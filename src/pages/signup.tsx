import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AccountCircle, ArrowBack } from "@mui/icons-material"
import { Alert, AlertTitle, Box, Button, Card, Divider, FormControl, FormLabel, LinearProgress, Stack, TextField, Typography } from "@mui/material"
import api from "../networking/endpoints"
import { Feedback } from "../utilities/utils"

function Signup() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState<Feedback | null>()
    const [emailAddress, setEmailAddress] = useState('')
    const [password, setPassword] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')

    const signup = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        try {
            setFeedback(null)
            setLoading(true)
            if (password !== passwordConfirmation) throw new Error("Passwords do not match!")
            await api.signup(emailAddress, password)
        } catch (err: any) {
            const message = err.response?.data?.message || err.message
            setFeedback({
                message: message,
                severity: "error"
            })
        } finally {
            setLoading(false)
        }
    }, [emailAddress, password, passwordConfirmation])

    return (
        <Stack sx={{ alignItems: 'center', mt: 5 }}>
            <Card variant="outlined" sx={{ padding: 5, width: '50%' }}>

                <Typography component="h1" variant="h4"
                    sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}>
                    Sign up
                </Typography>

                <Box component="form"
                    onSubmit={signup}
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
                    <FormControl>
                        <FormLabel htmlFor="confirm-password">Confirm Password</FormLabel>
                        <TextField required
                            fullWidth
                            name="confirm-password"
                            type="password"
                            id="confirm-password"
                            autoComplete="new-password"
                            placeholder="••••••"
                            variant="outlined"
                            color="primary"
                            value={passwordConfirmation}
                            onChange={(e) => setPasswordConfirmation(e.target.value)} />
                    </FormControl>

                    <Button fullWidth
                        variant="contained"
                        type="submit"
                        disabled={loading}
                        startIcon={<AccountCircle />}>
                        Signup
                    </Button>
                </Box>

                <Divider sx={{ mb: 2 }}>or</Divider>

                <Button fullWidth
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/login')}>
                    Login
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
    )
}

export default Signup