"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TbBuilding, TbSmartHome } from "react-icons/tb";
import { CgNotes } from "react-icons/cg";
import { LuNetwork } from "react-icons/lu";
import { LiaTelegramPlane } from "react-icons/lia";
import {
    GoalIcon,
    CalenderIcon,
    MailInviteIcon
} from "@/lib/customIcons";
import { navigationSections } from "./sidebarData";
import { FaRegFolder } from "react-icons/fa";
import { RiGroupLine } from "react-icons/ri";
import { Calendar, Mail, Plus, X, Globe, ChevronDown } from "lucide-react";
import { MdHelpOutline } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";
import { LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";


// Local storage helpers
const getFromLocalStorage = (key, defaultValue = null) => {
    try {
        if (typeof window !== "undefined" && window.localStorage) {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        }
        return defaultValue;
    } catch {
        return defaultValue;
    }
};

const setToLocalStorage = (key, value) => {
    try {
        if (typeof window !== "undefined" && window.localStorage) {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        }
        return false;
    } catch {
        return false;
    }
};

// Flatten navigationSections to create a map of path -> { icon, label }
const generatePageMap = () => {
    const map = {};
    navigationSections.forEach(section => {
        section.items.forEach(item => {
            if (item.path) {
                map[item.path] = { icon: item.icon, label: item.name };
            }
            if (item.hasDropdown && item.dropdownItems) {
                item.dropdownItems.forEach(dropItem => {
                    map[dropItem.path] = { icon: item.icon, label: dropItem.name };
                });
            }
        });
    });
    return map;
};

const QuickNavbar = ({ currentPath: propCurrentPath, isSidebarOpen, onToggleSidebar }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [currentPath, setCurrentPath] = useState(propCurrentPath || pathname || "/");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [modalPosition, setModalPosition] = useState({ left: 0 });
    const [mounted, setMounted] = useState(false);
    const didLoadFromStorage = useRef(false);
    const modalRef = useRef(null);
    const addButtonRef = useRef(null);

    // Global dropdown state
    const [isGlobalDropdownOpen, setIsGlobalDropdownOpen] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState("global");
    const [expandedEntities, setExpandedEntities] = useState({});
    const globalDropdownRef = useRef(null);
    const globalButtonRef = useRef(null);

    const pageMap = generatePageMap();

    // Available items for "Add" menu
    const allNavigationItems = [];
    navigationSections.forEach(section => {
        section.items.forEach(item => {
            // Check top-level item if it has a path
            if (item.path && !["/calendar", "/email", "/goals"].includes(item.path)) {
                allNavigationItems.push({
                    path: item.path,
                    icon: item.icon,
                    label: item.name,
                    section: section.title
                });
            }

            // check dropdown items
            if (item.hasDropdown && item.dropdownItems) {
                item.dropdownItems.forEach(dropItem => {
                    if (dropItem.path && !["/calendar", "/email", "/goals"].includes(dropItem.path)) {
                        allNavigationItems.push({
                            path: dropItem.path,
                            icon: item.icon, // Use parent icon or specialized if available
                            label: dropItem.name,
                            section: section.title
                        });
                    }
                });
            }
        });
    });

    // Mock data for entities - replace with your actual data
    const entities = [
        {
            id: "entity1",
            label: "Entity 1 - All Units",
            units: [
                { id: "unit1-1", label: "Unit 1", branch: "Branch" },
                { id: "unit1-2", label: "Unit 2", branch: "Branch" },
            ],
        },
        {
            id: "entity2",
            label: "Entity 2 - All Units",
            units: [
                { id: "unit2-1", label: "Unit 1", branch: "Branch" },
                { id: "unit2-2", label: "Unit 2", branch: "Branch" },
            ],
        },
    ];

    const getCurrentPageInfo = () => pageMap[currentPath] || null;

    const currentPage = getCurrentPageInfo();
    const CurrentIcon = currentPage?.icon;

    useEffect(() => {
        setMounted(true);
        if (pathname) setCurrentPath(pathname);
    }, [pathname]);

    useEffect(() => {
        if (propCurrentPath) setCurrentPath(propCurrentPath);
    }, [propCurrentPath]);

    useEffect(() => {
        const savedItems = getFromLocalStorage("quickNavSelectedItems", []);
        setSelectedItems(savedItems);
        setTimeout(() => (didLoadFromStorage.current = true), 0);
        if (!propCurrentPath) {
            const savedPath = getFromLocalStorage("currentPath", "/");
            setCurrentPath(savedPath);
        }
    }, [propCurrentPath]);

    useEffect(() => {
        if (didLoadFromStorage.current)
            setToLocalStorage("quickNavSelectedItems", selectedItems);
    }, [selectedItems]);

    useEffect(() => {
        setToLocalStorage("currentPath", currentPath);
    }, [currentPath]);

    // Outside click + Escape for modal
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target))
                setIsModalOpen(false);
        };
        if (isModalOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () =>
                document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => { };
    }, [isModalOpen]);

    useEffect(() => {
        const handleEscape = (e) => e.key === "Escape" && setIsModalOpen(false);
        if (isModalOpen) {
            document.addEventListener("keydown", handleEscape);
            return () => document.removeEventListener("keydown", handleEscape);
        }
        return () => { };
    }, [isModalOpen]);

    // Outside click + Escape for global dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                globalDropdownRef.current &&
                !globalDropdownRef.current.contains(event.target) &&
                !globalButtonRef.current?.contains(event.target)
            ) {
                setIsGlobalDropdownOpen(false);
            }
        };
        if (isGlobalDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () =>
                document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => { };
    }, [isGlobalDropdownOpen]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape") setIsGlobalDropdownOpen(false);
        };
        if (isGlobalDropdownOpen) {
            document.addEventListener("keydown", handleEscape);
            return () => document.removeEventListener("keydown", handleEscape);
        }
        return () => { };
    }, [isGlobalDropdownOpen]);

    const handleAddClick = () => {
        if (addButtonRef.current) {
            const rect = addButtonRef.current.getBoundingClientRect();
            setModalPosition({ left: rect.right - 95 });
        }
        setIsModalOpen(true);
    };

    const handleItemToggle = (item) => {
        setSelectedItems((prev) =>
            prev.find((s) => s.path === item.path)
                ? prev.filter((s) => s.path !== item.path)
                : [...prev, { path: item.path, label: item.label }]
        );
    };

    const handleRemoveItem = (path) =>
        setSelectedItems((prev) => prev.filter((i) => i.path !== path));

    const handleNavigate = (path) => {
        setCurrentPath(path);
        router.push(path);
    };

    const handleGlobalClick = () => {
        setIsGlobalDropdownOpen(!isGlobalDropdownOpen);
    };

    const toggleEntityExpanded = (entityId) => {
        setExpandedEntities((prev) => ({
            ...prev,
            [entityId]: !prev[entityId],
        }));
    };

    const handleEntitySelect = (entityId) => {
        setSelectedEntity(entityId);
        setIsGlobalDropdownOpen(false);
        // Add your entity selection logic here
    };

    const handleUnitSelect = (entityId, unitId) => {
        setSelectedEntity(`${entityId}-${unitId}`);
        setIsGlobalDropdownOpen(false);
        // Add your unit selection logic here
    };

    const getSelectedLabel = () => {
        if (selectedEntity === "global") return "Global";

        // Check if it's a unit selection (format: "entityId-unitId")
        const parts = selectedEntity.split("-");
        if (parts.length > 1) {
            const entityId = parts[0];
            const entity = entities.find((e) => e.id === entityId);
            if (entity) {
                const unit = entity.units.find(
                    (u) => `${entityId}-${u.id}` === selectedEntity
                );
                if (unit) {
                    // Extract entity name without "- All Units" suffix
                    const entityName = entity.label.replace(" - All Units", "");
                    return `${entityName} - ${unit.label}`; // ✅ Shows "Entity 1 - Unit 1"
                }
            }
        }

        // Check if it's an entity selection
        const entity = entities.find((e) => e.id === selectedEntity);
        if (entity) return entity.label;

        return "Global";
    };

    const availableItems = allNavigationItems.filter(
        (item) => !selectedItems.some((s) => s.path === item.path)
    );

    const scrollRef = useRef(null);
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return () => { };
        const onWheel = (e) => {
            if (e.deltaY === 0) return;
            e.preventDefault();
            el.scrollTo({ left: el.scrollLeft + e.deltaY, behavior: "smooth" });
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    const isCurrentInSelected = selectedItems.some((i) => i.path === currentPath);
    const isCurrentPathMapped = pageMap[currentPath] !== undefined;

    return (
        <>
            <div
                ref={scrollRef}
                className="sticky top-0 z-[50] bg-white shadow-sm border-b border-gray-200 px-4 overflow-x-auto hide-scrollbar transition-all duration-300 ease-in-out w-full"
            >
                <div className="flex items-center space-x-3">
                    {/* Sidebar Toggle Button */}
                    <div className="py-2 pr-2 border-r hidden md:block border-gray-200">
                        <button
                            onClick={onToggleSidebar}
                            className="flex items-center justify-center w-8 h-8 bg-[#F8F8F8] hover:bg-gray-100 rounded-[8px] border border-[#E1E1E1] transition-colors duration-200 text-[#353333]"
                            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                        >
                            {isSidebarOpen ? (
                                <LuPanelLeftClose size={18} />
                            ) : (
                                <LuPanelLeftOpen size={18} />
                            )}
                        </button>
                    </div>

                    {/* Calendar */}
                    {currentPath === "/calendar" ? (
                        <div className="relative flex items-center">
                            <div className="absolute -left-3 bottom-0 w-3 h-3 bg-gray-300/50">
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-br-[8px]" />
                            </div>
                            <div className="bg-gray-300/50 px-3 py-2 border-t border-gray-200">
                                <div className="flex items-center space-x-2 px-4 py-1.5 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white">
                                    <Calendar className="w-5 h-5 text-brand-mint" />
                                    <button
                                        onClick={() => handleNavigate("/calendar")}
                                        className="text-sm font-medium text-nowrap text-brand-mint"
                                    >
                                        Planner
                                    </button>
                                </div>
                            </div>
                            <div className="absolute -right-3 bottom-0 w-3 h-3 bg-gray-300/50">
                                <div className="absolute bottom-0 left-0 w-3 h-3 bg-white rounded-bl-[8px]" />
                            </div>
                        </div>
                    ) : (
                        <div className="py-2">
                            <button
                                onClick={() => handleNavigate("/calendar")}
                                className="flex items-center space-x-2 px-3 py-1.5 rounded-[8px] border transition-colors duration-200 bg-[#F8F8F8] hover:bg-gray-100 border-[#E1E1E1]"
                            >
                                <div className="p-0.5 bg-white rounded-full">
                                    <Calendar className="w-4 h-4 text-black" />
                                </div>
                                <span className="text-sm font-medium text-black">Planner</span>
                            </button>
                        </div>
                    )}

                    {/* Email */}
                    {currentPath === "/email" ? (
                        <div className="relative flex items-center">
                            <div className="absolute -left-3 bottom-0 w-3 h-3 bg-gray-300/50">
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-br-[8px]" />
                            </div>
                            <div className="bg-gray-300/50 px-3 py-2 border-t border-gray-200">
                                <div className="flex items-center space-x-2 px-4 py-1.5 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white">
                                    <Mail className="w-5 h-5 text-brand-mint" />
                                    <button
                                        onClick={() => handleNavigate("/email")}
                                        className="text-sm font-medium text-nowrap text-brand-mint"
                                    >
                                        Email
                                    </button>
                                </div>
                            </div>
                            <div className="absolute -right-3 bottom-0 w-3 h-3 bg-gray-300/50">
                                <div className="absolute bottom-0 left-0 w-3 h-3 bg-white rounded-bl-[8px]" />
                            </div>
                        </div>
                    ) : (
                        <div className="py-2">
                            <button
                                onClick={() => handleNavigate("/email")}
                                className="flex items-center space-x-2 px-3 py-1.5 rounded-[8px] border transition-colors duration-200 bg-[#F8F8F8] hover:bg-gray-100 border-[#E1E1E1]"
                            >
                                <div className="p-0.5 bg-white rounded-full">
                                    <Mail className="w-4 h-4 text-black" />
                                </div>
                                <span className="text-sm font-medium text-black">Email</span>
                            </button>
                        </div>
                    )}

                    {currentPath === "/goals" ? (
                        <div className="relative flex items-center">
                            <div className="absolute -left-3 bottom-0 w-3 h-3 bg-gray-300/50">
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-br-[8px]" />
                            </div>
                            <div className="bg-gray-300/50 px-3 py-2 border-t border-gray-200">
                                <div className="flex items-center space-x-2 px-4 py-1.5 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white">
                                    <GoalIcon className="w-5 h-5 text-brand-mint" />
                                    <button
                                        onClick={() => handleNavigate("/goals")}
                                        className="text-sm font-medium text-nowrap text-brand-mint"
                                    >
                                        Goals
                                    </button>
                                </div>
                            </div>
                            <div className="absolute -right-3 bottom-0 w-3 h-3 bg-gray-300/50">
                                <div className="absolute bottom-0 left-0 w-3 h-3 bg-white rounded-bl-[8px]" />
                            </div>
                        </div>
                    ) : (
                        <div className="py-2">
                            <button
                                onClick={() => handleNavigate("/goals")}
                                className="flex items-center space-x-2 px-3 py-1.5 rounded-[8px] border transition-colors duration-200 bg-[#F8F8F8] hover:bg-gray-100 border-[#E1E1E1]"
                            >
                                <div className="p-0.5 bg-white rounded-full">
                                    <GoalIcon className="w-4 h-4 text-black" />
                                </div>
                                <span className="text-sm font-medium text-black">Goals</span>
                            </button>
                        </div>
                    )}

                    {/* Dynamic tabs */}
                    {selectedItems.map((item) => {
                        const pageInfo = pageMap[item.path];
                        if (!pageInfo) return null;
                        const ItemIcon = pageInfo.icon;
                        const isCurrent = item.path === currentPath;

                        if (isCurrent)
                            return (
                                <div key={item.path} className="relative flex items-center">
                                    <div className="absolute -left-3 bottom-0 w-3 h-3 bg-gray-300/50">
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-br-[8px]" />
                                    </div>
                                    <div className="bg-gray-300/50 px-3 py-2 border-t border-gray-200">
                                        <div className="flex items-center space-x-2 px-4 py-1.5 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white">
                                            <ItemIcon className="w-5 h-5 text-brand-mint" />
                                            <button
                                                onClick={() => handleNavigate(item.path)}
                                                className="text-sm font-medium text-nowrap text-brand-mint"
                                            >
                                                {pageInfo.label}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveItem(item.path);
                                                }}
                                            >
                                                <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="absolute -right-3 bottom-0 w-3 h-3 bg-gray-300/50">
                                        <div className="absolute bottom-0 left-0 w-3 h-3 bg-white rounded-bl-[8px]" />
                                    </div>
                                </div>
                            );

                        return (
                            <div key={item.path} className="py-2">
                                <div className="flex items-center space-x-2 px-4 py-1.5 rounded-[8px] bg-[#F8F8F8] hover:bg-gray-100 border border-[#E1E1E1]">
                                    <ItemIcon className="w-5 h-5 text-black" />
                                    <button
                                        onClick={() => handleNavigate(item.path)}
                                        className="text-sm font-medium text-nowrap text-black"
                                    >
                                        {pageInfo.label}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveItem(item.path);
                                        }}
                                    >
                                        <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* ✅ Active current route if not in selected AND path is mapped */}
                    {!isCurrentInSelected &&
                        currentPath !== "/email" &&
                        currentPath !== "/calendar" &&
                        isCurrentPathMapped &&
                        currentPage && (
                            <div className="relative flex items-center">
                                <div className="absolute -left-3 bottom-0 w-3 h-3 bg-gray-300/50">
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-br-[8px]" />
                                </div>
                                <div className="bg-gray-300/50 px-3 border-t border-gray-200 py-2">
                                    <div
                                        className="flex items-center space-x-2 px-4 rounded-[8px] py-1.5 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white gap-1"
                                        onClick={() => handleNavigate(currentPath)}
                                    >
                                        <CurrentIcon className="w-5 h-5 text-brand-mint" />
                                        <span className="text-sm font-medium text-brand-mint text-nowrap">
                                            {currentPage.label}
                                        </span>
                                    </div>
                                </div>
                                <div className="absolute -right-3 bottom-0 w-3 h-3 bg-gray-300/50">
                                    <div className="absolute bottom-0 left-0 w-3 h-3 bg-white rounded-bl-[8px]" />
                                </div>
                            </div>
                        )}

                    {/* Add Button */}
                    <div className="py-2">
                        <button
                            ref={addButtonRef}
                            onClick={handleAddClick}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-[#F8F8F8] hover:bg-gray-100 rounded-[8px] transition-colors duration-200 border border-[#E1E1E1]"
                        >
                            <div className="p-0.5 bg-[#FFFFFF] rounded-full">
                                <Plus className="w-4 h-4 text-brand-mint" />
                            </div>
                            <span className="text-sm font-medium text-black">Add</span>
                        </button>
                    </div>

                    {/* Spacer to push global button to the right */}
                    <div className="flex-1"></div>

                    {/* Global Dropdown Button */}
                    <div className="py-2 ml-auto">
                        <button
                            ref={globalButtonRef}
                            onClick={handleGlobalClick}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-[#F8F8F8] hover:bg-gray-100 rounded-[8px] transition-colors duration-200 border border-[#E1E1E1]"
                        >
                            <Globe className="w-4 h-4 text-black" />
                            <span className="text-sm font-medium text-black">
                                {getSelectedLabel()}
                            </span>
                            <ChevronDown className="w-4 h-4 text-black" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Modal Dropdown */}
            {isModalOpen && (
                <div
                    className="fixed z-[60] top-13.5 right-0 lg:right-auto"
                    style={{
                        left: window.innerWidth >= 768 ? `${modalPosition.left}px` : "auto",
                    }}
                >
                    <div
                        ref={modalRef}
                        className="bg-white rounded-md shadow-xl w-45 max-h-96 overflow-hidden"
                    >
                        <div className="p-2 space-y-2 max-h-80 overflow-y-auto">
                            {availableItems.map((item) => {
                                const ItemIcon = item.icon;
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => {
                                            handleItemToggle(item);
                                            setIsModalOpen(false);
                                        }}
                                        className="w-full flex items-center space-x-1 rounded-[8px] border transition-all bg-[#F8F8F8] duration-200"
                                    >
                                        <div className="p-1.5">
                                            <ItemIcon className="w-4 h-4" />
                                        </div>
                                        <span className="flex-1 text-left text-sm font-medium">
                                            {item.label}
                                        </span>
                                    </button>
                                );
                            })}
                            {availableItems.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    All items are already added
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Global Dropdown */}
            {isGlobalDropdownOpen && (
                <div className="fixed z-[60] top-13.5 right-4">
                    <div
                        ref={globalDropdownRef}
                        className="bg-white rounded-lg shadow-xl w-64 max-h-96 overflow-hidden border border-gray-200"
                    >
                        <div className="p-2 space-y-1 max-h-80 overflow-y-auto hide-scrollbar">
                            {/* Global option */}
                            <button
                                onClick={() => handleEntitySelect("global")}
                                className={`w-full flex justify-between flex-col gap-1 px-3 py-2 rounded-md transition-colors ${selectedEntity === "global"
                                    ? "bg-brand-mint/10 text-brand-mint"
                                    : "hover:bg-gray-50"
                                    }`}
                            >
                                <div className="flex items-center space-x-2">
                                    <Globe className="w-4 h-4" />
                                    <span className="text-sm font-medium">Global</span>
                                </div>
                                <p className="text-xs text-gray-600 text-left">
                                    All Entities & Units
                                </p>
                            </button>

                            {/* Separator */}
                            <div className="border-t border-gray-200 my-1"></div>

                            {/* All Entities & Units */}
                            <div className="px-3 py-1">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    All Entities & Units
                                </span>
                            </div>

                            {/* Entity sections */}
                            {entities.map((entity) => (
                                <div key={entity.id} className="space-y-1">
                                    <div className="flex items-center">
                                        <button
                                            onClick={() => handleEntitySelect(entity.id)}
                                            className={`flex-1 flex items-center space-x-2 px-3 py-2 rounded-l-md transition-colors ${selectedEntity === entity.id
                                                ? "bg-brand-mint/10 text-brand-mint"
                                                : "hover:bg-gray-50"
                                                }`}
                                        >
                                            <TbBuilding className="w-4 h-4 text-gray-600" />
                                            <span className="text-sm font-medium text-gray-700">
                                                {entity.label}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => toggleEntityExpanded(entity.id)}
                                            className="px-2 py-2 rounded-r-md hover:bg-gray-50 transition-colors"
                                        >
                                            <ChevronDown
                                                className={`w-4 h-4 text-gray-400 transition-transform ${expandedEntities[entity.id] ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Units list */}
                                    {expandedEntities[entity.id] && (
                                        <div className="ml-4 space-y-1">
                                            {entity.units.map((unit) => (
                                                <button
                                                    key={unit.id}
                                                    onClick={() => handleUnitSelect(entity.id, unit.id)}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${selectedEntity === `${entity.id}-${unit.id}`
                                                        ? "bg-brand-mint/10 text-brand-mint"
                                                        : "hover:bg-gray-50"
                                                        }`}
                                                >
                                                    <span className="text-sm text-gray-700">
                                                        {unit.label}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {unit.branch}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}


        </>
    );
};

export default QuickNavbar;
