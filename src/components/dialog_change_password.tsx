import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { useSnackbar } from "notistack";
import Cancel from "@mui/icons-material/Cancel";
import Password from "@mui/icons-material/Password";
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import LinearProgress from '@mui/material/LinearProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import PasswordMeter from "./password_meter";
import { ValidatePassword } from "../utilities/security";
import { getErrorString } from "../utilities/utils";
import { saveCreds } from "../store/reducer";
import api from "../networking/endpoints";

type IProps = {
    open: boolean;
    closeDialog: () => void;
}

function ChangePasswordDialog(props: IProps) {
    const dispatch = useDispatch()
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
            const resp = await api.changePassword(oldPassword, password)
            dispatch(saveCreds({
                password: resp.password,
                mEncKey: resp.mEncKey,
                hAuthKey: resp.hAuthKey,
                wrappedAccountKey: resp.wrappedAccountKey,
                clientRandomValue: resp.clientRandomValue
            }))
            enqueueSnackbar("Password changed successfully", { variant: "success" })
            props.closeDialog()
        } catch (err) {
            const error = getErrorString(err)
            console.error(error)
            enqueueSnackbar("Password change failed: " + error, { variant: "error" })
        } finally {
            setLoading(false)
        }
    }, [oldPassword, password, checkValues, enqueueSnackbar, dispatch, props])

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
                <Alert severity="info">
                    <Typography>
                        Input your current and new passwords below.<br />
                        Encrypted files will remain available.
                    </Typography>
                </Alert>

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
                        disabled={loading || !oldPassword || !password || !passwordConfirmation}
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

            {loading && <LinearProgress variant="indeterminate" />}
        </Dialog>
    )
}

export default ChangePasswordDialog