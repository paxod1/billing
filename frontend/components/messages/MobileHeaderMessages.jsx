import React, { lazy, Suspense, useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import { IoIosAddCircleOutline, IoMdSearch } from "react-icons/io";
import { GoBell } from "react-icons/go";
import { FaChevronDown } from "react-icons/fa";
import AllMagics from "@/components/Dropdown/AllMagics";
import AdminSidebar from "../AdminSidebar";
import MobileHeaderViewOnly from "@/components/common/MobileHeaderViewOnly";

function MobileHeaderMessages({ subHeading, onNewChat }) {
  return (
    <>
      {/* Mobile Header */}
      <MobileHeaderViewOnly />

      {/* Mobile Content Header - Show user greeting and customize button */}
      <div className="w-full bg-[#F8F8F8] py-3 flex justify-center lg:hidden">
        <div className="w-[95%] flex flex-col justify-center gap-1">
          <div className="flex w-full items-center justify-between flex-row">
            <h1 className="text-xl font-bold">Messages</h1>
            <button
              className="px-4 py-2 bg-[#036510] text-white rounded-[10px] text-[15px] cursor-pointer hover:bg-brand-mint flex items-center justify-center gap-2"
              onClick={onNewChat}
            >
              <IoIosAddCircleOutline className="text-2xl" /> New Chat
            </button>
          </div>
          {subHeading && (
            <p className="md:text-sm text-xs font-medium text-[#7E7676] md:mt-0 mt-1">
              {subHeading}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default MobileHeaderMessages;
