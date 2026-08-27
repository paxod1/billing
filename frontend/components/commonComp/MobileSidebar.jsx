"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { IoIosArrowRoundBack } from "react-icons/io";
import { FaArrowRight } from "react-icons/fa";
import SidebarNavigation from "./SidebarNavigation";

function MobileSidebar({ isOpen, onClose }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed z-[1001] inset-0 bg-black/40 z-50 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`
          lg:hidden fixed top-0 right-0 h-[100dvh] w-[320px] bg-white z-[1001] flex flex-col border border-[#ECE8E8]
          transform transition-transform duration-300 ease-in-out hide-scrollbar
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
            >
                <section className="flex-1 overflow-y-auto hide-scrollbar">
                    {/* Brand Header */}
                    <div className="flex flex-col justify-center py-3 px-8 mb-3 relative">
                        <div className="flex gap-1 items-center justify-end">
                            <IoIosArrowRoundBack
                                className="text-3xl cursor-pointer shrink-0"
                                onClick={onClose}
                            />
                            <h1 className="text-4xl font-extrabold relative inline-block tracking-widest text-right">
                                <Link
                                    href="/"
                                    className="relative inline-block"
                                    onClick={onClose}
                                >
                                    YourBrand
                                </Link>
                                <div className="absolute bottom-0 right-0 w-1/2 h-0.5 bg-gray-300"></div>
                            </h1>
                        </div>
                        <p className="text-sm tracking-wide text-[#FFCA00] mt-1 text-right handwriting">
                            Powered by Billing
                        </p>
                    </div>

                    {/* Navigation Items */}
                    <SidebarNavigation isMobile={true} onLinkClick={onClose} />

                    {/* Upgrade Card
                    <div className="px-8">
                        <div
                            className="relative mt-5 mb-5 rounded-[10px] w-full flex flex-col items-center px-2 pt-0 pb-5 shadow-md"
                            style={{
                                background: "linear-gradient(180deg, #644C98 0%, #CDC0E9 100%)",
                            }}
                        >
                            <img
                                src="/sidebar-box-image.png"
                                alt="side-bar-ad-image.png"
                                className="w-40"
                            />

                            <h2 className="mt-0 text-center font-bold text-[15px] text-white">
                                Upgrade for more power
                            </h2>

                            <p className="mt-1 text-[12px] text-white">
                                You've tapped into the essentials - now unlock the rest. More
                                features, more impact, more growth
                            </p>

                            <button className="mt-5 w-full py-2 bg-white text-black font-semibold rounded-full shadow transition hover:bg-gray-100 flex gap-2 items-center justify-center">
                                Unlock More
                                <FaArrowRight />
                            </button>
                        </div>
                    </div> */}
                </section>
            </aside>
        </>
    );
}

export default MobileSidebar;
