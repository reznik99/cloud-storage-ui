
import { Buffer } from 'buffer'

// RTC constants
export const rtcChunkSize = 32_768                      // ~32kb chunk size for WebRTC data channel
export const rtcBufferedAmountLowThreshold = 65_535     // ~64kb threshold when sending should halt
export const rtcDataChannelName = "gdrive-file-transfer"
export const rtcPeerConstraints: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:turn.francescogorini.com' },
        { urls: 'stun:stun.l.google.com:19302' }
    ],
};
export type ChannelMessage = {
    sent: boolean;
    message: string;
    when: number;
}
export interface WebRTCStats extends Partial<RTCStats> {
    bytesReceived: number;
    bytesSent: number;
}

export const GetRTCConnStats = async (rtcConn: RTCPeerConnection, type: RTCStatsType): Promise<WebRTCStats | undefined> => {
    const stats = await rtcConn.getStats()
    let output: WebRTCStats | undefined = undefined
    stats.forEach((report: WebRTCStats) => {
        if (report.type === type) {
            output = report;
            return
        }
    })

    return output
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