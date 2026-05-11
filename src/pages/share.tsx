import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Download from '@mui/icons-material/Download';
import Lock from '@mui/icons-material/Lock';
import LockOpen from '@mui/icons-material/LockOpen';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { FileInfo, formatBytes, getErrorString, Progress, triggerDownload } from '../utilities/utils';
import api, { API_URL } from '../networking/endpoints';
import ProgressBar from '../components/progress_bar';
import { DecryptFileLink } from '../utilities/crypto';
import { Logo } from '../components/logo';

function LinkShare() {
    const navigate = useNavigate();
    const { hash } = useLocation();

    const { enqueueSnackbar } = useSnackbar();
    const params = useParams();
    const [loading, setLoading] = useState<boolean>(false);
    const [decrypting, setDecrypting] = useState<boolean>(false);
    const [file, setFile] = useState<FileInfo | null>();
    const [progress, setProgress] = useState<Progress | null>();
    const controller = useRef(new AbortController());

    const loadLinkInfo = useCallback(async () => {
        try {
            setLoading(true);
            const resp = await api.previewLink(params.access_key as string);
            setFile(resp.data as FileInfo);
        } catch (err: unknown) {
            const error = getErrorString(err);
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [params]);

    const downloadLink = useCallback(async () => {
        if (!file) return;
        controller.current = new AbortController();
        try {
            setLoading(true);
            // Download encrypted file with link access_key
            const resp = await api.downloadLink(params.access_key as string, setProgress, controller.current.signal);
            const fileKey = hash.slice(1);
            if (fileKey) {
                // Decrypt file with URL file key
                setDecrypting(true);
                const decryptedFile = await DecryptFileLink(fileKey, file, resp.data);
                triggerDownload(file.name, decryptedFile);
            } else {
                // Download plaintext file
                triggerDownload(file.name, new File([resp.data], file.name));
            }
            enqueueSnackbar('File downloaded successfully', { variant: 'success' });
        } catch (err: unknown) {
            const error = getErrorString(err);
            console.error(error);
            enqueueSnackbar('File download failed: ' + error, { variant: 'error' });
        } finally {
            setLoading(false);
            setDecrypting(false);
            setProgress(null);
        }
    }, [file, hash, params.access_key, enqueueSnackbar]);

    useEffect(() => {
        loadLinkInfo();
    }, [loadLinkInfo]);

    const fileKey = hash.slice(1);
    return (
        <Container maxWidth="xl">
            <Grid container justifyContent="center">
                <Grid size={{ lg: 7, md: 10, sm: 12, xs: 12 }} component={Card} padding="1em" marginTop="2em">
                    {loading && <LinearProgress variant="indeterminate" />}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <IconButton onClick={() => navigate('/login')}>
                            <ArrowBack />
                        </IconButton>
                        <Typography variant="h5">{file?.name}</Typography>
                        <Logo width={30} height={30} />
                    </Box>
                    <Divider sx={{ mt: 2 }} />

                    {!file && !loading && (
                        <Alert severity="error" variant="standard" sx={{ mt: 2 }}>
                            <AlertTitle>File not found</AlertTitle>
                            <Typography variant="body2">This link is either invalid or no longer available</Typography>
                        </Alert>
                    )}
                    {file && (
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Alert
                                severity={fileKey ? 'success' : 'warning'}
                                icon={fileKey ? <Lock fontSize="inherit" /> : <LockOpen fontSize="inherit" />}
                                variant="outlined"
                            >
                                <AlertTitle>{fileKey ? 'End-to-end encrypted' : 'Not encrypted'}</AlertTitle>
                                {fileKey ? (
                                    <Typography variant="body2">
                                        Decryption happens entirely in your browser. The server only stores ciphertext — the
                                        decryption key lives in this URL's fragment (after <code>#</code>) and is never sent
                                        over the network.
                                    </Typography>
                                ) : (
                                    <Typography variant="body2">
                                        This file is not encrypted. Treat the contents as public.
                                    </Typography>
                                )}
                            </Alert>

                            <Stack gap={1}>
                                <Grid
                                    container
                                    spacing={2}
                                    justifyContent="center"
                                    sx={{ flexDirection: { xs: 'column', lg: 'row' } }}
                                >
                                    <Grid size={{ lg: 3, md: 4, sm: 6, xs: 'auto' }} flexDirection="row">
                                        <Typography variant="body1">Uploaded on:</Typography>
                                        <Chip
                                            label={new Date(file?.added || 0).toLocaleDateString()}
                                            color="info"
                                            variant="outlined"
                                        />
                                    </Grid>
                                    <Divider orientation="vertical" sx={{ mx: 2 }} flexItem />

                                    <Grid size={{ lg: 3, md: 4, sm: 6, xs: 'auto' }} direction="row">
                                        <Typography variant="body1">Size:</Typography>
                                        <Chip label={formatBytes(file?.size || 0)} color="info" variant="outlined" />
                                    </Grid>
                                    <Divider orientation="vertical" sx={{ mx: 2 }} flexItem />

                                    <Grid size={{ lg: 3, md: 4, sm: 6, xs: 'auto' }} direction="row">
                                        <Typography variant="body1">Type:</Typography>
                                        <Chip label={file.type || 'Unknown'} color="info" variant="outlined" />
                                    </Grid>
                                </Grid>

                                <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
                                    <Typography variant="body1">Decryption key:</Typography>
                                    {fileKey ? (
                                        <Typography
                                            variant="body2"
                                            color="success.main"
                                            sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                                        >
                                            {fileKey}
                                        </Typography>
                                    ) : (
                                        <Typography variant="body2" color="warning.main">
                                            None (not encrypted)
                                        </Typography>
                                    )}
                                </Stack>
                            </Stack>
                            <Button variant="outlined" onClick={downloadLink} disabled={loading} startIcon={<Download />}>
                                Download
                            </Button>
                            {progress && (
                                <ProgressBar
                                    sx={{ mt: 2 }}
                                    onCancel={() => controller.current.abort()}
                                    progress={progress}
                                    file={file}
                                />
                            )}
                            {decrypting && (
                                <Stack direction="row" gap={1.5} alignItems="center" justifyContent="center">
                                    <CircularProgress size={16} color="success" />
                                    <Typography variant="body2" color="success.main">
                                        Decrypting locally in your browser…
                                    </Typography>
                                </Stack>
                            )}

                            {/* TODO: End-to-End encrypted videos can't be streamed for now */}
                            {file.type === 'video/mp4' && fileKey === '' && (
                                <video
                                    style={{ maxWidth: '50vw', maxHeight: '75vh' }}
                                    controls
                                    src={`${API_URL}/link_download?access_key=${params.access_key}`}
                                ></video>
                            )}
                        </CardContent>
                    )}
                </Grid>
            </Grid>
        </Container>
    );
}

export default LinkShare;
