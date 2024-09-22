import { AccountCircle, ArrowBack, Edit, Password } from '@mui/icons-material'
import { Box, Chip, Container, Divider, FormControl, FormControlLabel, FormLabel, IconButton, InputAdornment, LinearProgress, Paper, Stack, Switch, TextField, Typography, useColorScheme } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { RootState } from '../store/store'
import { calculateSizePercentageUsed, calculateSizeUsed, sizePercentageToColor } from '../utilities/utils'

function Settings() {
    const navigate = useNavigate()
    const data = useSelector((state: RootState) => state.user)
    const { mode, setMode } = useColorScheme()

    const sizeUsed = calculateSizeUsed(data.files)
    const sizeUsedPercentage = calculateSizePercentageUsed(sizeUsed, 1000)
    return (
        <Container component={Paper} sx={{ padding: 5 }}>
            <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>

            <Stack direction='column'
                spacing={2}
                sx={{ padding: 2 }}>

                <Divider><Typography variant='h5'>Account Details</Typography></Divider>
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
                                        <IconButton><Edit /></IconButton>
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
                        defaultValue={data.password}
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
                                        <IconButton><Edit /></IconButton>
                                    </InputAdornment>
                                )
                            },
                        }} />
                </FormControl>

                <FormControl>
                    <FormLabel>Account active since <Chip label={data.createdAt} /></FormLabel>
                </FormControl>
            </Stack>

            <Stack direction='column'
                spacing={2}
                sx={{ padding: 2 }}>
                <Divider><Typography variant='h5'>File Details</Typography></Divider>
                <FormControl>
                    <FormLabel>Files stored: <Chip label={data.files?.length || 0} /></FormLabel>
                </FormControl>
                <FormControl>
                    <FormLabel>Storage used: <Chip label={`${sizeUsed} MiB/1,000 MiB (${sizeUsedPercentage}%)`} /></FormLabel>
                </FormControl>
                <LinearProgress variant="determinate" color={sizePercentageToColor(sizeUsedPercentage)} value={sizeUsedPercentage} />
            </Stack>

            <Stack direction='column'
                spacing={2}
                sx={{ padding: 2 }}>
                <Divider><Typography variant='h5'>Preferences</Typography></Divider>
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
