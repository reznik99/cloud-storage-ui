import axios from "axios"
import { useCallback, useEffect, useState } from "react"
import { EnqueueSnackbar, useSnackbar } from "notistack"
import { Add, Cancel, Delete, InsertLink } from "@mui/icons-material"
import { Alert, AlertTitle, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItem, ListItemButton, ListItemIcon, Tooltip, Typography } from "@mui/material"
import { assembleShareLink, FileInfo, getErrorString, localDateTime, } from "../utilities/utils"
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
            setLink(resp.data as Link)
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
            setLink(resp.data as Link)
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
                    <Button startIcon={<Add />} onClick={createLink}>
                        Create link
                    </Button>
                }

                <List>
                    {loading
                        ? <CircularProgress />
                        : link
                            ? <Link link={link} deleteLink={deleteLink} enqueueSnackbar={enqueueSnackbar} />
                            : <Alert severity="info">
                                <AlertTitle>This file is not currently being shared.</AlertTitle>
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
}

type LinkProps = {
    link: Link;
    deleteLink: () => void;
    enqueueSnackbar: EnqueueSnackbar;
}

function Link(props: LinkProps) {
    return (
        <Box>
            <ListItem>
                <ListItemIcon><InsertLink /></ListItemIcon>
                <ListItemButton onClick={() => {
                    navigator.clipboard.writeText(assembleShareLink(props.link.access_key))
                    props.enqueueSnackbar("Copied URL to clipboard!")
                }}>
                    {assembleShareLink(props.link.access_key)}
                </ListItemButton>
                <Tooltip title="Delete" disableInteractive>
                    <Button onClick={props.deleteLink}>
                        <Delete />
                    </Button>
                </Tooltip>
            </ListItem>
            <Alert severity="success">
                <AlertTitle>This file is available for sharing</AlertTitle>
                <Typography>Created on: {localDateTime(new Date(props.link.created_at), true)}</Typography>
                <Typography>Downloads: {props.link.access_count}</Typography>
            </Alert>
        </Box>

    )
}

export default FileLinkDialog