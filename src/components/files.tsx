import { useCallback, useState } from "react"
import { Delete, Download, ExpandLess, ExpandMore, Link } from "@mui/icons-material"
import { Box, Button, Collapse, Divider, LinearProgress, List, ListItem, ListItemIcon, ListItemText, Tooltip, Typography } from "@mui/material"
import { Feedback, formatSize, getFileIcon, triggerDownload } from "../utilities/utils"
import api from "../networking/endpoints"

export type FileInfo = {
    name: string;
    size: number;
    added: string;
}

type IProps = {
    files: Array<FileInfo>;
    loadFileList: () => void;
    setAlertInfo: (info: Feedback) => void;
}

const zeroProgress = {
    estimateSec: 0,
    value: 0
}

function FilesView(props: IProps) {
    const [openIdx, setOpenIdx] = useState(-1)
    const [loadingIdx, setLoadingIdx] = useState(-1)
    const [progress, setProgress] = useState(zeroProgress)

    const createLink = useCallback((_: number) => {
        // do link creation
        props.setAlertInfo({ message: "Not yet implemented", severity: "warning" })
    }, [])

    const downloadFile = useCallback(async (idx: number) => {
        if (!props.files[idx]) return
        const file = props.files[idx]

        try {
            setLoadingIdx(idx)
            const resp = await api.downloadFile(file, setProgress)
            triggerDownload(file.name, resp.data)
            props.setAlertInfo({ message: "File downloaded successfully", severity: "success" })
        } catch (err: any) {
            const message = `${err.response.status} - ${err.response.statusText}`
            console.error(message || err)
            props.setAlertInfo({ message: "Download failed: " + message, severity: "error" })
        } finally {
            setLoadingIdx(-1)
            setProgress(zeroProgress)
        }
    }, [props.files])

    const deleteFile = useCallback(async (idx: number) => {
        if (!props.files[idx]) return
        const file = props.files[idx]

        try {
            setLoadingIdx(idx)
            await api.deleteFile(file)
            props.setAlertInfo({ message: "File deleted successfully", severity: "success" })
            props.loadFileList()
        } catch (err: any) {
            const message = `${err.response.status} - ${err.response.statusText}`
            console.error(message || err)
            props.setAlertInfo({ message: "Delete failed: " + message, severity: "error" })
        } finally {
            setLoadingIdx(-1)
        }
    }, [props.files])

    const toggleDetails = useCallback((idx: number) => {
        if (openIdx === idx) setOpenIdx(-1)
        else setOpenIdx(idx)
    }, [openIdx])

    return (
        <Box sx={{
            width: '80%',
            maxHeight: '100%',
            overflowY: 'scroll',
            flexGrow: 1,
            border: '1px solid #99c3ff',
        }}>

            <List>
                {/* List Header */}
                <ListItem sx={{ textAlign: 'center' }}>
                    <ListItemText sx={{ width: 150 }} primary="File Name" />
                    <ListItemText sx={{ width: 150 }} primary="File Size" />
                    <ListItemText sx={{ width: 150 }} primary="Actions" />
                </ListItem>
                <Divider />
                {/* List */}
                {
                    props.files.map((file, idx) =>
                        <Box key={idx}>
                            {/* File metadata */}
                            <ListItem>
                                <ListItemIcon>
                                    {getFileIcon(file.name)}
                                </ListItemIcon>
                                <ListItemText sx={{ width: 250 }} primary={file.name} />
                                <ListItemText sx={{ width: 150 }} primary={formatSize(file.size)} />

                                {/* File actions */}
                                <Tooltip title="Share" disableInteractive>
                                    <Button onClick={() => createLink(idx)}>
                                        <Link />
                                    </Button>
                                </Tooltip>

                                <Tooltip title="Download" disableInteractive>
                                    <Button onClick={() => downloadFile(idx)}>
                                        <Download />
                                    </Button>
                                </Tooltip>

                                <Tooltip title="Delete" disableInteractive>
                                    <Button onClick={() => deleteFile(idx)}>
                                        <Delete />
                                    </Button>
                                </Tooltip>

                                <Tooltip title="Details" disableInteractive>
                                    <Button onClick={() => toggleDetails(idx)}>
                                        {openIdx === idx ? <ExpandLess /> : <ExpandMore />}
                                    </Button>
                                </Tooltip>
                            </ListItem>
                            {loadingIdx === idx && <>
                                <LinearProgress variant="determinate" value={progress.value} />
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{progress.value}%</Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>estimate {`${progress.estimateSec}s`}</Typography>
                            </>
                            }

                            {/* File details */}
                            <Collapse in={openIdx == idx} timeout="auto">
                                <List component="div" disablePadding sx={{ pl: 4 }}>
                                    <ListItemText primary={"Uploaded on: " + new Date(file.added).toLocaleString()} />
                                </List>
                            </Collapse>
                        </Box>
                    )
                }
            </List>
        </Box>
    )
}

export default FilesView