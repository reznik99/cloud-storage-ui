# Security Review — 1GDrive (Frontend + Backend)

**Scope:**
- `1GDrive-FrontEnd` — React 19 / Vite SPA
- `1GDrive-BackEnd` — Go / Gin API + PostgreSQL

**Product:** Self-hosted, end-to-end encrypted cloud storage. Claims zero-knowledge:
client-side AES-256-GCM, PBKDF2-SHA512 / 500k iterations, server stores only ciphertext.

This document merges the original `AUDIT.md` (dated 2026-05-12) with a second-pass
independent review dated 2026-05-20. The second pass re-ranks issues by realistic
exploitability and contradicts a few of the original findings.

> Strike-through (~~like this~~) marks findings reviewed and accepted as intentional
> design, not a defect, or sufficiently mitigated. Reason follows each strike.

---

## Part 1 — Prioritised top 10 (independent re-rank, 2026-05-20)

Ordered by what an attacker would realistically exploit today. Fix in this order.

### 1. CRITICAL — Stored XSS via unencrypted upload + uploader-controlled MIME, served same-origin as the React app
**Files:** `BE/internal/handler.go:336,379,611` · `FE/src/components/dialog_file_upload.tsx:40,67`

The upload dialog has an "encryption off" toggle (intended for `<video>` streaming).
When used, the server stores `file.Header.Get("Content-Type")` — entirely attacker-
controlled — and replays it on `GET /api/link_download?access_key=…` with no
`Content-Disposition: attachment` and no `X-Content-Type-Options: nosniff`.

**Concrete exploit:**
1. Sign up, upload `evil.html` with encryption disabled and multipart part
   `Content-Type: text/html`.
2. Create a share link.
3. Send the **raw API URL** `https://storage.francescogorini.com/api/link_download?access_key=…`
   to the victim (not the `/share/...#…` route).
4. Victim's browser renders attacker HTML in the `storage.francescogorini.com` origin,
   with the React app's session cookie attached on any subsequent fetch
   (SameSite=Strict still permits, same site).
5. Attacker JS now calls `/api/files`, `/api/file`, `/api/link`, `/api/delete_account`
   etc. as the victim. Master key is in Redux in another tab — not reachable from this
   isolated document — but **file listing, ciphertext exfiltration, link creation, and
   quota-burn delete** all happen.

Listed as H8 in original AUDIT; impact significantly understated there.

**Fix:** `Content-Disposition: attachment; filename*=UTF-8''…` plus an allowlist for
the inline MIME types you actually need (`video/*`, `image/*`, `audio/*`) — or serve
user content from a sandboxed origin (`storage-cdn.francescogorini.com`).

---

### 2. HIGH — `/api/turn_credentials` is unauthenticated → free TURN relay for the entire internet
**Files:** `BE/main.go:119` · `BE/internal/handler.go:731-740` · `BE/internal/crypto.go:153-167`

No auth, no rate limit. Anyone scripts `curl /api/turn_credentials` and gets
RFC 8489-compliant time-bound credentials for `turn.francescogorini.com`. They now
have a free TURN relay for whatever they want — proxying scans, evading IP
reputation, exfiltrating from networks that allow only port 443.

**Fix:** Gate behind the `Protected` middleware (or at minimum require a fresh
captcha / proof-of-work) and rate-limit per IP.

---

### 3. HIGH — Storage quota race + INSERT-before-disk-write permanently consumes the user's quota
**Files:** `BE/internal/handler.go:310-353`

Two bugs in one handler:
- **Race**: `GetUserStorageMetrics` → check → `INSERT` is not transactional. Two
  concurrent uploads each see `SizeUsed+file.Size ≤ SizeAllowed` and both succeed;
  the user blows past their 1 GB.
- **Bookkeeping inversion**: line 339 `INSERT INTO files` happens *before* line 345
  `SaveUploadedFile`. If the disk write fails (full FS, EIO, AbortController on the
  client), the DB row stays. `file_size` is now counted against `allowed_storage`
  forever, but `c.File(filepath.Join(...))` will 404 for any subsequent download. No
  reconciliation path.

**Fix:** Insert after the file is on disk, or wrap the whole thing in a tx with
`defer tx.Rollback()` and a path-level cleanup on commit failure.

---

### 4. HIGH — `/ws` has no authentication AND `CheckWebSocketOrigin` doesn't check Origin
**Files:** `BE/internal/cookies.go:19-29` · `BE/main.go:117`

```go
return slices.Contains(allowedOrigins, proto+r.Host)
```

`r.Host` is the **server's** Host header (your own domain). The check reduces to
"is my own domain in the allowed list?" — always true. The actual `Origin` header
is never inspected. Combined with `/ws` being unauthenticated, this means:

- Cross-site WebSocket hijacking is unblocked at the origin layer.
- Anyone (any IP, any origin, any browser) can open `wss://…/ws`, receive a
  `wsKey`, and emit `answer` / `icecandidate` messages targeting **any other live
  wsKey**.

Original AUDIT C1 captures the unauth angle but misses that the origin check is
structurally broken (not just permissive — a no-op).

**Fix:** Use `r.Header.Get("Origin")`, and either require an auth cookie on `/ws`
or restrict it to authenticated P2P sessions issued via the API.

---

### 5. HIGH — Cookie store is signed-only with an 8-byte minimum HMAC key
**Files:** `BE/internal/cookies.go:47-60`

`cookie.NewStore` from gorilla wraps `securecookie` — signed, **not encrypted**.
The `id` field is base64-payload-visible. The bigger problem:
`if len(cookieAuthKey) < 8 { Fatal }` allows a 64-bit HMAC-SHA256 key. If the
operator picks `password` or `g-storage`, online brute-force of valid cookies
becomes feasible (~2^64 × HMAC cost, parallelisable per-user — viable against a
high-value target).

**Fix:** Require ≥32 bytes and use `securecookie` with both `authKey` and
`encryptKey` so the user_id stops leaking.

---

### 6. HIGH — Account squatting: signup has no email verification, no UNIQUE constraint, TOCTOU on the email check
**Files:** `BE/internal/handler.go:88-115` · `BE/schema/new.sql:3-12`

The `// TODO: send email to confirm email ownership` is the giveaway. Today:
- Attacker signs up `victim@bigcorp.com`. They now own that account.
- Victim later tries to sign up → "email already taken". They can't.
- Victim can recover via password reset (reset code goes to victim's inbox), which
  clobbers the attacker's files via the destructive reset described in
  `reset_password.tsx:128-154`. So this is a **denial-of-signup** more than account
  theft. Still a real abuse vector for a "self-hosted, anyone can register" service.
- Separately: concurrent `SELECT…INSERT` with no UNIQUE constraint → two rows with
  the same email. `GetUserByEmail` returns one nondeterministically.

**Fix:** Add UNIQUE on `users.email_address` immediately; implement email
confirmation before the account is usable.

---

### 7. MEDIUM — Email enumeration is wide open via at least three independent oracles
**Files:** `BE/internal/handler.go:38-56, 88-97, 128-148, 618-658`

1. **Signup** — "email address already taken" is a perfect binary oracle.
   Rate-limited per-IP only (10/min), so a single VPS rotating IPs walks the whole
   user table in hours.
2. **Login timing** — known email → Argon2id (64 MiB, t=1, ~100-300 ms);
   unknown email → no Argon2 call, returns near-instantly. Trivially
   distinguishable over the network.
3. **`/api/client_random_value`** (orig AUDIT C2) — real email returns its
   persistent CRV, unknown returns the env default. Two queries for the same
   address → matching CRV proves account exists.

**Fix the trifecta together:**
- Signup should silently accept (and email "you already have an account").
- Login should run Argon2 against a dummy hash on the unknown-email path.
- The CRV endpoint should HKDF a stable pseudo-CRV from a server secret + email
  for unknown addresses so it's indistinguishable from a real one.

---

### 8. MEDIUM — Unbounded request bodies (auth and unauth) → DoS
**Files:** `BE/main.go:80-96` · `BE/internal/handler.go:310`

No `router.MaxMultipartMemory` override, no `http.MaxBytesReader`, no body size
cap in middleware. `c.BindJSON` on `/api/login` reads the full body into memory
before parsing. `c.FormFile("file")` spills the multipart to a temp file in
`os.TempDir()` before your storage check runs. A single attacker can fill `/tmp`
faster than your quota check ever sees the request.

**Fix:** Add `c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, N)`
in a router-level middleware, with a separate larger cap on the upload route.

---

### 9. MEDIUM — `PreviewLink` / `DownloadLink` unauthenticated, unrate-limited; access_key in query string
**Files:** `BE/main.go:111-112` · `BE/internal/handler.go:533-616` · `BE/internal/middleware/logging.go:92`

128-bit access keys are good enough that guessing isn't the concern —
**logging is.** Reverse-proxy access logs and any error logger that captures the
full URL include the access_key. Anywhere a key leaks (logs, referrer, screenshot
of the URL bar) becomes unlimited download bandwidth.

Bonus: the download counter only increments when `Range` is empty
(`handler.go:601`) — `curl -H "Range: bytes=0-"` downloads the full file with the
counter stuck at 0. Counter-poisoning, not security-critical.

**Fix:** Add a rate limiter, prefer cookie-or-header transport for the key, and at
minimum strip query strings from any log line.

---

### 10. MEDIUM — Plaintext filenames + MIME in the DB undermine the "zero-knowledge" claim
**Files:** `BE/schema/new.sql:20-22` · `BE/internal/handler.go:336,338`

(Original AUDIT C3.) The single biggest gap between the README marketing
("end-to-end encrypted, server only stores ciphertext") and reality. A DB dump
from your Postgres host reveals every filename your users uploaded, which often is
the secret (`severance-letter-final.pdf`, `2FA-backup-codes.txt`).

**Fix:** Encrypt filenames client-side with the account key, same way you wrap
file keys.

---

## Part 2 — Corrections to the original AUDIT.md

- **H10 (deferred `rows.Close()` after early return → connection-pool leak)** —
  **Not a leak.** Go's `database/sql` docs are explicit: `Rows.Next()` returning
  false implicitly calls `Close()`. The pattern is brittle and bad style, but
  connections return to the pool. Drop from high severity; treat as a code-style
  refactor only.

- **M14 (`DeleteFile` deletes DB row before disk)** — Real but importance
  inverted: the worse direction is **upload** (top-10 item #3) where you create
  accounting before the data. On delete, an orphan ciphertext blob is a janitor
  problem, not a security one.

- **M13 (share links never expire)** — Original resolution is correct; matches
  the Google Drive "anyone with the link" model, entropy is sufficient. No work
  needed.

## Part 3 — Net-new vs the original AUDIT.md

Items not explicit in `AUDIT.md` 2026-05-12:

- **#2** — Unauthenticated `/api/turn_credentials` as a bandwidth-theft vector
  (orig AUDIT mentioned only the empty-secret case as informational).
- **#3** — `UploadFile` INSERT-before-write + non-transactional quota check.
- **#4** — Structural break in `CheckWebSocketOrigin` (uses `r.Host`, not
  `Origin`). Orig AUDIT had the unauth half but not the no-op check half.

The XSS at **#1** is present as H8 in the original audit but the same-origin
account-takeover impact is significantly understated there.

---

## Part 4 — Original findings preserved (2026-05-12 audit)

Below is the full original `AUDIT.md`, kept intact for traceability. Some entries
are superseded or re-ranked by Part 1 above — cross-reference when fixing.

### CRITICAL — break the zero-knowledge / authentication model

| # | Finding | Location | Threat vector |
|---|---|---|---|
| **C1** | **WebSocket signaling has no auth and no peer authorization.** `/ws` accepts any connection, server logs the 16-byte socket key at INFO, attacker-controlled `To` field relays to any socket. No rooms, no per-user mapping. | `BE/main.go:117`, `BE/internal/socket.go:48-95`, `BE/internal/handler.go:714-729` | **Unauthenticated remote attacker** → MITM/hijack live P2P signaling, DoS via unbounded socket map, peer impersonation. |
| **C2** | **`GET /api/client_random_value` is an unlimited email enumeration oracle.** Returns the user's real per-account CRV for registered emails, a fixed `DEFAULT_CRV` otherwise. Endpoint is **outside** the rate limiter. | `BE/main.go:98`, `BE/internal/handler.go:128-148` | **Unauthenticated remote attacker** → enumerate all registered emails, plus KDF-salt head-start for offline cracking after phishing. |
| **C3** | **Plaintext filenames + MIME types stored server-side and served to share-link visitors.** README claims "server never sees plaintext"; files like `tax-return-SSN-….pdf` are fully visible to operator, DB-backup leaker, or anyone with the share URL. | `BE/internal/handler.go:310-353` (upload), `533-616` (preview/download), `BE/schema/new.sql:18-23` | **Malicious operator / backup leak / share-link finder** → leaks sensitive metadata that often contains the secret itself. |
| **C4** | **Plaintext password, master key (`mEncKey`), and auth key parked in Redux for entire session and never cleared on logout.** Master key kept as raw base64 (extractable) even though `CryptoKey` would have been non-extractable. | `FE/src/store/reducer.ts:6,10-11,21,39`, `FE/src/pages/login.tsx:78`, `FE/src/networking/endpoints.ts:149-156`, `FE/src/components/nav.tsx:52-60` | **Any XSS — present or future — in MUI/notistack/dep tree** → full account compromise + decryption of all files. Cross-session leak on shared browsers. |

### HIGH

| # | Finding | Location | Threat vector |
|---|---|---|---|
| **H1** | **Cookie store is signed-only (not encrypted)**, and accepts `COOKIE_AUTH_KEY` as short as **8 bytes**. user_id readable from cookie, HMAC forge-able if key is short. | `BE/internal/cookies.go:47-50,58-59` | Cookie capture or weak-key brute-force → forge any user's session. |
| **H2** | **No server-side session table.** Logout clears only the local cookie; `ChangePassword` does **not invalidate other sessions**; no "log out everywhere". | `BE/internal/cookies.go:63-83`, `BE/internal/middleware/authentication.go:11-26` | Cookie theft + password rotation cannot evict attacker. |
| **H3** | **No UNIQUE constraint on `users.email_address`.** Signup is `SELECT ... INSERT` with no transaction. Concurrent signups create duplicate accounts; `GetUserByEmail` returns first row. | `BE/schema/new.sql:3-12`, `BE/internal/handler.go:88-115` | Race-condition account capture; locks original user out / mis-routes resets. |
| **H4** | ~~**`ResetPassword` does not delete files/links or invalidate sessions.** After reset, master key changes → wrapped file keys become permanently undecryptable; existing sessions still valid. The code's own TODO acknowledges this.~~ | `BE/internal/handler.go:660-712` | Any successful reset = silent total data loss for the user. |
| | > **Resolved:** Destructive reset is **intentional** and the frontend explicitly warns the user with a prominent `Alert severity="warning"` + mandatory "I understand and wish to continue" checkbox at `FE/src/pages/reset_password.tsx:128-154`. Listed consequences are explicit (all files lost, all share links broken). Not silent. Cleaning up orphan ciphertext blobs / invalidating sessions on the backend is a nice-to-have but not a security finding. | | |
| **H5** | **No upload size limit, no streaming bound.** Gin's multipart parser spills to disk before quota check is reached. | `BE/internal/handler.go:310-353`, `BE/main.go:80-87` | Unauthenticated/authenticated DoS → disk fill. |
| **H6** | **CSRF defense relies entirely on `SameSite` — and `SameSite=Lax` in dev** with `AllowOrigins: "*" + AllowCredentials: true`. No CSRF tokens on `/change_password`, `/delete_account`, `/file`, etc. | `BE/internal/cookies.go:32-43,71-75` | Malicious site → state-changing requests with victim's session. |
| **H7** | **`PrivateRoute` renders children before auth check resolves**, and Redux state isn't cleared on logout. | `FE/src/private_route.tsx:14-49` | Previous user's file list briefly visible to next user on a shared device. |
| **H8** | **No security headers on backend.** No HSTS, no `nosniff`, no `X-Frame-Options`, no `Content-Disposition: attachment` on share downloads — and **`Content-Type` is whatever the uploader set**. | `BE/internal/handler.go:379,611` | Malicious uploader sets `Content-Type: text/html` → stored XSS on the share download endpoint, executing on victim's origin. **Re-ranked to #1 in Part 1.** |
| **H9** | **CSP allows `localhost:8080` / `ws://localhost:8080` in the production build.** Single Vite config for dev+prod. | `FE/vite.config.ts:20-33`, `FE/dist/index.html:1` | SSRF-style attacks against local services from authenticated session. |
| **H10** | ~~**Pervasive `rows.Close()` defer-after-early-return leak** in every DB query function.~~ | `BE/internal/database/queries.go:14-23` and similar throughout | ~~Slow connection-pool exhaustion → availability DoS.~~ |
| | > **Corrected (2026-05-20):** Not a leak. `database/sql` auto-closes Rows when `Next()` returns false. Bad style, not a vulnerability. | | |

### MEDIUM

- **M1** — Login: timing differential between unknown-email (no Argon2 call) vs known-email-wrong-pw (full Argon2). Email enumeration oracle. — `BE/internal/handler.go:38-56`
- **M2** — `RequestResetPassword` differential log message + send latency → enumeration; no per-account rate limit → email bombing. — `BE/internal/handler.go:618-658`
- **M3** — Reset codes stored **plaintext** in DB; not hashed. SQL leak or DB backup = direct account takeover window (10 min). — `BE/schema/new.sql:37-42`, `handler.go:642`
- **M4** — Frontend `noopProgressCallback` and crypto timing logged via `console.info` in production. PBKDF2 timing fingerprints CPU class. — `FE/src/utilities/crypto.ts:139,185,210`
- **M5** — `Domain: c.Request.Host` on cookies — attacker-controlled `Host:` header. — `BE/internal/cookies.go:67,90`
- ~~**M6** — `sslmode=disable` for Postgres connection — plaintext DB traffic if DB is on another host. — `BE/internal/database/database.go:13-19`~~
  > **Resolved:** PostgreSQL runs on the same host as the API (loopback connection). No network traffic to MITM. Standard production topology for this deployment.
- **M7** — `ErrorHandler` returns raw `err.Error()` to clients (leaks schema, pq constraint names). — `BE/internal/middleware/logging.go:64-73`
- **M8** — Reset-password URL fragment rendered in **page title** ("Reset password (code: XYZ)"). Shoulder-surf / screen-share / a11y-tree leak. — `FE/src/pages/reset_password.tsx:79`
- **M9** — `minPasswordScore: 1` (zxcvbn) on both sides — accepts "password1"-tier passwords as the root of a key hierarchy. — `FE/src/utilities/security.ts:6`, `BE/internal/crypto.go:37`
- **M10** — P2P share: signaling unauthenticated + first-comer-wins race for the data channel. — `FE/src/pages/p2p_file_sharing.tsx:122-209`
- **M11** — P2P receiver writes attacker-supplied filename to `showSaveFilePicker` (RTL-spoofing, no size cap). — `FE/src/pages/p2p_file_sharing.tsx:256-319`
- ~~**M12** — `wrappedAccountKey` returned by `getSession` is trusted blindly; no consistency check against the login-time value. Malicious server can substitute. — `FE/src/private_route.tsx:24-33`~~
  > **Resolved:** AES-KW (RFC 3394) is authenticated — the wrap includes the integrity check IV `A6A6A6A6A6A6A6A6`. `UnwrapKey` at `FE/src/utilities/crypto.ts:76-86` throws if the wrap is tampered with or wrapped under a different key. Server-side substitution fails closed, not open. Not exploitable.
- ~~**M13** — Share access keys never expire, no max-download cap, no rotation. — `BE/internal/handler.go:447-468`~~
  > **Resolved:** Intentional design, matching the "anyone with the link" model of Google Drive and similar products. Users revoke by deleting the link.
- ~~**M14** — `DeleteFile` deletes DB row before disk; failure path leaks orphan ciphertext blobs forever. — `BE/internal/handler.go:386-426`~~
  > **Reclassified (2026-05-20):** Real but low-impact. Janitor problem, not security. The mirror bug on **upload** (Part 1 #3) is the one that matters.
- **M15** — CSP delivered only via `<meta>` → no `frame-ancestors`, `base-uri`, `object-src`, `form-action` enforced. — `FE/dist/index.html:1`

### LOW / INFORMATIONAL

- Logout `Logout` cookie uses `SameSiteLaxMode` while create uses `SameSiteStrictMode` — mismatch may prevent cookie deletion. — `BE/internal/cookies.go:86-98` *(Note: SameSite is not part of cookie identity for deletion; browsers match on name+domain+path. Cosmetic.)*
- Argon2 params: `t=1` is below OWASP recommendation (≥2). — `BE/internal/crypto.go`
- `TURN_SERVER_SECRET` empty → predictable HMAC accepted by TURN. — `BE/internal/crypto.go`
- ~~Logs contain raw `email_address` and `access_key` query params (effective share-link leak via logs). — `BE/internal/middleware/logging.go`~~
  > **Resolved (with caveat):** The share-link `access_key` only retrieves ciphertext from the server. The file decryption key lives in the URL fragment (`#…`), which browsers never transmit over HTTP — so the server cannot have it in logs. Knowing the `access_key` alone is insufficient to decrypt. **Caveat:** this only holds for encrypted uploads. If a user disables encryption for an upload (the "plaintext upload" option), an `access_key` in logs IS sufficient to download the plaintext. See also Part 1 #9.
- `dist/storage-api` (35 MB binary) committed to git.
- ~~Frontend deps: `zxcvbn@4.4.2` (archived/unmaintained)~~, `eslint-plugin-react-hooks` pinned to a *canary* build.
  > **Resolved (zxcvbn portion):** zxcvbn 4.4.2 has zero runtime dependencies and the password-strength algorithm is fixed. No supply-chain attack surface from being unmaintained. The only maintained alternative — `@zxcvbn-ts/core` — is functionally equivalent. Cost of migration outweighs benefit.
- ~~"Plaintext upload" toggle persists silently across dialog opens — `FE/src/components/dialog_file_upload.tsx`~~
  > **Resolved (not a defect):** State resets to `true` on dialog close via `closeDialog`'s `setEncryptionEnabled(true)` (`dialog_file_upload.tsx:40,46-51`). Original finding was incorrect.
- No `axios` interceptors, no `localStorage` token storage, no `eval`/`dangerouslySetInnerHTML`, no sourcemaps in production build, share-link key truly stays client-side, PBKDF2 params match README, AES-GCM IV handling is structurally safe (fresh key per file) — **the crypto primitives themselves are correct**.

---

## Part 5 — Crypto correctness (cleared)

- **AES-GCM IV generation** — `crypto.ts:163` uses `crypto.getRandomValues(new Uint8Array(12))`. Each file gets a brand-new key, so nonce reuse is structurally impossible.
- **PBKDF2 parameters** — `crypto.ts:42-43,121-130`. 500,000 iterations, SHA-512, salt = SHA-256(API_URL ‖ padding ‖ raw_crv). Matches README. 512-bit output split into 256-bit enc + 256-bit auth.
- **Salt domain separation** — API URL padded to 200 chars and concatenated with CRV before SHA-256. Prevents salt collision across deployments.
- **AES-KW wrap/unwrap chain** — RFC 3394; account key wraps file keys, master key wraps account key. Construction correct, integrity-checked on unwrap.
- **Share-link key never sent to server** — verified `share.tsx:62-66` reads `hash.slice(1)` client-side only; `assembleShareLink` (`utils.tsx:160-162`) builds `…/share/{accessKey}#{fileKey}`. No fetch in the codebase ever attaches the hash.
- **DTLS / data-channel encryption** — WebRTC data channels are DTLS-encrypted by spec; risk is signaling, not transport.
- **RNG** — only `crypto/rand` on the server, only `window.crypto.getRandomValues` on the client. No `math/rand`.
- **Argon2id** — `m=64 MiB`, `p=4`, `len=32`; `t=1` is the only param below current OWASP guidance.
- **Constant-time compare** — `subtle.ConstantTimeCompare` used for password hash and metrics basic-auth.
- **Parameterised SQL** — every query uses `$N` placeholders; no `fmt.Sprintf` into SQL anywhere.
- **Path traversal** — file blob `location` is server-generated hex, joined under `FileStoragePath`. Safe by construction.

---

## Suggested fix order

`#1 (XSS) → #2 (TURN) → #5 (cookie key minimum + encryption) → #3 (upload race) → #4 (WS origin + auth) → #6 (UNIQUE on email + dummy-Argon2 path) → #8 (body size cap) → #10 (encrypt filenames)`

The first two are public-internet-reachable today with no auth required. The rest
are graded by leverage given how the system is actually deployed.

The cryptographic primitives are correctly chosen and correctly used. What
undermines the security model is everything around them: uploader-controlled MIME
on the file-serving endpoint, unauth signaling/TURN endpoints, the gap between
the "zero-knowledge" claim and plaintext filenames in the DB, and the standard
operational hygiene gaps (body limits, security headers, server-side sessions).
