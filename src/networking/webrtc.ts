
const peerConstraints = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
    ]
};
const dataChannelName = "gdrive-file-transfer"

type socketSendFn = (icecandidate: RTCIceCandidate | null) => void
type channelOnMessageFn = (sendChannel: RTCDataChannel, event: MessageEvent<any>) => void
type channelStateChangeFn = (sendChannel: RTCDataChannel) => void
type channelErrorFn = (sendChannel: RTCDataChannel, error: RTCErrorEvent) => void
type onDataChannelFn = (sendChannel: RTCDataChannel) => void

// Creates a local webrtc connection and either <creates a local offer> OR <answers the passed in remote offer>
export async function StartConnection(socketSend: socketSendFn, channelOnMessage: channelOnMessageFn, channelOnStateChange: channelStateChangeFn, channelOnError: channelErrorFn) {
    // Create local conn
    const localConn = new RTCPeerConnection(peerConstraints)
    // Create channel and event listeners
    const sendChannel = localConn.createDataChannel(dataChannelName)
    sendChannel.binaryType = 'arraybuffer'
    sendChannel.onerror = (err) => channelOnError(sendChannel, err)
    sendChannel.onclose = () => channelOnStateChange(sendChannel)
    sendChannel.onopen = () => channelOnStateChange(sendChannel)
    sendChannel.onmessage = (ev) => channelOnMessage(sendChannel, ev)
    // Add local conn event listeners
    localConn.onicecandidate = (ev) => socketSend(ev.candidate)

    // We are creating a share link
    const localOffer = await localConn.createOffer()
    await localConn.setLocalDescription(localOffer)
    return {
        localConn,
        sendChannel,
        localOffer,
    }
}

// Creates a local webrtc connection and either <creates a local offer> OR <answers the passed in remote offer>
export async function AnswerConnection(socketSend: socketSendFn, onDataChannel: onDataChannelFn, remoteOffer: RTCSessionDescriptionInit) {
    // Create local conn
    const localConn = new RTCPeerConnection(peerConstraints)
    // Add local conn event listeners
    localConn.onicecandidate = (ev) => socketSend(ev.candidate)
    localConn.ondatachannel = (ev) => onDataChannel(ev.channel)

    // We are connecting to a share link
    await localConn.setRemoteDescription(remoteOffer)
    const localAnswer = await localConn.createAnswer()
    await localConn.setLocalDescription(localAnswer)
    return {
        localConn,
        localAnswer
    }
}