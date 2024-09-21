import { useCallback, useRef, useState } from "react"
import { Cancel, Delete, Download, ExpandLess, ExpandMore, Link } from "@mui/icons-material"
import { Box, Button, Collapse, Divider, List, ListItem, ListItemIcon, ListItemText, Tooltip, Typography } from "@mui/material"
import { useSnackbar } from "notistack"
import { FileInfo, formatSize, getErrorString, getFileIcon, Progress, triggerDownload } from "../utilities/utils"
import api from "../networking/endpoints"
import emptyDirectory from '/empty-box.png'
import FileLinkDialog from "./modal_file_link"
import ProgressBar from "./progress_bar"

type IProps = {
    files: Array<FileInfo>;
    loading: boolean;
    loadFileList: () => void;
}

function FilesView(props: IProps) {
    const { enqueueSnackbar } = useSnackbar()
    const [openIdx, setOpenIdx] = useState(-1)
    const [loadingIdx, setLoadingIdx] = useState(-1)
    const [linkDialogIdx, setLinkDialogIdx] = useState(-1)
    const [progress, setProgress] = useState<Progress | null>()
    const controller = useRef(new AbortController())

    const downloadFile = useCallback(async (idx: number) => {
        if (!props.files[idx]) return
        const file = props.files[idx]
        controller.current = new AbortController()
        try {
            setLoadingIdx(idx)
            const resp = await api.downloadFile(file, setProgress, controller.current.signal)
            triggerDownload(file.name, resp.data)
            enqueueSnackbar("File downloaded successfully", { variant: "success" })
        } catch (err: unknown) {
            const error = getErrorString(err)
            console.error(error)
            enqueueSnackbar("Download failed: " + error, { variant: "error" })
        } finally {
            setLoadingIdx(-1)
            setProgress(null)
        }
    }, [props.files, enqueueSnackbar])

    const deleteFile = useCallback(async (idx: number) => {
        if (!props.files[idx]) return
        const file = props.files[idx]

        try {
            setLoadingIdx(idx)
            await api.deleteFile(file)
            enqueueSnackbar("File deleted successfully", { variant: "success" })
            props.loadFileList()
        } catch (err: unknown) {
            const error = getErrorString(err)
            console.error(error)
            enqueueSnackbar("Delete failed: " + error, { variant: "error" })
        } finally {
            setLoadingIdx(-1)
        }
    }, [props, enqueueSnackbar])

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
        }}>

            <List sx={{ width: '100%', height: '100%' }}>
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
                                <ListItemIcon>{getFileIcon(file.name)}</ListItemIcon>
                                <ListItemText sx={{ width: 250 }} primary={file.name} />
                                <ListItemText sx={{ width: 150 }} primary={formatSize(file.size)} />

                                {/* File actions */}
                                <Tooltip title="Share" disableInteractive>
                                    <Button onClick={() => setLinkDialogIdx(idx)}>
                                        <Link />
                                    </Button>
                                </Tooltip>

                                {(loadingIdx === idx && progress)
                                    ? <Tooltip title="Cancel" disableInteractive>
                                        <Button onClick={() => controller.current.abort()}>
                                            <Cancel />
                                        </Button>
                                    </Tooltip>
                                    : <Tooltip title="Download" disableInteractive>
                                        <Button onClick={() => downloadFile(idx)}>
                                            <Download />
                                        </Button>
                                    </Tooltip>
                                }

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
                            {(loadingIdx === idx && progress) &&
                                <ProgressBar onCancel={() => controller.current.abort()}
                                    progress={progress}
                                    file={file}
                                />
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

                {!props.files.length &&
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <img src={emptyDirectory} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>No files</Typography>
                    </Box>
                }
            </List>

            <FileLinkDialog open={linkDialogIdx >= 0}
                file={props.files[linkDialogIdx]}
                closeDialog={() => setLinkDialogIdx(-1)} />
        </Box>
    )
}

export default FilesView