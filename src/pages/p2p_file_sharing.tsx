import React from 'react'
import { NavigateFunction } from 'react-router-dom'
import { ArrowBack, Send } from '@mui/icons-material'
import { useLocation, useNavigate } from 'react-router-dom'
import { Accordion, AccordionDetails, AccordionSummary, Alert, AlertTitle, Box, Button, Card, Chip, Divider, IconButton, LinearProgress, ListItem, ListItemButton, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { Buffer } from 'buffer'

import { AnswerConnection, StartConnection } from '../networking/webrtc'
import ProgressBar from '../components/progress_bar'
import { FileInfo, fileToFileInfo, formatBytes, getWebRTCStatus, getWebsocketStatus, getWebsocketURL, millisecondsToX, Progress, triggerDownload } from '../utilities/utils'

const CHUNK_SIZE = 16_000 // ~16kb chunk size for WebRTC data channel

// Creates a p2p file share link containing the local websocket key and local webrtc offer
const createLink = async (webSocketKey: string, localOffer: RTCSessionDescriptionInit) => {
    const link = `${window.location}#${webSocketKey}#${Buffer.from(JSON.stringify(localOffer), 'ascii').toString('base64')}`
    return link
}

// Parses a p2p file share link containing the peer websocket key and peer webrtc offer
const parseLink = (urlData: string) => {
    const [peerSocketKey, remoteOffer] = urlData.slice(1).split("#")
    return {
        remoteOffer: JSON.parse(Buffer.from(remoteOffer, 'base64').toString()) as RTCSessionDescriptionInit,
        peerSocketKey: peerSocketKey
    }
}

// Types
type IState = {
    // Websocket state
    websocket: WebSocket | undefined;
    webSocketKey: string;
    peerWebSocketKey: string;
    wsReadyState: number;
    // WebRTC state
    localConn: RTCPeerConnection | undefined;
    sendChannel: RTCDataChannel | undefined;
    channelReadyState: RTCDataChannelState;
    iceCandidates: Array<string>;
    // Page state
    uploadFile: File | undefined;
    downloadFileChunks: Array<ArrayBuffer>;
    downloadFileInfo: FileInfo | undefined;
    downloadStartTime: number;
    metricsTimer: number;
    progress: Progress | undefined;
    peerURL: string
    loading: boolean
    message: string
    messages: Array<ChannelMessage>;
}
type IProps = {
    navigate: NavigateFunction
    hash: string
}
type ChannelMessage = {
    sent: boolean;
    message: string;
    when: number;
}
type WebRTCStats = {
    bytesReceived: number;
    bytesSent: number;
}
class P2PFileSharing extends React.Component<IProps, IState> {
    constructor(props: any) {
        super(props)
        this.state = {
            // Websocket stuff
            websocket: undefined,
            webSocketKey: "",
            peerWebSocketKey: "",
            wsReadyState: WebSocket.CLOSED,
            // WebRTC stuff
            localConn: undefined,
            sendChannel: undefined,
            channelReadyState: "closed",
            iceCandidates: [],

            uploadFile: undefined,
            downloadFileChunks: [],
            downloadFileInfo: undefined,
            downloadStartTime: 0,
            metricsTimer: -1,
            progress: undefined,
            peerURL: "",
            loading: false,
            message: "",
            messages: [],
        }
    }

    componentDidMount(): void {
        const websocket = new WebSocket(getWebsocketURL())
        websocket.onmessage = this.wsOnMessage
        websocket.onopen = this.wsOnOpen
        websocket.onclose = this.wsOnClose
        websocket.onerror = this.wsOnError
        this.setState({ websocket: websocket, wsReadyState: WebSocket.CONNECTING })
    }

    componentWillUnmount(): void {
        this.state.websocket?.close?.()
        this.state.sendChannel?.close?.()
        this.state.localConn?.close?.()
    }

    /* Websocket event handlers */

    wsSendMessage = (wsMessage: any) => {
        this.state.websocket?.send(JSON.stringify(wsMessage))
    }
    wsOnMessage = (wsMessage: MessageEvent<any>) => {
        try {
            const message = JSON.parse(wsMessage.data)
            switch (message.command) {
                case "websocket-key":
                    console.log("[WS] received websocket-key:", message.data)
                    this.setState({ webSocketKey: message.data })
                    break
                case "answer":
                    console.log("[WS] received answer:", message.data)
                    const remoteAnswer = JSON.parse(message.data) as RTCSessionDescriptionInit
                    this.state.localConn?.setRemoteDescription(remoteAnswer)
                    break
                case "icecandidate":
                    console.log("[WS] received icecandidate:", message.data)
                    this.state.localConn?.addIceCandidate(JSON.parse(message.data))
                    break
                default:
                    console.warn("[WS] unknown command:", message)
                    break
            }
            if (!this.state.peerWebSocketKey.length && message.from?.length) {
                console.log("[WS] found peer websocket key:", message.from)
                this.setState({ peerWebSocketKey: message.from })
            }
        } catch (err) {
            console.error("[WS] message error:", err)
            enqueueSnackbar(`Failed to parse websocket message: ${err}`, { variant: "error" })
        }
    }
    wsOnOpen = (_: Event) => {
        this.setState({ wsReadyState: WebSocket.OPEN })
        console.log("[WS] Opened")
        if (this.props.hash.length) {
            console.log("Leech page detected...")
            setTimeout(() => this.leechShareLink(), 1000)
        } else {
            console.log("Seed page detected...")
        }
        enqueueSnackbar(`Websocket connection established`, { variant: "success" })
    }
    wsOnClose = (e: CloseEvent) => {
        this.setState({ wsReadyState: WebSocket.CLOSED })
        console.warn("[WS] Closed")
        enqueueSnackbar(`Websocket closed with code=${e.code} and reason=${e.reason}`, { variant: "warning" })
    }
    wsOnError = (e: Event) => {
        this.setState({ wsReadyState: WebSocket.CLOSING })
        console.error("[WS] Error", e)
        enqueueSnackbar(`Websocket error occurred`, { variant: "error" })
    }

    /* WebRTC event handlers */

    channelSendMessage = (message: string) => {
        if (!this.state.sendChannel) throw new Error("Send channel not initialized, unable to send message")

        this.state.sendChannel.send(JSON.stringify({ type: "message", data: message }))
        this.setState({ messages: this.state.messages.concat({ sent: true, message: message, when: Date.now() }) })
    }
    channelOnMessage = (message: MessageEvent<any>) => {
        switch (typeof message.data) {
            case "string":
                const msg = JSON.parse(message.data)
                console.log(`[WebRTC] Data channel received '${msg.type}'`)
                switch (msg.type) {
                    case "message":
                        this.setState({ messages: this.state.messages.concat({ sent: false, message: msg.data?.toString(), when: Date.now() }) })
                        break
                    case "file-info":
                        this.setState({
                            downloadFileInfo: {
                                name: msg.data.name,
                                size: msg.data.size as number,
                                added: (new Date()).toLocaleString(),
                                type: "",
                                wrapped_file_key: ""
                            }
                        })
                        break
                    case "start-download":
                        this.initiateFileTransfer()
                        break
                    case "finish-download":
                        triggerDownload(this.state.downloadFileInfo?.name || "unknown-name", new Blob(this.state.downloadFileChunks))
                        clearInterval(this.state.metricsTimer)
                        this.setState({ loading: false, downloadFileChunks: [], metricsTimer: -1, progress: undefined })
                        break;
                }
                break;
            case "object":
                // TODO: Instead of saving chanks in RAM, stream to disk to allow massive file transfer (use FileSystemWritableFileStream)
                this.setState(prevState => {
                    return { downloadFileChunks: [...prevState.downloadFileChunks, message.data] }
                })
                break;
            default:
                console.warn("[WebRTC] Data channel received unrecognized message type: ", typeof message.data)
        }
    }
    channelOnStateChange = () => {
        const readyState = this.state.sendChannel?.readyState || 'closed'
        this.setState({ channelReadyState: readyState })
        if (readyState === "closed") {
            console.warn("[WebRTC] Closed")
            return
        }
        console.log("[WebRTC] channel state changed:", readyState)
        if (this.state.sendChannel && this.state.uploadFile && readyState === "open") {
            console.log("[WebRTC] sending file information...")
            this.state.sendChannel.send(JSON.stringify(
                { type: "file-info", data: { name: this.state.uploadFile.name, size: this.state.uploadFile.size } }
            ))
        }
    }
    channelOnError = (error: RTCErrorEvent) => {
        console.log("[WebRTC] channel error:", error)
    }
    onDataChannel = (ev: RTCDataChannelEvent) => {
        console.log("[WebRTC] new data channel received:", ev.channel.readyState)
        this.setState({ sendChannel: ev.channel, channelReadyState: ev.channel.readyState }, () => {
            ev.channel.onmessage = this.channelOnMessage
            ev.channel.onopen = this.channelOnStateChange
            ev.channel.onclose = this.channelOnStateChange
            ev.channel.onerror = this.channelOnError
        })
    }
    onIceCandidate = (iceCandidate: RTCIceCandidate | null) => {
        if (!iceCandidate) return
        try {
            const iceCandidateStr = JSON.stringify(iceCandidate.toJSON())
            if (!this.state.peerWebSocketKey.length) {
                // if peer socket-key not initialized then store icecandidate
                this.setState((prevState) => {
                    return { iceCandidates: prevState.iceCandidates.concat(iceCandidateStr) }
                })
                return
            }
            console.log("[WS] Sending icecandidate to peer")
            this.wsSendMessage({
                from: this.state.webSocketKey,
                to: this.state.peerWebSocketKey,
                command: "icecandidate",
                data: iceCandidateStr
            })
        } catch (err) {
            console.error("icecandidate share err:", err)
            enqueueSnackbar(`Failed to share icecandidate with peer: ${err}`, { variant: "error" })
        }
    }

    // Prepare WebRTC and create an offer
    seedShareLink = async () => {
        try {
            this.setState({ loading: true })
            // Create localConn and generate offer
            const local = await StartConnection(this.onIceCandidate)
            local.sendChannel.onmessage = this.channelOnMessage
            local.sendChannel.onopen = this.channelOnStateChange
            local.sendChannel.onclose = this.channelOnStateChange
            local.sendChannel.onerror = this.channelOnError
            // Convert local offer into a URL
            if (!this.state.webSocketKey.length) throw new Error("webSocketKey not initialized")
            const link = await createLink(this.state.webSocketKey, local.localOffer!)
            // Save data
            this.setState({
                localConn: local.localConn,
                sendChannel: local.sendChannel,
                peerURL: link
            })
        } catch (err) {
            console.error("seed share link:", err)
            enqueueSnackbar(`Failed to create share link: ${err}`, { variant: "error" })
        } finally {
            this.setState({ loading: false })
        }
    }

    // Prepare WebRTC and create an answer
    leechShareLink = async () => {
        try {
            this.setState({ loading: true })
            // Parse remote offer (from the URL)
            const { peerSocketKey, remoteOffer } = parseLink(this.props.hash)
            // Create localConn and generate offer
            const local = await AnswerConnection(this.onIceCandidate, remoteOffer)
            local.localConn.ondatachannel = this.onDataChannel
            // Send answer to peer through signaling
            console.log("[WS] Sending answer")
            this.wsSendMessage({
                from: this.state.webSocketKey,
                to: peerSocketKey,
                command: "answer",
                data: JSON.stringify(local.localAnswer)
            })
            // Save data
            this.setState({
                peerWebSocketKey: peerSocketKey,
                localConn: local.localConn
            })
        } catch (err) {
            console.error("leech share link:", err)
            enqueueSnackbar(`Failed to leech share link: ${err}`, { variant: "error" })
        } finally {
            this.setState({ loading: false })
        }
    }

    // Handle file picking and initiate seedShareLink
    handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ uploadFile: event.target?.files?.[0] })
        this.seedShareLink()
    }

    // Requests file trasnfer start from peer & initiates metrics fetching
    requestFileTransfer = () => {
        try {
            if (!this.state.sendChannel) throw new Error("Send channel not initialized, unable to send message")
            // Send start download event to peer
            this.state.sendChannel.send(JSON.stringify({ type: "start-download" }))
            // Start metrics fetching job
            const metricsTimer = setInterval(this.handleMetrics, 100)
            this.setState({ loading: true, downloadStartTime: Date.now(), metricsTimer: metricsTimer })
        } catch (err) {
            console.error("[WebRTC] failed to request start-download:", err)
            enqueueSnackbar(`Failed to request file download: ${err}`, { variant: "error" })
        }
    }

    // Splits the file into chunks and initiates transfer to peer & metrics fetching
    initiateFileTransfer = async () => {
        try {
            this.setState({ loading: true })
            if (!this.state.uploadFile) { throw new Error("file not initialized, unable to send file") }
            const file = this.state.uploadFile

            // Chunk file into blobs to be sent
            const chunkCount = Math.ceil(file.size / CHUNK_SIZE)
            const chunks: Array<Blob> = []
            console.log(`[WebRTC] Sending file: fileSize=${formatBytes(file.size)} chunkSize=${CHUNK_SIZE} chunkCount=${chunkCount}`)
            for (let i = 0; i < chunkCount; i++) {
                const currentByte = i * CHUNK_SIZE
                const targetByte = currentByte + CHUNK_SIZE
                if (targetByte > file.size) {
                    chunks.push(file.slice(currentByte))
                } else {
                    chunks.push(file.slice(currentByte, targetByte))
                }
            }
            // Start file chunk sending job
            this.sendFileChunks(chunks)
            // Start metrics fetching job
            const metricsTimer = setInterval(this.handleMetrics, 100)
            this.setState({ downloadStartTime: Date.now(), metricsTimer: metricsTimer })
        } catch (err) {
            console.error("[WebRTC] send file err:", err)
            this.setState({ loading: false })
        }
    }

    // Starts sending chunks to the peer. This can block until channel bufferedAmount passes threshold. 
    // After which this function becomes async and continues sending when buffered amount decreases below threshold
    sendFileChunks = async (chunks: Blob[]) => {
        const sendChannel = this.state.sendChannel!
        if (chunks.length) {
            // Slow down, recurse once buffered amount decreases
            // TODO: maybe this can be a nice async func we can await
            if (sendChannel.bufferedAmount > sendChannel.bufferedAmountLowThreshold) {
                sendChannel.onbufferedamountlow = () => {
                    sendChannel.onbufferedamountlow = null;
                    this.sendFileChunks(chunks);
                };
                return;
            }
            // Remove chunk from list
            const chunkBlob = chunks[0]
            // Read chunk of file
            const chunk = await chunkBlob.arrayBuffer()
            // Send file chunk to peer
            sendChannel.send(chunk)
            if (chunks.length === 1) {
                // Last chunk means we notify peer we are done
                // TODO: send hash of file for integrity checks
                clearInterval(this.state.metricsTimer)
                this.setState({ loading: false, progress: undefined, metricsTimer: -1 })
                // TODO: Timeout should be removed
                setTimeout(() => sendChannel.send(JSON.stringify({ type: "finish-download" })), 500)
            } else {
                // Recurse until there are none left
                this.sendFileChunks(chunks.slice(1))
            }
        }
    }

    // Fetches metrics from either the peer channel or the partially downloaded file 
    handleMetrics = async () => {
        const { localConn, uploadFile, downloadFileInfo, downloadFileChunks, downloadStartTime } = this.state
        // Reciever can estimate progress based on downloaded chunks
        let metrics: WebRTCStats = {
            bytesReceived: downloadFileChunks.length * CHUNK_SIZE,
            bytesSent: 0
        };
        // Get real stats from WebRTC, this only works for the sender for some unknown reason 😡
        const stats = await localConn!.getStats()
        stats.forEach(report => {
            if (report.type === 'data-channel') {
                metrics = stats.get(report.id)
                return
            }
        })
        // Calculate statistics
        const bytesProcessed = Math.max(metrics?.bytesReceived, metrics?.bytesSent, 1);
        const elapsedSec = Math.max(millisecondsToX(Date.now() - downloadStartTime, 'second'), 1)
        const fileSize = downloadFileInfo?.size || uploadFile!.size
        this.setState({
            progress: {
                bytesProcessed: bytesProcessed,
                estimateSec: Math.round(((fileSize / bytesProcessed) * elapsedSec) - elapsedSec),
                percentage: Math.round((bytesProcessed / fileSize) * 100),
                bitRate: parseInt(((bytesProcessed / elapsedSec) * 8).toFixed(2))
            }
        })
    }

    render = () => (
        <Stack sx={{ paddingTop: 10 }}
            direction="row"
            width="100vw"
            height="100vh"
            className="login-container" >
            <Stack sx={{ paddingX: 5 }} flexGrow={1}>
                {this.state.loading && <LinearProgress variant='indeterminate' />}

                <Card sx={{ padding: 5 }}>
                    <Stack direction='row' alignItems='center' spacing={2}>
                        <Tooltip title="Go back" disableInteractive>
                            <IconButton onClick={() => this.props.navigate(-1)}><ArrowBack /></IconButton>
                        </Tooltip>
                        <Typography variant="h5">P2P file sharing</Typography>
                    </Stack>

                    {/* Select file button (sender) */}
                    {!this.props.hash.length &&
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', my: 2 }}>
                            <Button variant={this.state.uploadFile?.name ? "contained" : "outlined"} component="label">
                                {this.state.uploadFile?.name ?? "Select File"}
                                <input onChange={this.handleFile} type="file" hidden />
                            </Button>
                        </Box>
                    }
                    {/* Download file button (receiver) */}
                    {this.state.downloadFileInfo &&
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', my: 2 }}>
                            <Button variant="contained" onClick={this.requestFileTransfer}>
                                Download
                            </Button>
                        </Box>
                    }

                    {/* File transfer indicator */}
                    {(this.state.loading && this.state.progress && (this.state.downloadFileInfo || this.state.uploadFile)) &&
                        <>
                            <ProgressBar sx={{ my: 2 }}
                                onCancel={() => console.log("Attempted cancel download")}
                                progress={this.state.progress}
                                file={this.state.downloadFileInfo || fileToFileInfo(this.state.uploadFile)} />
                        </>
                    }

                    <Divider sx={{ my: 3 }} />
                    <Typography>File Information:</Typography>
                    {/* Sending file information */}
                    {this.state.uploadFile &&
                        <Stack direction="row" gap={2} marginTop={2}>
                            <Typography>File Name:</Typography> <Chip label={this.state.uploadFile?.name} color="info" variant="outlined" />
                            <Typography>File Size:</Typography> <Chip label={formatBytes(this.state.uploadFile?.size || 0)} color="info" variant="outlined" />
                        </Stack>
                    }
                    {/* Receiving file information */}
                    {this.state.downloadFileInfo &&
                        <Stack direction="row" gap={2} marginTop={2}>
                            <Typography>File Name:</Typography> <Chip label={this.state.downloadFileInfo.name} color="info" variant="outlined" />
                            <Typography>File Size:</Typography> <Chip label={formatBytes(this.state.downloadFileInfo.size || 0)} color="info" variant="outlined" />
                        </Stack>
                    }

                    <Divider sx={{ my: 3 }} />
                    <Typography>Network Information:</Typography>
                    {/* Websocket and WebRTC Peer conenction status */}
                    <Stack direction="row" gap={3} marginY={2}>
                        <Stack direction="row"
                            alignItems="center"
                            spacing={1}>
                            <Typography>Server:</Typography>
                            {getWebsocketStatus(this.state.wsReadyState)}
                        </Stack>

                        <Divider orientation='vertical' flexItem />

                        <Stack direction="row"
                            alignItems="center"
                            spacing={1}>
                            <Typography>Peer:</Typography>
                            {getWebRTCStatus(this.state.channelReadyState)}
                        </Stack>
                    </Stack>
                    <Typography color="primary">Local: {this.state.webSocketKey}</Typography>
                    <Typography color="secondary">Peer: {this.state.peerWebSocketKey || "Waiting connection"}</Typography>

                    <Divider sx={{ my: 3 }} />
                    <Typography>Peer Chat:</Typography>
                    {/* Chat section (WebRTC) */}
                    {this.state.channelReadyState === "open"
                        ? <Stack direction="column" width="100%" marginY={2}>
                            <Stack direction="column" gap={1} height={150} maxWidth="100%" overflow="scroll">
                                {this.state.messages.map((msg, idx) =>
                                    <Typography key={idx} color={msg.sent ? "primary" : "secondary"}>{msg.message}</Typography>
                                )}
                            </Stack>
                            <Stack component="form" direction="row" gap={1}
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    this.channelSendMessage(this.state.message)
                                    this.setState({ message: "" })
                                }}>
                                <TextField fullWidth
                                    placeholder='Say hi to your friend while you wait for the download'
                                    value={this.state.message}
                                    onChange={e => this.setState({ message: e.target.value })} />
                                <IconButton color="primary" type='submit' sx={{ p: '10px' }}>
                                    <Send />
                                </IconButton>
                            </Stack>
                        </Stack>
                        : <Typography marginTop={2}>Waiting for peer connection...</Typography>
                    }
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
                {this.state.peerURL &&
                    <Alert variant='standard' color="warning" severity='info' >
                        <Typography>Click the link below to copy it to your clipboard! Leave this page open while the recepient downloads the file!</Typography>
                        <ListItem>
                            <Tooltip title="Click to copy to clipboard">
                                <ListItemButton
                                    sx={{ overflowWrap: "break-all", overflow: 'hidden' }}
                                    onClick={() => {
                                        navigator.clipboard.writeText(this.state.peerURL)
                                        enqueueSnackbar("Copied URL to clipboard!")
                                    }}>
                                    <Typography color="info">{this.state.peerURL}</Typography>
                                </ListItemButton>
                            </Tooltip>
                        </ListItem>
                    </Alert>
                }
            </Stack>
        </Stack >
    )
}

// Wrapper function for class component
export default function P2PFileSharingWrapper() {
    const navigate = useNavigate()
    const { hash } = useLocation()

    return (
        <P2PFileSharing navigate={navigate} hash={hash} />
    )
}
