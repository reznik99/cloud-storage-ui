import { useCallback, useRef, useState } from "react"
import { Cancel, UploadFile } from "@mui/icons-material"
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material"
import { useSnackbar } from "notistack"
import { fileToFileInfo, getErrorString, Progress } from "../utilities/utils"
import api from "../networking/endpoints"
import ProgressBar from "./progress_bar"

type IProps = {
    open: boolean;
    closeDialog: () => void;
    loadFileList: () => void;
}

function FileUploadDialog(props: IProps) {
    const { enqueueSnackbar } = useSnackbar()
    const [selectedFile, setSelectedFile] = useState<File | null>()
    const [progress, setProgress] = useState<Progress | null>()
    const controller = useRef(new AbortController())

    const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFile(event.target?.files?.[0])
    }, [])

    const handleCancel = useCallback(() => {
        props.closeDialog()
        setSelectedFile(null)
        controller.current.abort()
        console.warn("Controller aborted")
    }, [])

    const uploadFile = useCallback(async () => {
        controller.current = new AbortController()
        console.info("Created controller")
        try {
            await api.uploadFile(selectedFile as File, setProgress, controller.current.signal)
            handleCancel()
            props.loadFileList()
            enqueueSnackbar("File uploaded successfully", { variant: "success" })
        } catch (err: any) {
            const error = getErrorString(err)
            console.error(error)
            enqueueSnackbar("Upload failed: " + error, { variant: "error" })
        } finally {
            setProgress(null)
        }
    }, [selectedFile])

    return (
        <Dialog open={props.open}
            fullWidth={true}
            onClose={handleCancel}
            aria-labelledby="file-dialog-title"
            aria-describedby="file-dialog-description">
            <DialogTitle id="file-dialog-title">Select file</DialogTitle>
            <DialogContent>
                <DialogContentText id="file-dialog-description">
                    Select a file to upload to store on the cloud.
                </DialogContentText>

                <Button variant={Boolean(selectedFile?.name) ? "contained" : "outlined"} component="label">
                    {selectedFile?.name ?? "Select File"}
                    <input onChange={handleFile} type="file" hidden />
                </Button>

                {progress && <ProgressBar sx={{ mt: 2 }} progress={progress} file={fileToFileInfo(selectedFile)} />}
            </DialogContent>
            <DialogActions>
                <Button variant="text"
                    startIcon={<Cancel />}
                    onClick={handleCancel}>
                    Cancel
                </Button>
                <Button variant="contained"
                    disabled={!selectedFile}
                    startIcon={<UploadFile />}
                    onClick={uploadFile} autoFocus>
                    Upload
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default FileUploadDialog