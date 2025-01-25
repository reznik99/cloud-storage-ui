import { Buffer } from "buffer"
import { FileInfo } from "./utils"
import { API_URL } from "../networking/endpoints"

type KeyOpts = {
    algo: string,
    length: number,
    usages: Array<KeyUsage>
    exportable: boolean
}

// Options for key derivation from password (used for generating master keys)
export const DeriveKeyOpts: KeyOpts = {
    algo: "PBKDF2",
    length: 512,
    usages: ["deriveBits", "deriveKey"],
    exportable: false
}
// Options for derived master keys (used for encrypting account keys)
export const MasterKeyOpts: KeyOpts = {
    algo: "AES-KW",
    length: 256,
    usages: ["wrapKey", "unwrapKey"],
    exportable: false
}
// Options for account encryption keys (used for encrypting file keys)
export const AccountKeyOpts: KeyOpts = {
    algo: "AES-KW",
    length: 256,
    usages: ["wrapKey", "unwrapKey"],
    exportable: true
}
// Options for file encryption keys (used for encrypting files)
export const FileKeyOpts: KeyOpts = {
    algo: "AES-GCM",
    length: 256,
    usages: ["encrypt", "decrypt"],
    exportable: true
}

const PBKDF2_iterations = 500_000   // PBKDF2 Iterations
const PBKDF2_hash_algo = "SHA-512"  // PBKDF2 Hash algorithm for derivation
const PBKDF2_salt_len = 16          // PBKDF2 Salt byte length
const AESGCM_iv_len = 12            // AES-GCM IV byte length
const AESKW_iv_len = 8              // AES-KW IV byte length
const CRV_len = 12                  // CRV byte length

// Generates random bytes with given length using browser CSPRNG 
function GenerateRandomBytes(length: number): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(length))
}

// Checks if two arraybuffers are equal
async function BufferEquals(first: Uint8Array, second: Uint8Array) {
    return first.length === second.length && first.every((value, index) => value === second[index]);
}

// Hashes/Digests a buffer with the given SHA algorithm
async function Hash(buffer: ArrayBuffer, hashAlgo: string) {
    return window.crypto.subtle.digest({ name: hashAlgo }, buffer)
}

// Generates a symmetric key with given options
async function GenerateKey(opts: KeyOpts) {
    return window.crypto.subtle.generateKey(
        {
            name: opts.algo,
            length: opts.length,
        },
        opts.exportable,
        opts.usages
    )
}

// Wrap a symmetric key with another symmetric key
async function WrapKey(key: CryptoKey, wrappingKey: CryptoKey) {
    return window.crypto.subtle.wrapKey(
        "raw", 
        key, 
        wrappingKey, 
        "AES-KW"
    )
}

// Unwrap a wrapped symmetric key with another symmetric key
async function UnwrapKey(wrappedKey: ArrayBuffer, wrappingKey: CryptoKey, opts: KeyOpts) {
    return window.crypto.subtle.unwrapKey(
        "raw", 
        wrappedKey, 
        wrappingKey, 
        "AES-KW",
        opts.algo,
        opts.exportable,
        opts.usages
    )
}

// Imports a key buffer into browser for cryptographic use
async function ImportKey(keyBuffer: ArrayBuffer, opts: KeyOpts): Promise<CryptoKey> {
    return window.crypto.subtle.importKey(
        "raw",
        keyBuffer,
        opts.algo,
        opts.exportable,
        opts.usages
    )
}

// Pads a raw CRV hex string with appropriate padding (URL + 'P' repeated to 200char length) for domain separation
function padCRV(rawCrvHex: string) {
    // Hex decode CRV
    const rawCrv = Buffer.from(rawCrvHex, 'hex')
    // API URL + P to 200 char length into Arraybuffer
    const padding = Buffer.from(API_URL.padEnd(200, "P"))
    // Concatenate padding with raw_crv buffer
    return Buffer.concat([padding, rawCrv])
}

// Returns a 32byte(256bit) salt derived from the raw CRV and padding
async function GenerateSaltFromCRV(rawCrvHex: string) {
    const crv = padCRV(rawCrvHex)
    return window.crypto.subtle.digest('sha-256', Buffer.from(crv))
}

// Derives Master Encryption and Authentication keys from password and salt.
async function DeriveKeysFromPassword(password: string, salt: Uint8Array) {
    const startTime = performance.now()
    if (salt.byteLength < PBKDF2_salt_len) {
        throw new Error(`Salt length ${salt.byteLength}bytes is below the set minimum of ${PBKDF2_salt_len}bytes!`)
    }

    // Convert string password to bytes and initialise PBKDF2 key from password
    const passwordBytes = Buffer.from(password)
    const keyMaterial = await ImportKey(passwordBytes, DeriveKeyOpts)

    // Derive bits for Encryption and Authentication Key
    const derivedBits = await window.crypto.subtle.deriveBits(
        {
            name: DeriveKeyOpts.algo,       // pbkdf2
            salt: salt,                     // salt derived from CRV
            iterations: PBKDF2_iterations,  // pbkdf2 iterations (500k)
            hash: PBKDF2_hash_algo,         // hash algo (sha-512)
        },
        keyMaterial,                        // Imported password
        512                                 // bit-length of output
    )

    // Get the first 32 bytes as the Encryption Key and the next 32 bytes as the Authentication Key
    const encryptionKeyBytes = derivedBits.slice(0, 32)
    const authenticationKeyBytes = derivedBits.slice(32, 64)

    // Hash authentication key for authenticating to API
    const hashedAuthenticationKeyBytes = await Hash(authenticationKeyBytes, "SHA-256")

    console.info(`DeriveKeysFromPassword took ${performance.now() - startTime}ms`)
    return {
        mEncKey: encryptionKeyBytes,
        hAuthKey: hashedAuthenticationKeyBytes,
        salt: Buffer.from(salt)
    }
}

// EncryptFile encrypts a file with the given key. Salt, IV and Wrapped File Key are pre-pended to ciphertext.
async function EncryptFile(masterKey: CryptoKey, file: File): Promise<File> {
    const startTime = performance.now()

    // Generate file encryption key
    const fileKey = await GenerateKey(FileKeyOpts)

    // Generate random IV for this file
    const iv = GenerateRandomBytes(AESGCM_iv_len)

    // Get file contents as a byte array
    const data = await file.arrayBuffer()

    // Encrypt file contents using derived key and IV
    const ciphertext = await window.crypto.subtle.encrypt(
        { name: FileKeyOpts.algo, iv: iv },
        fileKey,
        data
    )

    // Encrypt file encryption key
    const encryptedFileKey = await WrapKey(fileKey, masterKey)

    // Calculate total ciphertext output length
    const outputBuffer = new Uint8Array(encryptedFileKey.byteLength + iv.byteLength + ciphertext.byteLength)

    // Prepend Encrypted File Key and IV to file ciphertext
    outputBuffer.set(new Uint8Array(encryptedFileKey), 0)
    outputBuffer.set(iv, encryptedFileKey.byteLength)
    outputBuffer.set(new Uint8Array(ciphertext), encryptedFileKey.byteLength + iv.byteLength)

    console.info(`EncryptFile took ${performance.now() - startTime}ms`)
    // Return a new 'File' with plaintext replaced by ciphertext
    return new File([outputBuffer], file.name, { type: file.type, lastModified: file.lastModified })
}

// DecryptFile decrypts a file with the given key. Salt, IV and Wrapped File Key are extracted from ciphertext.
async function DecryptFile(masterKey: CryptoKey, fileInfo: FileInfo, fileData: ArrayBuffer): Promise<File> {
    const startTime = performance.now()

    const encryptedKeyLen = (FileKeyOpts.length / 8) + AESKW_iv_len

    // Split prepended fileKey, iv and file from ciphertext
    const encryptedFileKey = fileData.slice(0, encryptedKeyLen)
    const iv = fileData.slice(encryptedKeyLen, encryptedKeyLen + AESGCM_iv_len)
    const data = fileData.slice(encryptedKeyLen + AESGCM_iv_len)

    // Decrypt file encryption key
    const fileKey = await UnwrapKey(encryptedFileKey, masterKey, FileKeyOpts)

    // Decrypt contents of the file
    const plaintext = await window.crypto.subtle.decrypt(
        { name: FileKeyOpts.algo, iv: iv },
        fileKey,
        data
    )
    console.info(`DecryptFile took ${performance.now() - startTime}ms`)

    // Return a new 'File' with ciphertext replaced by plaintext // TODO: filetype?
    return new File([plaintext], fileInfo.name)
}

export {
    GenerateRandomBytes,
    GenerateSaltFromCRV,
    GenerateKey,
    DeriveKeysFromPassword,
    EncryptFile,
    DecryptFile,
    Hash,
    BufferEquals,
    WrapKey,
    UnwrapKey,
    ImportKey,
    CRV_len
}