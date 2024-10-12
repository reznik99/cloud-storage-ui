import { useLocation, useNavigate } from "react-router-dom"
import { ArrowBack, Password } from "@mui/icons-material"
import { Box, Button, Card, CardContent, Divider, FormControl, FormLabel, IconButton, Stack, TextField, Typography } from "@mui/material"
import logo from '/logo.png'
import { useCallback, useState } from "react"
import { ValidatePassword } from "../utilities/security"
import { getErrorString } from "../utilities/utils"
import { useSnackbar } from "notistack"
import PasswordMeter from "../components/password_meter"

function ResetPassword() {
    const navigate = useNavigate()
    const { hash } = useLocation()

    const { enqueueSnackbar } = useSnackbar()
    const [password, setPassword] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')

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
            enqueueSnackbar("Password reset successfully", { variant: "success" })
        } catch (err) {
            const error = getErrorString(err)
            console.error(error)
            enqueueSnackbar("Error resetting password: " + error, { variant: "error" })
        }
    }, [password, checkValues, navigate])

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

                    <Button fullWidth
                        variant="contained"
                        type="submit"
                        startIcon={<Password />}>
                        Reset Password
                    </Button>
                </CardContent>
            </Card>
        </Stack>
    )
}

export default ResetPassword