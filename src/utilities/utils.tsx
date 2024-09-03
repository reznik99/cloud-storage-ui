import { Article, AudioFile, Folder, FolderZip, Movie, Photo } from "@mui/icons-material"
import { FileInfo } from "../components/files"

export type Feedback = {
    message: string,
    severity: "error" | "info" | "success" | "warning"
}

export function calculateSizeUsed(files: Array<FileInfo>) {
    let total = 0
    files.forEach(file => total += file.size)

    return Math.round(total / 1000 / 1000) // MB
}

export function calculateSizePercentageUsed(used: number, total: number) {
    return Math.round((used / total) * 100)
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
            return (<FolderZip />)
        case "":
            return (<Folder />)
        // Images
        case ".jpg":
        case ".jpeg":
        case ".png":
            return (<Photo />)
        // Videos
        case ".mp4":
        case ".wav":
            return (<Movie />)
        // Music
        case ".mp3":
            return (<AudioFile />)
        // Default
        default:
            return (<Article />)
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