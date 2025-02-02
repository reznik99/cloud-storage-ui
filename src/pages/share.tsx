import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useSnackbar } from "notistack"
import { ArrowBack, Download } from "@mui/icons-material"
import { Alert, AlertTitle, Box, Button, Card, CardContent, Divider, IconButton, LinearProgress, Stack, Typography } from "@mui/material"
import { FileInfo, formatBytes, getErrorString, Progress, triggerDownload } from "../utilities/utils"
import api, { API_URL } from "../networking/endpoints"
import logo from '/logo.png'
import ProgressBar from "../components/progress_bar"
import { DecryptFileLink } from "../utilities/crypto"

function LinkShare() {
    const navigate = useNavigate()
    const { hash } = useLocation()

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
            // Download encrypted file with link access_key
            const resp = await api.downloadLink(params.access_key as string, setProgress, controller.current.signal)
            // Decrypt file with URL file key
            const fileKey = hash.slice(1)
            const decryptedFile = await DecryptFileLink(fileKey, file, resp.data)
            // Trigger download
            triggerDownload(file.name, decryptedFile)
            enqueueSnackbar("File downloaded successfully", { variant: "success" })
        } catch (err: unknown) {
            const error = getErrorString(err)
            console.error(error)
            enqueueSnackbar("File download failed: " + error, { variant: "error" })
        } finally {
            setLoading(false)
            setProgress(null)
        }
    }, [file, hash, params.access_key, enqueueSnackbar])

    useEffect(() => {
        loadLinkInfo()
    }, [loadLinkInfo])

    return (
        <Stack sx={{ alignItems: 'center', mt: 5 }}>
            {/* Loader */}
            {loading &&
                <Box sx={{ width: '50%' }}>
                    <LinearProgress variant="indeterminate" />
                </Box>
            }
            <Card sx={{ padding: 5, width: '50%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <IconButton onClick={() => navigate('/login')}><ArrowBack /></IconButton>
                    <Typography variant="h5">{file?.name}</Typography>
                    <img src={logo} style={{ maxHeight: 40 }} />
                </Box>
                <Divider sx={{ mt: 2 }} />

                {(!file && !loading) &&
                    <Alert severity="error" variant="standard" sx={{ mt: 2 }}>
                        <AlertTitle>File not found</AlertTitle>
                        <Typography variant="body2">This link is either invalid or no longer available</Typography>
                    </Alert>
                }
                {file &&
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box>
                            <Typography variant="body1">Uploaded on: {new Date(file?.added || 0).toLocaleDateString()}</Typography>
                            <Typography variant="body1">Size: {formatBytes(file?.size || 0)}</Typography>
                            <Typography variant="body1">Type: {file.type || "Unknown"}</Typography>
                            <Typography variant="body1">Decryption Key: {hash.slice(1) || "Unknown"}</Typography>
                        </Box>
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
                        {/* TODO: This stopped working with end-to-end encryption */}
                        {file.type === "video/mp4" &&
                            <video controls
                                src={`${API_URL}/link_download?access_key=${params.access_key}`}>
                            </video>
                        }
                    </CardContent>
                }
            </Card>
        </Stack>
    )
}

export default LinkShare