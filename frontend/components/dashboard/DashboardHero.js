import React from "react";
import { LuArrowDown, LuArrowUp, LuCircleCheck } from "react-icons/lu";

function DashboardHero() {
    return (
        <div className="w-full flex flex-col xl:flex-row items-center justify-between gap-12 mb-16 bg-white p-8 rounded-[32px] border border-[#ECE8E8]">
            {/* Illustration Area */}
            <div className="w-full xl:w-1/2 flex justify-center scale-110">
                <img
                    src="/home-left-image.png"
                    alt="Billing Hero"
                    className="max-h-[350px] w-auto h-auto drop-shadow-2xl"
                    onError={(e) => {
                        e.target.src = "https://img.freepik.com/free-vector/accounting-concept-illustration_114360-1550.jpg";
                    }}
                />
            </div>

            {/* Feature Flow Area */}
            <div className="w-full xl:w-1/2 flex flex-col gap-6 relative px-4">
                {/* Step 1 */}
                <div className="flex justify-start relative z-10">
                    <div className="w-[320px] p-6 border-2 border-[#353333] rounded-3xl bg-white shadow-[8px_8px_0px_rgba(0,0,0,0.02)]">
                        <h3 className="font-extrabold text-[15px] mb-2 leading-tight uppercase tracking-tight">Maintain Your Books of Accounts</h3>
                        <p className="text-[11px] text-[#353333]/60 leading-relaxed font-medium">
                            Keep all your transactions recorded in journals and ledgers. This ensures you have accurate financial records at all times.
                        </p>
                        <div className="mt-4 flex justify-end">
                            <div className="w-8 h-8 bg-[#FFCA00] rounded-[10px] flex items-center justify-center text-white rotate-12 hover:bg-[#d9ac00]">
                                <LuCircleCheck size={18} />
                            </div>
                        </div>
                    </div>
                    {/* Connector 1 */}
                    <div className="hidden xl:block absolute -right-4 top-1/2 -translate-y-1/2 text-[#353333]">
                        <div className="h-20 w-[2px] bg-[#353333]/10 ml-40 mt-12 relative">
                            <LuArrowDown className="absolute -bottom-2 -left-[7px]" size={16} />
                        </div>
                    </div>
                </div>

                {/* Step 2 */}
                <div className="flex justify-center relative z-20">
                    <div className="w-[320px] p-6 border-2 border-[#353333] rounded-3xl bg-white shadow-[8px_8px_0px_rgba(0,0,0,0.02)]">
                        <h3 className="font-extrabold text-[15px] mb-2 leading-tight uppercase tracking-tight">Track Cash Flow & Payments</h3>
                        <p className="text-[11px] text-[#353333]/60 leading-relaxed font-medium">
                            Monitor every cent moving in and out. Set up automated tracking and categorization to save hours of manual entry.
                        </p>
                        <div className="mt-4 flex justify-end">
                            <div className="w-8 h-8 bg-[#FFCA00] rounded-[10px] flex items-center justify-center text-white -rotate-6 hover:bg-[#d9ac00]">
                                <LuCircleCheck size={18} />
                            </div>
                        </div>
                    </div>
                    {/* Connector 2 */}
                    <div className="hidden xl:block absolute -right-4 top-1/2 -translate-y-1/2 text-[#353333]">
                        <div className="h-10 w-[2px] bg-[#353333]/10 ml-40 -mt-12 relative">
                            <LuArrowUp className="absolute -top-2 -left-[7px]" size={16} />
                        </div>
                    </div>
                </div>

                {/* Step 3 */}
                <div className="flex justify-end relative z-30">
                    <div className="w-[320px] p-6 border-2 border-[#353333] rounded-3xl bg-white shadow-[8px_8px_0px_rgba(0,0,0,0.02)]">
                        <h3 className="font-extrabold text-[15px] mb-2 leading-tight uppercase tracking-tight">Gain Insights & Make Decisions</h3>
                        <p className="text-[11px] text-[#353333]/60 leading-relaxed font-medium">
                            Analyze reports, spot trends, and use insights to plan budgets, forecast revenue, and optimize spending for better profitability.
                        </p>
                        <div className="mt-4 flex justify-end">
                            <div className="w-8 h-8 bg-[#FFCA00] rounded-[10px] flex items-center justify-center text-white font-black text-xs hover:bg-[#d9ac00]">
                                3
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DashboardHero;
