import { useCallback, useState } from "react"
import { useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"
import { useSnackbar } from "notistack"
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Container from "@mui/material/Container"
import Divider from '@mui/material/Divider'
import Grid2 from "@mui/material/Grid2"
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import ArrowBack from "@mui/icons-material/ArrowBack"
import AccountCircle from "@mui/icons-material/AccountCircle"

import { Feedback, getErrorString } from "../utilities/utils"
import { ValidatePassword } from "../utilities/security"
import api from "../networking/endpoints"
import PasswordMeter from "../components/password_meter"
import { saveCreds } from "../store/reducer"
import logo from '/logo.png'

function Signup() {
    const navigate = useNavigate()
    const dispatch = useDispatch()
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
            dispatch(saveCreds({ emailAddress: emailAddress }))
            navigate('/login')
            enqueueSnackbar("Account created successfully", { variant: "success" })
        } catch (err) {
            const error = getErrorString(err)
            console.error(error)
            setFeedback({ message: error, severity: "error" })
        } finally {
            setLoading(false)
        }
    }, [emailAddress, password, checkValues, dispatch, navigate, enqueueSnackbar])

    return (
        <Container maxWidth="xl">
            <Grid2 container
                columnSpacing={{ lg: 5, md: 3, sm: 1, xs: 1 }}
                rowSpacing={2}
                margin="4vw"
                justifyContent="center">
                <Grid2 size={{ lg: 7, md: 6, sm: 12, xs: 12 }}>
                    <Card sx={{ padding: 5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography component="h1" variant="h4">
                                Sign up
                            </Typography>
                            <img src={logo} height={50} />
                        </Box>

                        <Box component="form"
                            noValidate={true}
                            onSubmit={signup}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
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

                            <Stack direction="row" justifyContent="center">
                                <Button variant="contained"
                                    type="submit"
                                    disabled={loading}
                                    startIcon={<AccountCircle />}>
                                    Create Account
                                </Button>
                            </Stack>

                        </Box>

                        <Divider sx={{ mb: 3 }}>Already have an account?</Divider>

                        <Stack direction="row" justifyContent="center">
                            <Button variant="outlined"
                                startIcon={<ArrowBack />}
                                onClick={() => navigate('/login')}>
                                Log in
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
                </Grid2>
            </Grid2>
        </Container>
    )
}

export default Signup
