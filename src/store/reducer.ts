import { createSlice } from '@reduxjs/toolkit'
import { FileInfo } from '../utilities/utils'
import { Buffer } from 'buffer';

interface UserState {
    emailAddress: string;
    password: string;
    createdAt: string;
    lastSeen: string;
    files: Array<FileInfo>;
    mEncKey: CryptoKey | undefined;
    hAuthKey: ArrayBuffer | undefined;
    clientRandomValue: string;
}

// Define the initial state using that type
const initialState: UserState = {
    emailAddress: '',
    password: '',
    createdAt: '',
    lastSeen: '',
    files: [],
    mEncKey: undefined,
    hAuthKey: Buffer.alloc(0),
    clientRandomValue: ''
}

export const dataSlice = createSlice({
    name: 'user',
    initialState: initialState,
    reducers: {
        saveCreds: (state, action) => {
            action.payload.emailAddress || state.emailAddress;
            action.payload.createdAt || state.createdAt;
            action.payload.lastSeen || state.lastSeen;
            action.payload.password || state.password;
            action.payload.mEncKey || state.mEncKey;
            action.payload.hAuthKey || state.hAuthKey;
            action.payload.clientRandomValue || state.clientRandomValue;
        },
        saveFiles: (state, action) => {
            state.files = action.payload.files;
        },
    },
})

// Action creators are generated for each case reducer function
export const { saveCreds, saveFiles } = dataSlice.actions

export default dataSlice.reducer