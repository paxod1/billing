import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    message: '',
    type: '', // 'success', 'error', 'warning', 'info'
    timestamp: null, // To ensure different toasts with same message trigger
};

let lastErrorTimestamp = null;

const toastSlice = createSlice({
    name: 'toast',
    initialState,
    reducers: {
        showToast: (state, action) => {
            const now = Date.now();
            console.log("showToast called with:", action.payload.message, "type:", action.payload.type, "lastErrorTimestamp:", lastErrorTimestamp);
            // Ignore consecutive error toasts within a 800ms window to prevent duplicate/fallback toasts.
            if (action.payload.type === 'error') {
                if (lastErrorTimestamp && (now - lastErrorTimestamp < 800)) {
                    console.log("Ignore duplicate toast triggered for:", action.payload.message);
                    return;
                }
                lastErrorTimestamp = now;
            }
            state.message = action.payload.message;
            state.type = action.payload.type;
            state.timestamp = now;
        },
        clearToast: (state) => {
            state.message = '';
            state.type = '';
            state.timestamp = null;
        },
    },
});

export const { showToast, clearToast } = toastSlice.actions;
export default toastSlice.reducer;
