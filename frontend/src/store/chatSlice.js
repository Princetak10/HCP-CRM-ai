import { createSlice } from '@reduxjs/toolkit';

const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        messages: [],
        loading: false,
        error: null,
    },
    reducers: {
        addMessage(state, action) {
            state.messages.push(action.payload);
        },
        setLoading(state, action) {
            state.loading = action.payload;
        },
        setError(state, action) {
            state.error = action.payload;
        },
        clearMessages(state) {
            state.messages = [];
        },
    },
});

export const { addMessage, setLoading, setError, clearMessages } = chatSlice.actions;
export default chatSlice.reducer;
