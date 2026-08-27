"use client";

import React from "react";
import Lottie from "lottie-react";
import loadingAnimation from "@/public/assets/loading-animation.json";

const Loader = ({ message = "Processing Financial Data..." }) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center py-10 animate-in fade-in duration-200">
            
            <div className="w-40 h-40 sm:w-90 sm:h-90 flex items-center justify-center">
                <Lottie animationData={loadingAnimation} loop={true} className="w-full h-full" />
            </div>

            <div className="mt-10 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                    <span className="h-1 w-8 bg-gradient-to-r from-transparent to-[#FFCA00] rounded-full"></span>
                    <span className="text-[19px] font-extrabold text-[#333] tracking-tight">
                        {message}
                    </span>
                    <span className="h-1 w-8 bg-gradient-to-l from-transparent to-[#FFCA00] rounded-full"></span>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">
                    <span className="w-1.5 h-1.5 bg-[#FFCA00] rounded-full animate-pulse hover:bg-[#d9ac00]"></span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                        Securing Ledger
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Loader;
