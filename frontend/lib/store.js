import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './features/ui/uiSlice';
import toastReducer from './features/toast/toastSlice';

export const makeStore = () => {
    return configureStore({
        reducer: {
            ui: uiReducer,
            toast: toastReducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: {
                    ignoredActions: ['ui/openDeleteModal'],
                    ignoredActionPaths: ['payload.onConfirm'],
                    ignoredPaths: ['ui.deleteModal.onConfirm'],
                },
            }),
    });
};
