"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LuChevronDown } from "react-icons/lu";
import { navigationSections } from "./sidebarData";
import { MdLogout } from "react-icons/md";
import { clearAuthCookies } from "../../utils/cookieHelper";
import { toast } from "react-hot-toast";
import InviteUserModal from "./popups/invite/page";

function SidebarNavigation({ onLinkClick = () => { }, isMobile = false }) {
    const [openDropdowns, setOpenDropdowns] = useState({});
    const [nestedDropdownOpen, setNestedDropdownOpen] = useState({});
    const [showInviteModal, setShowInviteModal] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        clearAuthCookies();
        localStorage.clear();
        sessionStorage.clear();
        toast.success("Logged out successfully");
        router.push("/login");
        onLinkClick(); // Close mobile sidebar if open
    };

    // Helper function to apply active styles
    // Updated base color to #FFCA00 (yellow/amber)
    const activeClass = "text-[#FFCA00] font-semibold";
    const baseClass =
        "no-underline flex items-center gap-4 py-2 rounded-lg relative group transition-all duration-200";

    const enabledClass =
        "hover:text-[#FFCA00] text-black cursor-pointer";
    const disabledClass = "text-gray-300 cursor-not-allowed opacity-50";

    const handleLinkClick = (item, enabled) => {
        if (!enabled) return;

        // Handle Invite Modal special case
        if (item.id === "invite") {
            setShowInviteModal(true);
            onLinkClick(); // Close mobile sidebar
            return;
        }

        if (item.path) {
            onLinkClick();
        }
    };

    const handleDropdownToggle = (itemId, enabled) => {
        if (!enabled) return;
        setOpenDropdowns((prev) => ({
            ...prev,
            [itemId]: !prev[itemId],
        }));
    };

    const toggleNestedDropdown = (itemName) => {
        setNestedDropdownOpen((prev) => ({
            ...prev,
            [itemName]: !prev[itemName],
        }));
    };

    const isPathActive = (item) => {
        if (pathname === item.path) return true;

        if (item.hasDropdown && item.dropdownItems) {
            return item.dropdownItems.some((dropItem) => {
                if (dropItem.path && pathname === dropItem.path) return true;
                if (dropItem.hasNestedDropdown && dropItem.nestedItems) {
                    return dropItem.nestedItems.some(
                        (nested) => pathname === nested.path
                    );
                }
                return false;
            });
        }

        return false;
    };

    const renderNestedDropdown = (dropdownItem, index) => {
        const isExpanded = nestedDropdownOpen[dropdownItem.name];

        return (
            <div key={index}>
                <div
                    onClick={() => toggleNestedDropdown(dropdownItem.name)}
                    className="flex items-center justify-between py-1.5 text-gray-500 hover:text-[#FFCA00] cursor-pointer text-[13px] font-medium transition-colors duration-150"
                >
                    <span>{dropdownItem.name}</span>
                    <LuChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                            }`}
                    />
                </div>

                <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                        }`}
                >
                    <div className="ml-4 mt-1">
                        <ul>
                            {dropdownItem.nestedItems.map((item, itemIdx) => (
                                <li key={itemIdx} className="mt-1">
                                    <Link
                                        href={item.path}
                                        onClick={() => handleLinkClick(item, true)}
                                        className={`block px-6 py-1 rounded-md text-sm transition-colors duration-150
    ${pathname === item.path
                                                ? "bg-yellow-50 text-[#FFCA00] font-semibold"
                                                : "text-gray-600 hover:bg-gray-100 hover:text-[#FFCA00]"
                                            }`}
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    };

    const renderNavigationItem = (item) => {
        const IconComponent = item.icon;
        const isActive = isPathActive(item);
        const isEnabled = item.enabled;
        const isDropdownOpen = openDropdowns[item.id];

        // Style the icon safely
        const iconElement = IconComponent ? (
            <div className="w-5 h-5 flex items-center justify-start flex-shrink-0">
                <IconComponent
                    className="w-full h-full transition-transform duration-200"
                    preserveAspectRatio="xMinYMid meet"
                />
            </div>
        ) : null;

        if (item.hasDropdown) {
            return (
                <div key={item.id} className="relative">
                    <div
                        onClick={() => handleDropdownToggle(item.id, isEnabled)}
                        className={isEnabled ? "cursor-pointer" : "cursor-not-allowed"}
                    >
                        <div
                            className={`${baseClass} ${isEnabled
                                ? isActive
                                    ? activeClass
                                    : enabledClass
                                : disabledClass
                                }`}
                        >
                            {iconElement}

                            <div className="flex-1 flex items-center justify-between min-w-0">
                                <span className="truncate text-[15px]">{item.name}</span>
                                {isEnabled && (
                                    <LuChevronDown
                                        size={18}
                                        className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                                    />
                                )}
                            </div>

                            {/* Active Gold Underline */}
                            <div
                                className={`h-[3px] w-[60px] bg-[#FFCA00] absolute bottom-0 left-9 transition-all duration-300 
                                ${isActive && isEnabled ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
                            ></div>
                        </div>
                    </div>

                    {/* Dropdown Menu */}
                    {isEnabled && (
                        <div
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${isDropdownOpen
                                ? "max-h-[600px] opacity-100"
                                : "max-h-0 opacity-0"
                                }`}
                        >
                            <div className="ml-4">
                                <ul className="flex flex-col">
                                    {item.dropdownItems.map((dropdownItem, index) => (
                                        <li key={index} className="mt-1">
                                            {dropdownItem.hasNestedDropdown ? (
                                                renderNestedDropdown(dropdownItem, index)
                                            ) : (
                                                <Link
                                                    href={dropdownItem.path}
                                                    onClick={() =>
                                                        handleLinkClick(dropdownItem, true)
                                                    }
                                                    className={`block px-4 py-1 rounded-md text-sm transition-colors duration-150
    ${pathname === dropdownItem.path
                                                            ? "bg-yellow-50 text-[#FFCA00] font-semibold"
                                                            : "text-gray-600 hover:bg-gray-100 hover:text-[#FFCA00]"
                                                        }`}
                                                >
                                                    {dropdownItem.name}
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div key={item.id}>
                {isEnabled ? (
                    item.id === "invite" ? (
                        <div
                            onClick={() => handleLinkClick(item, true)}
                            className={`${baseClass} ${enabledClass}`}
                        >
                            {iconElement}
                            <span className="text-[15px]">{item.name}</span>
                        </div>
                    ) : (
                        <Link
                            href={item.path || "#"}
                            className={`${baseClass} ${isActive ? activeClass : enabledClass}`}
                            onClick={() => handleLinkClick(item, true)}
                        >
                            {iconElement}
                            <span className="text-[15px]">{item.name}</span>
                            {/* Active Gold Underline */}
                            <div
                                className={`h-[3px] w-[60px] bg-[#FFCA00] absolute bottom-1 left-9 transition-all duration-300 
                            ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
                            ></div>
                        </Link>
                    )
                ) : (
                    <div className={`${baseClass} ${disabledClass}`} title="Coming soon">
                        {iconElement}
                        <span className="text-[15px]">{item.name}</span>
                    </div>
                )}
            </div>
        );
    };

    const renderNavigationSection = (section) => (
        <div key={section.id} className="mt-8 flex flex-col gap-1 first:mt-5">
            {section.title && (
                <h2 className="text-gray-400 text-[13px] font-bold tracking-[0.1em] mb-2">
                    {section.title}
                </h2>
            )}
            {section.items.map(renderNavigationItem)}
        </div>
    );

    return (
        <div className="px-8 pb-10 h-full flex flex-col">
            <div className="flex-1">
                {navigationSections.map(renderNavigationSection)}
            </div>

            {/* Logout button at the bottom */}
            <div className="mt-auto border-t border-gray-100 pt-4 pb-2">
                <button
                    className="w-full flex items-center gap-4 py-2 text-red-500 hover:text-red-600 rounded-lg transition-all duration-200 group"
                    onClick={handleLogout}
                >
                    <div className="w-5 h-5 flex items-center justify-start flex-shrink-0">
                        <MdLogout
                            className="w-full h-full transition-transform duration-200"
                            preserveAspectRatio="xMinYMid meet"
                        />
                    </div>
                    <span className="text-[15px] font-medium">Logout</span>
                </button>
            </div>

            {/* Render Invite Modal */}
            <InviteUserModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
            />
        </div>
    );
}

export default SidebarNavigation;
