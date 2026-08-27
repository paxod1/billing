"use client";

import React, { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/commonComp/Navbar";
import Pagination from "@/components/commonComp/Pagination";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import { IoSearchOutline } from "react-icons/io5";
import { FiFilter, FiDownload, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiX, FiLoader, FiCheck } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import JournalEntryForm from "@/components/common/JournalEntryForm";
import ActionMenu from "@/components/commonComp/ActionMenu";
import CustomSelect from "@/components/common/CustomSelect";
import { journalEntryService } from "@/services/journalEntryService";
import { openDeleteModal, closeDeleteModal, setDeleteLoading } from "@/lib/features/ui/uiSlice";
import { handleExport } from "@/utils/exportHelper";
import { useRef } from "react";

export default function JournalEntryPage() {
    const dispatch = useDispatch();
    const [entries, setEntries] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const actionButtonsRef = useRef({});
    const [openMenuId, setOpenMenuId] = useState(null);
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [filters, setFilters] = useState({
        entry_type: "ALL",
        date: "",
        search: ""
    });
    const [totalItems, setTotalItems] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const pageSize = 10;


    const isFirstLoad = useRef(true);

    useEffect(() => {
        if (isFirstLoad.current) {
            fetchEntries(false);
            isFirstLoad.current = false;
        } else {
            fetchEntries(true);
        }
    }, [currentPage, filters]);

    // Instant search - call API on every keystroke via filter update
    useEffect(() => {
        if (searchInput !== filters.search) {
            setFilters(prev => ({ ...prev, search: searchInput }));
            setCurrentPage(1);
        }
    }, [searchInput]);

    const fetchEntries = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);
            if (isSilent) setIsFilterLoading(true);
            const response = await journalEntryService.getJournalEntries({
                ...filters,
                limit: pageSize,
                skip: (currentPage - 1) * pageSize
            });

            setEntries(response.data || []);
            setTotalItems(response.totalCount || 0);
        } catch (error) {
            console.error("Error fetching journal entries:", error);
            dispatch(showToast({ message: "Failed to load journal entries", type: "error" }));
        } finally {
            if (!isSilent) setIsLoading(false);
            setIsFilterLoading(false);
        }
    };

    const handleClearFilters = () => {
        setFilters({
            entry_type: "ALL",
            date: "",
            search: ""
        });
        setSearchInput("");
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedData = entries; // Already paginated from server

    const [isSubmitMode, setIsSubmitMode] = useState(false);

    const handleSave = async (formData) => {
        setIsSaving(true);
        try {
            const entryNo = formData.entryNumberSeries && formData.entryNo
                ? `${formData.entryNumberSeries}-${formData.entryNo}`
                : formData.entryNo;

            if (selectedEntry) {
                const payload = {
                    id: Number(selectedEntry.id),
                    date: formData.date || new Date().toISOString().split('T')[0],
                    reference: formData.referenceNo || entryNo,
                    narration: formData.notes || "",
                    entry_type: "MANUAL",
                    lines: formData.accounts
                        .filter(acc => acc.account)
                        .map(acc => ({
                            account_id: Number(acc.account),
                            debit: parseFloat(acc.debit) || 0,
                            credit: parseFloat(acc.credit) || 0
                        }))
                };
                await journalEntryService.updateJournalEntryCustom(payload);
            } else {
                const payload = {
                    action: "create",
                    date: formData.date || new Date().toISOString().split('T')[0],
                    reference: formData.referenceNo || entryNo,
                    narration: formData.notes || "",
                    entry_type: "MANUAL",
                    lines: formData.accounts
                        .filter(acc => acc.account)
                        .map(acc => ({
                            account_id: Number(acc.account),
                            debit: parseFloat(acc.debit) || 0,
                            credit: parseFloat(acc.credit) || 0
                        }))
                };
                await journalEntryService.createJournalEntryCustom(payload);
            }

            dispatch(showToast({
                message: selectedEntry ? "Journal entry updated successfully" : "Journal entry created successfully",
                type: "success"
            }));

            await fetchEntries(true);
            setIsModalOpen(false);
            setSelectedEntry(null);
            setIsSubmitMode(false);
        } catch (error) {
            console.error("Error saving entry:", error);
            dispatch(showToast({ message: error.response?.data?.message || "Failed to save journal entry", type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handlePost = async (entry) => {
        setOpenMenuId(null);
        // Immediately change status to "POSTING" in local UI state silently
        setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "POSTING" } : e));
        
        try {
            await journalEntryService.postJournalEntry(entry.id);
            dispatch(showToast({ message: "Journal entry posted successfully", type: "success" }));
        } catch (error) {
            console.error("Error posting journal entry:", error);
            // Revert back to original status if failed
            setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: entry.status } : e));
            dispatch(showToast({ message: error.response?.data?.message || "Failed to post journal entry", type: "error" }));
        } finally {
            // After 1 second, silently fetch new data to update the table status to POSTED
            setTimeout(async () => {
                try {
                    await fetchEntries(true);
                } catch (fetchErr) {
                    console.error("Error fetching entries after post:", fetchErr);
                }
            }, 1000);
        }
    };

    const handleEdit = (entry) => {
        setSelectedEntry(entry);
        setIsSubmitMode(false);
        setIsViewMode(false);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleView = (entry) => {
        setSelectedEntry(entry);
        setIsViewMode(true);
        setIsSubmitMode(false);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleSubmitClick = (entry) => {
        handlePost(entry);
    };

    const handleDelete = (entry) => {
        setOpenMenuId(null);
        dispatch(openDeleteModal({
            title: "Delete Journal Entry",
            message: `Are you sure you want to delete journal entry ${entry.entry_no}?`,
            onConfirm: () => handleDeleteConfirm(entry.id)
        }));
    };

    const handleDeleteConfirm = async (id) => {
        dispatch(setDeleteLoading(true));
        try {
            await journalEntryService.deleteJournalEntry(id);
            dispatch(showToast({ message: "Journal entry deleted successfully", type: "success" }));
            await fetchEntries(true);
            dispatch(closeDeleteModal());
        } catch (error) {
            console.error("Error deleting entry:", error);
            dispatch(showToast({ message: "Failed to delete journal entry", type: "error" }));
        } finally {
            dispatch(setDeleteLoading(false));
        }
    };

    const handleActionButtonClick = (e, id) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        const scrollX = window.scrollX || window.pageXOffset;

        setMenuPosition({
            x: rect.left + scrollX + rect.width / 2,
            y: rect.bottom + scrollY
        });

        setOpenMenuId(openMenuId === id ? null : id);
    };

    const entryTypeLabels = {
        "Journal_Entry": "Journal Entry",
        "Bank_Entry": "Bank Entry",
        "Cash_Entry": "Cash Entry",
        "Credit_Card_Entry": "Credit Card Entry",
        "Debit_Note": "Debit Note",
        "Credit_Note": "Credit Note",
        "Contra_Entry": "Contra Entry",
        "Excise_Entry": "Excise Entry",
        "Write_Off_Entry": "Write Off Entry",
        "Opening_Entry": "Opening Entry",
        "Depreciation_Entry": "Depreciation Entry"
    };

    const getStatusColor = (status) => {
        const s = status?.toUpperCase()?.replace(/_/g, " ");
        switch (s) {
            case "POSTED":
            case "SUBMITTED":
            case "PAID":
            case "COMPLETED":
                return "bg-green-50 text-green-600 border-green-100";
            case "POSTING":
                return "bg-yellow-50 text-yellow-600 border-yellow-100 animate-pulse";
            case "SAVED":
            case "DRAFT":
                return "bg-blue-50 text-blue-600 border-blue-100";
            case "CANCELLED":
            case "REJECTED":
                return "bg-red-50 text-red-600 border-red-100";
            default:
                return "bg-gray-50 text-gray-500 border-gray-100";
        }
    };

    const getEntryTypeColor = (type) => {
        const t = type?.toLowerCase();
        if (t?.includes("cash")) return "bg-orange-50 text-orange-600 border-orange-200";
        if (t?.includes("bank")) return "bg-purple-50 text-purple-600 border-purple-200";
        return "bg-indigo-50 text-indigo-600 border-indigo-200";
    };

    const navbarData = {
        heading: "Journal Entry",
        subheading: "Create and manage manual accounting entries",
        from: "common",
    };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message="Loading Journal Entries..." />
                </div>
            ) : (
                <>
                    <main className="flex-1 flex flex-col py-8">
                        {isLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <Loader message="Loading Journal Entries..." />
                            </div>
                        ) : (
                            <div className="w-full flex-1 flex flex-col">
                            {/* Header Section: Search & Actions OR Filter inputs */}
                            <div className="mb-6">
                                {!isFilterVisible ? (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        {/* Search Bar */}
                                        <div className="w-full sm:w-96">
                                            <div className="relative">
                                                <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    value={searchInput}
                                                    onChange={(e) => setSearchInput(e.target.value)}
                                                    placeholder="Search by entry no or narration"
                                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] hover:border-[#FFCA00] placeholder-gray-400 text-[14px] bg-white transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                            <button
                                                onClick={() => setIsFilterVisible(true)}
                                                className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-200 text-black rounded-lg text-[14px] font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <FiFilter size={16} /> Filter {filters.entry_type !== "ALL" && `(${filters.entry_type})`}
                                            </button>
                                            <button
                                                onClick={() => handleExport({
                                                    endpoint: "custom-api/admin/journal/export",
                                                    dispatch,
                                                    setIsExporting,
                                                    defaultFileName: "journal_entries_export.xlsx"
                                                })}
                                                disabled={isExporting}
                                                className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-medium hover:bg-[#d9ac00]/5 flex items-center justify-center gap-2 min-w-[120px] cursor-pointer disabled:opacity-50"
                                            >
                                                {isExporting ? <FiLoader className="animate-spin" size={16} /> : <FiDownload size={16} />}
                                                {isExporting ? "Exporting..." : "Export"}
                                            </button>
                                            <button
                                                onClick={() => { setSelectedEntry(null); setIsModalOpen(true); }}
                                                className="flex-1 sm:flex-none px-4 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-bold flex items-center justify-center gap-2 min-w-[170px] cursor-pointer hover:bg-[#d9ac00]"
                                            >
                                                Add New Entry <FiPlus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-end gap-3 px-1">
                                        <div className="flex-1 min-w-[180px]">
                                            <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Entry Type</label>
                                            <CustomSelect
                                                value={filters.entry_type}
                                                onChange={(val) => setFilters(prev => ({ ...prev, entry_type: val || "ALL" }))}
                                                options={[
                                                    { value: "ALL", label: "All Types" },
                                                    { value: "SALES_PAYMENT", label: "Sales Payment" },
                                                    { value: "PURCHASE_INVOICE", label: "Purchase Invoice" },
                                                    { value: "PURCHASE_RETURN", label: "Purchase Return" },
                                                    { value: "SALES_INVOICE", label: "Sales Invoice" },
                                                    { value: "PURCH_RETURN_PAYMENT", label: "Purchase Return Payment" },
                                                    { value: "PURCHASE_PAYMENT", label: "Purchase Payment" },
                                                    { value: "JOURNAL_ENTRY", label: "Journal Entry" },
                                                ]}
                                                placeholder="Select Type"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-[180px]">
                                            <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Date</label>
                                            <input
                                                type="date"
                                                value={filters.date}
                                                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                                                className="w-full px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2 pb-0.5 ml-auto">
                                            <button
                                                onClick={handleClearFilters}
                                                className="text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors p-2 bg-white border border-gray-200 rounded-lg"
                                                title="Reset Filters"
                                            >
                                                <FiX size={18} />
                                            </button>
                                            <button
                                                onClick={() => setIsFilterVisible(false)}
                                                className="px-6 py-2 cursor-pointer bg-gray-50 border border-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                                            >
                                                Back
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                                {isFilterLoading && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg">
                                        <div className="w-8 h-8 border-3 border-[#FFCA00] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                                {paginatedData.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <div className="min-w-[1000px] lg:min-w-0">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Entry No</th>
                                                        <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Status</th>
                                                        <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Date</th>
                                                        <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Entry Type</th>
                                                        <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">Debit</th>
                                                        <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">Credit</th>
                                                        <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {paginatedData.map((entry, idx) => {
                                                        const totalDebit = entry.lines_data?.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0) || 0;
                                                        const totalCredit = entry.lines_data?.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0) || 0;
                                                        const formatCurrency = (num) => parseFloat(num || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                                                        return (
                                                            <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                                    {entry.entry_no}
                                                                </td>
                                                                <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                                    {entry.status ? (
                                                                        <span
                                                                            onClick={(e) => {
                                                                                const s = entry.status?.toLowerCase();
                                                                                if (s === "saved" || s === "draft") {
                                                                                    e.stopPropagation();
                                                                                    handlePost(entry);
                                                                                }
                                                                            }}
                                                                            className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-bold border capitalize ${getStatusColor(entry.status)} ${
                                                                                (() => {
                                                                                    const s = entry.status?.toLowerCase();
                                                                                    return s === "saved" || s === "draft"
                                                                                        ? "cursor-pointer hover:opacity-80 transition-opacity"
                                                                                        : "";
                                                                                })()
                                                                            }`}
                                                                        >
                                                                            {entry.status?.toLowerCase() === "posting" 
                                                                                ? "posting..." 
                                                                                : entry.status?.replace(/_/g, " ")}
                                                                        </span>
                                                                    ) : (
                                                                        "-"
                                                                    )}
                                                                </td>
                                                                <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                                    {entry.date ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "-"}
                                                                </td>
                                                                <td className="px-4 lg:px-6 py-5 whitespace-nowrap">
                                                                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-bold border tracking-wide ${getEntryTypeColor(entry.entry_type)}`}>
                                                                        {entryTypeLabels[entry.entry_type] || entry.entry_type?.replace(/_/g, ' ')}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-right text-gray-900 font-semibold whitespace-nowrap">
                                                                    ₹ {formatCurrency(totalDebit)}
                                                                </td>
                                                                <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-right text-gray-900 font-semibold whitespace-nowrap">
                                                                    ₹ {formatCurrency(totalCredit)}
                                                                </td>
                                                                <td className="px-4 lg:px-6 py-5 text-center whitespace-nowrap">
                                                                <button
                                                                    ref={el => actionButtonsRef.current[entry.id] = el}
                                                                    onClick={(e) => handleActionButtonClick(e, entry.id)}
                                                                    className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === entry.id ? "bg-white border-[#FFCA00] text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                                                                >
                                                                    <FiMoreVertical size={18} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <EmptyState
                                        title="No Journal Entries Found"
                                        message={searchInput || filters.date ? `No entries match your search filters.` : "Start by adding your first journal entry using the button above."}
                                        actionLabel="Add New Entry"
                                        onActionClick={() => { setSelectedEntry(null); setIsModalOpen(true); }}
                                    />
                                )}
                            </div>

                            {/* Pagination */}
                            {totalItems > 0 && (
                                <div className="py-4">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={totalItems}
                                        pageSize={pageSize}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </main>

                    {/* Action Menu positioned absolutely at document level */}
                    {openMenuId && (
                        <div
                            className="fixed z-50"
                            style={{
                                left: `${menuPosition.x}px`,
                                top: `${menuPosition.y}px`,
                                transform: 'translateX(-50%)'
                            }}
                        >
                            <ActionMenu
                                isOpen={true}
                                onClose={() => setOpenMenuId(null)}
                                onView={() => handleView(entries.find(e => e.id === openMenuId))}
                                onEdit={(() => {
                                    const entry = entries.find(e => e.id === openMenuId);
                                    const isDraft = entry?.status?.toLowerCase() === "draft" || entry?.status?.toLowerCase() === "saved";
                                    return isDraft ? () => handleEdit(entry) : null;
                                })()}
                                onDelete={(() => {
                                    const entry = entries.find(e => e.id === openMenuId);
                                    const isDraft = entry?.status?.toLowerCase() === "draft" || entry?.status?.toLowerCase() === "saved";
                                    return isDraft ? () => handleDelete(entry) : null;
                                })()}
                                actions={(() => {
                                    const entry = entries.find(e => e.id === openMenuId);
                                    const isDraft = entry?.status?.toLowerCase() === "draft" || entry?.status?.toLowerCase() === "saved";
                                    return isDraft ? [
                                        {
                                            label: "Post",
                                            icon: <FiCheck size={16} />,
                                            onClick: () => handlePost(entry)
                                        }
                                    ] : [];
                                })()}
                            />
                        </div>
                    )}

                    <JournalEntryForm
                        isOpen={isModalOpen}
                        onClose={() => { setIsModalOpen(false); setSelectedEntry(null); setIsSubmitMode(false); setIsViewMode(false); }}
                        onSave={handleSave}
                        entryData={selectedEntry}
                        isSaving={isSaving}
                        submitLabel={isSubmitMode ? "Submit Entry" : null}
                        viewOnly={isViewMode}
                    />
                </>
            )}
        </div>
    );
}
