import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useSnackbar } from "notistack"
import AccountCircle from '@mui/icons-material/AccountCircle'
import ArrowBack from '@mui/icons-material/ArrowBack'
import Delete from '@mui/icons-material/Delete'
import Password from '@mui/icons-material/Password'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Grid2 from '@mui/material/Grid2'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import { useColorScheme } from "@mui/material/styles"

import { RootState } from '../store/store'
import { calculateSizePercentageUsed, calculateSizeUsed, formatBytes, localDateTime } from '../utilities/utils'
import CircularProgressWithLabel from '../components/circular_progress_w_label'
import ChangePasswordDialog from '../components/dialog_change_password'
import DeleteAccountDialog from '../components/dialog_delete_account'

function Settings() {
    const navigate = useNavigate()
    const user = useSelector((state: RootState) => state.user)
    const { enqueueSnackbar } = useSnackbar()
    const { mode, setMode } = useColorScheme()
    const [dialogOpen, setDialogOpen] = useState("")

    const sizeUsed = calculateSizeUsed(user.files)
    const sizeUsedPercentage = calculateSizePercentageUsed(sizeUsed, user.allowedStorage)

    const editField = () => {
        enqueueSnackbar("Not implemented", { variant: "warning" })
    }

    return (
        <Container component={Paper} sx={{ paddingTop: "1em" }}>
            <Stack direction='row' alignItems='center'>
                <Tooltip title="Go back" disableInteractive>
                    <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>
                </Tooltip>
                <Typography variant="h5">Settings</Typography>
            </Stack>

            <Stack direction='column' spacing={1} padding="2em">
                <Stack direction='column' spacing={2}>
                    <Divider><Typography variant='h6'>Account Details</Typography></Divider>
                    <FormControl>
                        <Typography>Email Address</Typography>
                        <TextField fullWidth
                            variant="standard"
                            color="primary"
                            value={user.emailAddress}
                            disabled />
                    </FormControl>
                    <FormControl>
                        <Typography>Password</Typography>
                        <TextField fullWidth
                            variant="standard"
                            color="primary"
                            value={'*'.repeat(15)}
                            disabled />
                    </FormControl>
                    <Stack direction='row' alignItems="center" gap={1}>
                        <Typography>Account created: </Typography>
                        <Chip label={localDateTime(new Date(user.createdAt), true)} />
                    </Stack>
                    <Stack direction='row' alignItems="center" gap={1}>
                        <Typography>Last online: </Typography>
                        <Chip label={localDateTime(new Date(user.lastSeen), true)} />
                    </Stack>
                </Stack>

                <Stack direction='column' spacing={2}>
                    <Divider><Typography variant='h6'>File Details</Typography></Divider>
                    <FormControl sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                        <Typography>Files stored:</Typography>
                        <Chip label={user.files?.length || 0} />
                    </FormControl>
                    <FormControl sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                        <Typography>Storage used:</Typography>
                        <Chip label={`${formatBytes(sizeUsed)}/${formatBytes(user.allowedStorage)}`} />
                    </FormControl>
                    <FormControl sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                        <Typography>Storage used:</Typography>
                        <CircularProgressWithLabel value={sizeUsedPercentage} size={40} />
                    </FormControl>
                </Stack>

                <Stack direction='column' spacing={3}>
                    <Divider><Typography variant='h6'>Preferences</Typography></Divider>
                    <Box>
                        <Typography>Color Theme</Typography>
                        <FormControlLabel checked={mode === 'dark'}
                            onChange={() => setMode(mode === 'light' ? 'dark' : 'light')}
                            control={<Switch color="primary" />}
                            label={mode}
                            labelPlacement="start"
                        />
                    </Box>
                </Stack>

                <Grid2 container spacing={3}>
                    <Grid2 size={12}><Divider><Typography variant='h6'>Actions</Typography></Divider></Grid2>
                    <Grid2 size={{ lg: "auto", sm: 12 }}>
                        <Button variant='outlined'
                            onClick={editField}
                            startIcon={<AccountCircle />}>
                            Update email address
                        </Button>
                    </Grid2>
                    <Grid2 size={{ lg: "auto", sm: 12 }}>
                        <Button variant='outlined'
                            onClick={() => setDialogOpen("password")}
                            startIcon={<Password />}>
                            Change password
                        </Button>
                    </Grid2>
                    <Grid2 size={{ lg: "auto", sm: 12 }}>
                        <Button variant='outlined'
                            color='error'
                            onClick={() => setDialogOpen("delete_account")}
                            startIcon={<Delete />}>
                            Delete account
                        </Button>
                    </Grid2>
                </Grid2>
            </Stack>

            <ChangePasswordDialog open={dialogOpen === "password"}
                closeDialog={() => setDialogOpen("")} />

            <DeleteAccountDialog open={dialogOpen === "delete_account"}
                closeDialog={() => setDialogOpen("")} />
        </Container>
    )
}

export default Settings
