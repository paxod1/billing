"use client";

import React, { useState } from "react";
import AdminSidebar from "../commonComp/Sidebar";
import MobileHeaderViewOnly from "../commonComp/MobileHeaderViewOnly";
import QuickNavbar from "../commonComp/QuickNavbar";

export default function UserLayout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex min-h-screen overflow-hidden bg-[#F8F8F8]">
            {/* Sidebar Container with Dynamic Width */}
            <div
                className="group relative flex-shrink-0 transition-all duration-300 ease-in-out hidden lg:block"
                style={{ width: isSidebarOpen ? "320px" : "0px" }}
            >
                <AdminSidebar isOpen={isSidebarOpen} />
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative">
                <div className={`flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out px-0 lg:${isSidebarOpen ? "md:px-8" : "md:px-12"}`}>
                    <QuickNavbar isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                    <MobileHeaderViewOnly />
                </div>
               
                <main
                    className={`flex-1 flex flex-col overflow-y-auto custom-scrollbar pt-0 pb-8 transition-all duration-300 ease-in-out px-0 lg:${isSidebarOpen ? "md:px-8" : "md:px-12"}`}
                >
                   <div className="md:px-5 px-3 flex-1 flex flex-col">
                       {children}
                   </div>
                </main>
            </div>
        </div>
    );
}
