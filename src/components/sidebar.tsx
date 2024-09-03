
import { useCallback, useState } from "react"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, Stack, Typography } from "@mui/material"
import { Cancel, Upload, UploadFile } from "@mui/icons-material"
import viteLogo from '/vite.svg'
import { FileInfo } from "./files"
import api from "../networking/endpoints"
import { calculateSizePercentageUsed, calculateSizeUsed, Feedback } from "../utilities/utils"

type IProps = {
    files: Array<FileInfo>;
    loadFileList: () => void;
    setAlertInfo: (info: Feedback) => void;
}

const zeroProgress = {
    estimateSec: 0,
    value: 0
}

function Sidebar(props: IProps) {
    const [fileModalOpen, setFileModalOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>()
    const [progress, setProgress] = useState(zeroProgress)

    const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFile(event.target?.files?.[0])
    }, [])

    const handleCancel = useCallback(() => {
        setFileModalOpen(false)
        setSelectedFile(null)
    }, [])

    const uploadFile = useCallback(async () => {
        try {
            await api.uploadFile(selectedFile as File, setProgress)
            handleCancel()
            props.loadFileList()
            props.setAlertInfo({ message: "File uploaded successfully", severity: "success" })
        } catch (err: any) {
            const message = `${err.response.status} - ${err.response.statusText}`
            console.error(message || err)
            props.setAlertInfo({ message: "Upload failed: " + message, severity: "error" })
        } finally {
            setProgress(zeroProgress)
        }
    }, [selectedFile])

    return (
        <Stack spacing={5}
            direction="column"
            alignItems="center"
            sx={{ paddingX: 2 }}>

            <a href="https://vitejs.dev" target="_blank">
                <img src={viteLogo} className="logo" alt="Vite logo" />
            </a>
            <Box sx={{ width: '100%' }}>
                <Typography>Space used:</Typography>
                <Typography>{calculateSizeUsed(props.files)} MiB/1,000 MiB</Typography>
                <LinearProgress variant="determinate" value={calculateSizePercentageUsed(calculateSizeUsed(props.files), 1000)} />
            </Box>

            <Button variant="contained"
                startIcon={<Upload />}
                onClick={() => setFileModalOpen(true)}>
                Upload
            </Button>

            <Dialog open={fileModalOpen}
                fullWidth={true}
                onClose={() => setFileModalOpen(false)}
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
                    {progress.value > 0 &&
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                            <LinearProgress variant="determinate" value={progress.value} />
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{progress.value}%</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>estimate {`${progress.estimateSec}s`}</Typography>
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

        </Stack>
    )
}

export default Sidebar