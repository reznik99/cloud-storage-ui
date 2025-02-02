
const peerConstraints: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
    ]
};
const dataChannelName = "gdrive-file-transfer"

type socketSendFn = (icecandidate: RTCIceCandidate | null) => void

// Creates a local webrtc connection and data channel, then return an offer
export async function StartConnection(onIceCandidate: socketSendFn) {
    // Create a local connection
    const localConn = new RTCPeerConnection(peerConstraints)
    localConn.onicecandidate = (ev) => onIceCandidate(ev.candidate)
    // Create a data channel
    const sendChannel = localConn.createDataChannel(dataChannelName)
    sendChannel.binaryType = 'arraybuffer'
    sendChannel.bufferedAmountLowThreshold = 0
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
export async function AnswerConnection(onIceCandidate: socketSendFn, remoteOffer: RTCSessionDescriptionInit) {
    // Create local conn
    const localConn = new RTCPeerConnection(peerConstraints)
    // Add local conn event listeners
    localConn.onicecandidate = (ev) => onIceCandidate(ev.candidate)

    // We are connecting to a share link
    await localConn.setRemoteDescription(remoteOffer)
    const localAnswer = await localConn.createAnswer()
    await localConn.setLocalDescription(localAnswer)
    return {
        localConn,
        localAnswer
    }
}