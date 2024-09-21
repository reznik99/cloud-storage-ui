import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowForward, LoginOutlined } from "@mui/icons-material"
import { Alert, AlertTitle, Box, Button, Card, CircularProgress, Divider, FormControl, FormLabel, LinearProgress, Stack, TextField, Typography } from "@mui/material"
import api from "../networking/endpoints"
import { Feedback, getErrorString } from "../utilities/utils"
import logo from '/logo.png'

function Login() {
    const navigate = useNavigate()
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState<Feedback | null>()
    const [emailAddress, setEmailAddress] = useState('')
    const [emailError, setEmailError] = useState('')
    const [password, setPassword] = useState('')
    const [passwordError, setPasswordError] = useState('')

    const checkAuth = useCallback(async () => {
        setCheckingAuth(true)
        try {
            await api.getFiles()
            navigate("/dashboard")
        } catch (err: unknown) {
            const message = getErrorString(err)
            console.warn("Authentication required:", message)
        } finally {
            setCheckingAuth(false)
        }
    }, [navigate])

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
            await api.login(emailAddress, password)
            navigate("/dashboard")
        } catch (err: unknown) {
            const error = getErrorString(err)
            console.error(error)
            setFeedback({ message: error, severity: "error" })
        } finally {
            setLoading(false)
        }
    }, [emailAddress, password, checkValues, navigate])

    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    return (
        <>
            {checkingAuth
                ? <Box sx={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <CircularProgress />
                </Box>
                : <Stack sx={{ alignItems: 'center', mt: 5 }}>
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
                            </FormControl>

                            <Button fullWidth
                                variant="contained"
                                type="submit"
                                disabled={loading}
                                endIcon={<LoginOutlined />}>
                                Login
                            </Button>
                        </Box>

                        <Divider sx={{ mb: 3 }}>or</Divider>

                        <Button fullWidth
                            variant="outlined"
                            endIcon={<ArrowForward />}
                            onClick={() => navigate('/signup')}>
                            Signup
                        </Button>

                    </Card>
                    <Box sx={{ width: '50%' }}>
                        {feedback &&
                            <Alert severity={feedback.severity}>
                                <AlertTitle>{feedback.message}</AlertTitle>
                            </Alert>
                        }
                        {loading && <LinearProgress variant="indeterminate" />}
                    </Box>
                </Stack>
            }
        </>
    )
}


export default Login