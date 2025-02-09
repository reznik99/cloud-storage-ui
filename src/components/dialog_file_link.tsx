import axios from "axios"
import { useCallback, useEffect, useState } from "react"
import { EnqueueSnackbar, useSnackbar } from "notistack"
import Add from "@mui/icons-material/Add"
import Cancel from "@mui/icons-material/Cancel"
import Delete from "@mui/icons-material/Delete"
import InsertLink from "@mui/icons-material/InsertLink"
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { assembleShareLink, FileInfo, getErrorString, localDateTime, } from "../utilities/utils"
import { DecryptFileKey } from "../utilities/crypto"
import api from "../networking/endpoints"
type IProps = {
    open: boolean;
    file: FileInfo;
    closeDialog: () => void;
}

function FileLinkDialog(props: IProps) {
    const { enqueueSnackbar } = useSnackbar()
    const [loading, setLoading] = useState(true)
    const [link, setLink] = useState<Link | null>()

    const loadLink = useCallback(async () => {
        try {
            setLoading(true)
            const resp = await api.getLink(props.file)
            const fileKey = props.file.wrapped_file_key
                ? await DecryptFileKey(props.file.wrapped_file_key)
                : ""
            const link: Link = {
                access_count: resp.data.access_count,
                access_key: resp.data.access_key,
                file_id: resp.data.file_id,
                created_by: resp.data.created_by,
                created_at: resp.data.created_at,
                file_key: fileKey
            }
            setLink(link)
        } catch (err: unknown) {
            if (!axios.isAxiosError(err) || err.status !== 404) {
                const error = getErrorString(err)
                console.error(error)
                enqueueSnackbar(error, { variant: "error" })
            }
        } finally {
            setLoading(false)
        }
    }, [props.file, enqueueSnackbar])

    const createLink = useCallback(async () => {
        try {
            setLoading(true)
            const resp = await api.createLink(props.file)
            const fileKey = props.file.wrapped_file_key
                ? await DecryptFileKey(props.file.wrapped_file_key)
                : ""
            const link: Link = {
                access_count: resp.data.access_count,
                access_key: resp.data.access_key,
                file_id: resp.data.file_id,
                created_by: resp.data.created_by,
                created_at: resp.data.created_at,
                file_key: fileKey
            }
            setLink(link)
            enqueueSnackbar("File link created successfully", { variant: "success" })
        } catch (err: unknown) {
            const error = getErrorString(err)
            console.error(error)
            enqueueSnackbar("Failed to generate link: " + error, { variant: "error" })
        } finally {
            setLoading(false)
        }
    }, [props.file, enqueueSnackbar])

    const deleteLink = useCallback(async () => {
        try {
            setLoading(true)
            await api.deleteLink(props.file)
            setLink(null)
            enqueueSnackbar("File link deleted successfully", { variant: "success" })
        } catch (err: unknown) {
            const error = getErrorString(err)
            console.error(error)
            enqueueSnackbar("Failed to delete link: " + error, { variant: "error" })
        } finally {
            setLoading(false)
        }
    }, [props.file, enqueueSnackbar])

    useEffect(() => {
        if (props.file?.name) {
            loadLink()
        }
        return () => {
            setLink(null)
        }
    }, [props.file, loadLink])

    return (
        <Dialog open={props.open}
            fullWidth={true}
            keepMounted={true}
            maxWidth="md"
            onClose={props.closeDialog}
            aria-labelledby="link-dialog-title"
            aria-describedby="link-dialog-description">
            <DialogTitle id="link-dialog-title">Share '{props?.file?.name}'</DialogTitle>
            <DialogContent>
                <DialogContentText id="link-dialog-description">
                    Share your files with friends by creating a secure link.
                </DialogContentText>
                <DialogContentText id="link-dialog-description-2">
                    The recipient will be able to download the file without requiring an account!
                </DialogContentText>

                {!link &&
                    <Button sx={{ marginY: 3 }}
                        startIcon={<Add />}
                        onClick={createLink}>
                        Create link
                    </Button>
                }

                <List>
                    {loading
                        ? <CircularProgress />
                        : link
                            ? <Link link={link} deleteLink={deleteLink} enqueueSnackbar={enqueueSnackbar} />
                            : <Alert severity="info">
                                <AlertTitle>This file is <b>not</b> currently being shared.</AlertTitle>
                            </Alert>
                    }
                </List>
            </DialogContent>
            <DialogActions>
                <Button variant="text"
                    startIcon={<Cancel />}
                    onClick={props.closeDialog}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    )
}

type Link = {
    access_key: string;
    access_count: number;
    file_id: number;
    created_by: number;
    created_at: string;
    file_key: string;
}

type LinkProps = {
    link: Link;
    deleteLink: () => void;
    enqueueSnackbar: EnqueueSnackbar;
}

function Link(props: LinkProps) {
    const shareLink = assembleShareLink(props.link.access_key, props.link.file_key)
    return (
        <Box>
            <ListItem>
                <ListItemIcon><InsertLink /></ListItemIcon>
                <ListItemButton sx={{ overflowWrap: "break-all" }} onClick={() => {
                    navigator.clipboard.writeText(shareLink)
                    props.enqueueSnackbar("Copied URL to clipboard!")
                }}>
                    {shareLink.split("#")[0] + " #" + shareLink.split("#")[1]}
                </ListItemButton>
                <Tooltip title="Delete" disableInteractive>
                    <Button onClick={props.deleteLink}>
                        <Delete />
                    </Button>
                </Tooltip>
            </ListItem>
            <Alert severity="success">
                <AlertTitle>This file is currently being shared!</AlertTitle>
                <Typography>Shared since: {localDateTime(new Date(props.link.created_at), true)}</Typography>
                <Typography>Downloads: {props.link.access_count}</Typography>
            </Alert>
        </Box>

    )
}

export default FileLinkDialog