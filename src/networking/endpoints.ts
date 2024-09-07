import axios from "axios"
import { FileInfo } from "../utilities/utils"


// const API_URL = "http://localhost:8080/api"
const API_URL = "https://storage.francescogorini.com/api"

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

async function getFiles() {
    return client.get("/files")
}

async function uploadFile(file: File, progressCallback: (progress: any) => void) {
    if (!progressCallback) {
        progressCallback = (_: number) => { }
    }

    const formData = new FormData()
    formData.append("file", file)

    return client.post("/file", formData, {
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

async function downloadFile(file: FileInfo, progressCallback: (progress: any) => void) {
    if (!progressCallback) {
        progressCallback = (_: number) => { }
    }
    return client.get("/file?name=" + file.name, {
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

const api = {
    login,
    signup,
    logout,
    getFiles,
    uploadFile,
    downloadFile,
    deleteFile,
    getLink,
    createLink,
    deleteLink
}
export default api