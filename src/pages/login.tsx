import { useCallback, useState } from "react"
import { Link as RouterLink, useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import Cancel from "@mui/icons-material/Cancel"
import LoginOutlined from "@mui/icons-material/LoginOutlined"
import Mail from "@mui/icons-material/Mail"

import logo from '/logo.png'
import api from "../networking/endpoints"
import { Feedback, getErrorString } from "../utilities/utils"
import { saveCreds } from "../store/reducer"
import { RootState } from "../store/store"

function Login() {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const user = useSelector((store: RootState) => store.user)
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState<Feedback | null>()
    const [emailAddress, setEmailAddress] = useState(user.emailAddress || '')
    const [emailError, setEmailError] = useState('')
    const [password, setPassword] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [dialogLoading, setDialogLoading] = useState(false)
    const [showResetDialog, setShowResetDialog] = useState(false)

    const resetFeedback = () => {
        setFeedback(null)
        setEmailError("")
        setPasswordError("")
    }

    const checkValues = useCallback(() => {
        if (!emailAddress.trim()) setEmailError("Email is required")
        else if (!password.trim()) setPasswordError("Password is required")
        else return true
        return false
    }, [emailAddress, password])

    const login = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        resetFeedback()
        try {
            setLoading(true)
            if (!checkValues()) return
            const resp = await api.login(emailAddress, password)
            dispatch(saveCreds({
                emailAddress: resp.emailAddress,
                createdAt: resp.createdAt,
                lastSeen: resp.lastSeen,
                password: password,
                mEncKey: resp.mEncKey,
                hAuthKey: resp.hAuthKey,
                wrappedAccountKey: resp.wrappedAccountKey,
                clientRandomValue: resp.clientRandomValue
            }))
            navigate("/dashboard")
        } catch (err: unknown) {
            const error = getErrorString(err)
            console.error(error)
            setFeedback({ message: error, severity: "error" })
        } finally {
            setLoading(false)
        }
    }, [emailAddress, password, checkValues, navigate, dispatch])

    const requestPasswordReset = useCallback(async () => {
        setDialogLoading(true)
        try {
            await api.requestResetPassword(emailAddress)
            setFeedback({ message: "Password reset email has been sent. If you can't find it make sure you check the spam folder.", severity: "success" })
        } catch (err: unknown) {
            const error = getErrorString(err)
            console.error(error)
            setFeedback({ message: error, severity: "error" })
        } finally {
            setDialogLoading(false)
            setShowResetDialog(false)
        }
    }, [emailAddress])

    return (
        <Stack sx={{ paddingTop: 10 }}
            direction="row"
            width="100vw"
            height="100vh"
            className="login-container">
            <Stack sx={{ paddingX: 5 }} flexGrow={1}>
                <Card sx={{ padding: 5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                            component="h1"
                            variant="h4"
                            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}>
                            Log In
                        </Typography>
                        <img src={logo} width={30} height={30} />
                    </Box>

                    <Box component="form"
                        onSubmit={login}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            gap: 3,
                            my: 3,
                        }}>
                        <FormControl>
                            <FormLabel htmlFor="email">Email Address</FormLabel>
                            <TextField fullWidth
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
                                onChange={(e) => setEmailAddress(e.target.value)} />
                        </FormControl>
                        <FormControl>
                            <FormLabel htmlFor="password">Password</FormLabel>
                            <TextField fullWidth
                                name="password"
                                type="password"
                                id="password"
                                autoComplete="new-password"
                                placeholder="••••••"
                                variant="outlined"
                                color="primary"
                                value={password}
                                error={!!passwordError}
                                helperText={passwordError}
                                onChange={(e) => setPassword(e.target.value)} />
                            <Stack direction="row" marginTop={2}>
                                <Link to="#" component={RouterLink} onClick={() => setShowResetDialog(true)}>Forgot Password?</Link>
                            </Stack>
                        </FormControl>

                        <Stack direction="row" justifyContent="center">
                            <Button variant="contained"
                                type="submit"
                                disabled={loading}
                                endIcon={<LoginOutlined />}>
                                Log in
                            </Button>
                        </Stack>
                    </Box>

                    <Divider sx={{ mb: 3 }}>Don't have an account?</Divider>

                    <Stack direction="row" justifyContent="center">
                        <Button variant="outlined"
                            onClick={() => navigate('/signup')}>
                            Create new account
                        </Button>
                    </Stack>

                </Card>
                <Box>
                    {feedback &&
                        <Alert severity={feedback.severity}>
                            <AlertTitle>{feedback.message}</AlertTitle>
                        </Alert>
                    }
                    {loading && <LinearProgress variant="indeterminate" />}
                </Box>
            </Stack>
            <Stack sx={{ paddingX: 5 }} flexGrow={1}>
                <Alert variant="filled" severity="info" icon="">
                    <AlertTitle>
                        <Typography variant="h5">Gorini Drive Storage</Typography>
                    </AlertTitle>
                    <Typography>
                        End-To-End encrypted file storage based on the
                        <Link to="https://mega.nz/SecurityWhitepaper.pdf" target="_blank" component={RouterLink}> Mega.nz whitepaper</Link>.
                    </Typography>
                    <ul>
                        <li>Up to 1GB of storage for free</li>
                        <li>End-To-End encryption</li>
                        <li>Files sharing is easy! Download without an account</li>
                        <li>Open Source</li>
                    </ul>
                </Alert>
                <Alert variant="standard" severity="info" sx={{ marginTop: 10 }}>
                    <AlertTitle>
                        <Typography variant="h5">Need to share files directly?</Typography>
                    </AlertTitle>
                    <Typography>
                        Click <Link to="/p2p-file-share" component={RouterLink}><b>here</b></Link> to share files with
                        <b> server-less peer-to-peer</b> file sharing!<br />
                    </Typography>
                    <ul>
                        <li><b>Unlimited</b> file sharing</li>
                        <li>Peer-To-Peer & Server-less</li>
                        <li>End-To-End encryption</li>
                        <li>Open Source</li>
                    </ul>
                </Alert>
            </Stack>

            <Dialog open={showResetDialog}
                fullWidth={true}
                keepMounted={true}
                onClose={() => setShowResetDialog(false)}>
                <DialogTitle id="pw-reset-dialog-title">Reset Password</DialogTitle>
                <DialogContent>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        gap: 3,
                    }}>
                        <FormControl>
                            <FormLabel htmlFor="email-reset">Email Address</FormLabel>
                            <TextField fullWidth
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
                                onChange={(e) => setEmailAddress(e.target.value)} />
                        </FormControl>

                        <Button fullWidth
                            variant="contained"
                            disabled={dialogLoading}
                            startIcon={dialogLoading ? <CircularProgress /> : <Mail />}
                            onClick={requestPasswordReset}>
                            Request Password Reset
                        </Button>
                    </Box>

                </DialogContent>
                <DialogActions>
                    <Button variant="text"
                        startIcon={<Cancel />}
                        onClick={() => setShowResetDialog(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    )
}


export default Login