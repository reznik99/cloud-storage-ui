import { Article, AudioFile, Folder, FolderZip, Movie, Photo } from "@mui/icons-material"
import { Chip } from "@mui/material";
import axios, { AxiosError } from "axios";
import { API_URL } from "../networking/endpoints";

export type FileInfo = {
    name: string;
    size: number;
    type: string;
    added: string;
    wrapped_file_key: string;
}
export type Feedback = {
    message: string,
    severity: "error" | "info" | "success" | "warning"
}
export type Progress = {
    estimateSec: number;
    bytesProcessed: number;
    percentage: number;
    bitRate?: number
}

export function millisecondsToX(ms: number, target: "day" | "hour" | "minute" | "second") {
    switch (target) {
        case "day":
            return ms / 1000 / 60 / 60 / 24
        case "hour":
            return ms / 1000 / 60 / 60
        case "minute":
            return ms / 1000 / 60
        case "second":
            return ms / 1000
    }
}

export function localDateTime(date: Date, withHumanDiff: boolean) {
    let output = date.toLocaleString()
    if (withHumanDiff) {
        const diffDays = millisecondsToX(Date.now() - date.valueOf(), "day")
        if (diffDays <= 1) output += " (< day ago)"
        else output += ` (${Math.floor(diffDays).toLocaleString()} days ago)`
    }
    return output
}

export function calculateSizeUsed(files: Array<FileInfo>) {
    let total = 0
    files.forEach(file => total += file.size)

    return Math.round(total / 1000 / 1000) // MB
}

export function calculateSizePercentageUsed(used: number, total: number) {
    return Math.min(Math.round((used / total) * 100), 100)
}

export function sizePercentageToColor(used: number): "error" | "info" | "success" | "warning" | "primary" | "inherit" | "secondary" {
    if (used < 25) return 'primary';
    if (used < 50) return 'info';
    if (used < 75) return 'warning';
    else return 'error';
}

export function formatBytes(byteSize: number) {
    if (byteSize < 1_000) {
        return "<1 kB"
    } else if (byteSize < 1_000_000) {
        return (byteSize / 1_000).toFixed(0).toLocaleString() + " kB"
    } else if (byteSize < 1_000_000_000) {
        return (byteSize / 1_000_000).toFixed(2).toLocaleString() + " MB"
    }
    return (byteSize / 1_000_000_000).toLocaleString() + " GB"
}

export function formatBits(bitSize: number) {
    if (bitSize < 1_000) {
        return "<1 kb"
    } else if (bitSize < 1_000_000) {
        return (bitSize / 1_000).toFixed(0).toLocaleString() + " kb"
    } else if (bitSize < 1_000_000_000) {
        return (bitSize / 1_000_000).toFixed(2).toLocaleString() + " Mb"
    }
    return (bitSize / 1_000_000_000).toLocaleString() + " Gb"
}

export function getFileIcon(fileName: string): JSX.Element {
    const fileExt = fileName.substring(fileName.lastIndexOf('.'), fileName.length)
    switch (fileExt.toLowerCase()) {
        // Folders
        case ".tar":
        case ".gz":
        case ".gzip":
        case ".zip":
        case ".7z":
        case ".7zip":
            return (<FolderZip color="primary" />)
        case "":
            return (<Folder color="primary" />)
        // Images
        case ".jpg":
        case ".jpeg":
        case ".png":
            return (<Photo color="primary" />)
        // Videos
        case ".mp4":
        case ".wav":
            return (<Movie color="primary" />)
        // Music
        case ".mp3":
            return (<AudioFile color="primary" />)
        // Default
        default:
            return (<Article color="primary" />)
    }
}

export function triggerDownload(name: string, fileBlob: Blob): void {
    const objectUrl = URL.createObjectURL(fileBlob);
    const link: HTMLAnchorElement = document.createElement('a');
    link.href = objectUrl;
    link.download = name;
    link.click();
    URL.revokeObjectURL(objectUrl);
}

export function getErrorString(err: Error | AxiosError | unknown): string {
    const isAxiosError = axios.isAxiosError(err)
    if (isAxiosError && err.response?.data?.message) return `${err.response.status} - ${err.response.data.message}`
    if (isAxiosError && err.response?.statusText) return `${err.response.status} - ${err.response.statusText}`
    if (err instanceof Error && err?.message) return err.message
    return err?.toString() || "unknown error"
}

export function assembleShareLink(accessKey: string, fileKey: string) {
    return `${window.location.protocol}//${window.location.host}/share/${accessKey}#${fileKey}`
}

export function fileToFileInfo(file: File | null | undefined): FileInfo {
    if (!file) return { name: '', type: '', size: 0, added: new Date(0).toLocaleString(), wrapped_file_key: '' }
    return {
        name: file.name,
        type: file.type,
        size: file.size,
        added: new Date().toLocaleString(),
        wrapped_file_key: ''
    }
}

export function noopProgressCallback(progress: Progress) {
    console.debug(progress)
}

export function getWebsocketStatus(status: number) {
    switch (status) {
        case WebSocket.CONNECTING:
            return <Chip label="connecting" color="info" variant="outlined" />
        case WebSocket.OPEN:
            return <Chip label="online" color="success" variant="outlined" />
        case WebSocket.CLOSING:
            return <Chip label="closing" color="warning" variant="outlined" />
        case WebSocket.CLOSED:
            return <Chip label="offline" color="error" variant="outlined" />
        default:
            return <Chip label="unknown" color="secondary" variant="outlined" />
    }
}

export function getWebRTCStatus(status: RTCDataChannelState | undefined) {
    switch (status) {
        case "connecting":
            return <Chip label="connecting" color="info" variant="outlined" />
        case "open":
            return <Chip label="online" color="success" variant="outlined" />
        case "closing":
            return <Chip label="closing" color="warning" variant="outlined" />
        case "closed":
            return <Chip label="offline" color="error" variant="outlined" />
        default:
            return <Chip label="unknown" color="secondary" variant="outlined" />
    }
}

export function getWebsocketURL() {
    const url = URL.parse(API_URL)
    if (!url) throw new Error("Failed to parse API_URL: " + API_URL)

    let proto = "wss:"
    if (url.protocol === "http:") {
        proto = "ws:"
    }
    return `${proto}//${url.host}/ws`
}