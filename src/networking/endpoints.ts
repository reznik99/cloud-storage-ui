import axios from "axios"
import { FileInfo, noopProgressCallback, Progress } from "../utilities/utils"
import { CRV_len, DeriveKeysFromPassword, GenerateRandomBytes, GenerateSaltFromCRV } from "../utilities/crypto"
import { Buffer } from "buffer"


// export const API_URL = "http://localhost:8080/api"
export const API_URL = "https://storage.francescogorini.com/api"

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

async function uploadFile(file: File, progressCallback: (progress: Progress) => void, signal: AbortSignal) {
    if (!progressCallback) progressCallback = noopProgressCallback

    const formData = new FormData()
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

async function login(email_address: string, password: string) {
    // Get client CRV (Client Random Value) from server
    const res = await client.get("/client_random_value", { params: { email_address: email_address } })
    const rawCrv = res.data?.client_random_value as string
    // Derive salt from CRV
    const salt = await GenerateSaltFromCRV(rawCrv)
    // Derive Master Auth and Enc Key from salt
    const keys = await DeriveKeysFromPassword(password, new Uint8Array(salt))
    // Login with email and derived auth key
    const resp = await client.post("/login", {
        email_address: email_address,
        password: Buffer.from(keys.hAuthKey).toString('base64')
    })

    return {
        emailAddress: resp.data.email_address as string,
        createdAt: resp.data.created_at as number,
        lastSeen: resp.data.last_seen as number,
        password: password,
        mEncKey: keys.mEncKey,
        hAuthKey: keys.hAuthKey,
        clientRandomValue: rawCrv
    }
}

async function signup(email_address: string, password: string) {
    // Generate random CRV (Client Random Value)
    const rawCrv = Buffer.from(GenerateRandomBytes(CRV_len)).toString('base64')
    // Derive salt from CRV
    const salt = await GenerateSaltFromCRV(rawCrv)
    // Derive Master Auth and Enc Key from salt
    const keys = await DeriveKeysFromPassword(password, new Uint8Array(salt))
    // Signup with email, derived auth key and client_random_value
    return client.post("/signup", {
        email_address: email_address,
        password: Buffer.from(keys.hAuthKey).toString('base64'),
        client_random_value: rawCrv
    })
}

async function logout() {
    return client.post("/logout")
}

async function getSession() {
    return client.get("/session")
}

async function requestResetPassword(email_address: string) {
    return client.get("/reset_password", { params: { email_address } })
}

async function resetPassword(new_password: string, reset_code: string) {
    // TODO: use hAuthKey
    return client.post("/reset_password", { new_password, reset_code })
}

async function changePassword(password: string, new_password: string) {
    // TODO: use hAuthKey
    return client.post("/change_password", { password, new_password })
}

async function deleteAccount(password: string) {
    // TODO: use hAuthKey
    return client.post("/delete_account", { password })
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