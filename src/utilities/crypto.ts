import { Buffer } from "buffer"
import { FileInfo } from "./utils"

type KeyOpts = {
    algo: string,
    length: number,
    usages: Array<KeyUsage>
}

// Options for derived master keys
const MasterKeyOpts: KeyOpts = {
    algo: "AES-KW",
    length: 256,
    usages: ["wrapKey", "unwrapKey"]
}

// Options for file encryption keys
const FileKeyOpts: KeyOpts = {
    algo: "AES-GCM",
    length: 256,
    usages: ["encrypt", "decrypt"]
}

// Options during key derivation from password
const DeriveKeyOpts: KeyOpts = {
    algo: "PBKDF2",
    length: 512,
    usages: ["deriveBits", "deriveKey"]
}

const PBKDF2_iterations = 500_000   // PBKDF2 Iterations
const PBKDF2_hash_algo = "SHA-512"  // PBKDF2 Hash algorithm for derivation
const PBKDF2_salt_len = 16          // PBKDF2 Salt byte length
const AESGCM_iv_len = 12            // AES-GCM IV byte length
const AESKW_iv_len = 8              // AES-KW IV byte length

// Generates random bytes with given length using browser CSPRNG 
function generateRandomBytes(length: number): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(length))
}

async function BufferEquals(first: Uint8Array, second: Uint8Array) {
    return first.length === second.length && first.every((value, index) => value === second[index]);
}

// Hashes/Digests a buffer with the given SHA algorithm
async function Hash(buffer: ArrayBuffer, hashAlgo: string): Promise<ArrayBuffer> {
    return window.crypto.subtle.digest({ name: hashAlgo }, buffer)
}

// Imports a key buffer into browser for cryptographic use
async function importKey(keyBuffer: ArrayBuffer, opts: KeyOpts): Promise<CryptoKey> {
    return window.crypto.subtle.importKey(
        "raw",
        keyBuffer,
        opts.algo,
        false,
        opts.usages
    )
}

// Exports a key from the browser to be prepended to a file
async function exportKey(encKey: CryptoKey): Promise<ArrayBuffer> {
    return window.crypto.subtle.exportKey(
        "raw",
        encKey
    )
}

// Generates a per file encryption key
async function generateFileEncryptionKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
        {
            name: FileKeyOpts.algo,
            length: 256,
        },
        true,
        FileKeyOpts.usages
    )
}

// Encrypts a file encryption key with the master key
async function encryptFileEncryptionKey(masterKey: CryptoKey, fileKey: CryptoKey): Promise<ArrayBuffer> {
    return window.crypto.subtle.wrapKey(
        "raw",
        fileKey,
        masterKey,
        MasterKeyOpts.algo
    )
}

// Decrypts a file encryption key with the master key
async function decryptFileEncryptionKey(masterKey: CryptoKey, fileKeyBytes: ArrayBuffer): Promise<CryptoKey> {
    return window.crypto.subtle.unwrapKey(
        "raw",
        fileKeyBytes,
        masterKey,
        MasterKeyOpts.algo,
        { name: FileKeyOpts.algo, length: FileKeyOpts.length },
        true,
        FileKeyOpts.usages
    )
}

// Derives Master Encryption and Authentication keys from password and salt (if any). Salt is null on signup and filled on login
async function DeriveKeysFromPassword(password: string, salt: Uint8Array | null) {
    const timerKey = "DeriveKeysFromPassword-" + Date.now()
    console.time(timerKey)
    // Convert ascii password to bytes
    const passwordBytes = Buffer.from(password)

    // Initialise PBKDF2 key
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',                  // Format
        passwordBytes,          // Source
        DeriveKeyOpts.algo,     // Output algorithm
        false,                  // Exportable
        DeriveKeyOpts.usages    // Key usage
    )

    // Generate salt if necessary (during signup)
    if (!salt) { salt = generateRandomBytes(PBKDF2_salt_len) }

    // Derive bits for Encryption and Authentication Key
    const derivedBits = await window.crypto.subtle.deriveBits(
        {
            name: DeriveKeyOpts.algo,
            salt: salt,
            iterations: PBKDF2_iterations,
            hash: PBKDF2_hash_algo,
        },
        keyMaterial,
        512
    )

    // Get the first 32 bytes as the Encryption Key and the next 32 bytes as the Authentication Key
    const encryptionKeyBytes = derivedBits.slice(0, 32)
    const authenticationKeyBytes = derivedBits.slice(32, 64)

    // Hash authentication key for authenticating to API
    const hashedAuthenticationKeyBytes = await Hash(authenticationKeyBytes, "SHA-256")
    const encryptionKey = await importKey(encryptionKeyBytes, MasterKeyOpts)

    console.timeEnd(timerKey)
    return {
        mEncKey: encryptionKey,
        hAuthKey: hashedAuthenticationKeyBytes,
        salt: Buffer.from(salt)
    }
}

// EncryptFile encrypts a file with the given password. Salt and IV are pre-pended to ciphertext.
async function EncryptFile(masterKey: CryptoKey, file: File): Promise<File> {
    const timerKey = "EncryptFile-" + Date.now()
    console.time(timerKey)

    // Generate file encryption key
    const fileKey = await generateFileEncryptionKey()

    // Generate random IV for this file
    const iv = generateRandomBytes(AESGCM_iv_len)

    // Get file contents as a byte array
    const data = await file.arrayBuffer()

    // Encrypt file contents using derived key and IV
    const ciphertext = await window.crypto.subtle.encrypt(
        { name: FileKeyOpts.algo, iv: iv },
        fileKey,
        data
    )

    // Encrypt file encryption key
    const encryptedFileKey = await encryptFileEncryptionKey(masterKey, fileKey)

    // Calculate total ciphertext output length
    const outputBuffer = new Uint8Array(encryptedFileKey.byteLength + iv.byteLength + ciphertext.byteLength)

    // Prepend Encrypted File Key and IV to file ciphertext
    outputBuffer.set(new Uint8Array(encryptedFileKey), 0)
    outputBuffer.set(iv, encryptedFileKey.byteLength)
    outputBuffer.set(new Uint8Array(ciphertext), encryptedFileKey.byteLength + iv.byteLength)

    console.timeEnd(timerKey)
    // Return a new 'File' with plaintext replaced by ciphertext
    return new File([outputBuffer], file.name, { type: file.type, lastModified: file.lastModified })
}

// DecryptFile decrypts a file with the given password. Salt and IV are extracted from ciphertext.
async function DecryptFile(masterKey: CryptoKey, fileInfo: FileInfo, fileData: ArrayBuffer): Promise<File> {
    const timerKey = "DecryptFile-" + Date.now()
    console.time(timerKey)

    const encryptedKeyLen = (FileKeyOpts.length / 8) + AESKW_iv_len

    // Split prepended fileKey, iv and file from ciphertext
    const encryptedFileKey = fileData.slice(0, encryptedKeyLen)
    const iv = fileData.slice(encryptedKeyLen, encryptedKeyLen + AESGCM_iv_len)
    const data = fileData.slice(encryptedKeyLen + AESGCM_iv_len)

    // Decrypt file encryption key
    const fileKey = await decryptFileEncryptionKey(masterKey, encryptedFileKey)

    // Decrypt contents of the file
    const plaintext = await window.crypto.subtle.decrypt(
        { name: FileKeyOpts.algo, iv: iv },
        fileKey,
        data
    )
    console.timeEnd(timerKey)

    // Return a new 'File' with ciphertext replaced by plaintext // TODO: filetype?
    return new File([plaintext], fileInfo.name)
}

export {
    DeriveKeysFromPassword,
    EncryptFile,
    DecryptFile,
    Hash,
    BufferEquals
}