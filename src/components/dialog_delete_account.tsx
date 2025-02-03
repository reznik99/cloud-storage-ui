import { useSnackbar } from "notistack"
import Article from "@mui/icons-material/Article"
import Cancel from "@mui/icons-material/Cancel"
import Link from "@mui/icons-material/Link"
import Password from "@mui/icons-material/Password"
import {
    Alert, AlertTitle, Box, Button, Checkbox, Dialog, DialogActions,
    DialogContent, DialogTitle, FormControl, FormControlLabel, FormLabel,
    LinearProgress, Stack, TextField, Typography
} from "@mui/material"
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
    const [acceptedTerms, setAcceptedTerms] = useState(false)

    const deleteAccount = useCallback(async () => {
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
                <Alert severity="warning">
                    <AlertTitle><b>WARNING</b>: This operation is <b>DESTRUCTIVE</b></AlertTitle>
                    <Typography>
                        This action will delete your account.
                        All your previously uploaded files will be deleted.
                        This action cannot be undone.
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

                <Box component="form"
                    noValidate={true}
                    gap={3}
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        marginTop: 3,
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
                    <Stack direction="row" justifyContent="center">
                        <Button color="error"
                            variant="contained"
                            onClick={deleteAccount}
                            disabled={loading || !password || !acceptedTerms}
                            startIcon={<Password />}>
                            Delete Account
                        </Button>
                    </Stack>
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

export default DeleteAccountDialog