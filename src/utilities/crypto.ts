import { Buffer } from "buffer"
import { FileInfo } from "./utils"

const PBKDF2_iterations = 500_000   // PBKDF2 Iterations
const PBKDF2_hash_algo = "SHA-256"  // PBKDF2 Hash algorithm for derivation
const PBKDF2_salt_len = 16          // PBKDF2 Salt byte length
const AESGCM_iv_len = 16            // AES-GCM IV byte length

type KeyInfo = {
    key: CryptoKey;
    salt: Buffer;
}

function generateRandomBytes(length: number): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(length))
}

// deriveAESKey (internal) derives an AES key from a master key and salt.
async function deriveAESKey(masterKey: CryptoKey, salt: Buffer | Uint8Array, extractable: boolean): Promise<CryptoKey> {
    const opts = {
        name: "PBKDF2",
        salt: salt,
        iterations: PBKDF2_iterations,
        hash: PBKDF2_hash_algo
    }
    return window.crypto.subtle.deriveKey(
        opts,                               // Input algorithm
        masterKey,                          // Source
        { name: "AES-GCM", length: 256 },   // Output algorithm
        extractable,                        // Exportable
        ["encrypt", "decrypt"]              // Key usage
    )
}

// DeriveKey generates an AES Key from a password and salt (if any). Generates the salt if none passed in.
async function DeriveKey(password: string, salt: Uint8Array | null): Promise<KeyInfo> {
    console.time('PasswordKeyDerivation')
    // Convert ascii password to bytes
    const passwordBytes = Buffer.from(password)
    // Initialise PBKDF2 key
    const passwordKey = await window.crypto.subtle.importKey(
        'raw',              // Format
        passwordBytes,      // Source
        { name: 'PBKDF2' }, // Output algorithm
        false,              // Exportable
        ['deriveKey']       // Key usage
    )
    // Generate salt if necessary
    if (!salt) salt = generateRandomBytes(PBKDF2_salt_len)
    // Derive AES key from password buffer
    const encryptionKey = await deriveAESKey(passwordKey, salt, true)
    console.timeEnd('PasswordKeyDerivation')
    return {
        key: encryptionKey,
        salt: Buffer.from(salt)
    }
}

// EncryptFile encrypts a file with the given password. Salt and IV are pre-pended to ciphertext.
async function EncryptFile(password: string, file: File) {
    console.time('EncryptFile')
    // Derive encryption key from password
    const { key, salt } = await DeriveKey(password, null)
    // Generate random IV for this file
    const iv = generateRandomBytes(AESGCM_iv_len)
    // Get file contents as a byte array
    const data = await file.arrayBuffer()
    // Encrypt file contents using derived key and IV
    const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        data
    )

    // Calculate total ciphertext output length
    const outputLength = salt.byteLength + iv.byteLength + ciphertext.byteLength
    // Prepend Salt and IV to file ciphertext
    const outputBuffer = new Uint8Array(outputLength);
    outputBuffer.set(salt, 0)
    outputBuffer.set(iv, PBKDF2_salt_len)
    outputBuffer.set(new Uint8Array(ciphertext), PBKDF2_salt_len + AESGCM_iv_len)

    console.timeEnd('EncryptFile')
    // Return a new 'File' with plaintext replaced by ciphertext
    return new File([outputBuffer], file.name, { type: file.type, lastModified: file.lastModified })
}

// DecryptFile decrypts a file with the given password. Salt and IV are extracted from ciphertext.
async function DecryptFile(password: string, fileInfo: FileInfo, fileData: ArrayBuffer) {
    console.time('DecryptFile')
    // Extract prepended salt & iv from ciphertext
    const salt = fileData.slice(0, PBKDF2_salt_len)
    const iv = fileData.slice(PBKDF2_salt_len, PBKDF2_salt_len + AESGCM_iv_len)
    const data = fileData.slice(PBKDF2_salt_len + AESGCM_iv_len)
    console.log("Salt:", Buffer.from(salt).toString('base64'))
    console.log("IV:", Buffer.from(iv).toString('base64'))
    // Derive encryption key from password and salt
    const { key } = await DeriveKey(password, new Uint8Array(salt))
    // Decrypt contents of the file
    const plaintext = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        data
    )
    console.timeEnd('DecryptFile')
    // Return a new 'File' with ciphertext replaced by plaintext // TODO: filetype?
    return new File([plaintext], fileInfo.name)
}

export {
    DeriveKey,
    EncryptFile,
    DecryptFile
}