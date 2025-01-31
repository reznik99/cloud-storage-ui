import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowBack } from '@mui/icons-material'
import { Accordion, AccordionDetails, AccordionSummary, Alert, AlertTitle, Box, Button, Card, Divider, FormControl, FormLabel, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material'


function P2PFileSharing() {
    const navigate = useNavigate()
    const [peerURL, setPeerURL] = useState("")
    const [selectedFile, setSelectedFile] = useState<File | null>()

    const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFile(event.target?.files?.[0])
    }, [])

    // TODO: WebRTC logic for peer setup, qr-code & url signaling, file sharing

    return (
        <Stack sx={{ paddingTop: 10 }}
            direction="row"
            width="100vw"
            height="100vh"
            className="login-container">
            <Stack sx={{ paddingX: 5 }} flexGrow={1}>
                <Card sx={{ padding: 5 }}>
                    <Stack direction='row' alignItems='center' spacing={2}>
                        <Tooltip title="Go back" disableInteractive>
                            <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>
                        </Tooltip>
                        <Typography variant="h5">P2P file sharing</Typography>
                    </Stack>

                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', my: 2 }}>
                        <Button variant={selectedFile?.name ? "contained" : "outlined"} component="label">
                            {selectedFile?.name ?? "Select File"}
                            <input onChange={handleFile} type="file" hidden />
                        </Button>
                    </Box>

                    <Divider sx={{ my: 3 }}>Receiving a file?</Divider>

                    <FormControl fullWidth>
                        <FormLabel htmlFor="peer-url">Peer URL</FormLabel>
                        <TextField fullWidth
                            name="peer-url"
                            placeholder={`${window.location.href}#....`}
                            variant="outlined"
                            color="primary"
                            value={peerURL}
                            onChange={(e) => setPeerURL(e.target.value)} />
                    </FormControl>
                </Card>
            </Stack>
            <Stack sx={{ paddingX: 5 }} flexGrow={1}>
                <Alert variant="standard" severity="info">
                    <AlertTitle>
                        <Typography variant="h5">Peer-To-Peer file sharing</Typography>
                    </AlertTitle>
                    <Typography sx={{ my: 3 }}>This page allow you to share files directly (without a server) to your friends!</Typography>

                    <Accordion defaultExpanded>
                        <AccordionSummary>Sending a file?</AccordionSummary>
                        <AccordionDetails>
                            Select a file, once selected you will be able to copy a <b>share link</b> or copy a QR code.<br />
                            Share this link or QR code with a friend, once they open the link they will be able to download the file <br />
                            directly from you! <b>Make sure not to close this tab</b> while the file is being transfered.
                        </AccordionDetails>
                    </Accordion>
                    <Accordion>
                        <AccordionSummary>Receiving a file?</AccordionSummary>
                        <AccordionDetails>
                            Simply clicking on the share link or scanning the QR code you received should initiate the download.<br />
                            Otherwise, paste the link on the left side and click <b>connect</b>.
                        </AccordionDetails>
                    </Accordion>

                </Alert>
            </Stack>
        </Stack>
    )
}

export default P2PFileSharing
