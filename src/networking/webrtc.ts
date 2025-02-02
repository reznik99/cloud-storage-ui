
const peerConstraints: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
    ]
};
const dataChannelName = "gdrive-file-transfer"

type socketSendFn = (icecandidate: RTCIceCandidate | null) => void
type onDataChannelFn = (sendChannel: RTCDataChannel) => void

// Creates a local webrtc connection and data channel, then return an offer
export async function StartConnection(onIceCandidate: socketSendFn) {
    // Create a local connection
    const localConn = new RTCPeerConnection(peerConstraints)
    localConn.onicecandidate = (ev) => onIceCandidate(ev.candidate)
    // Create a data channel
    const sendChannel = localConn.createDataChannel(dataChannelName)
    sendChannel.binaryType = 'arraybuffer'
    // Create an offer
    const localOffer = await localConn.createOffer()
    await localConn.setLocalDescription(localOffer)
    return {
        localConn,
        sendChannel,
        localOffer,
    }
}

// Creates a local webrtc connection and return an answer
export async function AnswerConnection(onIceCandidate: socketSendFn, onDataChannel: onDataChannelFn, remoteOffer: RTCSessionDescriptionInit) {
    // Create local conn
    const localConn = new RTCPeerConnection(peerConstraints)
    // Add local conn event listeners
    localConn.onicecandidate = (ev) => onIceCandidate(ev.candidate)
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