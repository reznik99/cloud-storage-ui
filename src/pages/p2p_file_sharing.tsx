import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ArrowBack } from '@mui/icons-material'
import { Box, Button, Container, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'


function P2PFileSharing() {
    const navigate = useNavigate()
    const [selectedFile, setSelectedFile] = useState<File | null>()

    const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFile(event.target?.files?.[0])
    }, [])

    return (
        <Container component={Paper} sx={{ padding: 5 }}>
            <Stack direction='row' alignItems='center' spacing={2}>
                <Tooltip title="Go back" disableInteractive>
                    <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>
                </Tooltip>
                <Typography variant="h5">Peer-To-Peer file sharing</Typography>
            </Stack>

            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', my: 2 }}>
                <Button variant={selectedFile?.name ? "contained" : "outlined"} component="label">
                    {selectedFile?.name ?? "Select File"}
                    <input onChange={handleFile} type="file" hidden />
                </Button>
            </Box>

        </Container>
    )
}

export default P2PFileSharing
