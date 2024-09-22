import { useSnackbar } from "notistack"
import { Cancel, Password } from "@mui/icons-material"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormLabel, TextField } from "@mui/material"
import PasswordMeter from "./password_meter";
import { useCallback, useState } from "react";
import { ValidatePassword } from "../utilities/security";
import { getErrorString } from "../utilities/utils";

type IProps = {
    open: boolean;
    closeDialog: () => void;
}

function ChangePasswordDialog(props: IProps) {
    const { enqueueSnackbar } = useSnackbar()

    const [loading, setLoading] = useState(false)
    const [oldPassword, setOldPassword] = useState('')
    const [password, setPassword] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')
    const [passwordError, setPasswordError] = useState('')

    const checkValues = useCallback(() => {
        if (!password.trim()) setPasswordError("Password is required")
        else if (password !== passwordConfirmation) setPasswordError("Passwords do not match!")
        else {
            const err = ValidatePassword(password)
            if (err) {
                console.warn(err)
                setPasswordError(err)
                return false
            }
            return true
        }
        return false
    }, [password, passwordConfirmation])

    const changePassword = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setPasswordError('')
        try {
            setLoading(true)
            if (!checkValues()) return
            enqueueSnackbar("Password changed successfully (not really)", { variant: "success" })
        } catch (err) {
            const error = getErrorString(err)
            console.error(error)
            enqueueSnackbar("Password change failed: " + error, { variant: "error" })
        } finally {
            setLoading(false)
        }
    }, [checkValues, enqueueSnackbar])

    return (
        <Dialog open={props.open}
            fullWidth={true}
            keepMounted={true}
            maxWidth="md"
            onClose={props.closeDialog}
            aria-labelledby="link-dialog-title"
            aria-describedby="link-dialog-description">
            <DialogTitle id="link-dialog-title">Change your password</DialogTitle>
            <DialogContent>
                <DialogContentText id="link-dialog-description-2">
                    Input your old and new passwords below. Encrypted files will remain available.
                </DialogContentText>

                <Box component="form"
                    noValidate={true}
                    onSubmit={changePassword}
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        gap: 3,
                        my: 3,
                    }}>

                    <FormControl>
                        <FormLabel htmlFor="old_password">Current Password</FormLabel>
                        <TextField fullWidth
                            name="old_password"
                            type="password"
                            id="old_password"
                            autoComplete="password"
                            placeholder="••••••"
                            variant="outlined"
                            color="primary"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)} />
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
                    {(password || passwordConfirmation) && <PasswordMeter password={password || passwordConfirmation} />}

                    <Button fullWidth
                        variant="contained"
                        type="submit"
                        disabled={loading}
                        startIcon={<Password />}>
                        Change Password
                    </Button>
                </Box>

            </DialogContent>
            <DialogActions>
                <Button variant="text"
                    startIcon={<Cancel />}
                    onClick={props.closeDialog}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default ChangePasswordDialog