"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";

import { accountService } from "@/services/accountService";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { openDeleteModal, closeDeleteModal, setDeleteLoading } from "@/lib/features/ui/uiSlice";
import { FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronRight } from "react-icons/fi";
import AccountModal from "@/components/commonComp/AccountModal";

// Custom SVG Icons
const PackageIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M8 6.04435L0.554182 3.08892L8 0L15.4458 3.08892L8 6.04435ZM8.54545 7.01572L16 4.05661V12.9074L8.54545 16V7.01572ZM7.45455 7.01572L0 4.05661V12.9074L7.45455 16V7.01572Z" fill="black" />
    </svg>
);

const FolderIcon = () => (
    <svg width="16" height="13" viewBox="0 0 16 13" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.6 13C1.16 13 0.783467 12.841 0.4704 12.5231C0.157333 12.2051 0.000533333 11.8224 0 11.375V1.625C0 1.17812 0.1568 0.795708 0.4704 0.47775C0.784 0.159791 1.16053 0.000541667 1.6 0H6.4L8 1.625H14.4C14.84 1.625 15.2168 1.78425 15.5304 2.10275C15.844 2.42125 16.0005 2.80367 16 3.25V11.375C16 11.8219 15.8435 12.2046 15.5304 12.5231C15.2173 12.8416 14.8405 13.0005 14.4 13H1.6Z" fill="black" />
    </svg>
);

const CircleIcon = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 5C1 6.06087 1.42143 7.07828 2.17157 7.82843C2.92172 8.57857 3.93913 9 5 9C6.06087 9 7.07828 8.57857 7.82843 7.82843C8.57857 7.07828 9 6.06087 9 5C9 3.93913 8.57857 2.92172 7.82843 2.17157C7.07828 1.42143 6.06087 1 5 1C3.93913 1 2.92172 1.42143 2.17157 2.17157C1.42143 2.92172 1 3.93913 1 5Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// Three-dot vertical action icon
const DotsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="5" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="19" r="2" />
    </svg>
);

// Eye / View icon
const EyeIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

// Static padding classes for nested levels to support Tailwind static compilation
const getPaddingClass = (level) => {
    switch (level) {
        case 0:
            return "pl-[40px] sm:pl-[64px]";
        case 1:
            return "pl-[64px] sm:pl-[88px]";
        case 2:
            return "pl-[88px] sm:pl-[112px]";
        default:
            return "pl-[112px] sm:pl-[136px]";
    }
};

export default function ChartsOfAccountsPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const [chartData, setChartData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuRef = useRef(null);

    // Modal and form states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [preselectedCategory, setPreselectedCategory] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [menuItem, setMenuItem] = useState(null);

    // Collapsible states
    const [expandedCategories, setExpandedCategories] = useState({
        assets: true,
        liabilities: true,
        equity: true,
        income: true,
        expenses: true,
    });
    const [expandedNodes, setExpandedNodes] = useState({});

    const toggleCategory = (key) => {
        setExpandedCategories((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const toggleNode = (nodeId) => {
        setExpandedNodes((prev) => ({
            ...prev,
            [nodeId]: !prev[nodeId],
        }));
    };

    // Close dropdown when clicking outside or scrolling
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null);
                setMenuItem(null);
            }
        };
        const handleScroll = () => {
            setOpenMenuId(null);
            setMenuItem(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScroll, true);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, []);

    useEffect(() => {
        fetchChartData();
    }, []);

    const fetchChartData = async () => {
        try {
            setIsLoading(true);
            const data = await accountService.getChartsOfAccounts();
            setChartData(data || {});

            // Auto-expand all folder nodes so full tree is visible immediately
            const folderStates = {};
            const expandFoldersRecursively = (nodes) => {
                if (!Array.isArray(nodes)) return;
                nodes.forEach(node => {
                    if (node.is_folder) {
                        folderStates[node.id] = true;
                        if (node.children) expandFoldersRecursively(node.children);
                    }
                });
            };

            Object.values(data || {}).forEach(list => {
                expandFoldersRecursively(list);
            });

            setExpandedNodes(folderStates);
        } catch (error) {
            console.error("Error fetching chart data:", error);
            dispatch(showToast({ message: "Failed to load charts of accounts", type: "error" }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (formData) => {
        try {
            setIsSaving(true);
            if (selectedAccount) {
                // Update mode
                await accountService.updateAccount(selectedAccount.id, formData);
                dispatch(showToast({ message: "Account updated successfully", type: "success" }));
            } else {
                // Create mode
                await accountService.createAccount(formData);
                dispatch(showToast({ message: "Account created successfully", type: "success" }));
            }
            await fetchChartData();
            setIsModalOpen(false);
            setSelectedAccount(null);
            setPreselectedCategory("");
        } catch (error) {
            console.error("Error saving account:", error);
            dispatch(showToast({
                message: selectedAccount ? "Failed to update account" : "Failed to create account",
                type: "error"
            }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (account) => {
        setOpenMenuId(null);
        dispatch(openDeleteModal({
            title: 'Delete Account',
            message: `Are you sure you want to delete "${account.name}"? This action cannot be undone.`,
            onConfirm: () => handleDeleteConfirm(account.id),
        }));
    };

    const handleDeleteConfirm = async (accountId) => {
        try {
            dispatch(setDeleteLoading(true));
            await accountService.deleteAccount(accountId);
            dispatch(showToast({ message: "Account deleted successfully", type: "success" }));
            await fetchChartData();
            dispatch(closeDeleteModal());
        } catch (error) {
            console.error("Error deleting account:", error);
            dispatch(showToast({ message: "Failed to delete account", type: "error" }));
            dispatch(closeDeleteModal());
        } finally {
            dispatch(setDeleteLoading(false));
        }
    };

    const categoryLabels = {
        assets: "Application of Funds (Assets)",
        liabilities: "Source of Funds (Liabilities)",
        equity: "Equity",
        income: "Income",
        expenses: "Expenses",
    };

    const renderTree = (items, level = 0) => {
        return items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedNodes[item.id] || false;

            return (
                <div key={item.id} className="w-full">
                    <div
                        onClick={() => {
                            if (item.is_folder) {
                                toggleNode(item.id);
                            }
                        }}
                        className={`flex flex-row items-center justify-between py-5 sm:py-7 pr-4 sm:pr-20 border-b border-gray-100 transition-colors gap-4 hover:bg-gray-50/50 ${item.is_folder ? 'cursor-pointer select-none' : ''} ${getPaddingClass(level)}`}
                    >
                        <div className="flex items-center gap-3">
                            {item.is_folder ? (
                                <div className="text-gray-400 flex items-center justify-center w-5 h-5">
                                    {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                                </div>
                            ) : (
                                <div className="w-5 h-5 flex items-center justify-center" />
                            )}
                            {item.is_folder ? (
                                <div className="flex-shrink-0">
                                    <FolderIcon />
                                </div>
                            ) : (
                                <div className="flex-shrink-0">
                                    <CircleIcon />
                                </div>
                            )}
                            <span className={`text-[14px] sm:text-[15px] text-gray-900 ${item.is_folder ? 'font-bold' : 'font-normal'}`}>{item.name}</span>
                        </div>

                        {/* Action icon — shown for ALL tree items (folders & leaves), not the root category headers */}
                        <div className="relative">
                            {/* Action icon button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const menuHeight = 135; // height of the dropdown menu
                                    const yPosition = (spaceBelow < menuHeight && rect.top > spaceBelow)
                                        ? rect.top - menuHeight - 4
                                        : rect.bottom + 4;

                                    setMenuPosition({
                                        x: rect.right,
                                        y: yPosition
                                    });
                                    setMenuItem(item);
                                    setOpenMenuId(openMenuId === item.id ? null : item.id);
                                }}
                                className="p-1.5 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                                title="Actions"
                            >
                                <DotsIcon />
                            </button>
                        </div>
                    </div>
                    {item.is_folder && isExpanded && hasChildren && renderTree(item.children, level + 1)}
                </div>
            );
        });
    };

    const navbarData = {
        heading: "Charts of Accounts",
        subheading: "Manage your account structure and categories",
        from: "setup",
    };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message="Loading Charts of Accounts..." />
                </div>
            ) : (
                <main className="flex-1 flex flex-col py-10">
                    <div className="w-full flex-1 flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mb-8">
                            <button
                                onClick={() => {
                                    setSelectedAccount(null);
                                    setPreselectedCategory("assets");
                                    setIsModalOpen(true);
                                }}
                                className="w-full sm:w-auto px-6 py-3 bg-[#FFCA00] text-white rounded-lg text-[14px] lg:text-[15px] font-bold flex items-center justify-center gap-2 cursor-pointer h-[48px] hover:bg-[#d9ac00]"
                            >
                                Add Account <FiPlus size={20} />
                            </button>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            <div className="overflow-x-auto">
                                <div className="min-w-[750px] lg:min-w-0">
                                    {Object.entries(categoryLabels).map(([key, label]) => (
                                        <React.Fragment key={key}>
                                            <div className="overflow-hidden">
                                                {/* Root Category Header */}
                                                <div 
                                                    onClick={() => toggleCategory(key)}
                                                    className="border border-gray-200 px-4 sm:px-10 py-4 sm:py-7 flex flex-row items-center justify-between gap-4 group hover:bg-gray-50 transition-colors cursor-pointer select-none"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-gray-400 flex items-center">
                                                            {expandedCategories[key] ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                                                        </div>
                                                        <div className="flex-shrink-0">
                                                            <PackageIcon />
                                                        </div>
                                                        <h2 className="text-[14px] sm:text-[15px] font-semibold text-gray-700">{label}</h2>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedAccount(null);
                                                            setPreselectedCategory(key);
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="text-[#FFCA00] hover:text-[#d9ac00] text-[13px] font-bold flex items-center gap-1 cursor-pointer sm:opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                                                    >
                                                        <FiPlus size={16} /> Add to {label.split(' ')[0]}
                                                    </button>
                                                </div>
 
                                                {/* Tree Content */}
                                                {expandedCategories[key] && (
                                                    <div>
                                                        {chartData[key] && chartData[key].length > 0 ? (
                                                            renderTree(chartData[key])
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                            {key !== "expenses" && (
                                                <div className="h-16 bg-white border-b border-gray-200"></div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            )}

            <AccountModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedAccount(null);
                    setPreselectedCategory("");
                }}
                onSave={handleSave}
                isSaving={isSaving}
                editData={selectedAccount}
                defaultCategory={preselectedCategory}
            />

            {/* Action Menu positioned fixed at document level */}
            {openMenuId && menuItem && (
                <div
                    ref={menuRef}
                    className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[10000] py-1 w-36 animate-in fade-in zoom-in duration-150"
                    style={{
                        left: `${menuPosition.x - 144}px`, // w-36 is 144px, align right edge with button
                        top: `${menuPosition.y + 4}px`
                    }}
                >
                    <button
                        onClick={() => {
                            const targetId = menuItem.id;
                            setOpenMenuId(null);
                            setMenuItem(null);
                            router.push(`/setup/chartsOfAccounts/${targetId}`);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-[#FFCA00]/10 hover:text-[#B8940A] transition-colors cursor-pointer"
                    >
                        <EyeIcon />
                        View
                    </button>
                    <button
                        onClick={() => {
                            setSelectedAccount(menuItem);
                            setOpenMenuId(null);
                            setMenuItem(null);
                            setIsModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-[#FFCA00]/10 hover:text-[#B8940A] transition-colors cursor-pointer"
                    >
                        <FiEdit2 size={15} />
                        Edit
                    </button>
                    <button
                        onClick={() => {
                            handleDeleteClick(menuItem);
                            setOpenMenuId(null);
                            setMenuItem(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                        <FiTrash2 size={15} />
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}
