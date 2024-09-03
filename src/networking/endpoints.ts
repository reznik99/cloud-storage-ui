import axios from "axios"
import { FileInfo } from "../components/files"

const API_URL = "http://localhost:8080/api"
const client = axios.create({
    withCredentials: true,
    baseURL: API_URL
})

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
                    value: Math.round((progressEvent.loaded * 100) / progressEvent.total)
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
                    value: Math.round((progressEvent.loaded * 100) / progressEvent.total)
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
    deleteFile
}
export default api