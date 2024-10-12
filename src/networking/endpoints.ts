import axios from "axios"
import { FileInfo, noopProgressCallback, Progress } from "../utilities/utils"


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
    return client.post("/login", {
        email_address,
        password
    })
}

async function signup(email_address: string, password: string) {
    return client.post("/signup", {
        email_address,
        password
    })
}

async function logout() {
    return client.post("/logout")
}

async function getSession() {
    return client.get("/session")
}

async function resetPassword(new_password: string, reset_code: string) {
    return client.post("/reset_password", { new_password, reset_code})
}

const api = {
    login,
    signup,
    logout,
    getSession,
    resetPassword,
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