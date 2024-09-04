
import { useCallback, useState } from "react"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, LinearProgress, Stack, Switch, Typography, useColorScheme } from "@mui/material"
import { Cancel, Upload, UploadFile } from "@mui/icons-material"
import { EnqueueSnackbar } from "notistack"
import viteLogo from '/vite.svg'
import api from "../networking/endpoints"
import { calculateSizePercentageUsed, calculateSizeUsed, FileInfo, getErrorString, Progress } from "../utilities/utils"

type IProps = {
    files: Array<FileInfo>;
    loadFileList: () => void;
    enqueueSnackbar: EnqueueSnackbar;
}

function Sidebar(props: IProps) {
    const { mode, setMode } = useColorScheme()
    const [fileModalOpen, setFileModalOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>()
    const [progress, setProgress] = useState<Progress | null>()

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
            props.enqueueSnackbar("File uploaded successfully", { variant: "success" })
        } catch (err: any) {
            const error = getErrorString(err)
            console.error(error)
            props.enqueueSnackbar("Upload failed: " + error, { variant: "error" })
        } finally {
            setProgress(null)
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

            {mode &&
                <FormControlLabel checked={mode === 'dark'}
                    onChange={() => setMode(mode === 'light' ? 'dark' : 'light')}
                    control={<Switch color="primary" />}
                    label={mode}
                    labelPlacement="top"
                />
            }

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
                    {progress &&
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