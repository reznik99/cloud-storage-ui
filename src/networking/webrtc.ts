import { Buffer } from 'buffer';
import { client } from './endpoints';
import { WebrtcStatsTypeMap, WebrtcStatsTypeMapKey } from '../utilities/webrtc';

// RTC constants
export const rtcChunkSize = 32_768; // ~32kb chunk size for WebRTC data channel
export const rtcBufferedAmountLowThreshold = 65_535; // ~64kb threshold when sending should halt
export const rtcDataChannelName = 'gdrive-file-transfer';

export type ChannelMessage = {
    sent: boolean;
    message: string;
    when: number;
};

// Parses all the RTCPeerConnection statistics and returns a map by stat type
export const GetRTCStats = async (rtcConn: RTCPeerConnection) => {
    const statsMap = new Map<WebrtcStatsTypeMapKey, WebrtcStatsTypeMap[WebrtcStatsTypeMapKey]>();
    const stats = await rtcConn.getStats();
    stats.forEach(report => {
        if (statsMap.has(report.type)) {
            statsMap.set(report.type, [...statsMap.get(report.type)!, report]);
        } else {
            statsMap.set(report.type, [report]);
        }
    });
    return statsMap;
};

// Gets the RTCPeerConnection statistics for a specific type
export async function GetRTCConnStats<K extends WebrtcStatsTypeMapKey>(
    rtcConn: RTCPeerConnection,
    type: K,
): Promise<WebrtcStatsTypeMap[K] | undefined> {
    const statsMap = await GetRTCStats(rtcConn);
    return statsMap.get(type) as WebrtcStatsTypeMap[K] | undefined;
}

// Creates a p2p file share link containing the local websocket key and local webrtc offer
export const CreateP2PLink = (wsKey: string, localOffer: RTCSessionDescriptionInit) => {
    const link = `${window.location}#${wsKey}#${Buffer.from(JSON.stringify(localOffer)).toString('base64')}`;
    return link;
};

// Parses a p2p file share link containing the peer websocket key and peer webrtc offer
export const ParseP2PLink = (urlData: string) => {
    const [wsPeerKey, rtcPeerOffer] = urlData.slice(1).split('#');
    return {
        rtcPeerOffer: JSON.parse(Buffer.from(rtcPeerOffer, 'base64').toString()) as RTCSessionDescriptionInit,
        wsPeerKey: wsPeerKey,
    };
};

// Retrieves the RTC Configuration for enstablishing WebRTC connectivity
// Attempts to fetch the TURN credentials aswell to be used if peer-to-peer connectivity fails
export const GetRTCServers = async (): Promise<RTCConfiguration> => {
    // Default ICE servers for STUN (peer-to-peer)
    const RTCConfig: RTCConfiguration = {
        iceServers: [{ urls: 'stun:turn.francescogorini.com' }, { urls: 'stun:stun.l.google.com:19302' }],
        iceTransportPolicy: 'all',
    };
    try {
        const res = await client.get('/turn_credentials');
        if (res.data) {
            const { username, credential } = res.data;
            RTCConfig.iceServers!.push(
                // TURN over UDP (fastest)
                { urls: ['turn:turn.francescogorini.com:3478?transport=udp'], username, credential },
                // TURN over TCP (fallback for UDP-restricted networks)
                { urls: ['turn:turn.francescogorini.com:3478?transport=tcp'], username, credential },
                // TURN over TLS (best for strict firewalls/proxies)
                { urls: ['turn:turn.francescogorini.com:5349?transport=tcp'], username, credential },
            );
        }
        return RTCConfig;
    } catch (err) {
        console.warn('Failed to get TURN Credentials', err);
        return RTCConfig;
    }
};
