'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from '@/lib/store';
import { injectStore } from '@/lib/axiosCreate';

export default function StoreProvider({ children }) {
    const storeRef = useRef(null);
    if (!storeRef.current) {
        // Create the store instance the first time this renders
        storeRef.current = makeStore();
        injectStore(storeRef.current);
    }

    return <Provider store={storeRef.current}>{children}</Provider>;
}
