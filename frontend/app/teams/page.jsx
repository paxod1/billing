"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Hash,
  Send,
  Paperclip,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Search,
  Link,
} from "lucide-react";
import { FiArrowLeft } from "react-icons/fi";
import { MdAddCircleOutline } from "react-icons/md";
import Image from "next/image";
import { tokenRequest } from "@/lib/axiosCreate";
import Pagination from "@/components/commonComp/Pagination";
import { TeamsIcon } from "@/lib/customIcons";
import CreateChannelModal from "@/components/models/CreateChannelModal";
import Navbar from "@/components/commonComp/Navbar";

// Team Tabs Component
const TeamTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "members", label: "Team Members", icon: TeamsIcon },
    { id: "channels", label: "Team Channels", icon: Hash },
  ];

  return (
    <div className="flex border-b-2 border-gray-200 mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 text-[0.92rem] border-b-3 transition-colors cursor-pointer ${activeTab === tab.id
              ? "border-[#FFCA00] text-[#FFCA00] font-bold"
              : "border-transparent text-gray-500 hover:text-gray-700 font-medium"
              }`}
          >
            <Icon className="w-5 h-5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// Team Members Component
const TeamMembers = ({ members, currentPage, itemsPerPage, onPageChange }) => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue < bValue) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const currentMembers = sortedMembers.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedMembers.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      onPageChange(totalPages);
    }
  }, [totalPages, currentPage, onPageChange]);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return <ArrowUpDown className="w-4 h-4" />;
  };

  return (
    <>
      <div className="pb-4">
        <div className="flex sm:flex-row flex-col sm:items-center items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Team Members
            </h2>
            <p className="text-sm text-gray-600">
              Display all team members and essential details
            </p>
          </div>
          <div className="w-full sm:w-auto h-auto mt-1.5 flex gap-2 sm:items-center items-start justify-center">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto pl-10 pr-4 py-2.5 border text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFCA00] outline-none placeholder:text-sm"
                placeholder="Search"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto text-nowrap">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr className="h-16 text-[0.95rem]">
                <th className="px-6 py-5 text-left font-semibold text-gray-500">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex gap-2 items-center hover:text-gray-700 cursor-pointer"
                  >
                    Member Name {getSortIcon("name")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-500">
                  <button
                    onClick={() => handleSort("title")}
                    className="flex gap-2 items-center hover:text-gray-700 cursor-pointer"
                  >
                    Title {getSortIcon("title")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-500">
                  <button
                    onClick={() => handleSort("email")}
                    className="flex gap-2 items-center hover:text-gray-700 cursor-pointer"
                  >
                    Email {getSortIcon("email")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-500">
                  <button
                    onClick={() => handleSort("phone")}
                    className="flex gap-2 items-center hover:text-gray-700 cursor-pointer"
                  >
                    Phone Number {getSortIcon("phone")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-500">
                  <button
                    onClick={() => handleSort("social")}
                    className="flex gap-2 items-center hover:text-gray-700 cursor-pointer"
                  >
                    Social Media {getSortIcon("social")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-500">
                  <button
                    onClick={() => handleSort("access")}
                    className="flex gap-2 items-center hover:text-gray-700 cursor-pointer"
                  >
                    Access {getSortIcon("access")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {currentMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 text-[0.89rem]">
                  <td className="px-6 py-5 whitespace-nowrap font-medium text-gray-900">
                    {member.name}
                  </td>
                  <td className="px-6 py-2 relative group">
                    <span className="block truncate max-w-[130px]">
                      {member.title.length > 10
                        ? member.title.slice(0, 10) + "..."
                        : member.title}
                    </span>
                    <div className="absolute -top-1 left-0 z-10 hidden group-hover:block bg-gray-800 text-white text-sm rounded px-2 py-1 w-max max-w-xs whitespace-normal break-words">
                      {member.title}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap font-medium text-gray-600">
                    {member.email}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap font-medium text-gray-600">
                    {member.phone}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap font-medium text-gray-600">
                    {member.social}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap font-medium text-gray-600">
                    {member.access}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          maxVisiblePages={5}
        />
      )}
    </>
  );
};

// Typing Indicator Component
const TypingIndicator = () => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
    <div className="bg-gray-100 px-4 py-3 rounded-lg">
      <div className="flex gap-1">
        <div
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  </div>
);

// Team Channels Component
const TeamChannels = ({
  channels,
  activeChannel,
  teamMembers,
  message,
  messages,
  setMessage,
  setActiveChannel,
  setMessages,
  setOpenCreateChannel,
}) => {
  const [showChannelView, setShowChannelView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const channelListRef = useRef(null);
  const [showScrollShadow, setShowScrollShadow] = useState(false);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Check scroll shadow for channel list
  useEffect(() => {
    const checkScroll = () => {
      if (channelListRef.current) {
        const { scrollTop } = channelListRef.current;
        setShowScrollShadow(scrollTop > 10);
      }
    };

    const listEl = channelListRef.current;
    if (listEl) {
      listEl.addEventListener("scroll", checkScroll);
      checkScroll();
      return () => listEl.removeEventListener("scroll", checkScroll);
    }
  }, []);

  // API: Fetch messages for a channel when it's selected
  useEffect(() => {
    if (activeChannel) {
      fetchChannelMessages(activeChannel);
    }
  }, [activeChannel]);

  // API: Fetch messages for a specific channel
  const fetchChannelMessages = async (channelName) => {
    try {
      // const response = await tokenRequest.get(`/api/channels/${channelName}/messages`);
      // setMessages(response.data);

      console.log("Fetching messages for channel:", channelName);
    } catch (error) {
      console.error("Error fetching channel messages:", error);
    }
  };

  // API: Send message to channel
  const sendChannelMessage = async (channelName, messageText) => {
    try {
      // const response = await tokenRequest.post(`/api/channels/${channelName}/messages`, {
      //   message: messageText,
      //   timestamp: new Date().toISOString()
      // });

      // return response.data;

      console.log("Sending message to channel:", channelName, messageText);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const currentChannelObj = channels.find(
    (channel) => channel.name === activeChannel
  );

  const filteredChannels = channels.filter(
    (channel) =>
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChannelSelect = (channelName) => {
    setActiveChannel(channelName);
    setShowChannelView(true);
  };

  const handleBackToList = () => {
    setShowChannelView(false);
    setActiveChannel(null);
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleSend = async () => {
    if (message.trim() && activeChannel) {
      const newMessage = {
        id: Date.now(),
        user: "You",
        avatar: "https://i.pravatar.cc/40",
        message: message.trim(),
        time: getCurrentTime(),
        isOwn: true,
      };

      setMessages((prev) => [...prev, newMessage]);
      setMessage("");

      // Send message via API
      await sendChannelMessage(activeChannel, newMessage.message);

      // Simulate typing indicator
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        // Simulate a response
        const responseMessage = {
          id: Date.now() + 1,
          user: "Alex Johnson",
          avatar:
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
          message: "Thanks for your message! I'll get back to you soon.",
          time: getCurrentTime(),
          isOwn: false,
        };
        setMessages((prev) => [...prev, responseMessage]);
      }, 2000);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Channels</h2>
          <p className="text-sm text-gray-600">
            Chat with team members across various business suites
          </p>
        </div>
        <button
          onClick={() => setOpenCreateChannel(true)}
          className="flex items-center justify-center gap-2 font-bold px-5 py-3 bg-[#FFCA00] text-white rounded-[10px] sm:text-[15px] text-xs cursor-pointer hover:bg-[#d9ac00]"
        >
          <MdAddCircleOutline className="text-2xl" /> Create Channels
        </button>
      </div>

      <div className="flex-1 flex md:flex-row flex-col gap-4 py-2 max-w-screen-2xl h-[calc(100dvh-10rem)]">
        {/* Left Sidebar */}
        <div
          className={`w-full xl:max-w-md md:max-w-xs flex-shrink-0 ${showChannelView ? "hidden md:block" : "block"
            } h-full`}
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 h-full flex flex-col">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Team Channels
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search channels..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent text-sm outline-none"
                />
              </div>
            </div>

            {/* Scroll shadow effect */}
            {showScrollShadow && (
              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
            )}

            {/* Channel list */}
            <div
              ref={channelListRef}
              className="space-y-2 overflow-y-auto flex-1 relative"
            >
              {filteredChannels.map((channel) => {
                const isActive = activeChannel === channel.name;
                return (
                  <div
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel.name)}
                    className={`p-3 rounded-md cursor-pointer transition-all ${isActive
                      ? "bg-[#FFCA00] text-white"
                      : "hover:bg-gray-50"
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Hash className={`w-5 h-5 ${channel.color}`} />
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-medium truncate ${isActive ? "text-white" : "text-gray-900"
                            }`}
                        >
                          {channel.name}
                        </h3>
                        <p
                          className={`text-xs truncate ${isActive ? "text-purple-100" : "text-gray-500"
                            }`}
                        >
                          {channel.members} Members • {channel.status}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Chat Section */}
        <div
          className={`flex-1 ${!showChannelView ? "hidden md:flex" : "flex"
            } h-full`}
        >
          {activeChannel ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col w-full overflow-hidden h-full">
              {/* Channel Header */}
              <div className="bg-[#FFCA00] text-white px-4 py-3 rounded-t-lg flex items-center justify-between hover:bg-[#d9ac00]">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-1 hover:bg-[#E6B600] rounded-full mr-2 transition-colors"
                  >
                    <FiArrowLeft className="text-xl" />
                  </button>
                  <Hash
                    className={`w-5 h-5 ${currentChannelObj ? currentChannelObj.color : "text-white"
                      }`}
                  />
                  <h1 className="text-xl font-semibold">
                    {activeChannel || "Select a channel"}
                  </h1>
                </div>
                <div className="flex items-center -space-x-2">
                  {teamMembers.slice(0, 4).map((member, i) => (
                    <div
                      key={member.id}
                      className={`w-8 h-8 ${member.color} rounded-full border-2 border-white flex items-center justify-center text-xs text-white`}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                  {teamMembers.length > 4 && (
                    <div className="w-8 h-8 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center text-xs text-white">
                      +{teamMembers.length - 4}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-end ${msg.isOwn ? "justify-end" : "justify-start"
                      }`}
                  >
                    {!msg.isOwn && (
                      <Image
                        src={msg.avatar}
                        alt={msg.user}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full mr-2 flex-shrink-0 object-cover"
                      />
                    )}

                    <div className="flex flex-col">
                      <div
                        className={`px-4 py-2 rounded-lg max-w-md ${msg.isOwn
                          ? "bg-[#FFCA00]/10 text-gray-900 text-right border border-[#FFCA00]/20"
                          : "bg-gray-100 text-gray-900"
                          }`}
                      >
                        <p className="text-xs font-semibold text-gray-700 mb-1">
                          {msg.isOwn ? "You" : msg.user}
                        </p>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                      <span
                        className={`text-xs text-gray-500 mt-1 ${msg.isOwn ? "text-right pr-1" : "text-left pl-1"
                          }`}
                      >
                        {msg.time}
                      </span>
                    </div>

                    {msg.isOwn && (
                      <Image
                        src={msg.avatar}
                        alt={msg.user}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full ml-2 flex-shrink-0 object-cover"
                      />
                    )}
                  </div>
                ))}

                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-100 flex items-center space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type a message...."
                    className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-full focus:ring-2 focus:ring-[#FFCA00] outline-none placeholder:text-sm"
                    disabled={!activeChannel}
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Paperclip className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!activeChannel}
                  className="w-10 h-10 bg-[#FFCA00] hover:bg-[#d9ac00] text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5 font-bold" />
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center justify-center flex-1 text-gray-500 bg-white rounded-lg shadow-sm border border-gray-100 h-full">
              <p>Select a channel to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Main Teams Component
export default function Teams() {
  const [activeTab, setActiveTab] = useState("members");
  const [activeChannel, setActiveChannel] = useState(null);
  const [membersPage, setMembersPage] = useState(1);
  const [message, setMessage] = useState("");
  const [openCreateChannel, setOpenCreateChannel] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);

  const itemsPerPage = 5;

  // Dummy data
  const dummyTeamMembers = [
    {
      id: 1,
      name: "John Smith",
      title: "Marketing Manager",
      email: "john@company.com",
      phone: "1234567890",
      social: "LinkedIn",
      access: "Admin",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      color: "bg-pink-400",
    },
    {
      id: 2,
      name: "Sarah Johnson",
      title: "UX Designer",
      email: "sarah@company.com",
      phone: "1234567891",
      social: "LinkedIn",
      access: "User",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b08c3c34?w=40&h=40&fit=crop&crop=face",
      color: "bg-blue-400",
    },
    {
      id: 3,
      name: "Alex Chen",
      title: "Frontend Developer",
      email: "alex@company.com",
      phone: "1234567892",
      social: "GitHub",
      access: "User",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
      color: "bg-green-400",
    },
    {
      id: 4,
      name: "Maria Garcia",
      title: "Product Manager",
      email: "maria@company.com",
      phone: "1234567893",
      social: "LinkedIn",
      access: "Admin",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
      color: "bg-yellow-400",
    },
    {
      id: 5,
      name: "David Wilson",
      title: "Backend Developer",
      email: "david@company.com",
      phone: "1234567894",
      social: "GitHub",
      access: "User",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face",
      color: "bg-purple-400",
    },
    {
      id: 6,
      name: "Emma Brown",
      title: "HR Manager",
      email: "emma@company.com",
      phone: "1234567895",
      social: "LinkedIn",
      access: "Admin",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face",
      color: "bg-teal-400",
    },
    {
      id: 7,
      name: "James Lee",
      title: "DevOps Engineer",
      email: "james@company.com",
      phone: "1234567896",
      social: "GitHub",
      access: "User",
      avatar:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40&h=40&fit=crop&crop=face",
      color: "bg-orange-400",
    },
    {
      id: 8,
      name: "Lisa Wang",
      title: "Data Analyst",
      email: "lisa@company.com",
      phone: "1234567897",
      social: "LinkedIn",
      access: "User",
      avatar:
        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=40&h=40&fit=crop&crop=face",
      color: "bg-cyan-400",
    },
  ];

  const dummyChannels = [
    {
      id: 1,
      name: "#design-team",
      description: "Design discussions and feedback",
      members: 12,
      status: "Active Now",
      color: "text-orange-500",
    },
    {
      id: 2,
      name: "#sprint-2024",
      description: "Current sprint planning and updates",
      members: 15,
      status: "2 New Messages",
      color: "text-purple-500",
    },
    {
      id: 3,
      name: "#general",
      description: "General team discussions",
      members: 25,
      status: "Always Active",
      color: "text-green-500",
    },
    {
      id: 4,
      name: "#development",
      description: "Development team coordination",
      members: 8,
      status: "Active Now",
      color: "text-blue-500",
    },
    {
      id: 5,
      name: "#marketing",
      description: "Marketing campaigns and strategies",
      members: 6,
      status: "1 New Message",
      color: "text-red-500",
    },
    {
      id: 6,
      name: "#product",
      description: "Product planning and roadmap",
      members: 10,
      status: "Active Now",
      color: "text-indigo-500",
    },
    {
      id: 7,
      name: "#random",
      description: "Random conversations and fun",
      members: 20,
      status: "5 New Messages",
      color: "text-yellow-500",
    },
  ];

  const dummyMessages = [
    {
      id: 1,
      user: "Alex Johnson",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      message:
        "I've completed the initial wireframes for the dashboard interface. Check out the Figma file I shared!",
      time: "10:17 AM",
      isOwn: false,
    },
    {
      id: 2,
      user: "You",
      avatar: "https://i.pravatar.cc/40",
      message:
        "Looks great, Alex! The layout is clean and intuitive. Can we add a dark mode toggle in the top right corner?",
      time: "10:17 AM",
      isOwn: true,
    },
  ];
  // API: Fetch team members on component mount
  useEffect(() => {
    fetchTeamMembers();
    fetchChannels();
  }, []);
  // API: Fetch all team members
  const fetchTeamMembers = async () => {
    try {
      // const response = await tokenRequest.get('/api/teams/members');
      // setTeamMembers(response.data);
      // Temporary: Using dummy data
      setTeamMembers(dummyTeamMembers);
      console.log("Fetching team members");
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };
  // API: Fetch all channels
  const fetchChannels = async () => {
    try {
      // const response = await tokenRequest.get('/api/teams/channels');
      // setChannels(response.data);
      // Temporary: Using dummy data
      setChannels(dummyChannels);
      setMessages(dummyMessages);
      console.log("Fetching channels");
    } catch (error) {
      console.error("Error fetching channels:", error);
    }
  };
  // API: Create a new channel
  const createChannel = async (channelData) => {
    try {
      // const response = await tokenRequest.post('/api/teams/channels', channelData);
      // setChannels(prev => [...prev, response.data]);
      console.log("Creating new channel:", channelData);
      // return response.data;
    } catch (error) {
      console.error("Error creating channel:", error);
    }
  };
  // API: Update member access/role
  const updateMemberAccess = async (memberId, accessLevel) => {
    try {
      // await tokenRequest.put(`/api/teams/members/${memberId}/access`, {
      //   access: accessLevel
      // });
      console.log("Updating member access:", memberId, accessLevel);
    } catch (error) {
      console.error("Error updating member access:", error);
    }
  };
  // API: Remove member from team
  const removeMember = async (memberId) => {
    try {
      // await tokenRequest.delete(`/api/teams/members/${memberId}`);
      // setTeamMembers(prev => prev.filter(member => member.id !== memberId));
      console.log("Removing member:", memberId);
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };
  // API: Delete a channel
  const deleteChannel = async (channelId) => {
    try {
      // await tokenRequest.delete(`/api/teams/channels/${channelId}`);
      // setChannels(prev => prev.filter(channel => channel.id !== channelId));
      console.log("Deleting channel:", channelId);
    } catch (error) {
      console.error("Error deleting channel:", error);
    }
  };
  // API: Add member to channel
  const addMemberToChannel = async (channelId, memberId) => {
    try {
      // await tokenRequest.post(`/api/teams/channels/${channelId}/members`, {
      //   memberId: memberId
      // });
      console.log("Adding member to channel:", channelId, memberId);
    } catch (error) {
      console.error("Error adding member to channel:", error);
    }
  };
  useEffect(() => {
    if (openCreateChannel) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [openCreateChannel]);
  const handleCreateChannel = async (data) => {
    console.log("New channel created:", data);
    await createChannel(data);
  };
    return (
        <div className="flex-1 flex flex-col">
            <Navbar
                data={{
                    heading: "Teams",
                    subheading: "Manage and collaborate with your organization's teams",
                    from: "comms",
                }}
            />
            <main className="flex-1 flex flex-col px-6 py-1">
                <div className="w-full flex-1 flex flex-col">
        <TeamTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "members" && (
          <TeamMembers
            members={teamMembers}
            currentPage={membersPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setMembersPage}
          />
        )}

                {activeTab === "channels" && (
                    <>
                        <TeamChannels
                            channels={channels}
                            activeChannel={activeChannel}
                            teamMembers={teamMembers}
                            message={message}
                            messages={messages}
                            setMessage={setMessage}
                            setActiveChannel={setActiveChannel}
                            setMessages={setMessages}
                            setOpenCreateChannel={setOpenCreateChannel}
                        />
                        <CreateChannelModal
                            isOpen={openCreateChannel}
                            onClose={() => setOpenCreateChannel(false)}
                            onSubmit={handleCreateChannel}
                            members={teamMembers}
                        />
                    </>
                )}
                </div>
            </main>
        </div>
    );
}
