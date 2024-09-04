import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowForward, LoginOutlined } from "@mui/icons-material"
import { Alert, AlertTitle, Box, Button, Card, CircularProgress, Divider, FormControl, FormLabel, LinearProgress, Stack, TextField, Typography } from "@mui/material"
import api from "../networking/endpoints"
import { Feedback, getErrorString } from "../utilities/utils"

function Login() {
    const navigate = useNavigate()
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState<Feedback | null>()
    const [emailAddress, setEmailAddress] = useState('')
    const [password, setPassword] = useState('')

    const checkAuth = useCallback(async () => {
        setCheckingAuth(true)
        try {
            await api.getFiles()
            navigate("/dashboard")
        } catch (err: any) { 

        } finally {
            setCheckingAuth(false)
        }
    }, [])

    const login = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        try {
            setFeedback(null)
            setLoading(true)
            await api.login(emailAddress, password)
            navigate("/dashboard")
        } catch (err: any) {
            const error = getErrorString(err)
            console.error(error)
            setFeedback({ message: error, severity: "error" })
        } finally {
            setLoading(false)
        }
    }, [emailAddress, password])

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
                    <Card variant="outlined" sx={{ padding: 5, width: '50%' }}>

                        <Typography
                            component="h1"
                            variant="h4"
                            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}>
                            Log In
                        </Typography>

                        <Box component="form"
                            onSubmit={login}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                width: '100%',
                                gap: 3,
                                my: 2,
                            }}>
                            <FormControl>
                                <FormLabel htmlFor="email">Email Address</FormLabel>
                                <TextField required
                                    fullWidth
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    placeholder="your@email.com"
                                    variant="outlined"
                                    color="primary"
                                    value={emailAddress}
                                    onChange={(e) => setEmailAddress(e.target.value)} />
                            </FormControl>
                            <FormControl>
                                <FormLabel htmlFor="password">Password</FormLabel>
                                <TextField required
                                    fullWidth
                                    name="password"
                                    type="password"
                                    id="password"
                                    autoComplete="new-password"
                                    placeholder="••••••"
                                    variant="outlined"
                                    color="primary"
                                    value={password}
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

                        <Divider sx={{ mb: 2 }}>or</Divider>

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