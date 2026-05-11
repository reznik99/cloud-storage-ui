import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Cancel from '@mui/icons-material/Cancel';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import Mail from '@mui/icons-material/Mail';
import FileUpload from '@mui/icons-material/FileUpload';

import api from '../networking/endpoints';
import { Feedback, getErrorString } from '../utilities/utils';
import { saveCreds } from '../store/reducer';
import { RootState } from '../store/store';
import { Logo } from '../components/logo';

function Login() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector((store: RootState) => store.user);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>();
    const [emailAddress, setEmailAddress] = useState(user.emailAddress || '');
    const [emailError, setEmailError] = useState('');
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [dialogLoading, setDialogLoading] = useState(false);
    const [showResetDialog, setShowResetDialog] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const resetFeedback = () => {
        setFeedback(null);
        setEmailError('');
        setPasswordError('');
    };

    const checkValues = useCallback(() => {
        if (!emailAddress.trim()) setEmailError('Email is required');
        else if (!password.trim()) setPasswordError('Password is required');
        else return true;
        return false;
    }, [emailAddress, password]);

    const login = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            resetFeedback();
            try {
                setLoading(true);
                if (!checkValues()) return;
                const resp = await api.login(emailAddress, password);
                dispatch(
                    saveCreds({
                        emailAddress: resp.emailAddress,
                        createdAt: resp.createdAt,
                        lastSeen: resp.lastSeen,
                        password: password,
                        mEncKey: resp.mEncKey,
                        hAuthKey: resp.hAuthKey,
                        wrappedAccountKey: resp.wrappedAccountKey,
                        clientRandomValue: resp.clientRandomValue,
                        allowedStorage: resp.allowedStorage,
                    }),
                );
                navigate('/dashboard');
            } catch (err: unknown) {
                const error = getErrorString(err);
                console.error(error);
                setFeedback({ message: error, severity: 'error' });
            } finally {
                setLoading(false);
            }
        },
        [emailAddress, password, checkValues, navigate, dispatch],
    );

    const requestPasswordReset = useCallback(async () => {
        setDialogLoading(true);
        try {
            await api.requestResetPassword(emailAddress);
            setFeedback({
                message: "Password reset email has been sent. If you can't find it make sure you check the spam folder.",
                severity: 'success',
            });
        } catch (err: unknown) {
            const error = getErrorString(err);
            console.error(error);
            setFeedback({ message: error, severity: 'error' });
        } finally {
            setDialogLoading(false);
            setShowResetDialog(false);
        }
    }, [emailAddress]);

    console.debug('Supports showSaveFilePicker', 'showSaveFilePicker' in window);
    return (
        <Container maxWidth="xl">
            <Grid
                container
                columnSpacing={{ lg: 5, md: 3, sm: 1, xs: 1 }}
                rowSpacing={2}
                margin="4vw"
                justifyContent="center"
            >
                <Grid size={{ lg: 7, md: 6, sm: 12, xs: 12 }}>
                    <Card sx={{ padding: 5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography component="h1" variant="h4">
                                Log in
                            </Typography>
                            <Logo width={50} height={50} />
                        </Box>

                        <Box
                            component="form"
                            onSubmit={login}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 3,
                                my: 3,
                            }}
                        >
                            <FormControl>
                                <FormLabel htmlFor="email">Email Address</FormLabel>
                                <TextField
                                    fullWidth
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    placeholder="your@email.com"
                                    variant="outlined"
                                    color="primary"
                                    value={emailAddress}
                                    error={!!emailError}
                                    helperText={emailError}
                                    onChange={e => setEmailAddress(e.target.value)}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel htmlFor="password">Password</FormLabel>
                                <TextField
                                    fullWidth
                                    name="password"
                                    type="password"
                                    id="password"
                                    autoComplete="current-password"
                                    placeholder="••••••"
                                    variant="outlined"
                                    color="primary"
                                    value={password}
                                    error={!!passwordError}
                                    helperText={passwordError}
                                    onChange={e => setPassword(e.target.value)}
                                />
                                <Stack direction="row" marginTop={2}>
                                    <Button
                                        variant="text"
                                        size="small"
                                        onClick={() => setShowResetDialog(true)}
                                        sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
                                    >
                                        Forgot Password?
                                    </Button>
                                </Stack>
                            </FormControl>

                            <Stack direction="row" justifyContent="center">
                                <Button variant="contained" type="submit" disabled={loading} endIcon={<LoginOutlined />}>
                                    Log in
                                </Button>
                            </Stack>
                        </Box>

                        <Divider sx={{ mb: 3 }}>Don't have an account?</Divider>

                        <Stack direction="row" justifyContent="center">
                            <Button variant="outlined" onClick={() => navigate('/signup')}>
                                Create new account
                            </Button>
                        </Stack>
                    </Card>
                    <Box>
                        {feedback && (
                            <Alert severity={feedback.severity}>
                                <AlertTitle>{feedback.message}</AlertTitle>
                            </Alert>
                        )}
                        {loading && <LinearProgress variant="indeterminate" />}
                    </Box>
                </Grid>
                <Grid size={{ lg: 5, md: 6, sm: 12, xs: 12 }}>
                    <Alert variant="standard" severity="info" icon={false}>
                        <AlertTitle>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    width: '100%',
                                }}
                            >
                                <Logo width={100} height={100} />
                                {/* Text */}
                                <Box>
                                    <Box
                                        component="span"
                                        sx={{
                                            fontSize: '3rem',
                                            fontWeight: 600,
                                            color: 'primary.main',
                                            opacity: 0,
                                            animation: 'fadeIn 0.7s ease forwards 0.7s',
                                        }}
                                    >
                                        G-Storage
                                    </Box>
                                    <Box
                                        component="span"
                                        sx={{
                                            display: 'block',
                                            fontSize: '2rem',
                                            color: 'text.secondary',
                                            opacity: 0,
                                            animation: 'fadeIn 1s ease forwards 1s',
                                        }}
                                    >
                                        End-to-end encrypted
                                    </Box>
                                </Box>
                            </Box>
                            <Typography variant="h6" mt={2}>
                                End-To-End encrypted file storage based on the
                                <Link to="https://mega.nz/SecurityWhitepaper.pdf" target="_blank" component={RouterLink}>
                                    {' '}
                                    Mega.nz whitepaper
                                </Link>
                                .
                            </Typography>
                        </AlertTitle>
                        <ul>
                            <li>
                                <Typography variant="subtitle2">1 GB storage per account</Typography>
                            </li>
                            <li>
                                <Typography variant="subtitle2">End-to-end encryption</Typography>
                            </li>
                            <li>
                                <Typography variant="subtitle2">Shareable download links — no account required</Typography>
                            </li>
                            <li>
                                <Typography variant="subtitle2">Open source</Typography>
                            </li>
                        </ul>
                    </Alert>

                    <Alert variant="standard" severity="info" icon={false}>
                        <AlertTitle>
                            <Typography variant="h6">Need to share files directly?</Typography>
                        </AlertTitle>
                        <Typography>
                            Share files with <b>server-less peer-to-peer</b> file sharing!
                        </Typography>
                        <ul>
                            <li>
                                <Typography variant="subtitle2">
                                    <b>Unlimited</b> file sharing
                                </Typography>
                            </li>
                            <li>
                                <Typography variant="subtitle2">Peer-to-peer, no server storage</Typography>
                            </li>
                            <li>
                                <Typography variant="subtitle2">No account required</Typography>
                            </li>
                        </ul>

                        <Box margin={3}>
                            <Button
                                to="/p2p-file-share"
                                variant="contained"
                                color="info"
                                startIcon={<FileUpload />}
                                component={RouterLink}
                            >
                                Share files
                            </Button>
                        </Box>
                    </Alert>
                </Grid>

                <Dialog open={showResetDialog} fullWidth={true} keepMounted={true} onClose={() => setShowResetDialog(false)}>
                    <DialogTitle id="pw-reset-dialog-title">Reset Password</DialogTitle>
                    <DialogContent>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                width: '100%',
                                gap: 3,
                            }}
                        >
                            <FormControl>
                                <FormLabel htmlFor="email-reset">Email Address</FormLabel>
                                <TextField
                                    fullWidth
                                    id="email-reset"
                                    type="email"
                                    name="email-reset"
                                    autoComplete="email"
                                    placeholder="your@email.com"
                                    variant="outlined"
                                    color="primary"
                                    value={emailAddress}
                                    error={!!emailError}
                                    helperText={emailError}
                                    onChange={e => setEmailAddress(e.target.value)}
                                />
                            </FormControl>

                            <Button
                                fullWidth
                                variant="contained"
                                disabled={dialogLoading}
                                startIcon={dialogLoading ? <CircularProgress /> : <Mail />}
                                onClick={requestPasswordReset}
                            >
                                Request Password Reset
                            </Button>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button variant="text" startIcon={<Cancel />} onClick={() => setShowResetDialog(false)}>
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>
            </Grid>
        </Container>
    );
}

export default Login;
