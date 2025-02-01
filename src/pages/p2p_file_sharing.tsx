import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowBack } from '@mui/icons-material'
import { Accordion, AccordionDetails, AccordionSummary, Alert, AlertTitle, Box, Button, Card, IconButton, LinearProgress, Stack, Tooltip, Typography } from '@mui/material'
import { Buffer } from 'buffer'
import useWebSocket from 'react-use-websocket'

import { CreateConnection } from '../networking/webrtc'
import { GetWebsocketURL } from '../networking/websocket'
import { getWebRTCStatus, getWebsocketStatus } from '../utilities/utils'

const createLink = async (webSocketKey: string, localOffer: RTCSessionDescriptionInit) => {
    const link = `${window.location}#${webSocketKey}#${Buffer.from(JSON.stringify(localOffer), 'ascii').toString('base64')}`
    console.log("Share link generated: ", link)
    return link
}

const parseLink = (urlData: string) => {
    const [peerSocketKey, remoteOffer] = urlData.slice(1).split("#")
    return {
        remoteOffer: JSON.parse(Buffer.from(remoteOffer, 'base64').toString()) as RTCSessionDescriptionInit,
        peerSocketKey: peerSocketKey
    }
}

function P2PFileSharing() {
    const navigate = useNavigate()
    const { hash } = useLocation()
    // Websocket stuff
    const { sendJsonMessage, readyState, getWebSocket } = useWebSocket(
        GetWebsocketURL(),
        {
            onMessage: wsOnMessage,
            onOpen: wsOnOpen,
            onClose: wsOnClose,
            onError: wsOnError
        }
    );
    const [webSocketKey, setWebSocketKey] = useState('')
    const [peerWebSocketKey, setPeerWebSocketKey] = useState('')
    // WebRTC stuff
    const [localConn, setLocalConn] = useState<RTCPeerConnection | undefined>()
    const [sendChannel, setSendChannel] = useState<RTCDataChannel | undefined>()
    const [channelReadyState, setChannelReadyState] = useState<RTCDataChannelState>("closed")
    const [iceCandidates, setIceCandidates] = useState<Array<string>>([])
    // Page stuff
    const [selectedFile, setSelectedFile] = useState<File | undefined>()
    const [peerURL, setPeerURL] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        return () => {
            getWebSocket()?.close()
        }
    }, [])

    useEffect(() => {
        if (!webSocketKey.length || !peerWebSocketKey.length) return
        // We have a peer websocket, let's send our queued icecandidates
        iceCandidates.forEach(iceCandidateStr => {
            console.log("Sending icecandidate to peer (effect)")
            sendJsonMessage({
                from: webSocketKey,
                to: peerWebSocketKey,
                command: "icecandidate",
                data: iceCandidateStr
            })
        })
    }, [webSocketKey, peerWebSocketKey])

    // Websocket event handlers
    function wsOnMessage(wsMessage: MessageEvent<any>) {
        try {
            const message = JSON.parse(wsMessage.data)
            switch (message.command) {
                case "websocket-key":
                    console.log("[WS] received websocket-key:", message.data)
                    setWebSocketKey(message.data)
                    break
                case "answer":
                    console.log("[WS] received answer:", message.data)
                    const remoteAnswer = JSON.parse(message.data) as RTCSessionDescriptionInit
                    localConn?.setRemoteDescription(remoteAnswer)
                    break
                case "icecandidate":
                    console.log("[WS] received icecandidate:", message.data)
                    localConn?.addIceCandidate(JSON.parse(message.data))
                    break
                default:
                    console.warn("[WS] unknown command:", message)
                    break
            }
            if (!peerWebSocketKey.length && message.from?.length) {
                console.log("Got peer websocket key:", message.from)
                setPeerWebSocketKey(message.from)
            }
        } catch (err) {
            console.error("[WS] message error:", err)
        }
    }
    function wsOnOpen(e: Event) {
        console.log("[WS] Opened", e)
        if (hash.length) {
            console.log("Leech page detected...")
            setTimeout(() => leechShareLink(), 1000)
        } else {
            console.log("Seed page detected...")
        }
    }
    function wsOnClose(e: CloseEvent) {
        console.warn("[WS] Closed", e)
    }
    function wsOnError(e: Event) {
        console.error("[WS] Error", e)
    }

    // WebRTC event handlers
    function channelOnStateChange(sendChannel: RTCDataChannel) {
        if (sendChannel) {
            const { readyState } = sendChannel;
            console.log(`Send channel state is: ${readyState}`);
            if (readyState === 'open') {
                console.log(`BOOOM SEND THE FUCKIN FILE DAWG`);
            }
            setChannelReadyState(readyState)
        }
    }
    function channelOnError(sendChannel: RTCDataChannel, error: RTCErrorEvent) {
        if (sendChannel) {
            console.error('Error in sendChannel:', error);
            return;
        }
        console.log('Error in sendChannel which is already closed:', error);
    }

    function handleIceCandidate(iceCandidate: RTCIceCandidate) {
        try {
            const iceCandidateStr = JSON.stringify(iceCandidate.toJSON())
            if (!peerWebSocketKey.length) {
                console.log("peer socket-key not initialized, storing icecandidate")
                setIceCandidates((prev) => prev.concat(iceCandidateStr))
                return
            }
            console.log("Sending icecandidate to peer")
            sendJsonMessage({
                from: webSocketKey,
                to: peerWebSocketKey,
                command: "icecandidate",
                data: iceCandidateStr
            })
        } catch (err) {
            console.error("icecandidate share err:", err)
        }
    }

    async function seedShareLink() {
        try {
            setLoading(true)
            // Create localConn and generate offer
            const local = await CreateConnection(handleIceCandidate, channelOnStateChange, channelOnError, undefined)
            // Convert local offer into a URL
            if (!webSocketKey.length) throw new Error("webSocketKey not initialized")
            const link = await createLink(webSocketKey, local.localOffer!)
            setLocalConn(local.localConn)
            setSendChannel(local.sendChannel)
            setPeerURL(link)
        } catch (err) {
            console.error("seed share link:", err)
        } finally {
            setLoading(false)
        }
    }

    async function leechShareLink() {
        try {
            setLoading(true)
            // Parse remote offer (from the URL)
            const { peerSocketKey, remoteOffer } = parseLink(hash)
            // Create localConn and generate offer
            const local = await CreateConnection(handleIceCandidate, channelOnStateChange, channelOnError, remoteOffer)
            // Convert local offer into a URL
            sendJsonMessage({
                from: webSocketKey,
                to: peerSocketKey,
                command: "answer",
                data: JSON.stringify(local.localAnswer)
            })
            // Save data
            setPeerWebSocketKey(peerSocketKey)
            setLocalConn(local.localConn)
            setSendChannel(local.sendChannel)
        } catch (err) {
            console.error("leech share link:", err)
        } finally {
            setLoading(false)
        }
    }

    function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
        setSelectedFile(event.target?.files?.[0])
        seedShareLink()
    }

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
                    <Stack direction="row" alignItems="center" spacing={2} display="flex">
                        <Typography>Websocket Status:</Typography>
                        {getWebsocketStatus(readyState)}
                        <Typography>WebRTC Status:</Typography>
                        {getWebRTCStatus(channelReadyState)}
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={2} display="flex">
                        <Typography color="primary">Local Socket: {webSocketKey}</Typography>
                        <Typography color="secondary">Peer Socket: {peerWebSocketKey}</Typography>
                    </Stack>
                    {loading && <LinearProgress variant='indeterminate' />}
                </Card>
            </Stack>
            <Stack sx={{ paddingX: 5, maxWidth: "50%" }} flexGrow={1}>
                <Alert variant="standard" severity="info">
                    <AlertTitle>
                        <Typography variant="h5">Peer-To-Peer file sharing</Typography>
                    </AlertTitle>
                    <Typography sx={{ my: 3 }}>This page allow you to share files directly (without a server) to your friends!</Typography>

                    <Accordion defaultExpanded>
                        <AccordionSummary><Typography component="span">Sending a file?</Typography></AccordionSummary>
                        <AccordionDetails>
                            <Typography>
                                Select a file, once selected you will be able to copy a <b>share link</b> or copy a QR code.<br />
                                Share this link or QR code with a friend, once they open the link they will be able to download the file <br />
                                directly from you! <b>Make sure not to close this tab</b> while the file is being transfered.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                    <Accordion>
                        <AccordionSummary><Typography component="span">Receiving a file?</Typography></AccordionSummary>
                        <AccordionDetails>
                            <Typography>
                                Simply clicking on the share link or scanning the QR code you received should initiate the download.<br />
                                Otherwise, paste the link on the left side and click <b>connect</b>.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                </Alert>
                {peerURL &&
                    <Alert>
                        <Typography sx={{ my: 3 }}>
                            {peerURL}
                        </Typography>
                    </Alert>
                }
            </Stack>
        </Stack>
    )
}

export default P2PFileSharing
