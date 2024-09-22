import { createSlice } from '@reduxjs/toolkit'
import { FileInfo } from '../utilities/utils'

interface UserState {
    emailAddress: string;
    password: string;
    createdAt: string;
    lastSeen: string;
    files: Array<FileInfo>;
}

// Define the initial state using that type
const initialState: UserState = {
    emailAddress: '',
    password: '',
    createdAt: '',
    lastSeen: '',
    files: [],
}

export const dataSlice = createSlice({
    name: 'user',
    initialState: initialState,
    reducers: {
        saveCreds: (state, action) => {
            state.emailAddress = action.payload.emailAddress;
            state.password = action.payload.password;
            state.createdAt = action.payload.createdAt;
            state.lastSeen = action.payload.lastSeen;
        },
        saveFiles: (state, action) => {
            state.files = action.payload.files;
        },
    },
})

// Action creators are generated for each case reducer function
export const { saveCreds, saveFiles } = dataSlice.actions

export default dataSlice.reducer