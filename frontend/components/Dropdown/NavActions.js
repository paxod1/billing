"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IoMdSearch } from "react-icons/io";
import { GoBell } from "react-icons/go";
import { FaChevronDown } from "react-icons/fa6";
import { clearAuthCookies } from "../../utils/cookieHelper";

export default function NavActions({
    showProfiles = false,
    profiles = [],
    onSearchClick,
    onBellClick,
}) {
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);
    const dropdownRef = useRef();

    useEffect(() => {
        const handleEvents = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
            if (e.type === 'scroll') {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            window.addEventListener("click", handleEvents);
            window.addEventListener("scroll", handleEvents, true);
        }

        return () => {
            window.removeEventListener("click", handleEvents);
            window.removeEventListener("scroll", handleEvents, true);
        };
    }, [isDropdownOpen]);

    // Simple logout function
    const handleLogout = () => {
        try {
            // 1. Clear all cookies using helper
            clearAuthCookies();

            // 2. Clear local storage
            localStorage.clear();
            sessionStorage.clear();

            // 3. Close dropdown
            setIsDropdownOpen(false);

            // 4. Navigate to login
            router.push('/login');

        } catch (error) {
            console.error('Logout error:', error);
            // Still navigate to login
            router.push('/login');
        }
    };

    const handleDropdownItemClick = (item) => {
        setIsDropdownOpen(false);

        switch (item) {
            case "Logout":
                handleLogout();
                break;
            case "Profile":
                router.push("/profile");
                break;
            case "Settings":
                router.push("/settings");
                break;
            default:
                break;
        }
    };

    return (
        <div className="flex items-center gap-5">
            {/* Profile avatars if enabled */}
            {showProfiles && (
                <div className="flex -space-x-2">
                    {profiles.slice(0, 4).map((p, i) => (
                        <img
                            key={i}
                            src={p}
                            alt={`profile-${i}`}
                            className="w-[32px] h-[32px] rounded-full border-2 border-white object-cover"
                        />
                    ))}
                    {profiles.length > 4 && (
                        <div className="w-[32px] h-[32px] rounded-full bg-gray-200 text-sm flex items-center justify-center border-2 border-white">
                            +{profiles.length - 4}
                        </div>
                    )}
                </div>
            )}

            {/* Search */}
            <div
                className="font-medium text-[25px] text-[#6B6868] hover:text-[#005CA6] cursor-pointer"
                onClick={onSearchClick}
            >
                <IoMdSearch />
            </div>

            {/* Bell */}
            <div
                className="font-medium text-[25px] text-[#6B6868] hover:text-[#005CA6] cursor-pointer"
                onClick={onBellClick}
            >
                <GoBell />
            </div>

            {/* Profile + Dropdown */}
            <div
                ref={dropdownRef}
                className="relative flex items-center gap-1 cursor-pointer"
                onClick={toggleDropdown}
            >
                <img
                    src="/admin-nav-drop.png"
                    alt="profile"
                    className="w-[32px] h-[32px] p-1 rounded-full bg-[#e6e6fa] border border-[#9A9191]"
                />
                <FaChevronDown className="text-black text-[11px]" />

                {isDropdownOpen && (
                    <div className="absolute top-full mt-3 right-0 bg-white rounded-lg shadow-md py-2 w-[130px] z-[1003]">
                        {["Profile", "Settings", "Logout"].map((item) => (
                            <p
                                key={item}
                                className="px-4 py-2 text-sm text-[#333] hover:bg-[#f2f2f2] cursor-pointer"
                                onClick={() => handleDropdownItemClick(item)}
                            >
                                {item}
                            </p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}