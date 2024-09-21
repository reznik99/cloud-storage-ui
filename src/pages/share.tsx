import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useSnackbar } from "notistack"
import { ArrowBack, Download } from "@mui/icons-material"
import { Alert, AlertTitle, Box, Button, Card, CardContent, Divider, FormControl, FormLabel, IconButton, LinearProgress, Stack, TextField, Typography } from "@mui/material"
import { FileInfo, formatSize, getErrorString, Progress, triggerDownload } from "../utilities/utils"
import api from "../networking/endpoints"
import logo from '/logo.png'
import ProgressBar from "../components/progress_bar"

function LinkShare() {
    const navigate = useNavigate()
    const { enqueueSnackbar } = useSnackbar()
    const params = useParams();
    const [loading, setLoading] = useState<boolean>(false)
    const [file, setFile] = useState<FileInfo | null>()
    const [progress, setProgress] = useState<Progress | null>()
    const controller = useRef(new AbortController())

    const loadLinkInfo = useCallback(async () => {
        try {
            setLoading(true)
            const resp = await api.previewLink(params.access_key as string)
            setFile(resp.data as FileInfo)
        } catch (err: unknown) {
            const error = getErrorString(err)
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [params])

    const downloadLink = useCallback(async () => {
        if (!file) return
        controller.current = new AbortController()
        try {
            setLoading(true)
            const resp = await api.downloadLink(params.access_key as string, setProgress, controller.current.signal)
            triggerDownload(file.name, resp.data)
            enqueueSnackbar("File downloaded successfully", { variant: "success" })
        } catch (err: unknown) {
            const error = getErrorString(err)
            console.error(error)
            enqueueSnackbar("File download failed: " + error, { variant: "error" })
        } finally {
            setLoading(false)
            setProgress(null)
        }
    }, [file, params.access_key, enqueueSnackbar])

    useEffect(() => {
        loadLinkInfo()
    }, [loadLinkInfo])
    
    return (
        <Stack sx={{ alignItems: 'center', mt: 5 }}>
            {/* Loader */}
            {loading && <Box sx={{ width: '50%' }}>
                <LinearProgress variant="indeterminate" />
            </Box>}
            <Card sx={{ padding: 5, width: '50%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <IconButton onClick={() => navigate('/login')}><ArrowBack /></IconButton>
                    <Typography variant="h5">{file?.name}</Typography>
                    <img src={logo} style={{ maxHeight: 40 }} />
                </Box>
                <Divider sx={{ mt: 2 }} />
                {file
                    ? <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box>
                            <Typography variant="body1">Uploaded on: {new Date(file?.added || 0).toLocaleDateString()}</Typography>
                            <Typography variant="body1">Size: {formatSize(file?.size || 0)}</Typography>
                        </Box>
                        <FormControl>
                            <FormLabel htmlFor="password">Decryption Password (optional)</FormLabel>
                            <TextField fullWidth
                                autoComplete='off'
                                name="password"
                                type="password"
                                id="password"
                                placeholder="••••••"
                                variant="outlined" />
                        </FormControl>
                        <Button variant="outlined"
                            onClick={downloadLink}
                            disabled={loading}
                            startIcon={<Download />}>
                            Download
                        </Button>
                        {progress && <ProgressBar sx={{ mt: 2 }}
                            onCancel={() => controller.current.abort()}
                            progress={progress}
                            file={file} />
                        }
                    </CardContent>
                    : !loading && <Alert severity="error" variant="standard" sx={{ mt: 2 }}>
                        <AlertTitle>File not found</AlertTitle>
                        <Typography variant="body2">This link is either invalid or no longer available</Typography>
                    </Alert>
                }
            </Card>
        </Stack>
    )
}

export default LinkShare