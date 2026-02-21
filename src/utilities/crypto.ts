import { Buffer } from 'buffer';
import { FileInfo } from './utils';
import { API_URL } from '../networking/endpoints';
import store from '../store/store';

type KeyOpts = {
    algo: string;
    length: number;
    usages: Array<KeyUsage>;
    exportable: boolean;
};

// Options for key derivation from password (used for generating master keys)
export const DeriveKeyOpts: KeyOpts = {
    algo: 'PBKDF2',
    length: 512,
    usages: ['deriveBits', 'deriveKey'],
    exportable: false,
};
// Options for derived master keys (used for encrypting account keys)
export const MasterKeyOpts: KeyOpts = {
    algo: 'AES-KW',
    length: 256,
    usages: ['wrapKey', 'unwrapKey'],
    exportable: false,
};
// Options for account encryption keys (used for encrypting file keys)
export const AccountKeyOpts: KeyOpts = {
    algo: 'AES-KW',
    length: 256,
    usages: ['wrapKey', 'unwrapKey'],
    exportable: true,
};
// Options for file encryption keys (used for encrypting files)
export const FileKeyOpts: KeyOpts = {
    algo: 'AES-GCM',
    length: 256,
    usages: ['encrypt', 'decrypt'],
    exportable: true,
};

const PBKDF2_iterations = 500_000; // PBKDF2 Iterations
const PBKDF2_hash_algo = 'SHA-512'; // PBKDF2 Hash algorithm for derivation
const PBKDF2_salt_len = 16; // PBKDF2 Salt byte length
const AESGCM_iv_len = 12; // AES-GCM IV byte length
const CRV_len = 12; // CRV byte length

// Generates random bytes with given length using browser CSPRNG
function GenerateRandomBytes(length: number): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(length));
}

// Hashes/Digests a buffer with the given SHA algorithm
async function Hash(buffer: ArrayBuffer, hashAlgo: string) {
    return window.crypto.subtle.digest({ name: hashAlgo }, buffer);
}

// Generates a symmetric key with given options
async function GenerateKey(opts: KeyOpts) {
    return window.crypto.subtle.generateKey(
        {
            name: opts.algo,
            length: opts.length,
        },
        opts.exportable,
        opts.usages,
    );
}

// Wrap a symmetric key with another symmetric key
async function WrapKey(key: CryptoKey, wrappingKey: CryptoKey) {
    return window.crypto.subtle.wrapKey('raw', key, wrappingKey, 'AES-KW');
}

// Unwrap a wrapped symmetric key with another symmetric key
async function UnwrapKey(wrappedKey: ArrayBuffer | Uint8Array, wrappingKey: CryptoKey, opts: KeyOpts) {
    return window.crypto.subtle.unwrapKey(
        'raw',
        wrappedKey as BufferSource,
        wrappingKey,
        'AES-KW',
        opts.algo,
        opts.exportable,
        opts.usages,
    );
}

// Imports a key buffer into browser for cryptographic use
async function ImportKey(keyBuffer: ArrayBuffer | Uint8Array, opts: KeyOpts): Promise<CryptoKey> {
    return window.crypto.subtle.importKey('raw', keyBuffer as BufferSource, opts.algo, opts.exportable, opts.usages);
}

// Pads a raw CRV hex string with appropriate padding (URL + 'P' repeated to 200char length) for domain separation
function padCRV(rawCrvStr: string) {
    // Hex decode CRV
    const rawCrv = Buffer.from(rawCrvStr, 'base64');
    // API URL + P to 200 char length into Arraybuffer
    const padding = Buffer.from(API_URL.padEnd(200, 'P'));
    // Concatenate padding with raw_crv buffer
    return Buffer.concat([padding, rawCrv]);
}

// Returns a 32byte(256bit) salt derived from the raw CRV and padding
async function GenerateSaltFromCRV(rawCrv: string) {
    const crv = padCRV(rawCrv);
    return window.crypto.subtle.digest('sha-256', Buffer.from(crv));
}

// Derives Master Encryption and Authentication keys from password and salt.
async function DeriveKeysFromPassword(password: string, salt: ArrayBuffer) {
    const startTime = performance.now();
    if (salt.byteLength < PBKDF2_salt_len) {
        throw new Error(`Salt length ${salt.byteLength}bytes is below the set minimum of ${PBKDF2_salt_len}bytes!`);
    }

    // Convert string password to bytes and initialise PBKDF2 key from password
    const passwordBytes = Buffer.from(password);
    const keyMaterial = await ImportKey(passwordBytes, DeriveKeyOpts);

    // Derive bits for Encryption and Authentication Key
    const derivedBits = await window.crypto.subtle.deriveBits(
        {
            name: DeriveKeyOpts.algo, // pbkdf2
            salt: salt, // salt derived from CRV
            iterations: PBKDF2_iterations, // pbkdf2 iterations (500k)
            hash: PBKDF2_hash_algo, // hash algo (sha-512)
        },
        keyMaterial, // Imported password
        512, // bit-length of output
    );

    // Get the first 32 bytes as the Encryption Key and the next 32 bytes as the Authentication Key
    const encryptionKeyBytes = derivedBits.slice(0, 32);
    const authenticationKeyBytes = derivedBits.slice(32, 64);

    // Hash authentication key for authenticating to API
    const hashedAuthenticationKeyBytes = await Hash(authenticationKeyBytes, 'SHA-256');

    console.info(`DeriveKeysFromPassword took ${performance.now() - startTime}ms`);
    return {
        mEncKey: encryptionKeyBytes,
        hAuthKey: hashedAuthenticationKeyBytes,
        salt: Buffer.from(salt),
    };
}

// TODO: Refreshing page causes loss of user password and master keys. Page unable to download/upload until login is performed again
// Cache password or master keys in storage?

// EncryptFile encrypts a file with the given key. Salt, IV and Wrapped File Key are pre-pended to ciphertext.
async function EncryptFile(file: File) {
    const startTime = performance.now();
    const mEncKey = store.getState().user.mEncKey;
    const wrappedAccountKey = store.getState().user.wrappedAccountKey;
    if (mEncKey === '' || wrappedAccountKey === '') throw new Error('Missing credentials, please re-login!');

    // Get master key, decrypt account key and generate file key
    const masterKey = await ImportKey(Buffer.from(mEncKey, 'base64'), MasterKeyOpts);
    const accountKey = await UnwrapKey(Buffer.from(wrappedAccountKey, 'base64'), masterKey, AccountKeyOpts);
    const fileKey = await GenerateKey(FileKeyOpts);

    // Generate random IV for this file
    const iv = GenerateRandomBytes(AESGCM_iv_len);
    // Get file contents as a byte array
    const data = await file.arrayBuffer();

    // Encrypt file contents using derived key and IV
    const ciphertext = await window.crypto.subtle.encrypt(
        {
            name: FileKeyOpts.algo,
            iv: iv as BufferSource,
        },
        fileKey,
        data,
    );
    // Encrypt file encryption key
    const encryptedFileKey = await WrapKey(fileKey, accountKey);

    // Prepend IV to file ciphertext
    const outputBuffer = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    outputBuffer.set(iv, 0);
    outputBuffer.set(new Uint8Array(ciphertext), iv.byteLength);
    const encryptedFile = new File([outputBuffer], file.name, { type: file.type, lastModified: file.lastModified });

    console.info(`EncryptFile took ${performance.now() - startTime}ms`);
    return {
        encryptedFileKey: encryptedFileKey,
        encryptedFile: encryptedFile,
    };
}

// DecryptFile decrypts a file with the given key. Salt, IV and Wrapped File Key are extracted from ciphertext.
async function DecryptFile(encryptedFileKey: ArrayBuffer | Uint8Array, fileInfo: FileInfo, fileData: Blob): Promise<File> {
    const startTime = performance.now();
    const mEncKey = store.getState().user.mEncKey;
    const wrappedAccountKey = store.getState().user.wrappedAccountKey;
    if (mEncKey === '' || wrappedAccountKey === '') throw new Error('Missing credentials, please re-login!');

    // Split prepended iv and file from ciphertext
    const iv = await fileData.slice(0, AESGCM_iv_len).arrayBuffer();
    const data = await fileData.slice(AESGCM_iv_len).arrayBuffer();

    // Get master key, decrypt account key and decrypt file encryption key
    const masterKey = await ImportKey(Buffer.from(mEncKey, 'base64'), MasterKeyOpts);
    const accountKey = await UnwrapKey(Buffer.from(wrappedAccountKey, 'base64'), masterKey, AccountKeyOpts);
    const fileKey = await UnwrapKey(encryptedFileKey, accountKey, FileKeyOpts);

    // Decrypt contents of the file
    const plaintext = await window.crypto.subtle.decrypt({ name: FileKeyOpts.algo, iv: iv }, fileKey, data);
    console.info(`DecryptFile took ${performance.now() - startTime}ms`);

    // Return a new 'File' with ciphertext replaced by plaintext // TODO: filetype?
    return new File([plaintext], fileInfo.name);
}

// DecryptFileKey is a helper function to decrypt just the file key for link generation
async function DecryptFileKey(encryptedFileKey: string) {
    const mEncKey = store.getState().user.mEncKey;
    const wrappedAccountKey = store.getState().user.wrappedAccountKey;
    if (mEncKey === '' || wrappedAccountKey === '') throw new Error('Missing credentials, please re-login!');

    // Get master key, decrypt account key and decrypt file encryption key
    const masterKey = await ImportKey(Buffer.from(mEncKey, 'base64'), MasterKeyOpts);
    const accountKey = await UnwrapKey(Buffer.from(wrappedAccountKey, 'base64'), masterKey, AccountKeyOpts);
    const fileKey = await UnwrapKey(Buffer.from(encryptedFileKey, 'base64'), accountKey, FileKeyOpts);
    const fileKeyBuf = await window.crypto.subtle.exportKey('raw', fileKey);

    return Buffer.from(fileKeyBuf).toString('base64');
}

async function DecryptFileLink(fileKeyStr: string, fileInfo: FileInfo, fileData: Blob) {
    // Split prepended iv and file from ciphertext
    const iv = await fileData.slice(0, AESGCM_iv_len).arrayBuffer();
    const data = await fileData.slice(AESGCM_iv_len).arrayBuffer();
    // Import file key
    const fileKey = await ImportKey(Buffer.from(fileKeyStr, 'base64'), FileKeyOpts);

    // Decrypt contents of the file
    const plaintext = await window.crypto.subtle.decrypt({ name: FileKeyOpts.algo, iv: iv }, fileKey, data);
    // Return a new 'File' with ciphertext replaced by plaintext // TODO: filetype?
    return new File([plaintext], fileInfo.name);
}

export {
    GenerateRandomBytes,
    GenerateSaltFromCRV,
    GenerateKey,
    DeriveKeysFromPassword,
    EncryptFile,
    DecryptFile,
    Hash,
    WrapKey,
    UnwrapKey,
    ImportKey,
    DecryptFileKey,
    DecryptFileLink,
    CRV_len,
};
