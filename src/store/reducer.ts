import { createSlice } from '@reduxjs/toolkit'
import { FileInfo } from '../utilities/utils'

interface UserState {
    emailAddress: string;
    password: string;
    createdAt: string;
    lastSeen: string;
    files: Array<FileInfo>;
    mEncKey: string;
    hAuthKey: string;
    wrappedAccountKey: string;
    clientRandomValue: string;
    allowedStorage: number;
}

// Define the initial state using that type
const initialState: UserState = {
    emailAddress: '',
    password: '',
    createdAt: '',
    lastSeen: '',
    files: [],
    mEncKey: '',
    hAuthKey: '',
    wrappedAccountKey: '',
    clientRandomValue: '',
    allowedStorage: 1_024_000_000
}

export const dataSlice = createSlice({
    name: 'user',
    initialState: initialState,
    reducers: {
        saveCreds: (state, action) => {
            state.emailAddress = action.payload.emailAddress || state.emailAddress;
            state.createdAt = action.payload.createdAt || state.createdAt;
            state.lastSeen = action.payload.lastSeen || state.lastSeen;
            state.password = action.payload.password || state.password;
            state.mEncKey = action.payload.mEncKey || state.mEncKey;
            state.hAuthKey = action.payload.hAuthKey || state.hAuthKey;
            state.wrappedAccountKey = action.payload.wrappedAccountKey || state.wrappedAccountKey;
            state.clientRandomValue = action.payload.clientRandomValue || state.clientRandomValue;
            state.allowedStorage = action.payload.allowedStorage || state.allowedStorage;
        },
        saveFiles: (state, action) => {
            state.files = action.payload.files;
        },
    },
})

// Action creators are generated for each case reducer function
export const { saveCreds, saveFiles } = dataSlice.actions

export default dataSlice.reducer