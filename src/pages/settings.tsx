import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useSnackbar } from "notistack"
import { AccountCircle, ArrowBack, Delete, Password } from '@mui/icons-material'
import { Box, Button, Chip, Container, Divider, FormControl, FormControlLabel, IconButton, Paper, Stack, Switch, TextField, Tooltip, Typography, useColorScheme } from '@mui/material'

import { RootState } from '../store/store'
import { calculateSizePercentageUsed, calculateSizeUsed, localDateTime } from '../utilities/utils'
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
    const sizeUsedPercentage = calculateSizePercentageUsed(sizeUsed, 1000)

    const editField = () => {
        enqueueSnackbar("Not implemented", { variant: "warning" })
    }

    return (
        <Container component={Paper} sx={{ padding: 5 }}>
            <Stack direction='row' alignItems='center' spacing={2}>
                <Tooltip title="Go back" disableInteractive>
                    <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>
                </Tooltip>
                <Typography variant="h5">Settings</Typography>
            </Stack>

            <Stack direction='column' spacing={2} sx={{ padding: 1 }}>
                <Divider><Typography variant='h6'>Account Details</Typography></Divider>
                <FormControl>
                    <Typography>Email Address</Typography>
                    <TextField fullWidth
                        variant="standard"
                        color="primary"
                        value={user.emailAddress}
                        onChange={() => { }}
                        disabled />
                </FormControl>
                <FormControl>
                    <Typography>Password</Typography>
                    <TextField fullWidth
                        variant="standard"
                        color="primary"
                        value={'*'.repeat(15)}
                        onChange={() => { }}
                        disabled />
                </FormControl>
                <Stack direction='row' justifyContent='space-evenly'>
                    <Stack direction='row' justifyContent='space-evenly'>
                        <Typography>Account created: </Typography>
                        <Chip label={localDateTime(new Date(user.createdAt), true)} />
                    </Stack>
                    <Stack direction='row' justifyContent='space-evenly'>
                        <Typography>Last online: </Typography>
                        <Chip label={localDateTime(new Date(user.lastSeen), true)} />
                    </Stack>
                </Stack>
            </Stack>

            <Stack direction='column' spacing={2} sx={{ padding: 1 }}>
                <Divider><Typography variant='h6'>File Details</Typography></Divider>
                <FormControl sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <Typography>Files stored:</Typography>
                    <Chip label={user.files?.length || 0} />
                </FormControl>
                <FormControl sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <Typography>Storage used:</Typography>
                    <Chip label={`${sizeUsed} MB/1,000 MB`} />
                </FormControl>
                <FormControl sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <Typography>Storage used:</Typography>
                    <CircularProgressWithLabel value={sizeUsedPercentage} size={40} />
                </FormControl>
            </Stack>

            <Stack direction='column' spacing={2} sx={{ padding: 1 }}>
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

            <Stack direction='column' spacing={2}>
                <Divider><Typography variant='h6'>Actions</Typography></Divider>

                <Stack direction="row" justifyContent="center">
                    <Button variant='outlined'
                        onClick={editField}
                        startIcon={<AccountCircle />}>
                        Update email address
                    </Button>
                    <Button variant='outlined'
                        onClick={() => setDialogOpen("password")}
                        startIcon={<Password />}>
                        Change password
                    </Button>
                </Stack>
                <Button variant='outlined'
                    color='error'
                    onClick={() => setDialogOpen("delete_account")}
                    startIcon={<Delete />}>
                    Delete account
                </Button>
            </Stack>

            <ChangePasswordDialog open={dialogOpen === "password"}
                closeDialog={() => setDialogOpen("")} />

            <DeleteAccountDialog open={dialogOpen === "delete_account"}
                closeDialog={() => setDialogOpen("")} />
        </Container>
    )
}

export default Settings
