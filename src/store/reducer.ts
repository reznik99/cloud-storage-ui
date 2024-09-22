import { createSlice } from '@reduxjs/toolkit'
import { FileInfo } from '../utilities/utils'

interface UserState {
    emailAddress: string;
    password: string;
    createdAt: string;
    files: Array<FileInfo>;
    value: number;
}

// Define the initial state using that type
const initialState: UserState = {
    emailAddress: '',
    password: '',
    createdAt: '',
    files: [],
    value: 0,
}

export const dataSlice = createSlice({
    name: 'user',
    initialState: initialState,
    reducers: {
        saveCreds: (state, action) => {
            console.log(action)
            state.emailAddress = action.payload.emailAddress;
            state.password = action.payload.password;
            state.createdAt = action.payload.createdAt
        },
        increment: (state) => {
            // Redux Toolkit allows us to write "mutating" logic in reducers. It
            // doesn't actually mutate the state because it uses the Immer library,
            // which detects changes to a "draft state" and produces a brand new
            // immutable state based off those changes.
            // Also, no return statement is required from these functions.
            state.value += 1
        },
        decrement: (state) => {
            state.value -= 1
        },
        incrementByAmount: (state, action) => {
            state.value += action.payload
        },
    },
})

// Action creators are generated for each case reducer function
export const { saveCreds, increment, decrement, incrementByAmount } = dataSlice.actions

export default dataSlice.reducer