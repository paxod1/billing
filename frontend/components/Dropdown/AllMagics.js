"use client";

import {
    BossIcon,
    GoalsIcon,
} from "@/lib/customIcons";
import React, { useEffect, useRef, useState } from "react";
import { FaLock } from "react-icons/fa";
import { RiExpandUpDownLine } from "react-icons/ri";

// Base app configuration with all possible apps
const baseApps = [
    {
        name: "Revenue",
        displayName: "Revenue",
        apiName: "billing", // Consolidated to Billing
        color: "bg-[#FFCA00]",
        icon: "/sales.png",
        isImage: true,
        locked: true,
        domain: 'https://billing.com'
    },
    {
        name: "Business Hub",
        displayName: "Business Hub",
        color: "bg-[#005CA6]",
        icon: <BossIcon />,
        isImage: false,
        locked: false,
        domain: 'https://www.bossmagics.com'
    },
    {
        name: "Leads",
        displayName: "Leads",
        apiName: "billing", // Consolidated
        color: "bg-[#FFCA00]",
        icon: "/leads.png",
        isImage: true,
        locked: true,
        domain: 'https://billing.com'
    },
    {
        name: "fulfillments",
        displayName: "Fulfillments",
        apiName: "Taskmagics",
        color: "bg-[#D57119]",
        icon: "/task.png",
        isImage: true,
        locked: true,
        domain: 'https://taskmagics.com'
    },
    {
        name: "Finance",
        displayName: "Finance",
        apiName: "billing",
        color: "bg-[#FFCA00]",
        icon: "/money.png",
        isImage: true,
        locked: true,
        domain: 'https://billing.com'
    },
    {
        name: "Productivity",
        displayName: "Productivity",
        apiName: "hiremagics",
        color: "bg-[#1F74C2]",
        icon: "/hire.png",
        isImage: true,
        locked: true,
        domain: 'https://hire-magics.vercel.app'
    },
    {
        name: "Compliance",
        displayName: "Compliance",
        apiName: "lexmagics",
        color: "bg-[#106104]",
        icon: "/lex.png",
        isImage: true,
        locked: true,
        domain: 'https://lexmagics.com'
    },
    {
        name: "Discoveries",
        displayName: "Discoveries",
        apiName: "scalemagics",
        color: "bg-[#383838]",
        icon: "/scale.png",
        isImage: true,
        locked: true,
        domain: 'https://scalemagics.com'
    },
    {
        name: "Goals",
        displayName: "Goals",
        apiName: "goalmagics",
        color: "bg-[#383838]",
        icon: <GoalsIcon />,
        isImage: false,
        locked: true,
        domain: 'https://goalmagics.com'
    },
];

export default function AllMagics({ sidebarPosition = "mobile" }) {
    const [open, setOpen] = useState(false);
    // Find Finance app for default selection
    const defaultApp = baseApps.find(app => app.name === "Finance") || baseApps[0];
    const [selected, setSelected] = useState(defaultApp);
    const [apps, setApps] = useState(baseApps);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, []);

    // Close dropdown on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (open) {
                setOpen(false);
            }
        };

        if (open) {
            window.addEventListener('scroll', handleScroll, { passive: true });
            window.addEventListener('touchmove', handleScroll, { passive: true });
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('touchmove', handleScroll);
        };
    }, [open]);

    // Handle app selection from dropdown
    const handleAppSelect = (app) => {
        if (!app.locked) {
            // If it's the current app (Finance), just close dropdown
            if (app.name === "Finance") {
                setSelected(app);
                setOpen(false);
                return;
            }
            // Otherwise navigation logic
            window.location.href = app.domain;
        } else {
            setOpen(false);
        }
    };

    // Handle selected box click
    const handleSelectedClick = () => {
        setOpen(!open);
    };

    // Get dropdown positioning classes
    const getDropdownClasses = () => {
        if (sidebarPosition === "desktop") {
            return "fixed top-[150px] left-[310px] w-[280px] bg-white border border-gray-200 rounded-lg p-3 z-[9999] flex flex-col gap-3 shadow-[10px_10px_40px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-left-2 duration-200";
        } else {
            return "absolute top-full mt-2 left-0 w-[250px] right-0 bg-white border border-gray-200 rounded-lg p-3 z-[9999] flex flex-col gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200";
        }
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* Selected Box */}
            <div
                className="flex items-center justify-between border rounded-lg px-2 py-2 cursor-pointer bg-[#F8F8F8] md:border-gray-400 border-gray-300 md:shadow"
                onClick={handleSelectedClick}
            >
                <div className="flex items-center gap-4">
                    <div className="w-9 h-8 flex items-center justify-center rounded-md">
                        {selected.isImage && selected.icon ? (
                            <img
                                src={selected.icon}
                                alt={selected.name}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            selected.icon
                        )}
                    </div>
                    <span className="font-bold text-[22px]">{selected.name}</span>
                </div>
                <RiExpandUpDownLine />
            </div>

            {/* Dropdown */}
            {open && (
                <div className={getDropdownClasses()}>
                    {apps
                        .filter(app => app.name !== selected.name)
                        .map((app, index) => (
                            <div
                                key={index}
                                className={`flex items-center gap-3 rounded-lg px-2 py-1 ${!app.locked
                                    ? 'hover:bg-gray-50 cursor-pointer transition-colors'
                                    : 'cursor-not-allowed opacity-70'
                                    }`}
                                onClick={() => handleAppSelect(app)}
                            >
                                <div className={`border ${app.locked ? 'border-gray-300' : 'border-gray-400'} rounded-md p-1.5 flex items-center justify-center`}>
                                    {app.isImage && app.icon ? (
                                        <img
                                            src={app.icon}
                                            alt={app.name}
                                            className="w-6 h-6 object-contain"
                                        />
                                    ) : (
                                        <div className="text-gray-700">
                                            {app.icon}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <span className={`font-medium ${app.locked ? 'text-gray-600' : 'text-gray-900'}`}>
                                        {app.name}
                                    </span>
                                </div>
                                {app.locked && (
                                    <FaLock className="text-gray-400 text-sm" />
                                )}
                            </div>
                        ))}
                </div>
            )}
        </div>
    );             
}