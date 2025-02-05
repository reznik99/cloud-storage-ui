
import { Buffer } from 'buffer'

// RTC constants
export const rtcChunkSize = 16_384 // ~16kb chunk size for WebRTC data channel
export const rtcDataChannelName = "gdrive-file-transfer"
export const rtcPeerConstraints: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' }
    ]
};
export type ChannelMessage = {
    sent: boolean;
    message: string;
    when: number;
}
export type WebRTCStats = {
    bytesReceived: number;
    bytesSent: number;
}

// Creates a p2p file share link containing the local websocket key and local webrtc offer
export const CreateP2PLink = (wsKey: string, localOffer: RTCSessionDescriptionInit) => {
    const link = `${window.location}#${wsKey}#${Buffer.from(JSON.stringify(localOffer)).toString('base64')}`
    return link
}

// Parses a p2p file share link containing the peer websocket key and peer webrtc offer
export const ParseP2PLink = (urlData: string) => {
    const [wsPeerKey, rtcPeerOffer] = urlData.slice(1).split("#")
    return {
        rtcPeerOffer: JSON.parse(Buffer.from(rtcPeerOffer, 'base64').toString()) as RTCSessionDescriptionInit,
        wsPeerKey: wsPeerKey
    }
}