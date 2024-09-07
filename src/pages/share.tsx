import { useCallback, useEffect, useState } from "react"
import { useSnackbar } from "notistack"
import { ArrowBack, Download } from "@mui/icons-material"
import { Button, Card, CardContent, FormControl, FormLabel, IconButton, LinearProgress, Stack, TextField, Typography } from "@mui/material"
import { FileInfo, formatSize, getErrorString, Progress, triggerDownload } from "../utilities/utils"
import api from "../networking/endpoints"
import { useNavigate, useParams } from "react-router-dom"

function LinkShare() {
    const navigate = useNavigate()
    const { enqueueSnackbar } = useSnackbar()
    const params = useParams();
    const [loading, setLoading] = useState<boolean>(false)
    const [file, setFile] = useState<FileInfo | null>()
    const [progress, setProgress] = useState<Progress | null>()

    useEffect(() => {
        loadLinkInfo()
    }, [])

    const loadLinkInfo = useCallback(async () => {
        try {
            setLoading(true)
            const resp = await api.previewLink(params.access_key as string)
            setFile(resp.data as FileInfo)
            console.log(resp.data)
        } catch (err: any) {
            const error = getErrorString(err)
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [params])

    const downloadLink = useCallback(async () => {
        if (!file) return
        try {
            setLoading(true)
            const resp = await api.downloadLink(params.access_key as string, setProgress)
            triggerDownload(file.name, resp.data)
            enqueueSnackbar("File downloaded successfully", { variant: "success" })
        } catch (err: any) {
            const error = getErrorString(err)
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [file])

    return (
        <Stack sx={{ alignItems: 'center', mt: 5 }}>
            <Card sx={{ padding: 5, width: '50%' }}>
                <IconButton onClick={() => navigate('/login')}><ArrowBack /></IconButton>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                    <Typography variant="h4">{file?.name}</Typography>
                    <FormControl>
                        <FormLabel htmlFor="password">Decryption Password (optional)</FormLabel>
                        <TextField fullWidth
                            name="password"
                            type="password"
                            id="password"
                            placeholder="••••••"
                            variant="outlined"
                            color="primary" />
                    </FormControl>
                    <Button onClick={downloadLink}
                        disabled={loading}
                        startIcon={<Download />}>
                        Download
                    </Button>
                    {progress && <>
                        <LinearProgress variant="determinate" value={progress.percentage} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{progress.percentage}%</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>estimate {`${progress.estimateSec}s`}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>processed {formatSize(progress.bytesProcessed)}</Typography>
                    </>}
                </CardContent>

                {loading && <LinearProgress variant="indeterminate" />}
            </Card>
        </Stack>
    )
}

export default LinkShare