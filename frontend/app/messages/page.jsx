"use client";

import React, { useState, useEffect } from "react";
import { FiSend, FiPaperclip, FiSearch, FiArrowLeft } from "react-icons/fi";
import { CgCloseO } from "react-icons/cg";
import Image from "next/image";
import { tokenRequest } from "@/lib/axiosCreate";
import Navbar from "@/components/commonComp/Navbar";
import CustomSelect from "@/components/common/CustomSelect";

// Dummy chats with online status
const chats = [
    {
        id: 1,
        name: "Anna",
        lastMsg: "Need help with dashboard layout",
        avatar: "https://randomuser.me/api/portraits/women/45.jpg",
        isOnline: true,
    },
    {
        id: 2,
        name: "John",
        lastMsg: "Sent a file : Wireframes_v2.fig",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg",
        isOnline: true,
    },
    {
        id: 3,
        name: "Sarah",
        lastMsg: "Meeting rescheduled to 3 pm",
        avatar: "https://randomuser.me/api/portraits/women/65.jpg",
        isOnline: false,
    },
    {
        id: 4,
        name: "Mike",
        lastMsg: "Thanks for the update",
        avatar: "https://randomuser.me/api/portraits/men/22.jpg",
        isOnline: true,
    },
    {
        id: 5,
        name: "Emma",
        lastMsg: "See you tomorrow!",
        avatar: "https://randomuser.me/api/portraits/women/33.jpg",
        isOnline: false,
    },
];

// Dynamic messages array
const messagesData = {
    1: [
        {
            id: 1,
            sender: "Anna",
            text: "Hey! I need some help with the dashboard layout",
            time: "10:15 AM",
            isOwn: false,
        },
        {
            id: 2,
            sender: "You",
            text: "Sure! What do you need help with?",
            time: "10:16 AM",
            isOwn: true,
        },
        {
            id: 3,
            sender: "Anna",
            text: "The sidebar navigation isn't aligning properly",
            time: "10:17 AM",
            isOwn: false,
        },
    ],
    2: [
        {
            id: 1,
            sender: "John",
            text: "I've completed the initial wireframes for the dashboard interface. Check out the Figma file I shared!",
            time: "10:17 AM",
            isOwn: false,
        },
        {
            id: 2,
            sender: "You",
            text: "Looks great! Can we add a dark mode toggle?",
            time: "10:18 AM",
            isOwn: true,
        },
        {
            id: 3,
            sender: "John",
            text: "Absolutely! I'll work on that today",
            time: "10:19 AM",
            isOwn: false,
        },
    ],
    3: [
        {
            id: 1,
            sender: "Sarah",
            text: "Meeting rescheduled to 3 pm",
            time: "09:30 AM",
            isOwn: false,
        },
        {
            id: 2,
            sender: "You",
            text: "Got it, thanks for letting me know!",
            time: "09:31 AM",
            isOwn: true,
        },
    ],
};

// Typing indicator component
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

export default function Messages() {
    const [selectedChat, setSelectedChat] = useState(null);
    const [message, setMessage] = useState("");
    const [openNewChat, setOpenNewChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [showChatView, setShowChatView] = useState(false);
    const [chatsList, setChatsList] = useState(chats);
    const [messages, setMessages] = useState(messagesData);

    // API: Fetch all chats on component mount
    useEffect(() => {
        fetchChats();
    }, []);

    // API: Fetch chats list
    const fetchChats = async () => {
        try {
            // const response = await tokenRequest.get('/chats');
            // setChatsList(response.data);

            // Temporary: Using dummy data
            setChatsList(chats);
        } catch (error) {
            console.error("Error fetching chats:", error);
        }
    };

    // API: Fetch messages for a specific chat
    const fetchMessages = async (chatId) => {
        try {
            // const response = await tokenRequest.get(`/chats/${chatId}/messages`);
            // setMessages(prev => ({
            //   ...prev,
            //   [chatId]: response.data
            // }));

            // Temporary: Using dummy data
            console.log("Fetching messages for chat:", chatId);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    // API: Send a message
    const sendMessage = async (chatId, messageText) => {
        try {
            // const response = await tokenRequest.post(`/chats/${chatId}/messages`, {
            //   text: messageText,
            //   timestamp: new Date().toISOString()
            // });

            // Add message to local state
            // setMessages(prev => ({
            //   ...prev,
            //   [chatId]: [...(prev[chatId] || []), response.data]
            // }));

            console.log("Message sent:", messageText);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    // API: Create a new chat
    const createNewChat = async (userId) => {
        try {
            // const response = await tokenRequest.post('/chats', {
            //   userId: userId
            // });

            // setChatsList(prev => [...prev, response.data]);
            // setSelectedChat(response.data);
            // setShowChatView(true);

            console.log("Creating new chat with user:", userId);
        } catch (error) {
            console.error("Error creating new chat:", error);
        }
    };

    // API: Mark messages as read
    const markAsRead = async (chatId) => {
        try {
            // await tokenRequest.put(`/chats/${chatId}/read`);

            console.log("Marking messages as read for chat:", chatId);
        } catch (error) {
            console.error("Error marking messages as read:", error);
        }
    };

    const handleSend = () => {
        if (!message.trim() || !selectedChat) return;

        // Send message via API
        sendMessage(selectedChat.id, message);
        setMessage("");

        // Simulate typing indicator
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 2000);
    };

    const handleChatSelect = (chat) => {
        setSelectedChat(chat);
        setShowChatView(true);

        // Fetch messages for this chat
        fetchMessages(chat.id);

        // Mark messages as read
        markAsRead(chat.id);
    };

    const handleBackToList = () => {
        setShowChatView(false);
    };

    const handleNewChat = () => {
        setOpenNewChat(true);
    };

    const handleStartNewChat = (userId) => {
        createNewChat(userId);
        setOpenNewChat(false);
    };

    // Filter chats based on search
    const filteredChats = chatsList.filter(
        (chat) =>
            chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.lastMsg.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col">
            <Navbar
                data={{
                    heading: "Messages",
                    subheading: "Chat with your team and clients",
                    from: "comms",
                }}
            />

            {/* New Chat Modal */}
            {openNewChat && (
                <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-md flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setOpenNewChat(false)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-black"
                        >
                            <CgCloseO className="text-2xl" />
                        </button>

                        <h2 className="text-xl font-bold mb-4">Start New Chat</h2>

                        <CustomSelect
                            options={[
                                { value: "1", label: "Anna" },
                                { value: "2", label: "John" },
                                { value: "3", label: "Sarah" },
                            ]}
                            placeholder="Select a member..."
                            onChange={(val) => {
                                if (val) {
                                    handleStartNewChat(val);
                                }
                            }}
                            className="mb-6"
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setOpenNewChat(false)}
                                className="px-5 py-2 rounded-md border"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setOpenNewChat(false)}
                                className="bg-[#FFCA00] text-black font-semibold px-5 py-2 rounded-md hover:bg-[#d9ac00]"
                            >
                                Start Chat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 flex flex-col overflow-hidden px-4 md:px-6 py-3 gap-4">
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-4 h-full">
                {/* Sidebar Chat List - Hide on mobile when chat is selected */}
                <div
                    className={`w-full xl:max-w-sm md:max-w-xs flex-shrink-0 h-full ${showChatView ? "hidden md:block" : "block"
                        }`}
                >
                    <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
                        <div className="px-4 pt-4 pb-2">
                            <h2 className="text-md font-semibold mb-3">Chats</h2>

                            {/* Search Bar */}
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search chats..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 p-2 space-y-2 h-full">
                            {filteredChats.map((chat) => (
                                <div
                                    key={chat.id}
                                    onClick={() => handleChatSelect(chat)}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${selectedChat?.id === chat.id
                                        ? "bg-[#FFCA00] text-white font-semibold"
                                        : "hover:bg-gray-100"
                                        }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <Image
                                            src={chat.avatar}
                                            alt={chat.name}
                                            width={40}
                                            height={40}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        {/* Online Status Dot */}
                                        {chat.isOnline && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                                        )}
                                    </div>

                                    <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                                        <p className="font-semibold truncate">{chat.name}</p>
                                        <p
                                            className={`text-sm truncate ${selectedChat?.id === chat.id
                                                ? "text-white/90"
                                                : "text-gray-500"
                                                }`}
                                        >
                                            {chat.lastMsg}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Chat Window - Show on mobile only when chat is selected */}
                <div
                    className={`flex flex-col flex-1 min-h-[400px] ${!showChatView ? "hidden md:flex" : "flex"
                        }`}
                >
                    {selectedChat ? (
                        <div className="bg-white rounded-lg shadow-sm flex flex-col overflow-hidden h-full">
                            {/* Chat Header */}
                            <div className="flex items-center gap-3 p-4 bg-[#FFCA00] text-white hover:bg-[#d9ac00]">
                                {/* Back button for mobile */}
                                <button
                                    onClick={handleBackToList}
                                    className="md:hidden p-1 hover:bg-[#E6B600] rounded-full transition-colors"
                                >
                                    <FiArrowLeft className="text-xl" />
                                </button>

                                <div className="relative">
                                    <Image
                                        src={selectedChat.avatar}
                                        alt={selectedChat.name}
                                        width={32}
                                        height={32}
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                    {selectedChat.isOnline && (
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="font-bold">{selectedChat.name}</h2>
                                    {selectedChat.isOnline && (
                                        <p className="text-xs text-white/90">Online</p>
                                    )}
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {messages[selectedChat.id]?.map((msg) =>
                                    msg.isOwn ? (
                                        // Outgoing
                                        <div
                                            key={msg.id}
                                            className="flex justify-end items-end gap-2"
                                        >
                                            <div>
                                                <p className="text-right font-semibold text-sm mb-1">
                                                    You
                                                </p>
                                                <div className="bg-[#FFCA00] px-4 py-2 rounded-lg text-sm max-w-md text-white hover:bg-[#d9ac00]">
                                                    {msg.text}
                                                </div>
                                                <p className="text-xs text-white/80 text-right mt-1">
                                                    {msg.time}
                                                </p>
                                            </div>
                                            <Image
                                                src="/admin-nav-drop.png"
                                                alt="You"
                                                width={32}
                                                height={32}
                                                className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                                            />
                                        </div>
                                    ) : (
                                        // Incoming
                                        <div key={msg.id} className="flex items-start gap-3">
                                            <Image
                                                src={selectedChat.avatar}
                                                alt={selectedChat.name}
                                                width={32}
                                                height={32}
                                                className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                                            />
                                            <div>
                                                <p className="font-semibold text-sm mb-1">
                                                    {msg.sender}
                                                </p>
                                                <div className="bg-gray-100 px-4 py-2 rounded-lg text-sm max-w-md shadow-sm">
                                                    {msg.text}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">{msg.time}</p>
                                            </div>
                                        </div>
                                    )
                                )}

                                {/* Typing Indicator */}
                                {isTyping && <TypingIndicator />}
                            </div>

                            {/* Message Input */}
                            <div className="flex items-center gap-2 p-3 border-t">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-brand-mint text-sm outline-none"
                                />
                                <button className="p-2 text-gray-500 hover:text-gray-700">
                                    <FiPaperclip size={20} />
                                </button>
                                <button
                                    onClick={handleSend}
                                    className="p-3 bg-[#FFCA00] text-white rounded-full hover:bg-[#d9ac00]"
                                >
                                    <FiSend size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center justify-center flex-1 text-gray-400 bg-white rounded-lg shadow-sm">
                            Select a chat to start messaging
                        </div>
                    )}
                </div>
                </div>
            </main>
        </div>
    );
}
