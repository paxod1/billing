import React, { lazy, Suspense, useState } from "react";
import AllMagics from "../Dropdown/AllMagics";
import { GoBell } from "react-icons/go";
import { IoMdSearch } from "react-icons/io";
import { FiMenu, FiX } from "react-icons/fi";

const MobileSidebar = lazy(() => import("./MobileSidebar"));

export default function MobileHeaderViewOnly() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <>
      <div className="w-full bg-[#F8F8F8] py-3 flex justify-center lg:hidden border-b border-gray-300 z-[1001]">
        <div className="w-[95%] flex items-center justify-between">
          {/* Center - All Magics dropdown when not customizing - ONLY for mobile/tablet */}
          <div className="flex justify-center w-1/2">
            <AllMagics sidebarPosition="mobile" />
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-1">
            <button className="p-2 text-[#6B6868] hover:text-[#FFCA00]">
              <IoMdSearch size={24} />
            </button>
            <button className="p-2 text-[#6B6868] hover:text-[#FFCA00]">
              <GoBell size={24} />
            </button>
            <div className="lg:hidden">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-md text-[#6B6868] cursor-pointer"
              >
                {isSidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Suspense
        fallback={<div className="fixed inset-0 bg-black/20 z-40 lg:hidden" />}
      >
        <MobileSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </Suspense>
    </>
  );
}
