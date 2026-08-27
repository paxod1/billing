'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { closeDeleteModal } from '@/lib/features/ui/uiSlice';

const GlobalDeleteModal = () => {
    const dispatch = useDispatch();
    const { isOpen, title, message, confirmText, cancelText, loading, onConfirm } = useSelector(
        (state) => state.ui.deleteModal
    );

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }
    };

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => dispatch(closeDeleteModal())}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in duration-200">
                <h2 className="text-[24px] font-bold mb-4">{title}</h2>
                <p className="text-[17px] text-gray-600 mb-8">
                    {message}
                </p>
                <div className="flex items-center justify-end gap-4">
                    <button
                        onClick={() => dispatch(closeDeleteModal())}
                        className="px-6 py-3 text-[17px] font-bold text-black hover:text-gray-600 transition-colors cursor-pointer disabled:opacity-50"
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-3 bg-red-500 text-white rounded-xl text-[17px] font-bold hover:bg-red-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? 'Deleting...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GlobalDeleteModal;
