import { Article, AudioFile, Folder, FolderZip, Movie, Photo } from "@mui/icons-material"

export type FileInfo = {
    name: string;
    size: number;
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

export function calculateSizeUsed(files: Array<FileInfo>) {
    let total = 0
    files.forEach(file => total += file.size)

    return Math.round(total / 1000 / 1000) // MB
}

export function calculateSizePercentageUsed(used: number, total: number) {
    return Math.min(Math.round((used / total) * 100), 100)
}

export function formatSize(byteSize: number) {
    if (byteSize < 1_000) {
        return "<1 KiB"
    } else if (byteSize < 1_000_000) {
        return (byteSize / 1_000).toFixed(0).toLocaleString() + " KiB"
    } else if (byteSize < 1_000_000_000) {
        return (byteSize / 1_000_000).toFixed(2).toLocaleString() + " MiB"
    }
    return byteSize.toLocaleString() + " GiB"
}

export function getFileIcon(fileName: string): any {
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

export async function triggerDownload(name: string, fileBlob: Blob) {
    const objectUrl = URL.createObjectURL(fileBlob);
    const link: HTMLAnchorElement = document.createElement('a');
    link.href = objectUrl;
    link.download = name;
    link.click();
    URL.revokeObjectURL(objectUrl);
}

export function getErrorString(err: any) {
    if (err.response?.data?.message) return `${err.response.status} - ${err.response.data.message}`
    if (err.response?.statusText) return `${err.response.status} - ${err.response.statusText}`
    if (err.message) return err.message
    return err.toString()
}

export function assembleShareLink(accessKey: string) {
    return `${window.location.protocol}//${window.location.host}/share/${accessKey}`
}