"use client";

import React from "react";
import Link from "next/link";
import AllMagics from "../Dropdown/AllMagics";
import SidebarNavigation from "./SidebarNavigation";

function AdminSidebar({ isOpen = true }) {
    return (
        <aside className={`hidden lg:flex fixed top-0 left-0 h-screen w-[320px] bg-white z-[100] flex-col border border-[#ECE8E8] transition-all duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
            <section className="flex flex-col h-full overflow-y-auto sidebar-scrollbar overscroll-contain px-2">
                {/* Brand Header */}
                <div className="flex flex-col justify-center py-6 px-2 mb-2 relative">
                    <div className="flex gap-1 items-center justify-end">
                        <h1 className="text-4xl font-extrabold relative inline-block tracking-widest text-right">
                            <Link href="/" className="relative inline-block text-[#353333]">
                                Billing
                            </Link>
                            <div className="absolute bottom-0 right-0 w-1/2 h-0.5 bg-gray-300"></div>
                        </h1>
                    </div>
                    <p className="text-sm tracking-wide text-[#353333] font-semibold mt-1 text-right">
                        Local Desktop Software
                    </p>
                </div>


                {/* Navigation Items */}
                <div className="flex-1 pb-10">
                    <SidebarNavigation isMobile={false} />
                </div>
            </section>
        </aside>
    );
}

export default AdminSidebar;
