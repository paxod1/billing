"use client";

import React, { useState, useEffect } from "react";
import { IoClose } from "react-icons/io5";
import CustomSelect from "@/components/common/CustomSelect";
import { accountService } from "@/services/accountService";

const AccountModal = ({ isOpen, onClose, onSave, isSaving, editData = null, defaultCategory = "" }) => {
    const [name, setName] = useState("");
    const [category, setCategory] = useState("assets");
    const [isFolder, setIsFolder] = useState(false);
    const [parentId, setParentId] = useState("");
    const [folders, setFolders] = useState([]);
    const [isLoadingFolders, setIsLoadingFolders] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editData) {
                setName(editData.name || "");
                setCategory(editData.category || "assets");
                setIsFolder(!!editData.is_folder);
                setParentId(editData.parent_id || "");
            } else {
                setName("");
                setCategory(defaultCategory || "assets");
                setIsFolder(false);
                setParentId("");
            }
        }
    }, [isOpen, editData, defaultCategory]);

    useEffect(() => {
        const fetchFolders = async () => {
            if (!isOpen || !category) return;
            try {
                setIsLoadingFolders(true);
                const data = await accountService.queryAccounts({
                    find: {
                        category,
                        is_folder: true
                    }
                });
                const folderList = Array.isArray(data) ? data : [];
                // Filter out the current account itself if in Edit mode, to prevent selecting itself as parent
                const filtered = editData 
                    ? folderList.filter(folder => folder.id !== editData.id)
                    : folderList;
                setFolders(filtered);
            } catch (error) {
                console.error("Error fetching folders:", error);
                setFolders([]);
            } finally {
                setIsLoadingFolders(false);
            }
        };

        fetchFolders();
    }, [isOpen, category, editData]);

    const handleCategoryChange = (val) => {
        setCategory(val);
        setParentId("");
    };

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        
        if (editData) {
            // Edit mode: only name is updated via manage API
            onSave({ name: name.trim() });
        } else {
            // Create mode
            const payload = {
                name: name.trim(),
                category,
                is_folder: isFolder
            };
            if (parentId) {
                payload.parent_id = Number(parentId);
            }
            onSave(payload);
        }
    };

    const isEditMode = !!editData;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-gray-500" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 md:p-8 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute cursor-pointer top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isSaving}
                >
                    <IoClose size={24} />
                </button>

                <h2 className="text-[20px] md:text-[24px] font-bold text-gray-900 mb-6">
                    {isEditMode ? "Edit Account" : "New Account"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name Input */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-gray-700">Account Name</label>
                        <input
                            type="text"
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-[14px] text-gray-900"
                            placeholder="Enter account name (e.g. Office Rent)"
                            disabled={isSaving}
                            required
                        />
                    </div>

                    {/* Category Select */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-gray-700">Category</label>
                        <CustomSelect
                            options={[
                                { value: "assets", label: "Assets" },
                                { value: "liabilities", label: "Liabilities" },
                                { value: "equity", label: "Equity" },
                                { value: "income", label: "Income" },
                                { value: "expenses", label: "Expenses" }
                            ]}
                            value={category}
                            onChange={handleCategoryChange}
                            isDisabled={isSaving || isEditMode}
                        />
                    </div>

                    {/* Under Account Select */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-gray-700">Under Account (Optional)</label>
                        <CustomSelect
                            options={[
                                { value: "", label: "None (Root Level)" },
                                ...(Array.isArray(folders) ? folders : []).map(folder => ({
                                    value: folder.id,
                                    label: folder.name
                                }))
                            ]}
                            value={parentId}
                            onChange={(val) => setParentId(val)}
                            placeholder={isLoadingFolders ? "Loading folder accounts..." : "Select under account..."}
                            isDisabled={isSaving || isEditMode || isLoadingFolders}
                        />
                    </div>

                    {/* Account Type Toggle */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-gray-700">Account Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setIsFolder(false)}
                                className={`py-3 px-4 rounded-lg border text-[14px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    !isFolder
                                        ? "border-[#FFCA00] bg-[#FFCA00]/5 text-[#B8940A]"
                                        : "border-gray-200 hover:bg-gray-50 text-gray-600"
                                } disabled:opacity-60 disabled:cursor-not-allowed`}
                                disabled={isSaving || isEditMode}
                            >
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="currentColor">
                                    <path d="M1 5C1 6.06087 1.42143 7.07828 2.17157 7.82843C2.92172 8.57857 3.93913 9 5 9C6.06087 9 7.07828 8.57857 7.82843 7.82843C8.57857 7.07828 9 6.06087 9 5C9 3.93913 8.57857 2.92172 7.82843 2.17157C7.07828 1.42143 6.06087 1 5 1C3.93913 1 2.92172 1.42143 2.17157 2.17157C1.42143 2.92172 1 3.93913 1 5Z" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                Regular Account
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFolder(true)}
                                className={`py-3 px-4 rounded-lg border text-[14px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    isFolder
                                        ? "border-[#FFCA00] bg-[#FFCA00]/5 text-[#B8940A]"
                                        : "border-gray-200 hover:bg-gray-50 text-gray-600"
                                } disabled:opacity-60 disabled:cursor-not-allowed`}
                                disabled={isSaving || isEditMode}
                            >
                                <svg width="14" height="11" viewBox="0 0 16 13" fill="currentColor">
                                    <path d="M1.6 13C1.16 13 0.783467 12.841 0.4704 12.5231C0.157333 12.2051 0.000533333 11.8224 0 11.375V1.625C0 1.17812 0.1568 0.795708 0.4704 0.47775C0.784 0.159791 1.16053 0.000541667 1.6 0H6.4L8 1.625H14.4C14.84 1.625 15.2168 1.78425 15.5304 2.10275C15.844 2.42125 16.0005 2.80367 16 3.25V11.375C16 11.8219 15.8435 12.2046 15.5304 12.5231C15.2173 12.8416 14.8405 13.0005 14.4 13H1.6Z" />
                                </svg>
                                Folder / Group
                            </button>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-[14px] font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-bold hover:bg-[#d9ac00] disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSaving || !name.trim()}
                        >
                            {isSaving ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Account")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AccountModal;
