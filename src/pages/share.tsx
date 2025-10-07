import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useSnackbar } from "notistack"
import ArrowBack from "@mui/icons-material/ArrowBack"
import Download from "@mui/icons-material/Download"
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from "@mui/material/Chip"
import Container from "@mui/material/Container"
import Divider from '@mui/material/Divider'
import Grid2 from "@mui/material/Grid2"
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { FileInfo, formatBytes, getErrorString, Progress, triggerDownload } from "../utilities/utils"
import api, { API_URL } from "../networking/endpoints"
import ProgressBar from "../components/progress_bar"
import { DecryptFileLink } from "../utilities/crypto"
import { Logo } from "../components/logo"

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
            const fileKey = hash.slice(1)
            if (fileKey) {
                // Decrypt file with URL file key
                const decryptedFile = await DecryptFileLink(fileKey, file, resp.data)
                triggerDownload(file.name, decryptedFile)
            } else {
                // Download plaintext file
                triggerDownload(file.name, new File([resp.data], file.name))
            }
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

    const fileKey = hash.slice(1)
    return (
        <Container maxWidth="xl">
            <Grid2 container justifyContent="center">
                <Grid2 size={{ lg: 7, md: 10, sm: 12, xs: 12 }} component={Card} padding="1em" marginTop="2em">
                    {loading && <LinearProgress variant="indeterminate" />}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <IconButton onClick={() => navigate('/login')}><ArrowBack /></IconButton>
                        <Typography variant="h5">{file?.name}</Typography>
                        <Logo width={30} height={30} />
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
                            <Stack gap={1}>
                                <Grid2 container spacing={2} justifyContent="center" sx={{ flexDirection: { xs: "column", lg: "row" } }}>
                                    <Grid2 size={{ lg: 3, md: 4, sm: 6, xs: "auto" }} flexDirection="row">
                                        <Typography variant="body1">Uploaded on:</Typography>
                                        <Chip label={new Date(file?.added || 0).toLocaleDateString()} color="info" variant="outlined" />
                                    </Grid2>
                                    <Divider orientation="vertical" sx={{ mx: 2 }} flexItem />

                                    <Grid2 size={{ lg: 3, md: 4, sm: 6, xs: "auto" }} direction="row">
                                        <Typography variant="body1">Size:</Typography>
                                        <Chip label={formatBytes(file?.size || 0)} color="info" variant="outlined" />
                                    </Grid2>
                                    <Divider orientation="vertical" sx={{ mx: 2 }} flexItem />

                                    <Grid2 size={{ lg: 3, md: 4, sm: 6, xs: "auto" }} direction="row">
                                        <Typography variant="body1">Type:</Typography>
                                        <Chip label={file.type || "Unknown"} color="info" variant="outlined" />
                                    </Grid2>
                                </Grid2>

                                <Stack direction="row" gap={2} alignItems="center">
                                    <Typography variant="body1">Decryption Key:</Typography>
                                    <Typography variant="body1" color={fileKey ? "info" : "warning"}>{fileKey || "None (not encrypted)"}</Typography>
                                </Stack>
                            </Stack>
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

                            {/* TODO: End-to-End encrypted videos can't be streamed for now */}
                            {file.type === "video/mp4" && fileKey === "" &&
                                <video style={{ maxWidth: '50vw', maxHeight: '75vh' }}
                                    controls
                                    src={`${API_URL}/link_download?access_key=${params.access_key}`}>
                                </video>
                            }
                        </CardContent>
                    }
                </Grid2>
            </Grid2>
        </Container>
    )
}

export default LinkShare