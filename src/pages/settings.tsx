import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useSnackbar } from "notistack"
import { AccountCircle, ArrowBack, Delete, Password } from '@mui/icons-material'
import { Box, Button, Chip, Container, Divider, FormControl, FormControlLabel, FormLabel, IconButton, Paper, Stack, Switch, TextField, Tooltip, Typography, useColorScheme } from '@mui/material'

import { RootState } from '../store/store'
import { calculateSizePercentageUsed, calculateSizeUsed, localDateTime } from '../utilities/utils'
import CircularProgressWithLabel from '../components/circular_progress_w_label'
import ChangePasswordDialog from '../components/modal_change_password'

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
                    <FormLabel>Email Address</FormLabel>
                    <TextField fullWidth
                        variant="standard"
                        color="primary"
                        value={user.emailAddress}
                        onChange={() => { }}
                        disabled />
                </FormControl>
                <FormControl>
                    <FormLabel>Password</FormLabel>
                    <TextField fullWidth
                        variant="standard"
                        color="primary"
                        value={'*'.repeat(user.password?.length || 10)}
                        onChange={() => { }}
                        disabled />
                </FormControl>
                <Stack direction='row' justifyContent='space-evenly'>
                    <FormLabel>Account created: <Chip label={localDateTime(new Date(user.createdAt), true)} /></FormLabel>
                    <FormLabel>Last online: <Chip label={localDateTime(new Date(user.lastSeen), true)} /></FormLabel>
                </Stack>
            </Stack>

            <Stack direction='column' spacing={2} sx={{ padding: 1 }}>
                <Divider><Typography variant='h6'>File Details</Typography></Divider>
                <FormControl sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <FormLabel>Files stored:</FormLabel>
                    <Chip label={user.files?.length || 0} />
                </FormControl>
                <FormControl sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <FormLabel>Storage used:</FormLabel>
                    <Chip label={`${sizeUsed} MB/1,000 MB`} />
                </FormControl>
                <FormControl sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <FormLabel>Storage used:</FormLabel>
                    <CircularProgressWithLabel value={sizeUsedPercentage} size={40} />
                </FormControl>
            </Stack>

            <Stack direction='column' spacing={2} sx={{ padding: 1 }}>
                <Divider><Typography variant='h6'>Preferences</Typography></Divider>
                <Box>
                    <FormLabel>Color Theme</FormLabel>
                    <FormControlLabel checked={mode === 'dark'}
                        onChange={() => setMode(mode === 'light' ? 'dark' : 'light')}
                        control={<Switch color="primary" />}
                        label={mode}
                        labelPlacement="start"
                    />
                </Box>
            </Stack>

            <Stack direction='column' spacing={2} sx={{ padding: 1, }}>
                <Divider><Typography variant='h6'>Actions</Typography></Divider>

                <Button onClick={editField}
                    startIcon={<AccountCircle />}>
                    Update email address
                </Button>
                <Button onClick={() => setDialogOpen("password")}
                    startIcon={<Password />}>
                    Change password
                </Button>
                <Button variant='outlined'
                    color='error'
                    onClick={editField}
                    startIcon={<Delete />}>
                    Delete account
                </Button>
            </Stack>

            <ChangePasswordDialog open={dialogOpen === "password"}
                closeDialog={() => setDialogOpen("")} />
        </Container>
    )
}

export default Settings
