import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowBack, Send } from '@mui/icons-material'
import { Accordion, AccordionDetails, AccordionSummary, Alert, AlertTitle, Box, Button, Card, Divider, IconButton, LinearProgress, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { Buffer } from 'buffer'
import useWebSocket from 'react-use-websocket'

import { AnswerConnection, StartConnection } from '../networking/webrtc'
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

type ChannelMessage = {
    sent: boolean;
    message: string;
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
    const [webSocketKey, setWebSocketKey] = useState("")
    const [peerWebSocketKey, setPeerWebSocketKey] = useState("")
    // WebRTC stuff
    const [localConn, setLocalConn] = useState<RTCPeerConnection | undefined>()
    const [sendChannel, setSendChannel] = useState<RTCDataChannel | undefined>()
    const [channelReadyState, setChannelReadyState] = useState<RTCDataChannelState>("closed")
    const [iceCandidates, setIceCandidates] = useState<Array<string>>([])
    // Page stuff
    const [selectedFile, setSelectedFile] = useState<File | undefined>()
    const [peerURL, setPeerURL] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")
    const [messages, setMessages] = useState<Array<ChannelMessage>>([])

    useEffect(() => {
        return () => {
            getWebSocket()?.close()
        }
    }, [])

    useEffect(() => {
        if (!webSocketKey.length || !peerWebSocketKey.length) return
        // We have a peer websocket, let's send our queued icecandidates
        iceCandidates.forEach(iceCandidateStr => {
            console.log("[WS] Sending icecandidate to peer (effect)")
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
    function wsOnOpen(_: Event) {
        console.log("[WS] Opened")
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
    const channelSendMessage = (message: string) => {
        sendChannel?.send(message)
        setMessages(prev => prev.concat({ sent: true, message: message }))
    }
    const channelOnMessage = (_: RTCDataChannel, message: MessageEvent<any>) => {
        console.log("[WebRTC] Data channel received message", message.data)
        setMessages(prev => prev.concat({ sent: false, message: message.data?.toString() }))
    }
    const channelOnStateChange = (sendChannel: RTCDataChannel) => {
        console.log("sendChannel:", sendChannel)
        console.log("[WebRTC] channel state changed:", sendChannel?.readyState)
        setChannelReadyState(sendChannel?.readyState || 'closed')
    }
    const channelOnError = (_: RTCDataChannel, error: RTCErrorEvent) => {
        console.log("[WebRTC] channel error:", error)
    }
    const connOnDataChannel = (sendChannel: RTCDataChannel) => {
        console.log("[WebRTC] new data channel received:", sendChannel)
        sendChannel.onerror = (err) => channelOnError(sendChannel, err)
        sendChannel.onclose = () => channelOnStateChange(sendChannel)
        sendChannel.onopen = () => channelOnStateChange(sendChannel)
        sendChannel.onmessage = (ev) => channelOnMessage(sendChannel, ev)
        setSendChannel(sendChannel)
    }

    // Event handler for when an ICE candidate is ready to be transmitted to the peer
    const handleIceCandidate = (iceCandidate: RTCIceCandidate | null) => {
        if (!iceCandidate) return
        try {
            const iceCandidateStr = JSON.stringify(iceCandidate.toJSON())
            if (!peerWebSocketKey.length) {
                console.log("peer socket-key not initialized, storing icecandidate")
                setIceCandidates((prev) => prev.concat(iceCandidateStr))
                return
            }
            console.log("[WS] Sending icecandidate to peer")
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

    // Prepare WebRTC and create an offer
    const seedShareLink = async () => {
        try {
            setLoading(true)
            // Create localConn and generate offer
            const local = await StartConnection(handleIceCandidate, channelOnMessage, channelOnStateChange, channelOnError)
            // Convert local offer into a URL
            if (!webSocketKey.length) throw new Error("webSocketKey not initialized")
            const link = await createLink(webSocketKey, local.localOffer!)
            // Save data
            setLocalConn(local.localConn)
            setSendChannel(local.sendChannel)
            setPeerURL(link)
        } catch (err) {
            console.error("seed share link:", err)
        } finally {
            setLoading(false)
        }
    }

    // Prepare WebRTC and create an answer
    const leechShareLink = async () => {
        try {
            setLoading(true)
            // Parse remote offer (from the URL)
            const { peerSocketKey, remoteOffer } = parseLink(hash)
            // Create localConn and generate offer
            const local = await AnswerConnection(handleIceCandidate, connOnDataChannel, remoteOffer)
            // Send answer to peer through signaling
            console.log("[WS] Sending answer")
            sendJsonMessage({
                from: webSocketKey,
                to: peerSocketKey,
                command: "answer",
                data: JSON.stringify(local.localAnswer)
            })
            // Save data
            setPeerWebSocketKey(peerSocketKey)
            setLocalConn(local.localConn)
        } catch (err) {
            console.error("leech share link:", err)
        } finally {
            setLoading(false)
        }
    }

    // Handle file picking and initiate seedShareLink
    const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
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

                {channelReadyState === "open"
                    ? <Stack direction="column">
                        {messages.map((msg, idx) =>
                            <Typography key={idx} color={msg.sent ? "primary" : "secondary"}>{msg.message}</Typography>
                        )}
                        <Stack direction="row" gap={1}>
                            <TextField value={message}
                                onChange={e => setMessage(e.target.value)} />
                            <Divider orientation='vertical' />
                            <IconButton color="primary" sx={{ p: '10px' }}
                                onClick={() => {
                                    channelSendMessage(message);
                                    setMessage("")
                                }}>
                                <Send />
                            </IconButton>
                        </Stack>
                    </Stack>
                    : <Typography>Peer not connected yet...</Typography>
                }
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
