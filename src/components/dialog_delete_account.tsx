import { useSnackbar } from "notistack"
import { Cancel, Password } from "@mui/icons-material"
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormLabel, TextField } from "@mui/material"
import { useCallback, useState } from "react";
import { getErrorString } from "../utilities/utils";
import api from "../networking/endpoints";
import { useNavigate } from "react-router-dom";

type IProps = {
    open: boolean;
    closeDialog: () => void;
}

function DeleteAccountDialog(props: IProps) {
    const { enqueueSnackbar } = useSnackbar()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [password, setPassword] = useState('')

    const changePassword = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        try {
            setLoading(true)
            await api.deleteAccount(password)
            enqueueSnackbar("Account deleted successfully", { variant: "success" })
            navigate('/login')
        } catch (err) {
            const error = getErrorString(err)
            console.error(error)
            enqueueSnackbar("Account deletion failed: " + error, { variant: "error" })
        } finally {
            setLoading(false)
        }
    }, [password, navigate, enqueueSnackbar])

    return (
        <Dialog open={props.open}
            fullWidth={true}
            keepMounted={true}
            maxWidth="md"
            onClose={props.closeDialog}>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogContent>
                <DialogContentText >
                    Warning! This will delete all your files. Shared links will become unavailable.
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
                        <FormLabel htmlFor="password">Password</FormLabel>
                        <TextField fullWidth
                            name="password"
                            type="password"
                            id="password"
                            autoComplete="password"
                            placeholder="••••••"
                            variant="outlined"
                            color="primary"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)} />
                    </FormControl>

                    <Button fullWidth
                        color="error"
                        variant="contained"
                        type="submit"
                        disabled={loading}
                        startIcon={<Password />}>
                        Delete Account
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

export default DeleteAccountDialog