import { useCallback, useRef, useState } from "react"
import { useSnackbar } from "notistack"
import { Buffer } from "buffer"
import Cancel from "@mui/icons-material/Cancel"
import Delete from "@mui/icons-material/Delete"
import Download from "@mui/icons-material/Download"
import ExpandLess from "@mui/icons-material/ExpandLess"
import ExpandMore from "@mui/icons-material/ExpandMore"
import Link from "@mui/icons-material/Link"
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import FormLabel from '@mui/material/FormLabel'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { FileInfo, formatBytes, getErrorString, getFileIcon, localDateTime, Progress, triggerDownload } from "../utilities/utils"
import { DecryptFile } from "../utilities/crypto"
import emptyDirectory from '/empty-box.png'
import FileLinkDialog from "./dialog_file_link"
import ProgressBar from "./progress_bar"
import api from "../networking/endpoints"

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
            console.log("Data received:", resp.data)
            const decFile = await DecryptFile(Buffer.from(file.wrapped_file_key, 'base64'), file, resp.data)

            triggerDownload(decFile.name, decFile)
            enqueueSnackbar("File downloaded successfully", { variant: "success" })
        } catch (err: unknown) {
            const error = getErrorString(err)
            console.error(err)
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

            <List disablePadding sx={{ width: '100%', height: '100%' }}>
                {/* List Header */}
                <Paper elevation={6} square>
                    <ListItem sx={{ width: '100%', textAlign: 'center' }}>
                        <Stack width='100%'
                            direction='row'
                            justifyContent='space-between'>
                            <ListItemText primary="File Name" />
                            <ListItemText primary="File Size" />
                            <ListItemText primary="Actions" />
                        </Stack>
                    </ListItem>
                </Paper>
                {/* List */}
                <Paper elevation={3} square>
                    <Divider><Chip label={`${props.files?.length || 0} files`} size="small" /></Divider>
                    {
                        props.files.map((file, idx) =>
                            <Box key={idx}>
                                {/* File metadata */}
                                <ListItem>
                                    <ListItemIcon>{getFileIcon(file.name)}</ListItemIcon>
                                    <ListItemText sx={{ width: 250 }} primary={file.name} />
                                    <ListItemText sx={{ width: 150 }} primary={formatBytes(file.size)} />

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
                                            <Button onClick={() => downloadFile(idx)} color="success">
                                                <Download />
                                            </Button>
                                        </Tooltip>
                                    }

                                    <Tooltip title="Delete" disableInteractive>
                                        <Button onClick={() => deleteFile(idx)} color="error">
                                            <Delete />
                                        </Button>
                                    </Tooltip>

                                    <Tooltip title="Details" disableInteractive>
                                        <Button onClick={() => toggleDetails(idx)} color="secondary">
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
                                <Collapse in={openIdx == idx} timeout="auto" sx={{ textAlign: 'center' }}>
                                    <Paper sx={{ padding: 2 }}>
                                        <FormLabel>
                                            Uploaded on: <Chip label={localDateTime(new Date(file.added), true)} />
                                        </FormLabel>
                                    </Paper>
                                </Collapse>
                            </Box>
                        )
                    }
                </Paper>

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