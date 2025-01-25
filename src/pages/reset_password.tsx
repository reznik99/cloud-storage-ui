import { useLocation, useNavigate } from "react-router-dom"
import { ArrowBack, Article, Password, Link } from "@mui/icons-material"
import { Alert, AlertTitle, Box, Button, Card, CardContent, Checkbox, Divider, FormControl, FormControlLabel, FormLabel, IconButton, Stack, TextField, Typography } from "@mui/material"
import logo from '/logo.png'
import { useCallback, useState } from "react"
import { ValidatePassword } from "../utilities/security"
import { getErrorString } from "../utilities/utils"
import { useSnackbar } from "notistack"
import PasswordMeter from "../components/password_meter"
import api from "../networking/endpoints"

function ResetPassword() {
    const navigate = useNavigate()
    const { hash } = useLocation()

    const { enqueueSnackbar } = useSnackbar()
    const [password, setPassword] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')
    const [acceptedTerms, setAcceptedTerms] = useState(false)

    const checkValues = useCallback(() => {
        if (!password.trim()) setPasswordError("Password is required")
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
    }, [password, passwordConfirmation])

    const resetPassword = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setPasswordError("")
        try {
            if (!checkValues()) return
            await api.resetPassword(password, hash.slice(1))
            enqueueSnackbar("Password reset successfully", { variant: "success" })
            navigate('/login')
        } catch (err) {
            const error = getErrorString(err)
            console.error(error)
            enqueueSnackbar("Error resetting password: " + error, { variant: "error" })
        }
    }, [password, hash, checkValues, navigate, enqueueSnackbar])

    return (
        <Stack sx={{ alignItems: 'center', mt: 5 }}>
            <Card sx={{ padding: 5, width: '50%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <IconButton onClick={() => navigate('/login')}><ArrowBack /></IconButton>
                    <Typography variant="h5">Reset password (code: {hash})</Typography>
                    <img src={logo} style={{ maxHeight: 40 }} />
                </Box>
                <Divider sx={{ mt: 2 }} />

                <CardContent component="form"
                    noValidate={true}
                    onSubmit={resetPassword}
                    sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                    <FormControl>
                        <FormLabel htmlFor="password">New Password</FormLabel>
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
                        <FormLabel htmlFor="confirm-password">Confirm New Password</FormLabel>
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

                    <Alert severity="warning">
                        <AlertTitle><b>WARNING</b>: This operation is <b>DESTRUCTIVE</b></AlertTitle>
                        <Typography>
                            This action will change your Account and Master encryption keys.
                            This means that all your previously uploaded files will become unaccessible, and in turn will be deleted.
                            This action cannot be undone, and your files will not be recoverable.
                        </Typography>
                        <ul>
                            <li>All your files will be lost <Article fontSize="small" color="primary" /> </li>
                            <li>All previously shared links will no longer work <Link fontSize="small" color="primary" /> </li>
                        </ul>
                        <Stack alignItems="center">
                            <FormControlLabel
                                label="I understand and wish to continue"
                                control={<Checkbox checked={acceptedTerms}
                                    onChange={e => setAcceptedTerms(e.target.checked)} />
                                } />
                        </Stack>
                    </Alert>

                    <Button fullWidth
                        variant="contained"
                        type="submit"
                        disabled={!acceptedTerms || !password || !passwordConfirmation}
                        startIcon={<Password />}>
                        Reset Password
                    </Button>
                </CardContent>
            </Card>
        </Stack>
    )
}

export default ResetPassword