import React from 'react'
import { NavigateFunction } from 'react-router-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { enqueueSnackbar } from 'notistack'
import ArrowBack from '@mui/icons-material/ArrowBack'
import Send from '@mui/icons-material/Send'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Container from "@mui/material/Container"
import Divider from '@mui/material/Divider'
import Grid2 from "@mui/material/Grid2"
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import ProgressBar from '../components/progress_bar'
import { WS_URL } from '../networking/endpoints'
import { FileInfo, fileToFileInfo, formatBytes, getWebRTCStatus, getWebsocketStatus, millisecondsToX, Progress, triggerDownload } from '../utilities/utils'
import { ChannelMessage, rtcChunkSize, CreateP2PLink, ParseP2PLink, rtcDataChannelName, rtcPeerConstraints, WebRTCStats } from '../networking/webrtc'
import logo from '/logo.png'

// Types
type IState = {
    // Websocket state
    wsKey: string;
    wsPeerKey: string;
    wsReadyState: number;
    // WebRTC state
    rtcConn: RTCPeerConnection | undefined;
    rtcChanel: RTCDataChannel | undefined;
    rtcReadyState: RTCDataChannelState;
    rtcIceCandidates: Array<string>;
    rtcNewMessage: string;
    rtcMessages: Array<ChannelMessage>;
    // Page state
    uploadFile: File | undefined;
    downloadFileInfo: FileInfo | undefined;
    transferStartTime: number;
    transferProgress: Progress | undefined;
    metricsIntervalID: number;
    shareLink: string;
    loading: boolean;
}
type IProps = {
    navigate: NavigateFunction;
    hash: string;
}

class P2PFileSharing extends React.Component<IProps, IState> {
    // Static data (prevent re-rendering)
    downloadFileChunks: Array<ArrayBuffer> = []
    websocket: WebSocket | undefined
    chatElement!: HTMLDivElement | null

    constructor(props: IProps) {
        super(props)
        this.state = {
            // Websocket variables
            wsKey: "",
            wsPeerKey: "",
            wsReadyState: WebSocket.CLOSED,
            // WebRTC variables
            rtcConn: undefined,
            rtcChanel: undefined,
            rtcReadyState: "closed",
            rtcIceCandidates: [],
            rtcNewMessage: "",
            rtcMessages: [],
            // Page variables
            uploadFile: undefined,
            downloadFileInfo: undefined,
            transferStartTime: 0,
            transferProgress: undefined,
            metricsIntervalID: -1,
            shareLink: "",
            loading: false,
        }
    }

    componentDidMount(): void {
        window.scrollTo(0, 0)
        const websocket = new WebSocket(WS_URL)
        websocket.onmessage = this.wsOnMessage
        websocket.onopen = this.wsOnOpen
        websocket.onclose = this.wsOnClose
        websocket.onerror = this.wsOnError
        this.websocket = websocket
        this.setState({ wsReadyState: WebSocket.CONNECTING })
    }

    componentWillUnmount(): void {
        // Close connections without showing user, as they meant to perform this action (back-button)
        if (this.websocket) {
            this.websocket.onclose = () => { }
            this.websocket.onerror = () => { }
            this.websocket.close()
        }
        if (this.state.rtcChanel) {
            this.state.rtcChanel.onclose = () => { }
            this.state.rtcChanel.onerror = () => { }
            this.state.rtcChanel.close()
        }
        if (this.state.rtcConn) {
            this.state.rtcConn.close()
        }
    }

    componentDidUpdate(_prevProps: Readonly<IProps>, prevState: Readonly<IState>): void {
        if (prevState.rtcMessages.length != this.state.rtcMessages.length) {
            this.chatElement?.scrollIntoView({ behavior: 'smooth' })
        }
    }

    /* Websocket event handlers */

    wsSendMessage = (wsMessage: object) => {
        this.websocket?.send(JSON.stringify(wsMessage))
    }
    wsOnMessage = async (wsMessage: MessageEvent) => {
        try {
            const message = JSON.parse(wsMessage.data)
            console.log(`[WS] received '${message.command}' message`)
            switch (message.command) {
                case "websocket-key": {
                    this.setState({ wsKey: message.data })
                    break
                }
                case "answer": {
                    const remoteAnswer = JSON.parse(message.data) as RTCSessionDescriptionInit
                    try {
                        await this.state.rtcConn?.setRemoteDescription(remoteAnswer)
                    } catch (err) { console.warn("[WS] set remote description failed:", err) }
                    break
                }
                case "icecandidate": {
                    console.debug("[WS] signalingState", this.state.rtcConn?.signalingState)
                    try {
                        await this.state.rtcConn?.addIceCandidate(new RTCIceCandidate(JSON.parse(message.data)))
                    } catch (err) { console.warn("[WS] add ice candidate failed:", err) }
                    break
                }
            }
            if (!this.state.wsPeerKey.length && message.from?.length) {
                console.log("[WS] found peer websocket key:", message.from)
                const cachedIceCandidates = [...this.state.rtcIceCandidates]
                this.setState({ loading: true, wsPeerKey: message.from, rtcIceCandidates: [] })
                // Send any cached IceCandidates to the peer
                if (cachedIceCandidates.length) {
                    console.log(`[WS] sending ${cachedIceCandidates.length} cached icecandidates`)
                    cachedIceCandidates.forEach(iceCandidateStr => {
                        this.wsSendMessage({
                            from: this.state.wsKey,
                            to: message.from, // wsPeerKey,
                            command: "icecandidate",
                            data: iceCandidateStr
                        })
                    })
                }
            }
        } catch (err) {
            console.error("[WS] message error:", err)
            enqueueSnackbar(`Failed to parse websocket message: ${err}`, { variant: "error" })
        }
    }
    wsOnOpen = () => {
        console.log("[WS] Opened")
        this.setState({ wsReadyState: WebSocket.OPEN })
        if (this.props.hash.length) {
            console.log("Leech page detected...")
            // TODO: Timeout should be removed
            setTimeout(() => this.leechShareLink(), 1000)
        } else {
            console.log("Seed page detected...")
        }
        enqueueSnackbar(`Websocket connection established`, { variant: "success" })
    }
    wsOnClose = (e: CloseEvent) => {
        console.warn("[WS] Closed")
        this.setState({ wsReadyState: WebSocket.CLOSED })
        enqueueSnackbar(`Websocket closed with code=${e.code}`, { variant: "warning" })
    }
    wsOnError = (e: Event) => {
        console.error("[WS] Error", e)
        this.setState({ wsReadyState: WebSocket.CLOSING })
        enqueueSnackbar(`Websocket error occurred`, { variant: "error" })
    }

    /* WebRTC event handlers */

    channelSendMessage = (message: string) => {
        this.state.rtcChanel!.send(JSON.stringify({ type: "message", data: message }))
        this.setState({ rtcMessages: this.state.rtcMessages.concat({ sent: true, message: message, when: Date.now() }) })
    }
    channelOnMessage = (message: MessageEvent) => {
        switch (typeof message.data) {
            case "string": {
                const msg = JSON.parse(message.data)
                console.log(`[WebRTC] Data channel received '${msg.type}'`)
                switch (msg.type) {
                    case "message": {
                        this.setState({ rtcMessages: this.state.rtcMessages.concat({ sent: false, message: msg.data?.toString(), when: Date.now() }) })
                        break
                    }
                    case "file-info": {
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
                    }
                    case "request-file-info": {
                        this.state.rtcChanel?.send(JSON.stringify(
                            { type: "file-info", data: { name: this.state.uploadFile?.name, size: this.state.uploadFile?.size } }
                        ))
                        break
                    }
                    case "start-download": {
                        this.initiateFileTransfer()
                        break
                    }
                    case "finish-download": {
                        triggerDownload(this.state.downloadFileInfo?.name || "unknown-name", new Blob(this.downloadFileChunks))
                        // Clear state and interval
                        clearInterval(this.state.metricsIntervalID)
                        this.downloadFileChunks = []
                        this.setState({ loading: false, metricsIntervalID: -1, transferProgress: undefined })
                        break;
                    }
                }
                break;
            }
            case "object": {
                // TODO: Instead of saving chanks in RAM, stream to disk to allow massive file transfer (use FileSystemWritableFileStream)
                this.downloadFileChunks.push(message.data)
                break;
            }
            default: { console.warn("[WebRTC] Data channel received unrecognized message type: ", typeof message.data) }
        }
    }
    channelOnOpen = () => {
        const readyState = this.state.rtcChanel?.readyState || 'closed'
        this.setState({ rtcReadyState: readyState, loading: false })
        console.log("[WebRTC] channel state changed:", readyState)
        if (this.state.rtcChanel && readyState === "open") {
            enqueueSnackbar("Peer connected", { variant: "success" })
        }
    }
    channelOnClose = () => {
        const readyState = this.state.rtcChanel?.readyState || 'closed'
        this.setState({ rtcReadyState: readyState })
        console.warn("[WebRTC] Closed")
        enqueueSnackbar("Peer disconnected", { variant: "warning" })
    }
    channelOnError = (error: RTCErrorEvent) => {
        console.log("[WebRTC] channel error:", error)
    }
    onDataChannel = (ev: RTCDataChannelEvent) => {
        console.log("[WebRTC] new data channel received:", ev.channel.readyState)
        this.setState({ rtcChanel: ev.channel, rtcReadyState: ev.channel.readyState, loading: false }, () => {
            ev.channel.onmessage = this.channelOnMessage
            ev.channel.onopen = this.channelOnOpen
            ev.channel.onclose = this.channelOnClose
            ev.channel.onerror = this.channelOnError
            // If we are the receiver, request file info
            if (!this.state.uploadFile) {
                console.log("[WebRTC] requesting file info")
                this.state.rtcChanel?.send(JSON.stringify({ type: "request-file-info" }))
            }
        })
    }
    onIceCandidate = (iceCandidate: RTCIceCandidate | null) => {
        console.log("[WebRTC] onIceCandidate", !!iceCandidate)
        if (!iceCandidate) return
        try {
            const iceCandidateStr = JSON.stringify(iceCandidate.toJSON())
            // if peer socket-key not initialized then store icecandidate
            if (!this.state.wsPeerKey.length) {
                this.setState((prevState) => {
                    return { rtcIceCandidates: prevState.rtcIceCandidates.concat(iceCandidateStr) }
                })
                return
            }
            console.log("[WS] Sending icecandidate to peer")
            this.wsSendMessage({
                from: this.state.wsKey,
                to: this.state.wsPeerKey,
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
            const rtcConn = new RTCPeerConnection(rtcPeerConstraints)
            rtcConn.onicecandidate = (ev) => this.onIceCandidate(ev.candidate)
            rtcConn.onicecandidateerror = (ev) => console.warn("[WebRTC] icecandidate err:", ev.errorText)
            rtcConn.onconnectionstatechange = (ev) => console.debug("[WebRTC] onconnectionstatechange:", ev)
            rtcConn.oniceconnectionstatechange = (ev) => console.debug("[WebRTC] oniceconnectionstatechange:", ev)
            rtcConn.onsignalingstatechange = (ev) => console.debug("[WebRTC] onsignalingstatechange:", ev)
            rtcConn.onicegatheringstatechange = (ev) => console.debug("[WebRTC] onicegatheringstatechange:", ev)
            // Create a data channel
            const rtcChannel = rtcConn.createDataChannel(rtcDataChannelName)
            rtcChannel.onmessage = this.channelOnMessage
            rtcChannel.onopen = this.channelOnOpen
            rtcChannel.onclose = this.channelOnClose
            rtcChannel.onerror = this.channelOnError
            rtcChannel.binaryType = 'arraybuffer'
            rtcChannel.bufferedAmountLowThreshold = 0
            // Create an offer
            const localOffer = await rtcConn.createOffer()
            await rtcConn.setLocalDescription(localOffer)

            // Convert local offer into a URL
            if (!this.state.wsKey.length) throw new Error("wsKey not initialized")
            const link = CreateP2PLink(this.state.wsKey, localOffer)
            // Save data
            this.setState({
                rtcConn: rtcConn,
                rtcChanel: rtcChannel,
                shareLink: link
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
        this.setState({ loading: true })
        try {
            // Parse remote offer (from the URL)
            const { wsPeerKey, rtcPeerOffer } = ParseP2PLink(this.props.hash)
            // Create local conn
            const rtcConn = new RTCPeerConnection(rtcPeerConstraints)
            rtcConn.ondatachannel = this.onDataChannel
            rtcConn.onicecandidate = (ev) => this.onIceCandidate(ev.candidate)
            rtcConn.onicecandidateerror = (ev) => console.warn("[WebRTC] icecandidate err:", ev.errorText)
            rtcConn.onconnectionstatechange = (ev) => console.debug("[WebRTC] onconnectionstatechange:", ev)
            rtcConn.oniceconnectionstatechange = (ev) => console.debug("[WebRTC] oniceconnectionstatechange:", ev)
            rtcConn.onsignalingstatechange = (ev) => console.debug("[WebRTC] onsignalingstatechange:", ev)
            rtcConn.onicegatheringstatechange = (ev) => console.debug("[WebRTC] onicegatheringstatechange:", ev)
            // We are connecting to a share link
            await rtcConn.setRemoteDescription(rtcPeerOffer)
            const localAnswer = await rtcConn.createAnswer()
            await rtcConn.setLocalDescription(localAnswer)
            // Send answer to peer through signaling
            console.log("[WS] Sending answer")
            this.wsSendMessage({
                from: this.state.wsKey,
                to: wsPeerKey,
                command: "answer",
                data: JSON.stringify(localAnswer)
            })
            // Save data
            this.setState({
                wsPeerKey: wsPeerKey,
                rtcConn: rtcConn
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
            if (!this.state.rtcChanel) throw new Error("Send channel not initialized, unable to send message")
            // Send start download event to peer
            this.state.rtcChanel.send(JSON.stringify({ type: "start-download" }))
            // Start metrics fetching job
            const metricsTimer = setInterval(this.handleMetrics, 250)
            this.setState({ loading: true, transferStartTime: Date.now(), metricsIntervalID: metricsTimer })
        } catch (err) {
            console.error("[WebRTC] failed to request start-download:", err)
            enqueueSnackbar(`Failed to request file download: ${err}`, { variant: "error" })
            this.setState({ loading: false })
        }
    }

    // Splits the file into chunks and initiates transfer to peer & metrics fetching
    initiateFileTransfer = async () => {
        try {
            this.setState({ loading: true })
            if (!this.state.uploadFile) { throw new Error("file not initialized, unable to send file") }
            const file = this.state.uploadFile

            // Chunk file into blobs to be sent
            const chunkCount = Math.ceil(file.size / rtcChunkSize)
            const chunks: Array<Blob> = []
            console.log(`[WebRTC] Sending file: fileSize=${formatBytes(file.size)} chunkSize=${rtcChunkSize} chunkCount=${chunkCount}`)
            for (let i = 0; i < chunkCount; i++) {
                const currentByte = i * rtcChunkSize
                const targetByte = currentByte + rtcChunkSize
                if (targetByte > file.size) {
                    chunks.push(file.slice(currentByte))
                } else {
                    chunks.push(file.slice(currentByte, targetByte))
                }
            }
            // Start file chunk sending job
            this.sendFileChunks(chunks)
            // Start metrics fetching job
            const metricsTimer = setInterval(this.handleMetrics, 250)
            this.setState({ transferStartTime: Date.now(), metricsIntervalID: metricsTimer })
        } catch (err) {
            console.error("[WebRTC] send file err:", err)
            enqueueSnackbar(`Failed to start file transfer: ${err}`, { variant: "error" })
            this.setState({ loading: false })
        }
    }

    // Starts sending chunks to the peer. This can block until channel bufferedAmount passes threshold. 
    // After which this function becomes async and continues sending when buffered amount decreases below threshold
    sendFileChunks = async (chunks: Blob[]) => {
        const sendChannel = this.state.rtcChanel!
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
                clearInterval(this.state.metricsIntervalID)
                this.setState({ loading: false, transferProgress: undefined, metricsIntervalID: -1 })
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
        const { rtcConn, uploadFile, downloadFileInfo, transferStartTime } = this.state

        let metrics: WebRTCStats = {
            bytesReceived: this.downloadFileChunks.length * rtcChunkSize,
            bytesSent: 0
        }
        // Get stats from WebRTC
        const stats = await rtcConn!.getStats()
        stats.forEach(report => {
            if (report.type === 'data-channel') {
                metrics = stats.get(report.id)
                return
            }
        })
        // Calculate statistics
        const fileSize = downloadFileInfo?.size || uploadFile!.size
        const bytesProcessed = Math.max(metrics?.bytesReceived, metrics?.bytesSent, 1) % fileSize;
        const elapsedSec = Math.max(millisecondsToX(Date.now() - transferStartTime, 'second'), 1)
        this.setState({
            transferProgress: {
                bytesProcessed: bytesProcessed,
                estimateSec: Math.round(((fileSize / bytesProcessed) * elapsedSec) - elapsedSec),
                percentage: Math.round((bytesProcessed / fileSize) * 100),
                bitRate: parseInt(((bytesProcessed / elapsedSec) * 8).toFixed(2))
            }
        })
    }

    render = () => (
        <Container maxWidth="xl">
            <Grid2 container
                columnSpacing={{ lg: 5, md: 3, sm: 1, xs: 1 }}
                rowSpacing={2}
                margin="4vw"
                justifyContent="center">
                <Grid2 size={{ lg: 7, md: 6, sm: 12, xs: 12 }} component={Card} padding="1em">
                    {this.state.loading && <LinearProgress variant='indeterminate' />}
                    <Stack direction='row' alignItems='center' spacing={2}>
                        <Tooltip title="Go back" disableInteractive>
                            <IconButton onClick={() => this.props.navigate(-1)}><ArrowBack /></IconButton>
                        </Tooltip>
                        <Typography variant="h5" width="100%">P2P file sharing</Typography>
                        <img src={logo} height={50} />
                    </Stack>
                    <Card sx={{ padding: "1em" }}>
                        {/* Select file button (sender) */}
                        {!this.props.hash.length &&
                            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                <Button variant={this.state.uploadFile?.name ? "contained" : "outlined"} component="label">
                                    {this.state.uploadFile?.name ?? "Select File"}
                                    <input onChange={this.handleFile} type="file" hidden />
                                </Button>
                            </Box>
                        }
                        {/* Download file button (receiver) */}
                        {this.state.downloadFileInfo &&
                            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                <Button variant="contained" onClick={this.requestFileTransfer}>
                                    Download
                                </Button>
                            </Box>
                        }

                        {/* File transfer indicator */}
                        {(this.state.loading && this.state.transferProgress && (this.state.downloadFileInfo || this.state.uploadFile)) &&
                            <>
                                <ProgressBar sx={{ my: 2 }}
                                    onCancel={() => console.log("Attempted cancel download")}
                                    progress={this.state.transferProgress}
                                    file={this.state.downloadFileInfo || fileToFileInfo(this.state.uploadFile)} />
                            </>
                        }

                        {/* Sending file information */}
                        {this.state.uploadFile &&
                            <>
                                <Divider sx={{ my: 3 }} />
                                {/* <Typography>File Information:</Typography> */}
                                <Stack direction="row" gap={2} marginTop={2} alignItems="center">
                                    <Typography>File Name:</Typography>
                                    <Chip label={this.state.uploadFile?.name} color="info" variant="outlined" />
                                    <Typography>File Size:</Typography>
                                    <Chip label={formatBytes(this.state.uploadFile?.size || 0)} color="info" variant="outlined" />
                                </Stack>
                            </>
                        }
                        {/* Receiving file information */}
                        {this.state.downloadFileInfo &&
                            <>
                                <Divider sx={{ my: 3 }} />
                                {/* <Typography>File Information:</Typography> */}
                                <Stack direction="row" gap={2} marginTop={2} alignItems="center">
                                    <Typography>File Name:</Typography> <Chip label={this.state.downloadFileInfo.name} color="info" variant="outlined" />
                                    <Typography>File Size:</Typography> <Chip label={formatBytes(this.state.downloadFileInfo.size || 0)} color="info" variant="outlined" />
                                </Stack>
                            </>
                        }

                        <Divider sx={{ my: 3 }} />
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
                                {getWebRTCStatus(this.state.rtcReadyState)}
                            </Stack>
                        </Stack>
                        <Typography color="primary">Local: {this.state.wsKey}</Typography>
                        <Typography color="secondary">Peer:  {this.state.wsPeerKey || "Waiting connection"}</Typography>

                        <Divider sx={{ my: 3 }} />
                        <Typography>Peer Chat:</Typography>
                        {/* Chat section (WebRTC) */}
                        {this.state.rtcReadyState !== "open"
                            ? <Typography marginTop={2}>Waiting for peer connection...</Typography>
                            : <Stack direction="column" width="100%" marginY={2}>
                                <Stack direction="column" gap={1} height={125} marginRight={5} sx={{ overflowY: "scroll" }}>
                                    {this.state.rtcMessages.map((msg, idx) => {
                                        if (msg.sent) {
                                            return (<Stack>
                                                <Typography key={idx} color="primary" alignSelf="flex-start">{msg.message}</Typography>
                                                <Typography variant='caption' color="textDisabled" alignSelf="flex-start">{new Date(msg.when).toLocaleTimeString()}</Typography>
                                            </Stack>)
                                        } else {
                                            return (<Stack>
                                                <Typography key={idx} color="secondary" alignSelf="flex-end">{msg.message}</Typography>
                                                <Typography variant='caption' color="textDisabled" alignSelf="flex-end">{new Date(msg.when).toLocaleTimeString()}</Typography>
                                            </Stack>)
                                        }
                                    })}
                                    <div ref={el => { this.chatElement = el; }} />
                                </Stack>
                                <Stack component="form" direction="row" gap={1}
                                    onSubmit={(e) => {
                                        e.preventDefault()
                                        this.channelSendMessage(this.state.rtcNewMessage)
                                        this.setState({ rtcNewMessage: "" })
                                    }}>
                                    <TextField fullWidth
                                        placeholder='Say hi to your friend while you wait for the download'
                                        value={this.state.rtcNewMessage}
                                        onChange={e => this.setState({ rtcNewMessage: e.target.value })} />
                                    <IconButton color="primary" type='submit' sx={{ p: '10px' }}>
                                        <Send />
                                    </IconButton>
                                </Stack>
                            </Stack>
                        }
                    </Card>
                </Grid2>
                <Grid2 size={{ lg: 5, md: 6, sm: 12, xs: 12 }}>
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
                    {this.state.shareLink &&
                        <Alert variant='standard' color="warning" severity='info' >
                            <Typography>Click the link below to copy it to your clipboard! Leave this page open while the recepient downloads the file!</Typography>
                            <ListItem>
                                <Tooltip title="Click to copy to clipboard">
                                    <ListItemButton
                                        sx={{ overflowWrap: "break-all", overflow: 'hidden' }}
                                        onClick={() => {
                                            navigator.clipboard.writeText(this.state.shareLink)
                                            enqueueSnackbar("Copied URL to clipboard!")
                                        }}>
                                        <Typography color="info">{this.state.shareLink}</Typography>
                                    </ListItemButton>
                                </Tooltip>
                            </ListItem>
                        </Alert>
                    }
                </Grid2>
            </Grid2>
        </Container>
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
