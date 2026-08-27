"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    maxVisiblePages = 5,
}) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (totalPages <= 1) return null;

    // Adjust max visible pages for mobile
    const effectiveMaxVisible = isMobile ? 3 : maxVisiblePages;

    const getPageNumbers = () => {
        const pages = [];
        const half = Math.floor(effectiveMaxVisible / 2);

        let start = Math.max(1, currentPage - half);
        let end = Math.min(totalPages, start + effectiveMaxVisible - 1);

        if (end - start + 1 < effectiveMaxVisible) {
            start = Math.max(1, end - effectiveMaxVisible + 1);
        }

        // Add first page and ellipsis if needed
        if (start > 1) {
            pages.push(1);
            if (start > 2) pages.push("...");
        }

        // Add visible pages
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        // Add ellipsis and last page if needed
        if (end < totalPages) {
            if (end < totalPages - 1) pages.push("...");
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className={`flex w-full items-center ${isMobile ? 'flex-col gap-4' : 'justify-between'} py-2 mt-6`}>
            {!isMobile && (
                <p className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                </p>
            )}

            <div className={`flex items-center ${isMobile ? 'justify-between w-full' : 'justify-center space-x-2'}`}>
                {/* Prev Button */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-md border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 bg-white transition-all ${isMobile ? 'flex-1 mr-2 flex justify-center' : ''}`}
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Numbers */}
                <div className={`flex items-center ${isMobile ? 'justify-center gap-1' : 'space-x-1'}`}>
                    {getPageNumbers().map((page, index) => (
                        <button
                            key={index}
                            onClick={() => typeof page === "number" && onPageChange(page)}
                            disabled={page === "..."}
                            className={`flex items-center justify-center rounded-md text-sm font-medium transition-all
                  ${isMobile ? 'w-8 h-8' : 'w-8 h-8'} 
                  ${page === currentPage
                                    ? "bg-[#FFCA00] text-white border border-[#FFCA00]"
                                    : page === "..."
                                        ? "cursor-default text-gray-400 border-none"
                                        : "border border-gray-200 text-gray-700 hover:bg-gray-50 bg-white shadow-sm"
                                }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                {/* Next Button */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-md border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 bg-white transition-all ${isMobile ? 'flex-1 ml-2 flex justify-center' : ''}`}
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {isMobile && (
                <p className="text-sm text-gray-500 w-full text-center">
                    Page {currentPage} of {totalPages}
                </p>
            )}
        </div>
    );
}
