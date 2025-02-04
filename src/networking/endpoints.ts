import axios from "axios"
import { FileInfo, noopProgressCallback, Progress } from "../utilities/utils"
import { AccountKeyOpts, CRV_len, DeriveKeysFromPassword, GenerateKey, GenerateRandomBytes, GenerateSaltFromCRV, ImportKey, MasterKeyOpts, UnwrapKey, WrapKey } from "../utilities/crypto"
import { Buffer } from "buffer"
import store from "../store/store"

export const WS_URL = "ws://localhost:8080/ws"
export const API_URL = "http://localhost:8080/api"
// export const WS_URL = "wss://storage.francescogorini.com/ws"
// export const API_URL = "https://storage.francescogorini.com/api"

const client = axios.create({
    withCredentials: true,
    baseURL: API_URL
})

async function getLink(file: FileInfo) {
    return client.get("/link?name=" + file.name)
}

async function createLink(file: FileInfo) {
    return client.post("/link", {
        name: file.name
    })
}

async function deleteLink(file: FileInfo) {
    return client.delete("/link", {
        data: {
            name: file.name
        }
    })
}

async function previewLink(accessKey: string) {
    return client.get("/link_preview?access_key=" + accessKey)
}

async function downloadLink(accessKey: string, progressCallback: (progress: Progress) => void, signal: AbortSignal) {
    if (!progressCallback) progressCallback = noopProgressCallback

    return client.get("/link_download?access_key=" + accessKey, {
        signal: signal,
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
            if (progressEvent.lengthComputable && progressEvent.total) {
                progressCallback({
                    estimateSec: Math.round(progressEvent.estimated || 0),
                    bytesProcessed: progressEvent.loaded,
                    percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
                })
            }
        }
    })
}

async function getFiles() {
    return client.get("/files")
}

async function uploadFile(file: File, encryptedFileKey: ArrayBuffer, progressCallback: (progress: Progress) => void, signal: AbortSignal) {
    if (!progressCallback) progressCallback = noopProgressCallback

    const formData = new FormData()
    formData.append("wrapped_file_key", Buffer.from(encryptedFileKey).toString('base64'))
    formData.append("file", file)

    return client.post("/file", formData, {
        signal: signal,
        headers: {
            "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
            if (progressEvent.lengthComputable && progressEvent.total) {
                progressCallback({
                    estimateSec: Math.round(progressEvent.estimated || 0),
                    bytesProcessed: progressEvent.loaded,
                    percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
                })
            }
        }
    })
}

async function downloadFile(file: FileInfo, progressCallback: (progress: Progress) => void, signal: AbortSignal) {
    if (!progressCallback) progressCallback = noopProgressCallback

    return client.get("/file?name=" + file.name, {
        signal: signal,
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
            if (progressEvent.lengthComputable && progressEvent.total) {
                progressCallback({
                    estimateSec: Math.round(progressEvent.estimated || 0),
                    bytesProcessed: progressEvent.loaded,
                    percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
                })
            }
        }
    })
}

async function deleteFile(file: FileInfo) {
    return client.delete("/file", {
        data: {
            name: file.name
        }
    })
}

async function login(emailAddress: string, password: string) {
    // Get client CRV (Client Random Value) from server
    const res = await client.get("/client_random_value", { params: { email_address: emailAddress } })
    const rawCrv = res.data?.client_random_value as string
    // Derive salt from CRV
    const salt = await GenerateSaltFromCRV(rawCrv)
    // Derive Master Auth and Enc Key from salt
    const keys = await DeriveKeysFromPassword(password, new Uint8Array(salt))
    // Login with email and derived auth key
    const resp = await client.post("/login", {
        email_address: emailAddress,
        password: Buffer.from(keys.hAuthKey).toString('base64')
    })
    return {
        emailAddress: resp.data.email_address as string,
        createdAt: resp.data.created_at as number,
        lastSeen: resp.data.last_seen as number,
        password: password,
        mEncKey: Buffer.from(keys.mEncKey).toString('base64'),
        hAuthKey: Buffer.from(keys.hAuthKey).toString('base64'),
        wrappedAccountKey: resp.data.wrapped_account_key as string,
        clientRandomValue: rawCrv
    }
}

async function signup(emailAddress: string, password: string) {
    // Generate random CRV (Client Random Value)
    const rawCrv = Buffer.from(GenerateRandomBytes(CRV_len)).toString('base64')
    // Derive salt from CRV
    const salt = await GenerateSaltFromCRV(rawCrv)
    // Derive Master Auth and Enc Key from salt
    const keys = await DeriveKeysFromPassword(password, new Uint8Array(salt))
    // Generate account key and wrap account key with master key
    const acctKey = await GenerateKey(AccountKeyOpts)
    const mEncKey = await ImportKey(keys.mEncKey, MasterKeyOpts)
    const acctKeyWrapped = await WrapKey(acctKey, mEncKey)

    // Signup with email, derived auth key and client_random_value
    return client.post("/signup", {
        email_address: emailAddress,
        password: Buffer.from(keys.hAuthKey).toString('base64'),
        wrapped_account_key: Buffer.from(acctKeyWrapped).toString('base64'),
        client_random_value: rawCrv
    })
}

async function logout() {
    return client.post("/logout")
}

async function getSession() {
    return client.get("/session")
}

// Request a reset password code by email in logged out session
async function requestResetPassword(emailAddress: string) {
    return client.get("/reset_password", { params: { email_address: emailAddress } })
}

// Reset user password using email code in logged out session
async function resetPassword(newPassword: string, resetCode: string) {
    // Generate new random CRV (Client Random Value)
    const newRawCrv = Buffer.from(GenerateRandomBytes(CRV_len)).toString('base64')
    // Derive new salt from new CRV
    const newSalt = await GenerateSaltFromCRV(newRawCrv)
    // Derive new Master Auth and Enc Key from new salt
    const newKeys = await DeriveKeysFromPassword(newPassword, new Uint8Array(newSalt))
    // Generate new account key and Wrap new account key with new master key
    const newAcctKey = await GenerateKey(AccountKeyOpts)
    const mEncKey = await ImportKey(newKeys.mEncKey, MasterKeyOpts)
    const newAcctKeyWrapped = await WrapKey(newAcctKey, mEncKey)

    return client.post("/reset_password", {
        reset_code: resetCode,
        new_password: Buffer.from(newKeys.hAuthKey).toString('base64'),
        new_wrapped_account_key: Buffer.from(newAcctKeyWrapped).toString('base64'),
        new_client_random_value: newRawCrv
    })
}

// Reset/change password using existing password in logged in session
async function changePassword(password: string, newPassword: string) {
    const user = store.getState().user
    if (!user.wrappedAccountKey) throw new Error("Wrapped account key not loaded. Refresh page and try again!")

    // Derive salt from existing CRV
    const currentSalt = await GenerateSaltFromCRV(user.clientRandomValue)
    // Derive existing Master Auth and Enc Key from salt
    const currentKeys = await DeriveKeysFromPassword(password, new Uint8Array(currentSalt))
    const curentmEncKey = await ImportKey(currentKeys.mEncKey, MasterKeyOpts)

    // Generate new random CRV (Client Random Value)
    const newRawCrv = Buffer.from(GenerateRandomBytes(CRV_len)).toString('base64')
    // Derive new salt from new CRV
    const newSalt = await GenerateSaltFromCRV(newRawCrv)
    // Derive new Master Auth and Enc Key from new salt
    const newKeys = await DeriveKeysFromPassword(newPassword, new Uint8Array(newSalt))
    const newmEncKey = await ImportKey(newKeys.mEncKey, MasterKeyOpts)

    // Decrypt account key with current keys and re-encrypt account key with new master key
    const acctKey = await UnwrapKey(Buffer.from(user.wrappedAccountKey, 'base64'), curentmEncKey, AccountKeyOpts)
    const newWrappedAcctKey = await WrapKey(acctKey, newmEncKey)

    // TODO: mEncKey has changed and will break encryption/decryption of files. Rotate it and upload wrapped kek aswell
    await client.post("/change_password", {
        password: Buffer.from(currentKeys.hAuthKey).toString('base64'),
        new_password: Buffer.from(newKeys.hAuthKey).toString('base64'),
        new_wrapped_account_key: Buffer.from(newWrappedAcctKey).toString('base64'),
        new_client_random_value: newRawCrv
    })
    return {
        password: newPassword,
        mEncKey: Buffer.from(newKeys.mEncKey).toString('base64'),
        hAuthKey: Buffer.from(newKeys.hAuthKey).toString('base64'),
        wrappedAccountKey: Buffer.from(newWrappedAcctKey).toString('base64'),
        clientRandomValue: newRawCrv
    }
}

// Delete account using existing password in logged in session
async function deleteAccount(password: string) {
    const rawCrv = store.getState().user.clientRandomValue
    // Derive salt from CRV
    const salt = await GenerateSaltFromCRV(rawCrv)
    // Derive Master Auth and Enc Key from salt
    const keys = await DeriveKeysFromPassword(password, new Uint8Array(salt))

    return client.post("/delete_account", { password: Buffer.from(keys.hAuthKey).toString('base64') })
}

const api = {
    login,
    signup,
    logout,
    getSession,
    changePassword,
    deleteAccount,
    resetPassword,
    requestResetPassword,
    getFiles,
    uploadFile,
    downloadFile,
    deleteFile,
    getLink,
    createLink,
    deleteLink,
    previewLink,
    downloadLink
}
export default api