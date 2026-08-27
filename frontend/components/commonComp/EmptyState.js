"use client";

import React from "react";
import { LuWallet } from "react-icons/lu";

const EmptyState = ({
    title = "Financial Records Not Found",
    message = "Your ledger is currently empty. Start building your financial overview by adding new entries.",
    actionLabel,
    onActionClick
}) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center py-10 px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="w-24 h-24 bg-[#FDFDFD] rounded-[32px] flex items-center justify-center mb-6 relative border border-gray-100 shadow-inner">
                {/* Abstract Finance Pattern */}
                <div className="absolute inset-4 border border-dashed border-gray-200 rounded-[24px] opacity-40 animate-[pulse_4s_infinite]"></div>

                {/* Central Icon container */}
                <div className="relative z-10 w-14 h-14 bg-white rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.05)] border border-gray-50 flex flex-col items-center justify-center overflow-hidden group">
                    <div className="w-full h-1 bg-[#FFCA00] absolute top-0 hover:bg-[#d9ac00]"></div>
                    <LuWallet className="text-[#FFCA00] text-3xl transform group-hover:scale-110 transition-transform duration-500" />

                    {/* Floating Bill element */}
                    <div className="absolute bottom-1 right-1 w-3 h-3 bg-gray-100 rounded-sm"></div>
                </div>

                {/* Ornament dots */}
                <div className="absolute top-4 left-4 w-2 h-2 bg-[#FFCA00] rounded-full opacity-30 hover:bg-[#d9ac00]"></div>
                <div className="absolute bottom-6 right-8 w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
            </div>

            <div className="space-y-2 max-w-md">
                <h3 className="text-[22px] font-bold text-[#111] tracking-tight">
                    {title}
                </h3>
                <p className="text-[15px] font-medium text-gray-400 leading-relaxed">
                    {message}
                </p>
            </div>

            {/* {actionLabel && (
                <button
                    onClick={onActionClick}
                    className="mt-8 px-6 py-2.5 border-2 border-[#FFCA00] text-[#FFCA00] bg-white rounded-lg text-[14px] font-bold hover:bg-yellow-50 transition-all flex items-center gap-2"
                >
                    {actionLabel}
                </button>
            )} */}
        </div>
    );
};

export default EmptyState;
