"use client";

import Navbar from "@/components/commonComp/Navbar";
import React from "react";
import Image from "next/image";

const teamMembers = [
  {
    name: "Sarah",
    role: "Designer",
    status: "Active Now",
    statusColor: "bg-[#FFCA00]",
    avatar: "https://randomuser.me/api/portraits/women/65.jpg",
  },
  {
    name: "Mike",
    role: "Developer",
    status: "5 mins ago",
    statusColor: "bg-orange-400",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    name: "James",
    role: "Product Manager",
    status: "Offline",
    statusColor: "bg-gray-400",
    avatar: "https://randomuser.me/api/portraits/men/45.jpg",
  },
];

export default function TeamStatus() {
    return (
        <div className="flex-1 flex flex-col">
            <Navbar
                data={{
                    heading: "Team Status",
                    subheading: "Monitor your organization's team activity in real-time",
                    from: "comms",
                }}
            />

            <main className="flex-1 flex flex-col p-6">
                <div className="w-full flex-1 flex flex-col">
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                        {/* Card Title */}
                        <h2 className="text-xl font-bold mb-6 text-gray-900">Online Team Members</h2>

                        <div className="divide-y divide-gray-100">
                            {teamMembers.map((member, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                                >
                                    {/* Left side: Avatar + Info */}
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Image
                                                src={member.avatar}
                                                alt={member.name}
                                                width={48}
                                                height={48}
                                                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                            />
                                            <span
                                                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${member.statusColor}`}
                                            ></span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-base">{member.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-gray-500 font-medium lowercase first-letter:uppercase">
                                                    {member.role}
                                                </p>
                                                <span className="text-gray-300">•</span>
                                                <span
                                                    className={`text-xs font-semibold ${member.status === "Offline"
                                                        ? "text-gray-400"
                                                        : member.status === "Active Now"
                                                            ? "text-[#FFCA00]"
                                                            : "text-orange-500"
                                                        }`}
                                                >
                                                    {member.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right side: Actions or Status Indicator if needed */}
                                    <div className="flex items-center">
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${member.status === "Active Now"
                                            ? "bg-[#FFCA00]/10 text-[#FFCA00]"
                                            : "bg-gray-100 text-gray-500"
                                            }`}>
                                            {member.status === "Active Now" ? "Live" : "Away"}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
