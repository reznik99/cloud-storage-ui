export type WebrtcStatsType = 'candidate-pair' | 'data-channel' | 'local-candidate' | 'peer-connection' | 'remote-candidate';
export type WebrtcStatsTypeMapKey = keyof WebrtcStatsTypeMap;

export interface WebrtcStatsTypeMap {
    'peer-connection': WebrtcPeerConnectionStats[];
    'candidate-pair': WebrtcCandidatePairStats[];
    'local-candidate': WebrtcCandidateStats[];
    'remote-candidate': WebrtcCandidateStats[];
    'data-channel': WebrtcDataChannelStats[];
    // Add other standard or custom types as needed:
    // 'inbound-rtp': RtcInboundRtpStreamStats;
    // etc.
}

export interface WebrtcPeerConnectionStats extends RTCStats {
    type: 'peer-connection';
    dataChannelsClosed: number;
    dataChannelsOpened: number;
}

export interface WebrtcCandidatePairStats extends RTCStats {
    type: 'candidate-pair';
    bytesReceived: number;
    bytesSent: number;
    currentRoundTripTime: number; // Seconds (can be 0 if no RTT yet)
    lastPacketReceivedTimestamp: number;
    lastPacketSentTimestamp: number;
    localCandidateId: string;
    nominated: boolean;
    priority: number; // // NOTE: This priority value is large and may exceed the safe limit
    readable: boolean;
    remoteCandidateId: string;
    responsesReceived: number;
    selected: boolean;
    state: 'waiting' | 'in-progress' | 'failed' | 'succeeded' | 'cancelled';
    totalRoundTripTime: number; // Seconds
    transportId: string;
    writable: boolean;
}

export interface WebrtcCandidateStats extends RTCStats {
    type: 'local-candidate' | 'remote-candidate';
    address: string;
    candidateType: 'host' | 'srflx' | 'prflx' | 'relay';
    port: number;
    priority: number;
    protocol: 'tcp' | 'udp';
}

export interface WebrtcDataChannelStats extends RTCStats {
    type: 'data-channel';
    bytesReceived: number;
    bytesSent: number;
    dataChannelIdentifier: number;
    label: string;
    messagesReceived: number;
    messagesSent: number;
    protocol: string; // User defined on handshake
    state: 'connecting' | 'open' | 'closing' | 'closed';
}
