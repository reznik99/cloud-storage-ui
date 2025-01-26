import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { Cancel, LoginOutlined, Mail } from "@mui/icons-material"
import { Alert, AlertTitle, Box, Button, Card, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormLabel, LinearProgress, Link, Stack, TextField, Typography } from "@mui/material"
import api from "../networking/endpoints"
import { Feedback, getErrorString } from "../utilities/utils"
import logo from '/logo.png'
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
        <>
            <Stack sx={{ alignItems: 'center', mt: 5 }}>
                <Card sx={{ padding: 5, width: '50%' }}>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                            component="h1"
                            variant="h4"
                            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}>
                            Log In
                        </Typography>
                        <img src={logo} style={{ maxHeight: 40 }} />
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
                                <Link href="#" onClick={() => setShowResetDialog(true)}>Forgot Password?</Link>
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
                <Box sx={{ width: '50%' }}>
                    {feedback &&
                        <Alert severity={feedback.severity}>
                            <AlertTitle>{feedback.message}</AlertTitle>
                        </Alert>
                    }
                    {loading && <LinearProgress variant="indeterminate" />}
                </Box>

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
        </>
    )
}


export default Login