"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { reportService } from "@/services/reportService";
import { handleExport } from "@/utils/exportHelper";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import CustomSelect from "@/components/common/CustomSelect";
import { FiFilter, FiDownload, FiX, FiLoader, FiCalendar, FiCheck, FiChevronDown, FiChevronRight } from "react-icons/fi";

// ─── Period Range Picker Component ──────────────────────────────────────────

function PeriodFilter({ fromDate, toDate, onChange }) {
    const [showPopup, setShowPopup] = useState(false);
    const popupRef = useRef(null);

    const [tempFromDate, setTempFromDate] = useState(fromDate || "");
    const [tempToDate, setTempToDate] = useState(toDate || "");

    useEffect(() => {
        const handler = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) setShowPopup(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleApply = () => {
        if (tempFromDate && tempToDate) {
            onChange(tempFromDate, tempToDate);
            setShowPopup(false);
        }
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setTempFromDate("");
        setTempToDate("");
        onChange("", "");
    };

    const hasValue = fromDate && toDate;

    return (
        <div className="flex flex-col gap-1.5 relative" ref={popupRef}>
            <label className="text-[13px] text-gray-500 font-medium ml-1">Periods</label>

            <div
                onClick={() => setShowPopup(!showPopup)}
                className={`flex items-center gap-2 px-4 py-2.5 bg-white border ${hasValue ? "border-[#FFCA00]" : "border-gray-200"} rounded-lg text-sm text-gray-700 shadow-sm hover:border-[#FFCA00] transition-all cursor-pointer min-h-[42px]`}
            >
                <FiCalendar size={15} className={hasValue ? "text-[#FFCA00]" : "text-gray-400"} />
                <span className="flex-1 truncate">
                    {hasValue ? `${fromDate} to ${toDate}` : "Select Date Range"}
                </span>
                {hasValue && (
                    <FiX
                        size={14}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        onClick={handleClear}
                    />
                )}
            </div>

            {showPopup && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-5 w-[300px] animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-[13px] font-bold text-gray-700 mb-4 uppercase tracking-wider">Select Period</p>

                    <div className="space-y-4 mb-5">
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-widest">From Date</label>
                            <input
                                type="date"
                                value={tempFromDate}
                                onChange={(e) => setTempFromDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-widest">To Date</label>
                            <input
                                type="date"
                                value={tempToDate}
                                onChange={(e) => setTempToDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setShowPopup(false)}
                            className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={!tempFromDate || !tempToDate}
                            className="px-4 py-2 text-sm font-bold bg-[#FFCA00] text-white rounded-lg hover:bg-[#d9ac00] flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <FiCheck size={14} /> Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const getPaddingClass = (indent) => {
    switch (indent) {
        case 1: return "pl-8 sm:pl-12";
        case 2: return "pl-16 sm:pl-20";
        case 3: return "pl-24 sm:pl-28";
        default: return "";
    }
};

const getRowWeight = (rowType) => {
    switch (rowType) {
        case "section_header": return "font-bold text-gray-900 text-[15px]";
        case "group_header": return "font-medium text-gray-700 text-[15px]";
        case "section_total": return "font-bold text-black text-[15px]";
        case "grand_total": return "font-bold text-black text-[16px]";
        case "group_total": return "font-medium text-black text-[14px]";
        default: return "text-gray-600 text-[14px]";
    }
};

const SECTION_OPTIONS = [
    { value: "assets", label: "Assets" },
    { value: "liabilities", label: "Liabilities" },
    { value: "income", label: "Income" },
    { value: "expenses", label: "Expenses" },
    { value: "equity", label: "Equity" },
];

const isRowCollapsed = (rowIndex, allRows, expandedHeaders) => {
    const targetRow = allRows[rowIndex];
    if (!targetRow) return false;

    let currentIndent = targetRow.indent;
    const isTotalRow = targetRow.row_type === "category_total" ||
        targetRow.row_type === "section_total" ||
        targetRow.row_type === "group_total";

    for (let i = rowIndex - 1; i >= 0; i--) {
        const prevRow = allRows[i];
        const isHeader = prevRow.row_type === "category_header" ||
            prevRow.row_type === "section_header" ||
            prevRow.row_type === "group_header";

        if (isHeader) {
            if (prevRow.indent < currentIndent || (isTotalRow && prevRow.indent === currentIndent)) {
                if (!expandedHeaders.has(prevRow.label)) {
                    return true;
                }
                currentIndent = prevRow.indent;
            }
        }
    }
    return false;
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TrialBalancePage() {
    const dispatch = useDispatch();

    const [isLoading, setIsLoading] = useState(true);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isFilterVisible, setIsFilterVisible] = useState(false);

    const [tbData, setTbData] = useState(null);

    // Filter state
    const [section, setSection] = useState("");
    const [account, setAccount] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Collapsible states
    const [expandedHeaders, setExpandedHeaders] = useState(new Set());
    const toggleHeader = (label) => {
        setExpandedHeaders((prev) => {
            const next = new Set(prev);
            if (next.has(label)) {
                next.delete(label);
            } else {
                next.add(label);
            }
            return next;
        });
    };

    const [expandedAccounts, setExpandedAccounts] = useState(new Set());
    const toggleAccount = (label) => {
        setExpandedAccounts((prev) => {
            const next = new Set(prev);
            if (next.has(label)) {
                next.delete(label);
            } else {
                next.add(label);
            }
            return next;
        });
    };

    // ── Build API params ──────────────────────────────────────────────────
    const buildParams = () => {
        const params = {};
        if (section) params.section = section;
        if (account.trim()) params.account = account.trim();
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;
        return params;
    };

    // ── Fetch ─────────────────────────────────────────────────────────────
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await reportService.getTrialBalance(buildParams());
            setTbData(response);
        } catch (err) {
            console.error("Failed to fetch Trial Balance:", err);
        } finally {
            setIsLoading(false);
            setIsFirstLoad(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section, account, fromDate, toDate]);

    // ── Clear filters ─────────────────────────────────────────────────────
    const handleClearFilters = () => {
        setSection("");
        setAccount("");
        setFromDate("");
        setToDate("");
    };

    // ── Export ────────────────────────────────────────────────────────────
    const handleExportTB = () => {
        const exportParams = { ...buildParams(), export: true };
        handleExport({
            endpoint: "custom-api/admin/reports/trial_balance",
            payload: exportParams,
            dispatch,
            setIsExporting,
            defaultFileName: `trial_balance_${new Date().toISOString().split("T")[0]}.xlsx`
        });
    };

    const rows = tbData?.data || [];

    const navbarData = {
        heading: "Trial Balance",
        subheading: "Balanced Summary of All Accounts",
        from: "reports",
    };

    const formatCurrency = (amount) =>
        `₹ ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const renderRows = () => {
        const rendered = [];
        rows.forEach((row, index) => {
            if (isRowCollapsed(index, rows, expandedHeaders)) {
                return;
            }

            const paddingClass = getPaddingClass(row.indent);
            const weightClass = getRowWeight(row.row_type);
            const isGrandTotal = row.row_type === "grand_total";
            const isSectionHeader = row.row_type === "section_header";
            const isHeader = isSectionHeader || row.row_type === "group_header";
            const isSectionTotal = row.row_type === "section_total";
            const hasChildren = row.account_child && row.account_child.length > 0;

            rendered.push(
                <tr
                    key={index}
                    onClick={() => {
                        if (isHeader) {
                            toggleHeader(row.label);
                        } else if (hasChildren) {
                            toggleAccount(row.label);
                        }
                    }}
                    className={`bg-white border-b border-gray-200 hover:bg-gray-50 transition-all ${(isHeader || hasChildren) ? "cursor-pointer" : ""} ${isGrandTotal ? "bg-gray-50 border-t-2 border-gray-300" : ""}`}
                >
                    <td className={`px-6 py-5 whitespace-nowrap ${weightClass} ${paddingClass}`}>
                        {isHeader ? (
                            <div className="flex items-center gap-2 select-none">
                                <span className="text-gray-400">
                                    {expandedHeaders.has(row.label) ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                                </span>
                                <span>{row.label}</span>
                            </div>
                        ) : hasChildren ? (
                            <div className="flex items-center gap-2 select-none">
                                <span className="text-gray-400">
                                    {expandedAccounts.has(row.label) ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                                </span>
                                <span>{row.label}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="w-4 flex-shrink-0" />
                                <span>{row.label}</span>
                            </div>
                        )}
                    </td>
                    <td className={`px-6 py-5 text-right whitespace-nowrap ${weightClass}`}>
                        {formatCurrency(row.amounts?.closing_dr || 0)}
                    </td>
                    <td className={`px-6 py-5 text-right whitespace-nowrap ${weightClass}`}>
                        {formatCurrency(row.amounts?.closing_cr || 0)}
                    </td>
                </tr>
            );

            // Render children accounts if parent row is expanded
            if (hasChildren && expandedAccounts.has(row.label)) {
                row.account_child.forEach((child, childIdx) => {
                    const childPaddingClass = getPaddingClass(child.indent || 2);
                    const childWeightClass = getRowWeight(child.row_type || "account_child");
                    rendered.push(
                        <tr
                            key={`child-${index}-${childIdx}`}
                            className="bg-gray-50/40 border-b border-gray-100 hover:bg-gray-50 transition-all"
                        >
                            <td className={`px-6 py-4 whitespace-nowrap ${childWeightClass} ${childPaddingClass}`}>
                                <div className="flex items-center gap-2">
                                    <span className="w-4 flex-shrink-0" />
                                    <span>{child.label}</span>
                                </div>
                            </td>
                            <td className={`px-6 py-4 text-right whitespace-nowrap ${childWeightClass}`}>
                                {formatCurrency(child.amounts?.closing_dr || 0)}
                            </td>
                            <td className={`px-6 py-4 text-right whitespace-nowrap ${childWeightClass}`}>
                                {formatCurrency(child.amounts?.closing_cr || 0)}
                            </td>
                        </tr>
                    );
                });
            }

            // Spacer after every section_total or collapsed section_header
            const isCollapsedSectionHeader = isSectionHeader && !expandedHeaders.has(row.label);
            if (isSectionTotal || isCollapsedSectionHeader) {
                rendered.push(
                    <tr key={`spacer-${index}`} className="bg-white border-b border-gray-200">
                        <td colSpan={3} className="py-8"></td>
                    </tr>
                );
            }
        });
        return rendered;
    };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />

            {isLoading && isFirstLoad ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message="Loading Trial Balance..." />
                </div>
            ) : (
                <main className="flex-1 flex flex-col py-8">
                    <div className="w-full flex-1 flex flex-col">

                        {/* Action Buttons */}
                        {!isFilterVisible && (
                            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-3 mb-6 animate-in fade-in duration-300">
                                <button
                                    onClick={() => setIsFilterVisible(true)}
                                    className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-200 text-black rounded-lg text-[14px] font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 min-w-[120px] shadow-sm h-[48px] cursor-pointer"
                                >
                                    <FiFilter size={18} /> Filter
                                </button>
                                <button
                                    onClick={handleExportTB}
                                    disabled={isExporting}
                                    className="w-full sm:w-auto px-4 py-2.5 bg-white border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-bold hover:bg-[#d9ac00]/5 flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-50 h-[48px] cursor-pointer"
                                >
                                    {isExporting ? <FiLoader className="animate-spin" size={18} /> : <FiDownload size={18} />}
                                    {isExporting ? "Exporting..." : "Export"}
                                </button>
                            </div>
                        )}

                        {/* Filter Panel */}
                        {isFilterVisible && (
                            <div className="mb-8 animate-in slide-in-from-top-2 fade-in duration-300">
                                <div className="flex flex-col lg:flex-row items-end gap-4 lg:gap-6">
                                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-6">

                                        {/* Section */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[13px] text-gray-500 font-medium ml-1">Section</label>
                                            <CustomSelect
                                                value={section}
                                                onChange={(val) => setSection(val ?? "")}
                                                options={SECTION_OPTIONS}
                                                placeholder="All Sections"
                                                isClearable
                                            />
                                        </div>

                                        {/* Account */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[13px] text-gray-500 font-medium ml-1">Account</label>
                                            <input
                                                type="text"
                                                value={account}
                                                onChange={(e) => setAccount(e.target.value)}
                                                placeholder="Search Account..."
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FFCA00] text-sm shadow-sm"
                                            />
                                        </div>

                                        {/* Periods */}
                                        <PeriodFilter
                                            fromDate={fromDate}
                                            toDate={toDate}
                                            onChange={(f, t) => { setFromDate(f); setToDate(t); }}
                                        />
                                    </div>

                                    {/* Clear + Back */}
                                    <div className="flex items-center gap-3 h-[42px] mb-0.5">
                                        <button
                                            onClick={handleClearFilters}
                                            title="Clear Filters"
                                            className="p-2.5 text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg hover:bg-red-50 transition-all shadow-sm cursor-pointer"
                                        >
                                            <FiX size={18} />
                                        </button>
                                        <button
                                            onClick={() => setIsFilterVisible(false)}
                                            className="px-6 py-2 bg-gray-50 text-gray-700 text-sm font-bold border border-gray-100 rounded-lg hover:bg-gray-100 transition-colors shadow-sm h-full flex items-center justify-center cursor-pointer"
                                        >
                                            Back
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Trial Balance Table */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            {isLoading && (
                                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                                    <div className="flex flex-col items-center gap-3 bg-white/80 p-6 rounded-2xl shadow-xl border border-white/50">
                                        <FiLoader className="animate-spin text-[#FFCA00]" size={40} />
                                        <p className="text-[#333] text-sm font-bold tracking-tight">Updating results...</p>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <div className="min-w-[1000px] lg:min-w-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Account</th>
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">Debit</th>
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">Credit</th>

                                            </tr>
                                        </thead>

                                        <tbody>
                                            {rows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-16 text-center text-gray-400 text-sm">
                                                        No trial balance data found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                renderRows()
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
}
