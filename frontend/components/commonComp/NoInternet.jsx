"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import Lottie from "lottie-react";
import noInternetAnimation from "@/public/assets/No Internet.json";

const NoInternet = () => {
    const isOffline = useSelector((state) => state.ui?.isOffline);
    const [isRefreshing, setIsRefreshing] = useState(false);

    if (!isOffline) return null;

    const handleRetry = () => {
        setIsRefreshing(true);
        // Refresh the page to reload configurations and retry fetching services
        setTimeout(() => {
            window.location.reload();
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-gradient-to-br from-white via-slate-50 to-slate-100 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="max-w-md w-full flex flex-col items-center text-center">
                {/* Lottie Animation Container */}
                <div className="w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center drop-shadow-md hover:scale-105 transition-transform duration-300">
                    <Lottie 
                        animationData={noInternetAnimation} 
                        loop={true} 
                        className="w-full h-full" 
                    />
                </div>

                {/* Content */}
                <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-center gap-2">
                        <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping"></span>
                        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight sm:text-4xl">
                            Connection Lost
                        </h1>
                    </div>
                    
                    <p className="text-base text-slate-500 max-w-sm mx-auto leading-relaxed">
                        We couldn't connect to our servers or encountered an internal error. Please check your connection and try again.
                    </p>
                </div>

                {/* Interactive Retry Button */}
                <div className="mt-10 w-full px-4">
                    <button
                        onClick={handleRetry}
                        disabled={isRefreshing}
                        className="relative group w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#FFCA00] to-[#E5B500] p-0.5 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <div className="relative flex items-center justify-center gap-3 rounded-[14px] bg-slate-900 px-6 py-3.5 text-white transition-colors duration-300 group-hover:bg-transparent group-hover:text-slate-950 font-bold text-base">
                            <svg 
                                className={`w-5 h-5 transition-transform duration-700 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`}
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                                strokeWidth={2.5}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
                            </svg>
                            <span>{isRefreshing ? 'Reconnecting...' : 'Retry Connection'}</span>
                        </div>
                    </button>
                    
                    
                </div>
            </div>
        </div>
    );
};

export default NoInternet;
