import { AccountCircle, ArrowBack, Edit, Password } from '@mui/icons-material'
import { Box, Chip, Container, FormControl, FormLabel, IconButton, InputAdornment, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { RootState } from '../store/store'

function Settings() {
    const navigate = useNavigate()
    const data = useSelector((state: RootState) => state.user)
    console.log(data)
    return (
        <Container component={Paper}>
            <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>

            <Stack direction='column'
                spacing={2}
                sx={{ padding: 10 }}>
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
                    <FormLabel>Account active since</FormLabel>
                    <Chip content={data.createdAt} />
                </FormControl>

                <FormControl>
                    <FormLabel>Storage used</FormLabel>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2">{data.files?.length} files at 512.4 MB/1000 MB</Typography>
                        <LinearProgress variant='determinate' value={45} />
                    </Box>
                </FormControl>

            </Stack>
        </Container>
    )
}

export default Settings
