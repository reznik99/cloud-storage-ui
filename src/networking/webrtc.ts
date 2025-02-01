

const peerConstraints = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
    ]
};

const dataChannelName = "gdrive-file-transfer"
type socketSendFn = (icecandidate: RTCIceCandidate) => void
type channelStateChangeFn = (sendChannel: RTCDataChannel) => void
type channelErrorFn = (sendChannel: RTCDataChannel, error: RTCErrorEvent) => void

// Creates a local webrtc connection and either <creates a local offer> OR <answers the passed in remote offer>
export async function CreateConnection(socketSend: socketSendFn, channelStateChange: channelStateChangeFn, channelError: channelErrorFn, remoteOffer?: RTCSessionDescriptionInit) {
    // Create local conn and channel
    const localConn = new RTCPeerConnection(peerConstraints)
    const sendChannel = localConn.createDataChannel(dataChannelName)
    sendChannel.binaryType = 'arraybuffer'
    // Add channel event listeners
    sendChannel.addEventListener('open', () => channelStateChange(sendChannel))
    sendChannel.addEventListener('close', () => channelStateChange(sendChannel))
    sendChannel.addEventListener('error', (error) => channelError(sendChannel, error))
    // Add local conn event listener
    localConn.addEventListener('icecandidate', async event => {
        if (!event.candidate) return
        console.log('Local ICE candidate: ', event.candidate)
        socketSend(event.candidate)
    })
    let localOffer: RTCSessionDescriptionInit | undefined = undefined
    let localAnswer: RTCSessionDescriptionInit | undefined = undefined
    if (remoteOffer) {
        // We are connecting to a share link
        await localConn.setRemoteDescription(remoteOffer)
        localAnswer = await localConn.createAnswer()
        await localConn.setLocalDescription(localAnswer)
    } else {
        // We are creating a share link
        localOffer = await localConn.createOffer()
        await localConn.setLocalDescription(localOffer)
    }

    // Return local conn, send channel and (local offer OR local answer)
    return {
        localConn,
        sendChannel,
        localOffer,
        localAnswer
    }
}