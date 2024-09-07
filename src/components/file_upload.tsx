import { Cancel, UploadFile } from "@mui/icons-material"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, Typography } from "@mui/material"
import { formatSize, getErrorString, Progress } from "../utilities/utils"
import { useCallback, useState } from "react"
import api from "../networking/endpoints"
import { useSnackbar } from "notistack"

type IProps = {
    open: boolean;
    closeDialog: () => void;
    loadFileList: () => void;
}

function FileUploadDialog(props: IProps) {
    const { enqueueSnackbar } = useSnackbar()
    const [selectedFile, setSelectedFile] = useState<File | null>()
    const [progress, setProgress] = useState<Progress | null>()

    const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFile(event.target?.files?.[0])
    }, [])

    const handleCancel = useCallback(() => {
        props.closeDialog()
        setSelectedFile(null)
    }, [])

    const uploadFile = useCallback(async () => {
        try {
            await api.uploadFile(selectedFile as File, setProgress)
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
            onClose={props.closeDialog}
            aria-labelledby="file-dialog-title"
            aria-describedby="file-dialog-description">
            <DialogTitle id="file-dialog-title">Select file</DialogTitle>
            <DialogContent>
                <DialogContentText id="file-dialog-description">
                    Select a file to upload to store on the cloud.
                </DialogContentText>
                <Button variant="contained" component="label" disabled={Boolean(selectedFile?.name)}>
                    {selectedFile?.name ?? "Select File"}
                    {/* Bind the handler to the input */}
                    <input onChange={handleFile} type="file" hidden />
                </Button>
                {progress &&
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <LinearProgress variant="determinate" value={progress.percentage} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{progress.percentage}%</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>estimate {`${progress.estimateSec}s`}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>processed {formatSize(progress.bytesProcessed)}</Typography>
                    </Box>
                }
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