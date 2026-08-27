import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    deleteModal: {
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        loading: false,
        itemId: null, // To identify what to delete
        itemType: null, // To identify context (e.g., 'tax_code')
    },
    pageLoading: false,
    isOffline: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        openDeleteModal: (state, action) => {
            state.deleteModal = {
                ...initialState.deleteModal,
                isOpen: true,
                ...action.payload,
            };
        },
        closeDeleteModal: (state) => {
            state.deleteModal.isOpen = false;
        }, 
        setDeleteLoading: (state, action) => {
            state.deleteModal.loading = action.payload;
        },
        setPageLoading: (state, action) => {
            state.pageLoading = action.payload;
        },
        setOffline: (state, action) => {
            state.isOffline = action.payload;
        },
    },
});

export const { openDeleteModal, closeDeleteModal, setDeleteLoading, setPageLoading, setOffline } = uiSlice.actions;
export default uiSlice.reducer;
