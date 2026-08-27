"use client";

import React, { useState, useEffect, useCallback } from "react";
import { IoClose } from "react-icons/io5";
import { FiTrash2, FiUpload, FiPaperclip, FiExternalLink } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { journalEntryService } from "@/services/journalEntryService";
import { accountService } from "@/services/accountService";
import CustomSelect from "@/components/common/CustomSelect";
import { uploadToBunny } from "@/utils/bunnyUpload";

const JournalEntryForm = ({ isOpen, onClose, onSave, entryData, isSaving, submitLabel, viewOnly }) => {
    const dispatch = useDispatch();
    const [leafAccounts, setLeafAccounts] = useState([]);
    const [isLoadingNumber, setIsLoadingNumber] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [suggestionsByLine, setSuggestionsByLine] = useState({});
    const [loadingSuggestionsByLine, setLoadingSuggestionsByLine] = useState({});
    const queriedByLineRef = React.useRef({});
    const [formData, setFormData] = useState({
        entryNumberSeries: "JEN",
        entryNo: "",
        entryType: "MANUAL",
        date: "",
        accounts: [
            { id: null, account: "", debit: 0, credit: 0 },
            { id: null, account: "", debit: 0, credit: 0 }
        ],
        notes: "",
        attachment: null,
        referenceNo: ""
    });

    const isBlockStartRow = useCallback((idx) => {
        if (idx === 0) return true;
        let cumulativeDebit = 0;
        let cumulativeCredit = 0;
        for (let i = 0; i < idx; i++) {
            cumulativeDebit += parseFloat(formData.accounts[i].debit) || 0;
            cumulativeCredit += parseFloat(formData.accounts[i].credit) || 0;
        }
        return cumulativeDebit === cumulativeCredit;
    }, [formData.accounts]);

    const getBlockStartRowIdx = useCallback((idx) => {
        if (idx === 0) return 0;
        for (let i = idx; i >= 0; i--) {
            if (isBlockStartRow(i)) {
                return i;
            }
        }
        return 0;
    }, [isBlockStartRow]);

    useEffect(() => {
        if (isOpen) {
            fetchLeafAccounts();
            setSuggestionsByLine({});
            setLoadingSuggestionsByLine({});
            queriedByLineRef.current = {};
            if (!entryData) {
                fetchUniqueNumber();
            }
        }
    }, [isOpen]);

    const fetchLeafAccounts = async () => {
        try {
            const accounts = await accountService.fetchLeaves();
            setLeafAccounts(accounts);
        } catch (error) {
            console.error("Error fetching leaf accounts:", error);
        }
    };

    const fetchUniqueNumber = async () => {
        setIsLoadingNumber(true);
        try {
            const data = await journalEntryService.getUniqueEntryNumber();
            if (data?.success && data.entry_no) {
                setFormData(prev => ({
                    ...prev,
                    entryNo: data.entry_no
                }));
            }
        } catch (error) {
            console.error("Error fetching unique number:", error);
        } finally {
            setIsLoadingNumber(false);
        }
    };

    React.useEffect(() => {
        if (entryData) {
            console.log("Mapping Entry Data:", entryData);
            const hasDash = entryData.entry_no?.includes('-');
            setFormData({
                entryNumberSeries: hasDash ? entryData.entry_no.split('-')[0] : "",
                entryNo: hasDash ? entryData.entry_no.split('-')[1] : (entryData.entry_no || ""),
                entryType: entryData.entry_type || "MANUAL",
                date: entryData.date ? new Date(entryData.date).toISOString().split('T')[0] : "",
                accounts: entryData.lines_data?.map(line => ({
                    id: line.id,
                    account: typeof line.account_id === 'object' ? line.account_id?.id : line.account_id,
                    accountName: typeof line.account_id === 'object' ? line.account_id?.name : "",
                    debit: parseFloat(line.debit) || 0,
                    credit: parseFloat(line.credit) || 0
                })) || [
                        { id: null, account: "", debit: 0, credit: 0 },
                        { id: null, account: "", debit: 0, credit: 0 }
                    ],
                notes: entryData.narration || "",
                attachment: entryData.attachmentkey || entryData.attachment || null,
                referenceNo: entryData.reference || ""
            });
        } else {
            setFormData(prev => ({
                ...prev,
                entryNumberSeries: "", // We'll store the full unique number in entryNo
                entryType: "MANUAL",
                date: new Date().toISOString().split('T')[0],
                accounts: [
                    { id: null, account: "", debit: 0, credit: 0 },
                    { id: null, account: "", debit: 0, credit: 0 }
                ],
                notes: "",
                attachment: null,
                referenceNo: ""
            }));
        }
    }, [entryData, isOpen]);

    useEffect(() => {
        if (!isOpen || viewOnly) return;

        const fetchAllSuggestions = async () => {
            const numAccounts = formData.accounts.length;
            for (let idx = 0; idx < numAccounts; idx++) {
                const row = formData.accounts[idx];
                
                if (isBlockStartRow(idx)) {
                    if (row.account) {
                        let side = "debit";
                        if ((parseFloat(row.debit) || 0) > 0) {
                            side = "debit";
                        } else if ((parseFloat(row.credit) || 0) > 0) {
                            side = "credit";
                        } else {
                            side = "debit";
                        }

                        const lastQueried = queriedByLineRef.current[idx];
                        if (!lastQueried || lastQueried.accountId !== row.account || lastQueried.side !== side) {
                            queriedByLineRef.current[idx] = { accountId: row.account, side };
                            
                            setLoadingSuggestionsByLine(prev => ({ ...prev, [idx]: true }));
                            try {
                                const suggestions = await accountService.fetchSuggestions(row.account, side);
                                setSuggestionsByLine(prev => ({ ...prev, [idx]: suggestions }));
                            } catch (error) {
                                console.error(`Error loading suggestions for line ${idx}:`, error);
                            } finally {
                                setLoadingSuggestionsByLine(prev => ({ ...prev, [idx]: false }));
                            }
                        }
                    } else {
                        if (queriedByLineRef.current[idx]) {
                            delete queriedByLineRef.current[idx];
                            setSuggestionsByLine(prev => {
                                const copy = { ...prev };
                                delete copy[idx];
                                return copy;
                            });
                        }
                    }
                }
            }
            
            // Clean up any indices in suggestionsByLine and queriedByLineRef that are now out of bounds or not block starts
            const maxIdx = numAccounts - 1;
            setSuggestionsByLine(prev => {
                const copy = { ...prev };
                let localChanged = false;
                Object.keys(copy).forEach(k => {
                    const keyInt = parseInt(k);
                    if (keyInt > maxIdx || !isBlockStartRow(keyInt)) {
                        delete copy[k];
                        localChanged = true;
                    }
                });
                if (localChanged) {
                    return copy;
                }
                return prev;
            });
            
            Object.keys(queriedByLineRef.current).forEach(k => {
                const keyInt = parseInt(k);
                if (keyInt > maxIdx || !isBlockStartRow(keyInt)) {
                    delete queriedByLineRef.current[k];
                }
            });
        };

        fetchAllSuggestions();
    }, [formData.accounts, isOpen, viewOnly, isBlockStartRow]);

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAccountChange = (index, field, value) => {
        const newAccounts = [...formData.accounts];
        newAccounts[index][field] = value;
        setFormData(prev => ({ ...prev, accounts: newAccounts }));
    };

    const handleAddAccount = () => {
        setFormData(prev => ({
            ...prev,
            accounts: [...prev.accounts, { id: null, account: "", debit: 0, credit: 0 }]
        }));
    };

    const handleRemoveAccount = (index) => {
        if (formData.accounts.length > 2) {
            setFormData(prev => ({
                ...prev,
                accounts: prev.accounts.filter((_, i) => i !== index)
            }));
        }
    };

    const calculateTotals = () => {
        const totalDebit = formData.accounts.reduce((sum, acc) => sum + (parseFloat(acc.debit) || 0), 0);
        const totalCredit = formData.accounts.reduce((sum, acc) => sum + (parseFloat(acc.credit) || 0), 0);
        return { totalDebit, totalCredit };
    };

    const { totalDebit, totalCredit } = calculateTotals();
    const isBalanced = totalDebit === totalCredit && totalDebit > 0;

    const handleSubmit = async () => {
        if (!formData.entryType) {
            dispatch(showToast({ message: "Please select entry type", type: "error" }));
            return;
        }
        if (!formData.date) {
            dispatch(showToast({ message: "Please select date", type: "error" }));
            return;
        }
        
        const hasUnselectedAccount = formData.accounts.some(acc => !acc.account);
        if (hasUnselectedAccount) {
            dispatch(showToast({ message: "Please select an account for all lines", type: "error" }));
            return;
        }

        if (!isBalanced) {
            dispatch(showToast({ message: "Total debit must equal total credit", type: "error" }));
            return;
        }
        
        try {
            setIsUploading(true);
            let attachmentUrl = formData.attachment;
            if (formData.attachment instanceof File) {
                attachmentUrl = await uploadToBunny(formData.attachment, "journal-entries");
            }
            onSave({ ...formData, attachmentkey: attachmentUrl || formData.attachment });
        } catch (error) {
            console.error("Error uploading journal entry attachment:", error);
            dispatch(showToast({ message: "Failed to upload attachment.", type: "error" }));
        } finally {
            setIsUploading(false);
        }
    };

    const isEditMode = !!entryData;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200">
                <div className="p-6 sm:p-10">
                    <div className="mb-6 border-b pb-4 pr-10">
                        <h2 className="text-xl sm:text-[28px] font-bold text-gray-900">
                            {viewOnly ? "View Journal Entry" : (isEditMode ? "Edit Journal Entry" : "Add New Journal Entry")}
                        </h2>
                        <p className="text-gray-500 text-xs sm:text-[14px] mt-1">
                            {viewOnly ? "Review the journal entry details" : "Setup journal entry"}
                        </p>
                    </div>

                    <div className=" pt-6">
                        {/* Details Section */}
                        <div className="mb-6">
                            <h3 className="text-[16px] font-bold text-gray-900 mb-4 uppercase tracking-wider">Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-1">
                                {(isEditMode || viewOnly) && (
                                    viewOnly ? (
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[13px] font-medium text-gray-500">Entry Number</label>
                                            <p className="text-[15px] font-medium text-gray-900 px-1">
                                                {formData.entryNumberSeries && formData.entryNo ? `${formData.entryNumberSeries}-${formData.entryNo}` : formData.entryNo}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[13px] font-medium text-gray-700">Entry Number</label>
                                            <input
                                                type="text"
                                                value={isLoadingNumber ? "Loading..." : (formData.entryNumberSeries && formData.entryNo ? `${formData.entryNumberSeries}-${formData.entryNo}` : formData.entryNo)}
                                                readOnly
                                                className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 focus:outline-none text-[14px] cursor-not-allowed"
                                                placeholder="Fetching unique number..."
                                                disabled={isSaving || isLoadingNumber || isUploading || viewOnly}
                                            />
                                        </div>
                                    )
                                )}
                                {viewOnly ? (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[13px] font-medium text-gray-500">Entry Type</label>
                                        <p className="text-[15px] font-medium text-gray-900 px-1">
                                            {formData.entryType?.replace(/_/g, ' ')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[13px] font-medium text-gray-700">Entry Type</label>
                                        <input
                                            type="text"
                                            value={formData.entryType?.replace(/_/g, ' ') || "MANUAL"}
                                            readOnly
                                            className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 focus:outline-none text-[14px] cursor-not-allowed"
                                        />
                                    </div>
                                )}
                                {viewOnly ? (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[13px] font-medium text-gray-500">Date</label>
                                        <p className="text-[15px] font-medium text-gray-900 px-1">
                                            {formData.date ? new Date(formData.date).toLocaleDateString('en-GB') : '-'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[13px] font-medium text-gray-700">Date</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => handleChange("date", e.target.value)}
                                            className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-500"
                                            disabled={isSaving || isUploading || viewOnly}
                                        />
                                    </div>
                                )}
                                {viewOnly && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[13px] font-medium text-gray-500">Reference No</label>
                                        <p className="text-[15px] font-medium text-gray-900 px-1">
                                            {formData.referenceNo || '-'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Accounts Section */}
                        <div className="mb-6">
                            <h3 className="text-[16px] font-bold text-gray-900 mb-4 uppercase tracking-wider">Accounts</h3>
                            <div className="border border-gray-300 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <div className="min-w-[600px]">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-300">
                                                <tr>
                                                    <th className="px-3 py-3 text-left text-[13px] font-medium text-gray-600 w-12">#</th>
                                                    <th className="px-3 py-3 text-left text-[13px] font-medium text-gray-600">Account</th>
                                                    <th className="px-3 py-3 text-left text-[13px] font-medium text-gray-600 w-32">Debit</th>
                                                    <th className="px-3 py-3 text-left text-[13px] font-medium text-gray-600 w-32">Credit</th>
                                                    <th className="px-3 py-3 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.accounts.map((account, idx) => (
                                                    <tr key={idx} className="border-b border-gray-200">
                                                        <td className="px-3 py-3 text-gray-700">{idx + 1}</td>
                                                        <td className="px-3 py-3">
                                                            {viewOnly ? (
                                                                <span className="text-[14px] font-medium text-gray-900 px-1">
                                                                    {leafAccounts.find(acc => String(acc.id) === String(account.account))?.name || account.accountName || "Select Account"}
                                                                </span>
                                                            ) : (
                                                                <CustomSelect
                                                                    value={account.account}
                                                                    onChange={(val) => handleAccountChange(idx, "account", val)}
                                                                    options={(() => {
                                                                        if (isBlockStartRow(idx)) {
                                                                            return leafAccounts.map(acc => ({ value: acc.id, label: acc.name }));
                                                                        }
                                                                        const blockStartIdx = getBlockStartRowIdx(idx);
                                                                        let list = suggestionsByLine[blockStartIdx];
                                                                        if (!Array.isArray(list)) {
                                                                            list = leafAccounts;
                                                                        }
                                                                        if (!Array.isArray(list)) {
                                                                            list = [];
                                                                        }
                                                                        if (account.account) {
                                                                            const hasSelected = list.some(acc => String(acc.id) === String(account.account));
                                                                            if (!hasSelected) {
                                                                                const selectedAcc = leafAccounts.find(acc => String(acc.id) === String(account.account));
                                                                                if (selectedAcc) {
                                                                                    list = [selectedAcc, ...list];
                                                                                }
                                                                            }
                                                                        }
                                                                        return list.map(acc => ({ value: acc.id, label: acc.name }));
                                                                    })()}
                                                                    placeholder="Select"
                                                                    isDisabled={isSaving || isUploading || viewOnly}
                                                                    isLoading={!account.account && !isBlockStartRow(idx) && loadingSuggestionsByLine[getBlockStartRowIdx(idx)]}
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            {viewOnly ? (
                                                                <span className="text-[14px] font-medium text-gray-900 block text-left">
                                                                    ₹ {parseFloat(account.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </span>
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    value={account.debit === 0 || account.debit === "0" || account.debit === "" ? "" : account.debit}
                                                                    onChange={(e) => handleAccountChange(idx, "debit", e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] text-[13px] text-right disabled:bg-gray-50 disabled:text-gray-500"
                                                                    placeholder="₹ 0.00"
                                                                    step="0.01"
                                                                    disabled={isSaving || isUploading || viewOnly}
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            {viewOnly ? (
                                                                <span className="text-[14px] font-medium text-gray-900 block text-left">
                                                                    ₹ {parseFloat(account.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </span>
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    value={account.credit === 0 || account.credit === "0" || account.credit === "" ? "" : account.credit}
                                                                    onChange={(e) => handleAccountChange(idx, "credit", e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] text-[13px] text-right disabled:bg-gray-50 disabled:text-gray-500"
                                                                    placeholder="₹ 0.00"
                                                                    step="0.01"
                                                                    disabled={isSaving || isUploading || viewOnly}
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-3 text-center">
                                                            {!viewOnly && formData.accounts.length > 2 && (
                                                                <button
                                                                    onClick={() => handleRemoveAccount(idx)}
                                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                                    disabled={isSaving || isUploading}
                                                                >
                                                                    <FiTrash2 size={16} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                {!viewOnly && (
                                    <div className="px-4 py-3 bg-white border-t border-gray-200">
                                        <button
                                            onClick={handleAddAccount}
                                            className="text-[13px] text-gray-600 hover:text-[#FFCA00] font-medium transition-colors"
                                            disabled={isSaving || isUploading}
                                        >
                                            + Add New Entry
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Totals */}
                            <div className="mt-4 flex flex-col sm:flex-row justify-end items-end sm:items-center gap-4 sm:gap-8 text-[14px]">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600 font-medium">Total Debit:</span>
                                    <span className={`font-semibold ${!isBalanced && totalDebit > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                        ₹ {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600 font-medium">Total Credit:</span>
                                    <span className={`font-semibold ${!isBalanced && totalCredit > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                        ₹ {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                            {!isBalanced && (totalDebit > 0 || totalCredit > 0) && (
                                <p className="text-red-500 text-[12px] text-right mt-2">
                                    ⚠ Total debit and credit must be equal
                                </p>
                            )}
                        </div>

                        {/* References Section */}
                        {!viewOnly && (
                            <div className="mt-8">
                                <h3 className="text-[16px] font-bold text-gray-900 mb-4 uppercase tracking-wider">References</h3>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[13px] font-medium text-gray-700">Notes</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => handleChange("notes", e.target.value)}
                                            className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400 resize-none h-24 disabled:bg-gray-50 disabled:text-gray-500"
                                            placeholder="Add invoice terms or notes"
                                            disabled={isSaving || isUploading}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[13px] font-medium text-gray-700">Attachment</label>
                                            <input
                                                type="file"
                                                onChange={(e) => handleChange("attachment", e.target.files[0])}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-[14px] placeholder-gray-400 h-[46px] disabled:bg-gray-50 disabled:text-gray-500"
                                                disabled={isSaving || isUploading}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[13px] font-medium text-gray-700">Reference No</label>
                                            <input
                                                type="text"
                                                value={formData.referenceNo}
                                                onChange={(e) => handleChange("referenceNo", e.target.value)}
                                                className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-500"
                                                placeholder="Reference Number"
                                                disabled={isSaving || isUploading}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* References Section for View Only */}
                        {viewOnly && (
                            <div className="mt-8">
                                <h3 className="text-[16px] font-bold text-gray-900 mb-4 uppercase tracking-wider">References</h3>
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[13px] font-medium text-gray-500">Notes / Narration</label>
                                        <p className="text-[14px] text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200 min-h-[80px]">
                                            {formData.notes || 'No notes available'}
                                        </p>
                                    </div>
                                    {formData.attachment && (
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[13px] font-medium text-gray-500">Attachment</label>
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={formData.attachment}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#FFCA00] bg-[#FFCA00]/10 rounded-lg hover:bg-[#FFCA00]/20 transition-colors border border-[#FFCA00]/20"
                                                >
                                                    <FiPaperclip size={14} />
                                                    View Attachment
                                                    <FiExternalLink size={14} className="ml-1" />
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-row items-center justify-end gap-2.5 sm:gap-4 mt-10 pt-6 border-t px-1 sm:px-0">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-4 sm:px-10 py-2 sm:py-2.5 text-xs sm:text-[15px] font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                            disabled={isSaving || isUploading}
                        >
                            Close
                        </button>
                        {!viewOnly && (
                            <button
                                onClick={handleSubmit}
                                className="flex-1 sm:flex-none px-4 sm:px-10 py-2 sm:py-2.5 text-xs sm:text-[15px] font-semibold text-white bg-[#FFCA00] rounded-lg hover:bg-[#d9ac00] transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                                disabled={isSaving || isUploading}
                            >
                                {isSaving ? "Saving..." : (isEditMode ? "Save Changes" : "Create Entry")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JournalEntryForm;
