"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/commonComp/Navbar";
import { AnimatePresence, motion } from "framer-motion";
import { useKeyboardShortcuts } from "@/components/common/KeyboardShortcutsProvider";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";

import {
    ChevronRight,
    ChevronLeft,
    Settings,
    Search,
    Navigation,
    PlusCircle,
    Cpu,
    Home,
    TrendingUp,
    ShoppingCart,
    Package,
    BookOpen,
    Users,
    BarChart2,
    Monitor,
    Compass,
    Command,
    Megaphone,
    Briefcase,
    Printer,
    Trash2
} from "lucide-react";

// List of available keys for custom combinations
const availableKeys = [
    "CTRL / CMD", "SHIFT", "ALT", "G", "A", "B", "C", "D", "E", "F", 
    "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", 
    "U", "V", "W", "X", "Y", "Z", "0", "1", "2", "3", "4", "5", "6", 
    "7", "8", "9", "ENTER", "SPACE", "ESC", "TAB",
    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"
];

const RESTRICTED_SYSTEM_SHORTCUTS = new Set([
    "ctrl/cmdp",
    "ctrl/cmds",
    "ctrl/cmdt",
    "ctrl/cmdw",
    "ctrl/cmdn",
    "ctrl/cmdf",
    "ctrl/cmdr",
    "ctrl/cmdh",
    "ctrl/cmdj",
    "ctrl/cmdd",
    "ctrl/cmdo",
    "ctrl/cmdq",
    "ctrl/cmda",
    "ctrl/cmdc",
    "ctrl/cmdv",
    "ctrl/cmdx",
    "ctrl/cmdz",
    "ctrl/cmdy",
    "f12",
    "ctrl/cmdalti",
    "ctrl/cmdshifti"
]);

const checkSystemDefault = (keys) => {
    let combined = keys.join("").toLowerCase().replace(/\s+/g, "").replace(/\+/g, "").replace(/,/g, "");
    // Normalize CTRL, CMD and CTRL/CMD into ctrl/cmd
    combined = combined.replace(/ctrl\/cmd/g, "CTRL_CMD_PLACEHOLDER")
                       .replace(/ctrl/g, "CTRL_CMD_PLACEHOLDER")
                       .replace(/cmd/g, "CTRL_CMD_PLACEHOLDER")
                       .replace(/CTRL_CMD_PLACEHOLDER/g, "ctrl/cmd");

    if (combined === "ctrl/cmdp") {
        return "CTRL/CMD + P is a reserved system default printing shortcut.";
    }
    if (combined === "ctrl/cmds") {
        return "CTRL/CMD + S is a reserved system default saving shortcut.";
    }
    if (combined === "ctrl/cmdt") {
        return "CTRL/CMD + T is a reserved system default new tab shortcut.";
    }
    if (combined === "ctrl/cmdw") {
        return "CTRL/CMD + W is a reserved system default tab closing shortcut.";
    }
    if (combined === "ctrl/cmdn") {
        return "CTRL/CMD + N is a reserved system default window shortcut.";
    }
    if (combined === "ctrl/cmdf") {
        return "CTRL/CMD + F is a reserved system default find shortcut.";
    }
    if (combined === "ctrl/cmdr") {
        return "CTRL/CMD + R is a reserved system default reload shortcut.";
    }
    if (combined === "f12") {
        return "F12 is a reserved system default developer tools shortcut.";
    }
    if (RESTRICTED_SYSTEM_SHORTCUTS.has(combined)) {
        return `${keys.join(" + ")} is a reserved system default browser shortcut. Please choose a different combination.`;
    }
    return null;
};

const parseKeyString = (keyStr) => {
    if (!keyStr) return { keys: [], connectors: [] };
    const keys = [];
    const connectors = [];
    
    // Split on delimiters while capturing them to preserve sequences
    const tokens = keyStr.split(/(\+|,)/);
    let currentKey = "";
    tokens.forEach((token) => {
        const trimmed = token.trim();
        if (trimmed === "+" || trimmed === ",") {
            if (currentKey) {
                keys.push(currentKey.trim());
                currentKey = "";
            }
            connectors.push(trimmed);
        } else {
            currentKey += (currentKey ? " " : "") + token;
        }
    });
    if (currentKey) {
        keys.push(currentKey.trim());
    }
    
    // Normalize keys
    const normalizedKeys = keys.map(k => {
        const clean = k.toUpperCase();
        if (clean === "CTRL" || clean === "CMD" || clean === "CTRL/CMD" || clean === "CTRL / CMD") {
            return "CTRL / CMD";
        }
        return clean;
    });

    while (connectors.length < normalizedKeys.length - 1) {
        connectors.push("+");
    }
    if (connectors.length > normalizedKeys.length - 1) {
        connectors.splice(normalizedKeys.length - 1);
    }

    return { keys: normalizedKeys, connectors };
};

export default function SettingsPage() {
    const router = useRouter();

    // Active category drill-down state (null means show list menu)
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Search and tab filter states for Keyboard Shortcuts
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    // Modal state for editing shortcuts
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeEditItem, setActiveEditItem] = useState(null); // { sectionKey, categoryIdx, itemIdx, item }
    const [tempKeys, setTempKeys] = useState([]);
    const [tempConnectors, setTempConnectors] = useState([]);
    const [validationError, setValidationError] = useState("");
    const [recordingIdx, setRecordingIdx] = useState(null);
    const [showConnectorHint, setShowConnectorHint] = useState(false);
    const [demoStep, setDemoStep] = useState("idle"); // "idle", "moving", "clicking", "toggled", "restoring", "done"
    const [virtualCursorPos, setVirtualCursorPos] = useState({ x: 200, y: 300 });
    const firstConnectorRef = useRef(null);

    useEffect(() => {
        if (isModalOpen && typeof window !== "undefined") {
            const dismissed = localStorage.getItem("billing_seen_connector_hint");
            if (!dismissed) {
                setShowConnectorHint(true);
            }
        }
    }, [isModalOpen]);

    useEffect(() => {
        if (isModalOpen && showConnectorHint && firstConnectorRef.current) {
            // Start demo
            setDemoStep("moving");
            
            const timer1 = setTimeout(() => {
                const connEl = firstConnectorRef.current;
                const modalEl = connEl?.closest(".relative");
                if (connEl && modalEl) {
                    const connRect = connEl.getBoundingClientRect();
                    const modalRect = modalEl.getBoundingClientRect();
                    setVirtualCursorPos({
                        x: connRect.left - modalRect.left + connRect.width / 2,
                        y: connRect.top - modalRect.top + connRect.height / 2
                    });
                }
            }, 600);

            const timer2 = setTimeout(() => {
                setDemoStep("clicking");
            }, 1800);

            const timer3 = setTimeout(() => {
                // Simulate first click: change to ","
                setTempConnectors(prev => {
                    const next = [...prev];
                    if (next.length > 0) next[0] = ",";
                    return next;
                });
                setDemoStep("toggled");
            }, 2100);

            const timer4 = setTimeout(() => {
                setDemoStep("clicking");
            }, 2900);

            const timer5 = setTimeout(() => {
                // Simulate second click: change back to "+"
                setTempConnectors(prev => {
                    const next = [...prev];
                    if (next.length > 0) next[0] = "+";
                    return next;
                });
                setDemoStep("restoring");
            }, 3200);

            const timer6 = setTimeout(() => {
                setDemoStep("done");
                setShowConnectorHint(false);
                try {
                    localStorage.setItem("billing_seen_connector_hint", "true");
                } catch (e) {
                    console.error(e);
                }
            }, 4000);

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
                clearTimeout(timer4);
                clearTimeout(timer5);
                clearTimeout(timer6);
            };
        } else {
            setDemoStep("idle");
        }
    }, [isModalOpen, showConnectorHint]);

    const dismissConnectorHint = () => {
        setShowConnectorHint(false);
        setDemoStep("done");
        try {
            localStorage.setItem("billing_seen_connector_hint", "true");
        } catch (e) {
            console.error(e);
        }
    };

    // Listen to keypresses when in recording mode
    useEffect(() => {
        if (recordingIdx === null) return;

        const handleCapture = (e) => {
            e.preventDefault();
            e.stopPropagation();

            let pressed = e.key.toUpperCase();

            // Unify Control, Meta (Command) to CTRL / CMD
            if (e.key === "Control" || e.key === "Meta") {
                pressed = "CTRL / CMD";
            } else if (e.key === "Shift") {
                pressed = "SHIFT";
            } else if (e.key === "Alt") {
                pressed = "ALT";
            } else if (e.key === " ") {
                pressed = "SPACE";
            } else if (e.key === "ArrowUp") {
                pressed = "UP";
            } else if (e.key === "ArrowDown") {
                pressed = "DOWN";
            } else if (e.key === "ArrowLeft") {
                pressed = "LEFT";
            } else if (e.key === "ArrowRight") {
                pressed = "RIGHT";
            } else if (e.key === "Escape") {
                pressed = "ESC";
            } else if (e.key === "Enter") {
                pressed = "ENTER";
            } else if (e.key === "Tab") {
                pressed = "TAB";
            } else if (e.key.length === 1) {
                pressed = e.key.toUpperCase();
            }

            const newKeys = [...tempKeys];
            newKeys[recordingIdx] = pressed;
            setTempKeys(newKeys);
            setRecordingIdx(null); // stop recording on key press
        };

        window.addEventListener("keydown", handleCapture, true);
        return () => {
            window.removeEventListener("keydown", handleCapture, true);
        };
    }, [recordingIdx, tempKeys]);

    // Validate keys whenever tempKeys or isModalOpen changes
    useEffect(() => {
        if (!isModalOpen) {
            setValidationError("");
            return;
        }
        const error = checkSystemDefault(tempKeys);
        setValidationError(error || "");
    }, [tempKeys, isModalOpen]);

    const categories = [
        {
            id: "shortcuts",
            title: "Keyboard Shortcuts",
            desc: "Navigate modules, create invoices, and trigger operations across Billing dynamically.",
            icon: Command,
            iconBg: "bg-amber-50 text-amber-600 font-bold",
            color: "text-amber-600"
        }
    ];

    const navbarData = {
        heading: selectedCategory === "shortcuts" ? "Keyboard Shortcuts" : "Settings",
        subheading: selectedCategory === "shortcuts"
            ? "Navigate modules, create invoices, and trigger operations across Billing dynamically."
            : "Manage your overall setup and preferences for Billing.",
        from: "settings"
    };

    const { stateShortcuts, updateShortcut, loading } = useKeyboardShortcuts();
    const dispatch = useDispatch();
    const [saving, setSaving] = useState(false);

    // Calculate dynamic counts based on the search query
    const getBadgeCounts = () => {
        const counts = {
            all: 0,
            open_tabs: 0,
            create_records: 0,
            system_actions: 0
        };

        const query = searchQuery.toLowerCase().trim();

        Object.keys(stateShortcuts).forEach((sectionKey) => {
            let sectionCount = 0;
            stateShortcuts[sectionKey].forEach((cat) => {
                cat.items.forEach((item) => {
                    if (
                        !query ||
                        item.name.toLowerCase().includes(query) ||
                        item.key.toLowerCase().includes(query) ||
                        cat.category.toLowerCase().includes(query)
                    ) {
                        sectionCount++;
                    }
                });
            });
            counts[sectionKey] = sectionCount;
            counts.all += sectionCount;
        });

        return counts;
    };

    const counts = getBadgeCounts();

    // Filters and groups shortcuts data according to active search query and selected tab
    const getFilteredData = () => {
        const filtered = {};
        const query = searchQuery.toLowerCase().trim();

        Object.keys(stateShortcuts).forEach((sectionKey) => {
            if (activeTab !== "all" && activeTab !== sectionKey) {
                return;
            }

            const sectionData = stateShortcuts[sectionKey];
            const filteredSection = sectionData
                .map((cat) => {
                    const matchedItems = cat.items.filter((item) => {
                        return (
                            !query ||
                            item.name.toLowerCase().includes(query) ||
                            item.key.toLowerCase().includes(query) ||
                            cat.category.toLowerCase().includes(query)
                        );
                    });
                    return { ...cat, items: matchedItems };
                })
                .filter((cat) => cat.items.length > 0);

            if (filteredSection.length > 0) {
                filtered[sectionKey] = filteredSection;
            }
        });

        return filtered;
    };

    const filteredData = getFilteredData();

    // Category icon renderer matching mockup exactly (outline style yellow/green/blue outline icons)
    const renderCategoryIcon = (category, sectionId) => {
        const colorClass = sectionId === "open_tabs"
            ? "text-[#E5A93B]"
            : sectionId === "create_records"
                ? "text-[#10B981]"
                : "text-[#8B5CF6]";

        switch (category) {
            case "Dashboard":
            case "Accounting":
                return <Home className={colorClass} size={16} />;
            case "Sales":
            case "Parties":
                return <Megaphone className={colorClass} size={16} />;
            case "Purchases":
            case "Reports":
                return <ShoppingCart className={colorClass} size={16} />;
            case "Inventory":
            case "Settings":
            case "Export/Print":
                return <Briefcase className={colorClass} size={16} />;
            case "Interface":
                return <Monitor className={colorClass} size={16} />;
            case "Navigation":
                return <Compass className={colorClass} size={16} />;
            default:
                return <Settings className={colorClass} size={16} />;
        }
    };

    // Open change shortcut modal
    const handleRowClick = (sectionKey, categoryIdx, itemIdx, item) => {
        const { keys, connectors } = parseKeyString(item.key);

        setActiveEditItem({ sectionKey, categoryIdx, itemIdx, item });
        setTempKeys(keys);
        setTempConnectors(connectors);
        setRecordingIdx(null);
        setIsModalOpen(true);
    };

    // Add another key row in modal
    const handleAddKey = () => {
        setTempKeys([...tempKeys, "A"]);
        setTempConnectors([...tempConnectors, "+"]);
    };

    // Save customized shortcut
    const handleSaveShortcut = () => {
        if (!activeEditItem) return;
        const error = checkSystemDefault(tempKeys);
        if (error) {
            setValidationError(error);
            return;
        }
        const { sectionKey, categoryIdx, itemIdx, item } = activeEditItem;

        // Stitch keys and connectors back together cleanly
        let formattedKeys = "";
        tempKeys.forEach((keyVal, idx) => {
            formattedKeys += keyVal;
            if (idx < tempKeys.length - 1) {
                const connector = tempConnectors[idx] || "+";
                if (connector === ",") {
                    formattedKeys += ", ";
                } else {
                    formattedKeys += " + ";
                }
            }
        });

        setSaving(true);
        updateShortcut(sectionKey, categoryIdx, itemIdx, formattedKeys, item.id)
            .then((success) => {
                if (success) {
                    dispatch(showToast({ message: "Shortcut updated successfully", type: "success" }));
                    setIsModalOpen(false);
                    setActiveEditItem(null);
                }
            })
            .catch((err) => {
                console.error("Failed to update shortcut:", err);
            })
            .finally(() => {
                setSaving(false);
                setRecordingIdx(null);
            });
    };

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-[#F8F9FA]">
            <Navbar data={navbarData} />

            <div className="flex-1 flex flex-col py-8 w-full">
                <AnimatePresence mode="wait">
                    {selectedCategory === null ? (
                        /* VIEW 1: FULL-PAGE SETTINGS LIST */
                        <motion.div
                            key="menu-list"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="w-full flex flex-col gap-6"
                        >
                            {/* macOS Header section preview in menu */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                    <Settings size={36} className="text-[#353333] animate-spin" style={{ animationDuration: '10s' }} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">General Setup Preferences</h2>
                                <p className="text-sm text-gray-500 mt-2 max-w-[420px] leading-relaxed">
                                    Manage layout shortcuts, dashboard preferences, and navigate modules dynamically across the platform.
                                </p>
                            </div>

                            {/* macOS-style options list container */}
                            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)] divide-y divide-gray-100">
                                {categories.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className="w-full text-left p-5 flex items-center justify-between transition-all duration-200 cursor-pointer hover:bg-gray-50/70 group"
                                        >
                                            <div className="flex items-center gap-4 flex-1 pr-4">
                                                <div className={`p-3 rounded-xl ${cat.iconBg} shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                                                    <Icon size={22} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-base text-gray-900 leading-snug group-hover:text-[#FFCA00] transition-colors duration-200">
                                                        {cat.title}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                                        {cat.desc}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center text-gray-400 group-hover:text-gray-900 transition-colors duration-200">
                                                <span className="text-xs font-medium mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    Configure
                                                </span>
                                                <ChevronRight
                                                    size={18}
                                                    className="transform group-hover:translate-x-1 transition-transform duration-200"
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ) : (
                        /* VIEW 2: KEYBOARD SHORTCUTS DASHBOARD VIEW */
                        <motion.div
                            key="menu-component"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25 }}
                            className="w-full flex flex-col"
                        >
                            {/* Drill-down Back Navigation */}
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="self-start flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black mb-8 transition-colors cursor-pointer group"
                            >
                                <ChevronLeft size={20} className="transform group-hover:-translate-x-0.5 transition-transform" />
                                Back to Settings
                            </button>

                            {/* Search and Tabs row */}
                            <div className="flex flex-row items-center justify-between w-full gap-4 mb-8">
                                {/* Search input - Left Side */}
                                <div className="relative w-full max-w-[240px]">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                                        <Search size={16} />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Search shortcuts"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-11 pl-10 pr-4 bg-white border border-[#E5E7EB] rounded-[6px] text-xs transition-all outline-none focus:outline-none focus:ring-0 focus:border-[#FFCA00]/70 text-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                                    />
                                </div>

                                {/* Tabs row - Right Side */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setActiveTab("all")}
                                        className={`h-10 px-4 rounded-[6px] text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer outline-none focus:outline-none border shadow-sm ${
                                            activeTab === "all"
                                                ? "bg-[#FFCA00] text-white border-[#FFCA00]"
                                                : "bg-white border-[#E5E7EB] text-gray-500 hover:bg-gray-50"
                                        }`}
                                    >
                                        All Shortcuts
                                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] ${activeTab === "all" ? "bg-white/20 text-white font-extrabold" : "bg-[#E5E7EB] text-gray-600 font-bold"}`}>
                                            {counts.all}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("open_tabs")}
                                        className={`h-10 px-4 rounded-[6px] text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer outline-none focus:outline-none border shadow-sm ${
                                            activeTab === "open_tabs"
                                                ? "bg-[#FFCA00] text-white border-[#FFCA00]"
                                                : "bg-white border-[#E5E7EB] text-gray-500 hover:bg-gray-50"
                                        }`}
                                    >
                                        Open Tabs
                                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] ${activeTab === "open_tabs" ? "bg-white/20 text-white font-extrabold" : "bg-[#E5E7EB] text-gray-600 font-bold"}`}>
                                            {counts.open_tabs}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("create_records")}
                                        className={`h-10 px-4 rounded-[6px] text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer outline-none focus:outline-none border shadow-sm ${
                                            activeTab === "create_records"
                                                ? "bg-[#FFCA00] text-white border-[#FFCA00]"
                                                : "bg-white border-[#E5E7EB] text-gray-500 hover:bg-gray-50"
                                        }`}
                                    >
                                        Create Records
                                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] ${activeTab === "create_records" ? "bg-white/20 text-white font-extrabold" : "bg-[#E5E7EB] text-gray-600 font-bold"}`}>
                                            {counts.create_records}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("system_actions")}
                                        className={`h-10 px-4 rounded-[6px] text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer outline-none focus:outline-none border shadow-sm ${
                                            activeTab === "system_actions"
                                                ? "bg-[#FFCA00] text-white border-[#FFCA00]"
                                                : "bg-white border-[#E5E7EB] text-gray-500 hover:bg-gray-50"
                                        }`}
                                    >
                                        System Actions
                                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] ${activeTab === "system_actions" ? "bg-white/20 text-white font-extrabold" : "bg-[#E5E7EB] text-gray-600 font-bold"}`}>
                                            {counts.system_actions}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Main Content Sections */}
                            <div className="space-y-12">
                                {loading ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col animate-pulse"
                                            >
                                                <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 h-10 flex items-center gap-2">
                                                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                                                    <div className="w-20 h-4 bg-gray-200 rounded"></div>
                                                </div>
                                                <div className="p-4 flex-1 flex flex-col gap-4">
                                                    {[1, 2, 3].map((j) => (
                                                        <div key={j} className="flex justify-between items-center">
                                                            <div className="w-24 h-4 bg-gray-200 rounded"></div>
                                                            <div className="w-12 h-6 bg-gray-100 rounded-[6px]"></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        {/* Section 1: Open Tabs */}
                                        {filteredData.open_tabs && (
                                            <div>
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="p-2 rounded-lg bg-[#FEF3C7] text-[#D97706] shadow-sm">
                                                        <Navigation size={18} className="transform rotate-45" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-md font-bold text-gray-900 leading-snug">
                                                            1, Open Tabs
                                                        </h2>
                                                        <p className="text-[11px] text-gray-500 font-normal mt-0.5">
                                                            Jump instantly to any section inside the Billing layout
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                    {filteredData.open_tabs.map((card, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col"
                                                        >
                                                            <div className="bg-[#FFF9E6]/70 border-b border-[#FFF2D4] px-4 py-3 flex items-center gap-2">
                                                                <div className="p-1 rounded">
                                                                    {renderCategoryIcon(card.category, "open_tabs")}
                                                                </div>
                                                                <span className="text-xs font-bold text-gray-900 tracking-wide">{card.category}</span>
                                                            </div>
                                                            <div className="p-4 flex-1 flex flex-col gap-3.5 justify-start">
                                                                {card.items.map((item, itemIdx) => {
                                                                    // Find exact index in main state for modification
                                                                    const mainCatIdx = stateShortcuts.open_tabs.findIndex(c => c.category === card.category);
                                                                    const mainItemIdx = stateShortcuts.open_tabs[mainCatIdx].items.findIndex(i => i.name === item.name);

                                                                    return (
                                                                        <div
                                                                            key={itemIdx}
                                                                            onClick={() => handleRowClick("open_tabs", mainCatIdx, mainItemIdx, item)}
                                                                            className="flex justify-between items-center py-0.5 hover:bg-gray-50/70 px-2 -mx-2 rounded transition-all cursor-pointer group/row"
                                                                        >
                                                                            <span className="text-sm font-medium text-gray-700 group-hover/row:text-gray-900">{item.name}</span>
                                                                            <span className="bg-[#F3F4F6] text-[#4B5563] font-bold px-3 py-1.5 rounded-[6px] text-xs tracking-wide group-hover/row:bg-gray-200 transition-colors">
                                                                                {item.key}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Section 2: Create Records */}
                                        {filteredData.create_records && (
                                            <div>
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="p-2 rounded-lg bg-[#D1FAE5] text-[#059669] shadow-sm">
                                                        <PlusCircle size={18} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-md font-bold text-gray-900 leading-snug">
                                                            2, Create
                                                        </h2>
                                                        <p className="text-[11px] text-gray-500 font-normal mt-0.5">
                                                            Instantly open modal drawers or wizards to populate database entries.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                    {filteredData.create_records.map((card, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col"
                                                        >
                                                            <div className="bg-[#F0FDF4] border-b border-[#DCFCE7] px-4 py-3 flex items-center gap-2">
                                                                <div className="p-1 rounded">
                                                                    {renderCategoryIcon(card.category, "create_records")}
                                                                </div>
                                                                <span className="text-xs font-bold text-gray-900 tracking-wide">{card.category}</span>
                                                            </div>
                                                            <div className="p-4 flex-1 flex flex-col gap-3.5 justify-start">
                                                                {card.items.map((item, itemIdx) => {
                                                                    // Find exact index in main state for modification
                                                                    const mainCatIdx = stateShortcuts.create_records.findIndex(c => c.category === card.category);
                                                                    const mainItemIdx = stateShortcuts.create_records[mainCatIdx].items.findIndex(i => i.name === item.name);

                                                                    return (
                                                                        <div
                                                                            key={itemIdx}
                                                                            onClick={() => handleRowClick("create_records", mainCatIdx, mainItemIdx, item)}
                                                                            className="flex justify-between items-center py-0.5 hover:bg-gray-50/70 px-2 -mx-2 rounded transition-all cursor-pointer group/row"
                                                                        >
                                                                            <span className="text-sm font-medium text-gray-700 group-hover/row:text-gray-900">{item.name}</span>
                                                                            <span className="bg-[#F3F4F6] text-[#4B5563] font-bold px-3 py-1.5 rounded-[6px] text-xs tracking-wide group-hover/row:bg-gray-200 transition-colors">
                                                                                {item.key}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Section 3: Export & Print */}
                                        {filteredData.system_actions && (
                                            <div>
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="p-2 rounded-lg bg-[#F5F3FF] text-[#8B5CF6] shadow-sm">
                                                        <Printer size={18} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-md font-bold text-gray-900 leading-snug">
                                                            3, Export & Print
                                                        </h2>
                                                        <p className="text-[11px] text-gray-500 font-normal mt-0.5">
                                                            Instantly open modal drawers or wizards to populate database entries.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                    {filteredData.system_actions.map((card, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col"
                                                        >
                                                            <div className="bg-[#F5F3FF]/70 border-b border-[#E0E7FF] px-4 py-3 flex items-center gap-2">
                                                                <div className="p-1 rounded">
                                                                    {renderCategoryIcon(card.category, "system_actions")}
                                                                </div>
                                                                <span className="text-xs font-bold text-gray-900 tracking-wide">{card.category}</span>
                                                            </div>
                                                            <div className="p-4 flex-1 flex flex-col gap-3.5 justify-start">
                                                                {card.items.map((item, itemIdx) => {
                                                                    // Find exact index in main state for modification
                                                                    const mainCatIdx = stateShortcuts.system_actions.findIndex(c => c.category === card.category);
                                                                    const mainItemIdx = stateShortcuts.system_actions[mainCatIdx].items.findIndex(i => i.name === item.name);

                                                                    return (
                                                                        <div
                                                                            key={itemIdx}
                                                                            onClick={() => handleRowClick("system_actions", mainCatIdx, mainItemIdx, item)}
                                                                            className="flex justify-between items-center py-0.5 hover:bg-gray-50/70 px-2 -mx-2 rounded transition-all cursor-pointer group/row"
                                                                        >
                                                                            <span className="text-sm font-medium text-gray-700 group-hover/row:text-gray-900">{item.name}</span>
                                                                            <span className="bg-[#F3F4F6] text-[#4B5563] font-bold px-3 py-1.5 rounded-[6px] text-xs tracking-wide group-hover/row:bg-gray-200 transition-colors">
                                                                                {item.key}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Empty state view */}
                            {!loading && Object.keys(filteredData).length === 0 && (
                                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                                    <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                        <Search size={28} />
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg">No shortcuts found</h3>
                                    <p className="text-sm text-gray-500 mt-2 max-w-[320px] leading-relaxed">
                                        We couldn't find any shortcuts matching "{searchQuery}". Try using different terms.
                                    </p>
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="mt-5 px-5 py-2 bg-[#FFCA00] text-[#353333] hover:bg-[#d9ac00] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        Clear Search Query
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* CHANGE SHORTCUT INTERACTIVE MODAL (Figma Mockup Matching) */}
            <AnimatePresence>
                {isModalOpen && activeEditItem && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1003] p-4 cursor-pointer"
                        onClick={() => {
                            setIsModalOpen(false);
                            setActiveEditItem(null);
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full flex flex-col relative cursor-default"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Change Shortcut</h2>

                            {/* Sequential Connector Guided Hint */}
                            {showConnectorHint && (
                                <div className="mb-6 p-4 bg-amber-50/70 border border-[#FFF2D4] rounded-xl flex gap-3 relative shadow-[0_2px_8px_rgba(253,230,138,0.15)]">
                                    <span className="text-lg">💡</span>
                                    <div className="flex-1 pr-6">
                                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-1">Custom Combos & Sequences</h4>
                                        <p className="text-[11px] leading-relaxed text-gray-600 font-medium">
                                            You can now create both simultaneous key combos (using <span className="font-bold bg-white border border-gray-200 px-1 py-0.5 rounded text-[10px] text-gray-800 shadow-sm">+</span>) 
                                            and step-by-step sequential actions (using <span className="font-bold bg-white border border-gray-200 px-1 py-0.5 rounded text-[10px] text-gray-800 shadow-sm">,</span>). 
                                            Simply click the separator button between any keys to toggle.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={dismissConnectorHint}
                                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors text-xs font-bold p-1 cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* Shortcut Name Display */}
                            <div className="mb-6">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                                    Shortcut Name
                                </label>
                                <div className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] flex items-center text-sm font-semibold text-gray-800">
                                    {activeEditItem.item.name}
                                </div>
                            </div>

                            {/* Shortcut Combination Customizer Table */}
                            <div className="mb-6">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                                    Combination Keys
                                </label>

                                <div className="border border-[#E5E7EB] rounded-[6px] overflow-hidden bg-white">
                                    {/* Header Row */}
                                    <div className="flex bg-[#F9FAFB] px-4 py-2.5 border-b border-[#E5E7EB] text-xs font-bold text-gray-500">
                                        <div className="w-10">#</div>
                                        <div>Key</div>
                                    </div>

                                    {/* Key Rows */}
                                    <div className="divide-y divide-gray-100 bg-[#FAFAFA]">
                                        {tempKeys.map((keyVal, kIdx) => (
                                            <div
                                                key={kIdx}
                                                className="flex items-center px-4 py-3 hover:bg-gray-50/70 transition-colors"
                                            >
                                                {/* Counter */}
                                                <div className="w-10 text-sm font-semibold text-gray-400">{kIdx + 1}</div>

                                                {/* Keycap Recorder & Plus Sign */}
                                                <div className="flex-1 flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRecordingIdx(recordingIdx === kIdx ? null : kIdx)}
                                                        className={`h-11 px-4 border rounded-[6px] text-xs font-bold transition-all min-w-[128px] text-center focus:outline-none cursor-pointer ${
                                                            recordingIdx === kIdx
                                                                ? "bg-amber-50/80 border-[#FFCA00] text-gray-900 ring-2 ring-[#FFCA00]/20 animate-pulse font-extrabold"
                                                                : "bg-white border-[#E5E7EB] text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                                                        }`}
                                                    >
                                                        {recordingIdx === kIdx ? "Press key..." : keyVal}
                                                    </button>

                                                      {/* + Sign / , Comma sequential toggle selector if not last key */}
                                                      {kIdx < tempKeys.length - 1 && (
                                                          <button
                                                              ref={kIdx === 0 ? firstConnectorRef : null}
                                                              type="button"
                                                              onClick={() => {
                                                                  const nextConnectors = [...tempConnectors];
                                                                  nextConnectors[kIdx] = nextConnectors[kIdx] === "+" ? "," : "+";
                                                                  setTempConnectors(nextConnectors);
                                                                  dismissConnectorHint();
                                                              }}
                                                              title="Click to toggle between + (simultaneous combo) and , (sequential keys)"
                                                              className={`h-8 px-2.5 border rounded-[4px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center min-w-[32px] hover:scale-105 active:scale-95 ${
                                                                  showConnectorHint 
                                                                      ? "bg-amber-100 border-amber-300 ring-2 ring-amber-400 ring-offset-1 animate-pulse text-amber-800 font-extrabold" 
                                                                      : "bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-600"
                                                              }`}
                                                          >
                                                              {tempConnectors[kIdx] || "+"}
                                                          </button>
                                                      )}
                                                 </div>

                                                 {/* Delete Button */}
                                                 <button
                                                     type="button"
                                                     onClick={() => {
                                                         if (tempKeys.length > 1) {
                                                             setTempKeys(tempKeys.filter((_, i) => i !== kIdx));
                                                             const connIdx = kIdx === tempKeys.length - 1 ? kIdx - 1 : kIdx;
                                                             setTempConnectors(tempConnectors.filter((_, i) => i !== connIdx));
                                                             if (recordingIdx === kIdx) setRecordingIdx(null);
                                                             else if (recordingIdx > kIdx) setRecordingIdx(recordingIdx - 1);
                                                         }
                                                     }}
                                                     disabled={tempKeys.length <= 1}
                                                     className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-2 cursor-pointer"
                                                 >
                                                     <Trash2 size={16} />
                                                 </button>
                                             </div>
                                         ))}
                                    </div>

                                    {/* Add Key Row Button */}
                                    <button
                                        onClick={handleAddKey}
                                        className="flex items-center gap-2.5 w-full px-4 py-3 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors bg-white border-t border-[#E5E7EB] text-left cursor-pointer"
                                    >
                                        <span className="text-sm font-extrabold">+</span>
                                        Add 1 more key
                                    </button>
                                </div>
                            </div>

                            {validationError && (
                                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-semibold text-red-600 flex items-center gap-2.5 animate-pulse">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 animate-ping"></span>
                                    <div>{validationError}</div>
                                </div>
                            )}

                            {/* Footer Buttons */}
                            <div className="flex justify-end items-center gap-6 mt-2">
                                <button
                                    onClick={() => {
                                        setRecordingIdx(null);
                                        setIsModalOpen(false);
                                        setActiveEditItem(null);
                                    }}
                                    className="text-sm font-bold text-gray-900 hover:text-black cursor-pointer bg-transparent py-2.5 px-4 rounded-[6px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setRecordingIdx(null);
                                        handleSaveShortcut();
                                    }}
                                    disabled={!!validationError || saving}
                                    className={`text-sm font-bold px-6 py-2.5 rounded-[6px] shadow-sm transition-colors flex items-center gap-2 ${
                                        validationError || saving
                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
                                            : "bg-[#FFCA00] hover:bg-[#d9ac00] text-white cursor-pointer"
                                    }`}
                                >
                                    {saving ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </button>
                            </div>

                            {/* Virtual Cursor for Demo */}
                            {isModalOpen && showConnectorHint && demoStep !== "idle" && demoStep !== "done" && (
                                <motion.div
                                    animate={{
                                        x: virtualCursorPos.x,
                                        y: virtualCursorPos.y,
                                        scale: demoStep === "clicking" ? 0.8 : 1
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 70,
                                        damping: 15
                                    }}
                                    className="absolute pointer-events-none z-[1005] w-5 h-6 flex items-center justify-center"
                                    style={{ left: -4, top: -3 }}
                                >
                                    <svg className="w-5 h-6 text-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] filter" viewBox="0 0 24 24" fill="currentColor">
                                        <path 
                                            d="M4.5 3V19.5L9.6 14.4L14.7 21L17.5 19.4L12.5 12.9L17.6 12.4L4.5 3Z" 
                                            stroke="white" 
                                            strokeWidth="1.5" 
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
