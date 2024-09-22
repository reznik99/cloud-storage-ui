import { AccountCircle, ArrowBack, Edit, Password } from '@mui/icons-material'
import { Box, Chip, Container, Divider, FormControl, FormControlLabel, FormLabel, IconButton, InputAdornment, Paper, Stack, Switch, TextField, Tooltip, Typography, useColorScheme } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useSnackbar } from "notistack"

import { RootState } from '../store/store'
import { calculateSizePercentageUsed, calculateSizeUsed, localDateTime } from '../utilities/utils'
import CircularProgressWithLabel from '../components/circular_progress_w_label'

function Settings() {
    const navigate = useNavigate()
    const { mode, setMode } = useColorScheme()
    const data = useSelector((state: RootState) => state.user)
    const { enqueueSnackbar } = useSnackbar()

    const editField = () => {
        enqueueSnackbar("Not implemented", { variant: "warning" })
    }

    const sizeUsed = calculateSizeUsed(data.files)
    const sizeUsedPercentage = calculateSizePercentageUsed(sizeUsed, 1000)
    return (
        <Container component={Paper} sx={{ padding: 5 }}>
            <Stack direction='row' alignItems='center' spacing={2}>
                <Tooltip title="Go back" disableInteractive>
                    <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>
                </Tooltip>
                <Typography variant="h5">Settings</Typography>
            </Stack>

            <Stack direction='column'
                spacing={2}
                sx={{ padding: 2 }}>

                <Divider><Typography variant='h6'>Account Details</Typography></Divider>
                <FormControl>
                    <FormLabel>Email Address</FormLabel>
                    <TextField fullWidth
                        variant="standard"
                        color="primary"
                        defaultValue={data.emailAddress}
                        disabled
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <AccountCircle />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Tooltip title="Edit" disableInteractive>
                                            <IconButton onClick={editField}><Edit /></IconButton>
                                        </Tooltip>
                                    </InputAdornment>
                                )
                            },
                        }} />
                </FormControl>

                <FormControl>
                    <FormLabel>Password</FormLabel>
                    <TextField fullWidth
                        variant="standard"
                        color="primary"
                        type='password'
                        defaultValue={"a".repeat(data.password?.length)}
                        disabled
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Password />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Tooltip title="Edit" disableInteractive>
                                            <IconButton onClick={editField}><Edit /></IconButton>
                                        </Tooltip>
                                    </InputAdornment>
                                )
                            },
                        }} />
                </FormControl>

                <FormControl>
                    <FormLabel>Account created: <Chip label={localDateTime(new Date(data.createdAt), true)} /></FormLabel>
                </FormControl>

                <FormControl>
                    <FormLabel>Last online: <Chip label={localDateTime(new Date(data.lastSeen), true)} /></FormLabel>
                </FormControl>
            </Stack>

            <Stack direction='column'
                spacing={2}
                sx={{ padding: 2 }}>
                <Divider><Typography variant='h6'>File Details</Typography></Divider>
                <FormControl sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <FormLabel>Files stored:</FormLabel>
                    <Chip label={data.files?.length || 0} />
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

            <Stack direction='column'
                spacing={2}
                sx={{ padding: 2 }}>
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
        </Container>
    )
}

export default Settings
