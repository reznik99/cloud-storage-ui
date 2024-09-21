import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useSnackbar } from "notistack"
import { AccountCircle, ArrowBack } from "@mui/icons-material"
import { Alert, AlertTitle, Box, Button, Card, Divider, FormControl, FormLabel, LinearProgress, Stack, TextField, Typography } from "@mui/material"
import { Feedback, getErrorString } from "../utilities/utils"
import { ValidatePassword } from "../utilities/security"
import api from "../networking/endpoints"
import logo from '/logo.png'
import PasswordMeter from "../components/password_meter"

function Signup() {
    const navigate = useNavigate()
    const { enqueueSnackbar } = useSnackbar()
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState<Feedback | null>()
    const [emailAddress, setEmailAddress] = useState('')
    const [emailError, setEmailError] = useState('')
    const [password, setPassword] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')

    const handleEmail = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        resetFeedback()
        if (!e.target.validity.valid) {
            setEmailError("Invalid email address")
        }
        setEmailAddress(e.target.value)
    }

    const resetFeedback = () => {
        setFeedback(null)
        setEmailError("")
        setPasswordError("")
    }

    const checkValues = useCallback(() => {
        if (!emailAddress.trim()) setEmailError("Email is required")
        else if (!password.trim()) setPasswordError("Password is required")
        else if (password !== passwordConfirmation) setPasswordError("Passwords do not match!")
        else {
            const err = ValidatePassword(password)
            if (err) {
                setPasswordError(err)
                return false
            }
            return true
        }
        return false
    }, [emailAddress, password, passwordConfirmation])

    const signup = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        resetFeedback()
        try {
            setLoading(true)
            if (!checkValues()) return
            await api.signup(emailAddress, password)
            enqueueSnackbar("Account created successfully", { variant: "success" })
        } catch (err) {
            const error = getErrorString(err)
            console.error(error)
            setFeedback({ message: error, severity: "error" })
        } finally {
            setLoading(false)
        }
    }, [emailAddress, password, checkValues, enqueueSnackbar])

    return (
        <Stack sx={{ alignItems: 'center', mt: 5 }}>
            <Card sx={{ padding: 5, width: '50%' }}>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography component="h1" variant="h4"
                        sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}>
                        Sign up
                    </Typography>
                    <img src={logo} style={{ maxHeight: 40 }} />
                </Box>

                <Box component="form"
                    noValidate={true}
                    onSubmit={signup}
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        gap: 3,
                        my: 3,
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
                            error={!!emailError}
                            helperText={emailError}
                            onChange={handleEmail} />
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
                            error={!!passwordError}
                            helperText={passwordError}
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
                            error={!!passwordError}
                            helperText={passwordError}
                            onChange={(e) => setPasswordConfirmation(e.target.value)} />
                    </FormControl>
                    {password && <PasswordMeter password={password || passwordConfirmation} />}

                    <Button fullWidth
                        variant="contained"
                        type="submit"
                        disabled={loading}
                        startIcon={<AccountCircle />}>
                        Signup
                    </Button>
                </Box>

                <Divider sx={{ mb: 3 }}>or</Divider>

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
