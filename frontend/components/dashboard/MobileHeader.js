"use client";

import React, { useState, useRef, useEffect, Suspense, lazy } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import { IoMdSearch } from "react-icons/io";
import { FaChevronDown } from "react-icons/fa";
import AllMagics from "@/components/Dropdown/AllMagics";
import { IoChevronBack } from "react-icons/io5";
import { useRouter } from "next/navigation";
import MobileHeaderViewOnly from "@/components/commonComp/MobileHeaderViewOnly";

// Lazy load MobileSidebar - only loads when needed
// const MobileSidebar = lazy(() => import("./MobileSidebar"));

function MobileHeader({
    data,
    isMobileCustomizing = false,
    title,
    subHeading,
}) {
    // const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Use data props if available, otherwise fall back to direct props
    const heading = data?.heading || title;
    const subheading = data?.subheading || subHeading;
    const from = data?.from;

    // Close sidebar when customizing mode changes
    // useEffect(() => {
    //   if (isMobileCustomizing) {
    //     setIsSidebarOpen(false);
    //   }
    // }, [isMobileCustomizing]);


    const router = useRouter();

    return (
        <>
            {/* Mobile Header */}
            {/* <MobileHeaderViewOnly /> */}

            {/* Mobile Content Header - Show user greeting and customize button */}
            <div className="w-full bg-[#F8F8F8] py-3 flex justify-center lg:hidden">
                <div className="w-full flex flex-col justify-center gap-1">
                    <div className="flex w-full items-center justify-between flex-row">
                        <h1 className="text-xl font-bold flex items-center gap-3">
                            {heading === "Test Opportunities" && (
                                <div
                                    onClick={() => router.push("/opportunitiespage")}
                                    className="cursor-pointer"
                                >
                                    <IoChevronBack />
                                </div>
                            )}
                            {heading}
                        </h1>

                        {!isMobileCustomizing ? (
                            from === "home" && (
                                <button
                                    className="sm:px-9 px-6 sm:py-3 py-2 bg-[#FFCA00] text-[#353333] rounded-[10px] text-[15px] cursor-pointer hover:bg-[#d9ac00]"
                                    onClick={data.onCustomizeClick}
                                >
                                    Customize
                                </button>
                            )
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={data.onCancelClick}
                                    className="px-6 py-3 bg-gray-500/50 text-white rounded-lg text-sm font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={data.onSaveClick}
                                    className="px-6 py-3 bg-[#FFCA00] text-[#353333] rounded-lg text-sm font-semibold hover:bg-[#d9ac00]"
                                >
                                    Save
                                </button>
                            </div>
                        )}
                    </div>
                    {subheading && (
                        <p className="md:text-sm text-xs font-medium text-[#7E7676] md:mt-0 mt-1">
                            {subheading}
                        </p>
                    )}
                </div>
            </div>

            {/* <Suspense
        fallback={<div className="fixed inset-0 bg-black/20 z-40 lg:hidden" />}
      >
        <MobileSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </Suspense> */}
        </>
    );
}

export default MobileHeader;
