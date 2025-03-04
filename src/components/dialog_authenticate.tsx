import { useCallback, useState } from "react";
import { useSnackbar } from "notistack"
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Cancel from "@mui/icons-material/Cancel"
import Password from "@mui/icons-material/Password"
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import LinearProgress from '@mui/material/LinearProgress'
import TextField from '@mui/material/TextField'

import { getErrorString } from "../utilities/utils";
import api from "../networking/endpoints";
import { RootState } from "../store/store";
import { saveCreds } from "../store/reducer";

type IProps = {
    open: boolean;
    closeDialog: () => void;
}

function AuthenticateDialog(props: IProps) {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const userEmailAddress = useSelector((store: RootState) => store.user.emailAddress)
    const { enqueueSnackbar } = useSnackbar()

    const [loading, setLoading] = useState(false)
    const [emailAddress, setEmailAddress] = useState(userEmailAddress || '')
    const [password, setPassword] = useState('')

    const changePassword = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        try {
            setLoading(true)
            const resp = await api.login(emailAddress, password)
            dispatch(saveCreds({
                emailAddress: resp.emailAddress,
                createdAt: resp.createdAt,
                lastSeen: resp.lastSeen,
                password: password,
                mEncKey: resp.mEncKey,
                hAuthKey: resp.hAuthKey,
                wrappedAccountKey: resp.wrappedAccountKey,
                clientRandomValue: resp.clientRandomValue,
                allowedStorage: resp.allowedStorage
            }))
            enqueueSnackbar("Keys derived successfully", { variant: "success" })
            props.closeDialog()
        } catch (err) {
            console.error(getErrorString(err))
            await api.logout()
            navigate("/login")
        } finally {
            setLoading(false)
        }
    }, [password, emailAddress, enqueueSnackbar, dispatch, navigate, props])

    return (
        <Dialog open={props.open}
            fullWidth={true}
            keepMounted={true}
            maxWidth="md"
            onClose={() => { }} // Disable closing this dialog
            aria-labelledby="link-dialog-title"
            aria-describedby="link-dialog-description">
            <DialogTitle id="link-dialog-title">Authentication Required</DialogTitle>
            <DialogContent>
                <DialogContentText id="link-dialog-description-2">
                    Account keys aren't loaded. Please re-authenticate to re-load keys.
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
                        startIcon={<Password />}>
                        Authenticate
                    </Button>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="text"
                    startIcon={<Cancel />}
                    onClick={() => { }}>
                    Close
                </Button>
            </DialogActions>
            {loading && <LinearProgress variant="indeterminate" />}
        </Dialog>
    )
}

export default AuthenticateDialog