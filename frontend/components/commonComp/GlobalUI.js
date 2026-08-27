'use client';

import React, { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useDispatch } from 'react-redux';
import { setOffline } from '@/lib/features/ui/uiSlice';
import GlobalDeleteModal from './GlobalDeleteModal';
import GlobalToast from './GlobalToast';
import GlobalLoader from './GlobalLoader';
import NoInternet from './NoInternet';

const GlobalUI = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const handleOnline = () => {
            dispatch(setOffline(false));
        };
        const handleOffline = () => {
            dispatch(setOffline(true));
        };

        // Check initial state on mount
        if (typeof window !== 'undefined') {
            if (!navigator.onLine) {
                dispatch(setOffline(true));
            }
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            }
        };
    }, [dispatch]);

    return (
        <>
            <Toaster
                position="top-center"
                richColors
                expand={false}
            />
            <GlobalLoader />
            <GlobalToast />
            <GlobalDeleteModal />
            <NoInternet />
        </>
    );
};

export default GlobalUI;
