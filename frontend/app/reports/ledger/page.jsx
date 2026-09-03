"use client";

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { reportService } from "@/services/reportService";
import { handleExport } from "@/utils/exportHelper";
import Navbar from "@/components/commonComp/Navbar";
import Pagination from "@/components/commonComp/Pagination";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import CustomSelect from "@/components/common/CustomSelect";
import { FiFilter, FiDownload, FiX, FiLoader } from "react-icons/fi";

export default function GeneralLedgerPage() {
    const dispatch = useDispatch();
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const pageSize = 10;

    const [filters, setFilters] = useState({
        reference: "",
        account: "",
        entry_type: "",
        from_date: "",
        to_date: "",
        date: ""
    });

    const [accountOptions, setAccountOptions] = useState([]);

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const accountsData = await reportService.getLedgerAccounts();
                const formatted = [];
                (Array.isArray(accountsData) ? accountsData : []).forEach(item => {
                    const id = item.account_id || item.id;
                    const name = item.name || item.account_name;
                    if (id && name) {
                        formatted.push({ value: String(id), label: name });
                    }
                });
                
                // Remove duplicates by value
                const unique = Array.from(new Map(formatted.map(item => [item.value, item])).values());
                setAccountOptions(unique);
            } catch (err) {
                console.error("Failed to load ledger accounts:", err);
            }
        };
        fetchAccounts();
    }, []);

    const fetchLedgerData = async () => {
        setIsLoading(true);
        try {
            const params = {
                limit: pageSize,
                skip: (currentPage - 1) * pageSize,
                ...filters
            };
            const response = await reportService.getGeneralLedger(params);
            setLedgerEntries(response.data);
            setTotalCount(response.totalCount || response.data.length);
        } catch (error) {
            console.error("Failed to fetch ledger data:", error);
        } finally {
            setIsLoading(false);
            setIsFirstLoad(false);
        }
    };

    useEffect(() => {
        fetchLedgerData();
    }, [currentPage, filters]);

    const handleClearFilters = () => {
        setFilters({
            reference: "",
            account: "",
            entry_type: "",
            from_date: "",
            to_date: "",
            date: ""
        });
        setCurrentPage(1);
    };

    const handleExportLedger = () => {
        handleExport({
            endpoint: "api/reports/ledger",
            payload: {
                ...filters,
                export: true,
                export_filename: `general_ledger_${new Date().toISOString().split('T')[0]}.xlsx`
            },
            dispatch,
            setIsExporting,
            defaultFileName: `general_ledger_${new Date().toISOString().split('T')[0]}.xlsx`
        });
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const navbarData = {
        heading: "General Ledger",
        subheading: "View all financial transactions across every account",
        from: "reports",
    };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />
            {isLoading && isFirstLoad ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message="Loading General Ledger..." />
                </div>
            ) : (
                <main className="flex-1 flex flex-col py-8">
                    <div className="w-full flex-1 flex flex-col">
                        {/* Action Buttons - Hidden when filter is active */}
                        {!isFilterVisible && (
                            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-3 mb-6 animate-in fade-in duration-300">
                                <button 
                                    onClick={() => setIsFilterVisible(true)}
                                    className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-200 text-black rounded-lg text-[14px] font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 min-w-[120px] shadow-sm"
                                >
                                    <FiFilter size={16} /> Filter
                                </button>
                                <button 
                                    onClick={handleExportLedger}
                                    disabled={isExporting}
                                    className="w-full sm:w-auto px-4 py-2.5 bg-white border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-50 shadow-sm"
                                >
                                    {isExporting ? <FiLoader className="animate-spin" size={16} /> : <FiDownload size={16} />} 
                                    {isExporting ? "Exporting..." : "Export"}
                                </button>
                            </div>
                        )}

                        {/* Filter Section - Styled to match shared image */}
                        {isFilterVisible && (
                            <div className="mb-8 animate-in slide-in-from-top-2 fade-in duration-300">
                                <div className="flex flex-col lg:flex-row items-end gap-4 lg:gap-6">
                                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[13px] text-gray-500 font-medium ml-1">Account</label>
                                            <CustomSelect
                                                value={filters.account}
                                                onChange={(val) => setFilters(prev => ({ ...prev, account: val ?? "" }))}
                                                options={accountOptions}
                                                placeholder="All Accounts"
                                                isClearable
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[13px] text-gray-500 font-medium ml-1">Entry Type</label>
                                            <CustomSelect
                                                value={filters.entry_type}
                                                onChange={(val) => setFilters(prev => ({ ...prev, entry_type: val }))}
                                                options={[
                                                    { value: "SALES_INVOICE", label: "Sales Invoice" },
                                                    { value: "PURCHASE_INVOICE", label: "Purchase Invoice" },
                                                    { value: "PAYMENT", label: "Payment" },
                                                    { value: "PURCHASE_PAYMENT", label: "Purchase Payment" },
                                                    { value: "JOURNAL_ENTRY", label: "Journal Entry" },
                                                ]}
                                                placeholder="All Entry Types"
                                                isClearable
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Action buttons (X and Back) */}
                                    <div className="flex items-center gap-3 h-[42px] mb-0.5">
                                        <button
                                            onClick={handleClearFilters}
                                            title="Clear Filters"
                                            className="p-2.5 text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg hover:bg-red-50 transition-all shadow-sm"
                                        >
                                            <FiX size={18} />
                                        </button>
                                        <button
                                            onClick={() => setIsFilterVisible(false)}
                                            className="px-6 py-2 bg-gray-50 text-gray-700 text-sm font-bold border border-gray-100 rounded-lg hover:bg-gray-100 transition-colors shadow-sm h-full flex items-center justify-center"
                                        >
                                            Back
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            {isLoading && !isFirstLoad && (
                                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                                    <div className="flex flex-col items-center gap-3 bg-white/80 p-6 rounded-2xl shadow-xl border border-white/50">
                                        <FiLoader className="animate-spin text-[#FFCA00]" size={40} />
                                        <p className="text-[#333] text-sm font-bold tracking-tight">Updating results...</p>
                                    </div>
                                </div>
                            )}
                            {ledgerEntries.length > 0 ? (
                                <div className="space-y-8">
                                    {Object.entries(
                                        ledgerEntries.reduce((acc, entry) => {
                                            const accName = entry.account_name || (typeof entry.account === 'object' ? entry.account?.name : entry.account) || "Unknown Account";
                                            if (!acc[accName]) acc[accName] = [];
                                            acc[accName].push(entry);
                                            return acc;
                                        }, {})
                                    ).map(([accountName, entries], groupIndex) => (
                                        <div key={groupIndex} className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                                            <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
                                                <h3 className="text-[16px] font-bold text-gray-800">{accountName} Ledger</h3>
                                            </div>
                                            <div className="min-w-[1000px] lg:min-w-0">
                                                <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">#</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Account</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Date</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">Debit</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">Credit</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">Balance</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Running Balance</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Ref Name</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Ref Type</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {entries.map((entry, index) => (
                                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                            {index + 1}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-900 whitespace-nowrap font-medium">
                                                            {accountName}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-500 whitespace-nowrap">
                                                            {entry.date ? new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-900 text-right whitespace-nowrap">
                                                            ₹ {(parseFloat(entry.debit) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-900 text-right whitespace-nowrap">
                                                            ₹ {(parseFloat(entry.credit) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 text-right whitespace-nowrap">
                                                            ₹ {((entry.balance !== undefined && entry.balance !== null)
                                                                ? parseFloat(entry.balance)
                                                                : (parseFloat(entry.debit || 0) - parseFloat(entry.credit || 0))
                                                            ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">₹ {(parseFloat(entry.running_balance) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">{entry.reference || "—"}</td>
                                                        <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                            <span className="capitalize">{entry.entry_type?.toLowerCase().replace(/_/g, ' ') || "—"}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    title="No Ledger Entries Found"
                                    message="No financial transactions available to display."
                                    actionLabel=""
                                    onActionClick={() => { }}
                                />
                            )}
                        </div>

                        {/* Pagination */}
                        <div className="mt-6">
                            {ledgerEntries.length > 0 && totalCount > pageSize && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalCount}
                                    pageSize={pageSize}
                                    onPageChange={setCurrentPage}
                                />
                            )}
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
}
