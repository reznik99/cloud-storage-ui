import { Article, AudioFile, Folder, FolderZip, Movie, Photo } from "@mui/icons-material"
import axios, { AxiosError } from "axios";

export type FileInfo = {
    name: string;
    size: number;
    type: string;
    added: string;
}
export type Feedback = {
    message: string,
    severity: "error" | "info" | "success" | "warning"
}
export type Progress = {
    estimateSec: number;
    bytesProcessed: number;
    percentage: number;
}

function millisecondsToX(ms: number, target: "day" | "hour" | "minute" | "second") {
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

export function formatSize(byteSize: number) {
    if (byteSize < 1_000) {
        return "<1 kB"
    } else if (byteSize < 1_000_000) {
        return (byteSize / 1_000).toFixed(0).toLocaleString() + " kB"
    } else if (byteSize < 1_000_000_000) {
        return (byteSize / 1_000_000).toFixed(2).toLocaleString() + " MB"
    }
    return byteSize.toLocaleString() + " GB"
}

export function getFileIcon(fileName: string): JSX.Element {
    const fileExt = fileName.substring(fileName.lastIndexOf('.'), fileName.length)
    switch (fileExt) {
        // Folders
        case ".gzip":
        case ".zip":
        case ".tar":
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

export function assembleShareLink(accessKey: string) {
    return `${window.location.protocol}//${window.location.host}/share/${accessKey}`
}

export function fileToFileInfo(file: File | null | undefined): FileInfo {
    if (!file) return { name: '', type: '', size: 0, added: new Date(0).toLocaleString() }
    return {
        name: file.name,
        type: file.type,
        size: file.size,
        added: new Date().toLocaleString()
    }
}

export function noopProgressCallback(progress: Progress) {
    console.debug(progress)
}