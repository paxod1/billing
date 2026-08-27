"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IoIosAddCircleOutline, IoMdSearch } from "react-icons/io";
import { CiBellOn, CiCalendar, CiMail } from "react-icons/ci";
import { TbSmartHome } from "react-icons/tb";
import { FaChevronDown, FaRegBell } from "react-icons/fa";
import { GoBell } from "react-icons/go";
// import AddList from "./records/adminLists/AddList";
import NavActions from "@/components/Dropdown/NavActions";

function AdminNavbar({ data }) {
    const pathname = usePathname();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [openAddList, setOpenAddList] = useState(false);

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const dropdownRef = useRef();

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="w-full bg-[#F8F8F8] sm:pt-2 pt-3 flex justify-center">
            <div className=" w-full pb-1  flex sm:flex-row flex-col sm:gap-0 gap-4">
                {/* Left side nav links */}
                <div className="flex-1 flex gap-1 justify-center flex-col pt-3 sm:order-0 order-2">
                    <h1 className="text-[25px] font-bold">
                        {data.heading && data.heading}
                    </h1>
                    <p className="text-[15px] font-medium text-[#7E7676]">
                        {data.subheading && data.subheading}
                    </p>
                </div>

                {/* Right side icons */}
                <div className="flex justify-end items-center gap-5 sm:order-0 order-1">
                    {/* Home page buttons */}
                    {data.from === "home" && (
                        <div className="flex items-center gap-3">
                            {!data.isCustomizing ? (
                                <button
                                    className="px-9 py-3 bg-[#FFCA00] text-white rounded-[10px] text-[15px] cursor-pointer hover:bg-[#d9ac00]"
                                    onClick={data.onCustomizeClick}
                                >
                                    Customize
                                </button>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <button
                                        className="px-6 py-3 bg-gray-500/50 text-white rounded-[10px] text-[15px] cursor-pointer hover:bg-gray-600/50 transition-colors"
                                        onClick={data.onCancelClick}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="px-6 py-3 bg-[#FFCA00] text-[#353333] rounded-[10px] text-[15px] cursor-pointer hover:bg-[#d9ac00]"
                                        onClick={data.onSaveClick}
                                    >
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* List table page button */}
                    {data.from === "listUnlock" && (
                        <button
                            className="px-6 py-3 bg-[#FFCA00] text-[#353333] rounded-[10px] text-[15px] cursor-pointer hover:bg-[#d9ac00] flex items-center justify-center gap-2"
                            onClick={() => {
                                setOpenAddList(true);
                            }}
                        >
                            <IoIosAddCircleOutline className="text-2xl" /> Create a list
                        </button>
                    )}

                    <NavActions
                        onSearchClick={() => console.log("Search clicked")}
                        onBellClick={() => console.log("Bell clicked")}
                    />
                </div>
            </div>
            {/* Add list form component */}
            {/* {openAddList && <AddList close={setOpenAddList} />} */}
        </div>
    );
}

export default AdminNavbar;
