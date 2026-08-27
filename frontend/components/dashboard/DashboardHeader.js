import React from "react";
import { LuSearch, LuBell, LuUser } from "react-icons/lu";

function DashboardHeader({ params }) {
    const { heading, subheading, isCustomizing, onCustomizeClick, onCancelClick, onSaveClick } = params;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between py-6 mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-extrabold text-[#353333] tracking-tight">{heading}</h1>
                <p className="text-[#353333]/50 text-sm font-medium mt-1">{subheading}</p>
            </div>

            <div className="flex items-center gap-6">
                {isCustomizing ? (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onCancelClick}
                            className="px-6 py-2.5 border border-[#ECE8E8] text-[#353333] font-bold rounded-xl hover:bg-gray-50 transition-all text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSaveClick}
                            className="px-8 py-2.5 bg-[#FFCA00] text-[#353333] font-bold rounded-xl (255,202,0,0.4)] text-sm hover:bg-[#d9ac00]"
                        >
                            Save Changes
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={onCustomizeClick}
                            className="px-8 py-2.5 bg-[#FFCA00] text-white font-bold rounded-xl (255,202,0,0.4)] text-sm hover:bg-[#d9ac00]"
                        >
                            Customize
                        </button>

                        <div className="flex items-center gap-4 text-[#353333]/60">

                            <button className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                                <LuSearch size={22} />
                            </button>
                            
                            <button className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors cursor-pointer relative">
                                <LuBell size={22} />
                                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>

                            <button className="flex items-center gap-2 pl-2 border-l border-[#ECE8E8]">
                                <div className="w-9 h-9 bg-gray-200 rounded-xl overflow-hidden border border-[#ECE8E8]">
                                    <img src="/logo.png" alt="User" className="w-full h-full object-cover" />
                                </div>
                                <LuUser size={18} className="text-[#353333]/30" />
                            </button>

                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default DashboardHeader;  