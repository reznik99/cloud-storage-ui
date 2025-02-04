
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
    const rtcConn = new RTCPeerConnection(peerConstraints)
    rtcConn.onicecandidate = (ev) => onIceCandidate(ev.candidate)
    // Create a data channel
    const rtcChannel = rtcConn.createDataChannel(dataChannelName)
    rtcChannel.binaryType = 'arraybuffer'
    rtcChannel.bufferedAmountLowThreshold = 0
    // Create an offer
    const localOffer = await rtcConn.createOffer()
    await rtcConn.setLocalDescription(localOffer)
    return {
        rtcConn,
        rtcChannel,
        localOffer,
    }
}

// Creates a local webrtc connection and return an answer
export async function AnswerConnection(onIceCandidate: socketSendFn, peerOffer: RTCSessionDescriptionInit) {
    // Create local conn
    const rtcConn = new RTCPeerConnection(peerConstraints)
    // Add local conn event listeners
    rtcConn.onicecandidate = (ev) => onIceCandidate(ev.candidate)

    // We are connecting to a share link
    await rtcConn.setRemoteDescription(peerOffer)
    const localAnswer = await rtcConn.createAnswer()
    await rtcConn.setLocalDescription(localAnswer)
    return {
        rtcConn,
        localAnswer
    }
}