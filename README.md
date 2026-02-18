<p align="center">
  <img src="public/logo.png" alt="GoriniDrive" width="80" />
</p>

<h1 align="center">GoriniDrive</h1>

<p align="center">
  Self-hosted, end-to-end encrypted cloud storage.
  <br />
  Zero-knowledge file storage, link sharing, and peer-to-peer transfers.
  <br /><br />
  <a href="https://storage.francescogorini.com">Live Demo</a> · <a href="https://github.com/reznik99/cloud-storage-api">Backend Repo</a>
</p>

---

## Overview

GoriniDrive is a self-hosted cloud storage platform where files are encrypted client-side before they ever leave the browser. The server only stores ciphertext — it never has access to your plaintext data or encryption keys.

This repository contains the **frontend** SPA. The corresponding backend API lives at [cloud-storage-api](https://github.com/reznik99/cloud-storage-api).

### Features

- **E2E Encrypted Storage** — Files encrypted in-browser before upload using AES-256-GCM
- **Shareable Links** — Generate download links for any file; encryption key stays in the URL fragment (never sent to the server)
- **Peer-to-Peer Transfers** — Share files directly between browsers via WebRTC data channels, no file-size limits
- **Password-Based Key Derivation** — PBKDF2 (500k iterations, SHA-512) derives all keys from your password
- **Zero-Knowledge Architecture** — Password reset destroys data by design; the server can't help you recover
- **Dark / Light Mode**

### Roadmap

- [ ] Folder view — upload and navigate directory structures (like Google Drive)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript |
| Build | Vite 6, SRI via `vite-plugin-csp-guard` |
| UI | Material UI 6, Emotion |
| State | Redux Toolkit |
| Routing | React Router 7 (data router) |
| HTTP | Axios (cookie-based sessions) |
| Crypto | Web Crypto API (AES-GCM, AES-KW, PBKDF2, SHA-256/512) |
| P2P | WebRTC Data Channels, WebSocket signaling |
| Password Strength | zxcvbn |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        Browser                           │
│                                                          │
│   ┌──────────┐   ┌──────────┐   ┌────────────────────┐   │
│   │  React   │──▶│  Redux   │──▶│   Web Crypto API │   │
│   │  UI/MUI  │   │  Store   │   │  (encrypt/decrypt) │   │
│   └──────────┘   └──────────┘   └────────────────────┘   │
│        │                                │                │
│        ▼                                ▼                │
│   ┌──────────┐                  ┌──────────────────┐     │
│   │  Axios   │──── REST ───────▶│  Backend API    │     │
│   └──────────┘                  │  (ciphertext     │     │
│                                 │   only)          │     │
│   ┌──────────────────────┐      └──────────────────┘     │
│   │ WebRTC Data Channel  │◀─ signaling (WS) ──▶ Peer   │
│   │  (P2P file transfer) │                               │
│   └──────────────────────┘                               │
└──────────────────────────────────────────────────────────┘
```

### File Upload / Download Flow

1. **Upload**: Generate random AES-256-GCM file key → encrypt file → wrap file key with Account Key (AES-KW) → upload ciphertext + wrapped key
2. **Download**: Fetch ciphertext + wrapped key → unwrap file key with Account Key → decrypt file

### Link Sharing

A shareable link has the form:

```
https://storage.francescogorini.com/share/{access_key}#{file_key}
```

The `access_key` (path) authorizes download from the server. The `file_key` (fragment) decrypts the file client-side. Since URL fragments are never sent to the server, the server cannot decrypt the file — even for shared links.

### Peer-to-Peer Sharing

Uses WebRTC with WebSocket signaling:

1. Sender creates a data channel and gets a shareable URL (or QR code)
2. Receiver opens the URL; SDP offer/answer exchange happens via WebSocket
3. ICE candidates are exchanged, a direct P2P connection is established
4. File is streamed in 32KB chunks over the data channel
5. On Chromium, writes stream directly to disk via `FileSystemWritableFileStream`; Firefox buffers in memory

No authentication or server storage required — files flow directly between peers.

---

## Security

### Key Hierarchy

GoriniDrive uses a 4-tier key hierarchy (inspired by the [Mega whitepaper](https://mega.nz/SecurityWhitepaper.pdf)):

```
Password + CRV (Client Random Value)
        │
        ▼  PBKDF2-SHA512 (500,000 iterations)
   ┌─────────────────────────┐
   │   512-bit derived key   │
   └────────┬────────────────┘
            │
     ┌──────┴──────┐
     ▼              ▼
 Master Key     Auth Key
 (AES-KW)      (SHA-256 → server)
     │
     ▼  unwraps
 Account Key
 (AES-KW, stored encrypted on server)
     │
     ▼  unwraps
 File Key₁, File Key₂, ...
 (AES-GCM 256-bit, per-file, stored encrypted on server)
```

- **Master Key** never leaves the browser. It is derived from your password each session.
- **Account Key** is stored on the server wrapped (encrypted) by the Master Key.
- **File Keys** are randomly generated per file and stored wrapped by the Account Key.
- **Auth Key** is a SHA-256 hash of the derived authentication bytes — the server authenticates you without ever seeing your password.

### Zero-Knowledge Guarantees

- The server stores only ciphertext and wrapped keys.
- Password reset generates a **new** Account Key — previously uploaded files become permanently inaccessible. This is by design.
- The CRV salt is domain-separated (padded with the API URL) to prevent cross-site key reuse.

### Content Security Policy

Enforced at build time via `vite-plugin-csp-guard`:

- `script-src 'self'` — no inline scripts, no third-party JS
- **Subresource Integrity (SRI)** on all built assets
- WebSocket connections restricted to the backend origin
- `unsafe-inline` for styles only (required by Material UI)

### Password Policy

Passwords are evaluated client-side using [zxcvbn](https://github.com/dropbox/zxcvbn) (Dropbox's password strength estimator). Minimum 8 characters, minimum strength score of 1/4.

---

## Getting Started

### Prerequisites

- Node.js 18+
- The [backend API](https://github.com/reznik99/cloud-storage-api) running

### Install & Run

```bash
git clone https://github.com/reznik99/cloud-storage-frontend.git
cd cloud-storage-frontend
npm install
npm run dev
```

### Build

```bash
npm run build     # outputs to dist/
npm run preview   # preview production build locally
```

### Project Structure

```
src/
├── components/      # Reusable UI (dialogs, nav, sidebar, file views)
├── pages/           # Route-level pages (dashboard, login, settings, etc.)
├── networking/      # API client (axios) and WebRTC configuration
├── store/           # Redux store and user state slice
└── utilities/       # Crypto operations, password validation, helpers
```

---

## Interface

![Login Screenshot][login]

![Signup Screenshot][signup]

![Dashboard Screenshot][dashboard]

![Upload Screenshot][upload]

![Download Screenshot][download]

![Sharing Screenshot][sharing]

![Sharing Download Screenshot][sharing-download]

![Peer-to-Peer share Screenshot][p2p-sharing]

![Settings Screenshot][settings]

![Deletion Screenshot][deletion]

![Light-mode Screenshot][light-mode]


<!-- LINKS -->
[signup]: 1-readme-src/signup.png
[login]: 1-readme-src/login.png
[dashboard]: 1-readme-src/dashboard.png
[upload]: 1-readme-src/upload.png
[download]: 1-readme-src/download.png
[deletion]: 1-readme-src/deletion.png
[sharing]: 1-readme-src/sharing.png
[p2p-sharing]: 1-readme-src/p2p-sharing.png
[sharing-download]: 1-readme-src/sharing-download.png
[settings]: 1-readme-src/settings.png
[light-mode]: 1-readme-src/light-mode.png
