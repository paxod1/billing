"use client";

import NavActions from "../Dropdown/NavActions";
import { MdAddCircleOutline } from "react-icons/md";

export default function MessagesNavbar({ onNewChat }) {
  return (
    <div className="flex justify-between items-center px-6 py-4 bg-[#F9F9F9]">
      {/* Title */}
      <h1 className="text-[1.8rem] font-bold flex gap-3 items-center cursor-pointer">
        Messages
      </h1>
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={onNewChat}
          className="flex items-center justify-center gap-2 font-semibold px-5 py-3 bg-[#FFCA00] text-white rounded-[10px] text-[15px] cursor-pointer hover:bg-[#d9ac00]"
        >
          <MdAddCircleOutline className="text-2xl" /> New Chat
        </button>

        {/* Right Side Actions */}
        <NavActions
          onSearchClick={() => console.log("Search clicked")}
          onBellClick={() => console.log("Bell clicked")}
        />
      </div>
    </div>
  );
}
