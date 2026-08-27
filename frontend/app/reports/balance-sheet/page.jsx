"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { reportService } from "@/services/reportService";
import { handleExport } from "@/utils/exportHelper";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import CustomSelect from "@/components/common/CustomSelect";
import { FiFilter, FiDownload, FiX, FiLoader, FiCalendar, FiCheck, FiChevronDown, FiChevronRight } from "react-icons/fi";

// ─── Month/Year picker popup ────────────────────────────────────────────────

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function buildYearOptions() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= currentYear - 10; y--) years.push(y);
    return years;
}

/** Small popup that lets the user pick a From month/year and a To month/year */
function CustomDateRangePopup({ value, onChange, onClose }) {
    const years = buildYearOptions();
    const now = new Date();

    const [fromMonth, setFromMonth] = useState(value?.fromMonth ?? now.getMonth() + 1);
    const [fromYear, setFromYear]   = useState(value?.fromYear  ?? now.getFullYear());
    const [toMonth, setToMonth]     = useState(value?.toMonth   ?? now.getMonth() + 1);
    const [toYear, setToYear]       = useState(value?.toYear    ?? now.getFullYear());
    const [error, setError]         = useState("");

    const popupRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    const handleApply = () => {
        const from = new Date(fromYear, fromMonth - 1, 1);
        const to   = new Date(toYear,   toMonth   - 1, 1);
        if (from > to) {
            setError("'From' date must be before or equal to 'To' date.");
            return;
        }

        // For Balance Sheet, "periods" is usually a list of month-end dates.
        // We generate all month-end dates between from and to.
        const periodDates = [];
        let curr = new Date(toYear, toMonth, 0); // Start from the end
        const start = new Date(fromYear, fromMonth - 1, 1);
        
        while (curr >= start) {
            const y = curr.getFullYear();
            const m = curr.getMonth() + 1;
            const d = curr.getDate();
            periodDates.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
            
            // Move to previous month
            curr = new Date(curr.getFullYear(), curr.getMonth(), 0);
        }

        onChange({ 
            fromMonth, fromYear, 
            toMonth, toYear, 
            periods: periodDates.join(",") 
        });
        onClose();
    };

    return (
        <div
            ref={popupRef}
            className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-5 w-[340px] animate-in fade-in slide-in-from-top-2 duration-200"
        >
            <p className="text-[13px] font-bold text-gray-700 mb-4 uppercase tracking-wider">Select Custom Range</p>

            {/* From */}
            <div className="mb-4">
                <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-widest">From</p>
                <div className="flex gap-2">
                    <select
                        value={fromMonth}
                        onChange={(e) => { setFromMonth(Number(e.target.value)); setError(""); }}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                    >
                        {MONTHS.map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={fromYear}
                        onChange={(e) => { setFromYear(Number(e.target.value)); setError(""); }}
                        className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* To */}
            <div className="mb-4">
                <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-widest">To</p>
                <div className="flex gap-2">
                    <select
                        value={toMonth}
                        onChange={(e) => { setToMonth(Number(e.target.value)); setError(""); }}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                    >
                        {MONTHS.map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={toYear}
                        onChange={(e) => { setToYear(Number(e.target.value)); setError(""); }}
                        className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

            <div className="flex gap-2 justify-end">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                >
                    Cancel
                </button>
                <button
                    onClick={handleApply}
                    className="px-4 py-2 text-sm font-bold bg-[#FFCA00] text-white rounded-lg hover:bg-[#d9ac00] flex items-center gap-1.5"
                >
                    <FiCheck size={14} /> Apply
                </button>
            </div>
        </div>
    );
}

// ─── Months Limit selector (preset + custom) ────────────────────────────────

const PRESET_OPTIONS = [
    { value: "3",      label: "Last 3 Months" },
    { value: "6",      label: "Last 6 Months" },
    { value: "12",     label: "Last 12 Months" },
    { value: "custom", label: "Custom Range..." },
];

/** Renders the Months Limit field with preset dropdown + custom popup */
function MonthsLimitField({ monthsLimit, customRange, onPresetChange, onCustomChange, onClear }) {
    const [showPopup, setShowPopup] = useState(false);

    const handleSelectChange = (val) => {
        if (val === "custom") {
            setShowPopup(true);
            onPresetChange("custom");
        } else {
            onPresetChange(val);
            onClear(); // clear any custom range when switching to preset
        }
    };

    const displayLabel = () => {
        if (monthsLimit === "custom" && customRange) {
            return `${MONTHS[customRange.fromMonth - 1].slice(0, 3)} ${customRange.fromYear} → ${MONTHS[customRange.toMonth - 1].slice(0, 3)} ${customRange.toYear}`;
        }
        return null;
    };

    const label = displayLabel();

    return (
        <div className="flex flex-col gap-1.5 relative">
            <label className="text-[13px] text-gray-500 font-medium ml-1">Months Limit</label>

            {/* When custom range is active show a pill with clear, otherwise show the dropdown */}
            {monthsLimit === "custom" && customRange ? (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowPopup(true)}
                        className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-white border border-[#FFCA00] rounded-lg text-sm font-semibold text-gray-700 shadow-sm hover:bg-yellow-50 transition-all"
                    >
                        <FiCalendar size={15} className="text-[#FFCA00]" />
                        {label}
                    </button>
                    <button
                        onClick={() => { onPresetChange(""); onClear(); }}
                        className="p-2.5 text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg hover:bg-red-50 transition-all shadow-sm"
                        title="Clear custom range"
                    >
                        <FiX size={16} />
                    </button>
                </div>
            ) : (
                <CustomSelect
                    value={monthsLimit}
                    onChange={handleSelectChange}
                    options={PRESET_OPTIONS}
                    placeholder="Default (All)"
                    isClearable
                />
            )}

            {showPopup && (
                <CustomDateRangePopup
                    value={customRange}
                    onChange={(range) => { onCustomChange(range); }}
                    onClose={() => setShowPopup(false)}
                />
            )}
        </div>
    );
}

// ─── Indent padding helper (same as P&L) ────────────────────────────────────
const getPaddingClass = (indent) => {
    switch (indent) {
        case 1: return "pl-8 sm:pl-12";
        case 2: return "pl-16 sm:pl-20";
        case 3: return "pl-24 sm:pl-28";
        default: return "";
    }
};

// ─── Row weight helper ───────────────────────────────────────────────────────
const getRowWeight = (rowType) => {
    switch (rowType) {
        case "section_header":  return "font-bold text-gray-900 text-[15px]";
        case "group_header":    return "font-medium text-gray-700 text-[15px]";
        case "section_total":   return "font-bold text-black text-[15px]";
        case "group_total":     return "font-medium text-black text-[14px]";
        default:                return "text-gray-600 text-[14px]";
    }
};

// ─── Section options ─────────────────────────────────────────────────────────
const SECTION_OPTIONS = [
    { value: "assets",      label: "Assets" },
    { value: "liabilities", label: "Liabilities" },
    { value: "equity",      label: "Equity" },
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
export default function BalanceSheetPage() {
    const dispatch = useDispatch();

    const [isLoading, setIsLoading]         = useState(true);
    const [isFirstLoad, setIsFirstLoad]     = useState(true);
    const [isExporting, setIsExporting]     = useState(false);
    const [isFilterVisible, setIsFilterVisible] = useState(false);

    const [bsData, setBsData]   = useState(null);

    // Filter state
    const [section, setSection]         = useState("");
    const [account, setAccount]         = useState("");
    const [monthsLimit, setMonthsLimit] = useState("");
    const [customRange, setCustomRange] = useState(null); // { fromMonth, fromYear, toMonth, toYear, periods }

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

    // ── Build API params ──────────────────────────────────────────────────
    const buildParams = () => {
        const params = {};
        if (section)             params.section      = section;
        if (account.trim())      params.account      = account.trim();
        
        if (monthsLimit && monthsLimit !== "custom") {
            params.months_limit = monthsLimit;
        } else if (monthsLimit === "custom" && customRange) {
            params.periods = customRange.periods;
        }
        
        return params;
    };

    // ── Fetch ─────────────────────────────────────────────────────────────
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await reportService.getBalanceSheet(buildParams());
            setBsData(response);
        } catch (err) {
            console.error("Failed to fetch Balance Sheet:", err);
        } finally {
            setIsLoading(false);
            setIsFirstLoad(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section, account, monthsLimit, customRange]);

    // ── Clear filters ─────────────────────────────────────────────────────
    const handleClearFilters = () => {
        setSection("");
        setAccount("");
        setMonthsLimit("");
        setCustomRange(null);
    };

    // ── Export ────────────────────────────────────────────────────────────
    const handleExportBS = () => {
        const exportParams = { ...buildParams(), export: true };
        handleExport({
            endpoint: "custom-api/admin/reports/balance_sheet",
            payload: exportParams,
            dispatch,
            setIsExporting,
            defaultFileName: `balance_sheet_${new Date().toISOString().split("T")[0]}.xlsx`
        });
    };

    // ── Derived data ──────────────────────────────────────────────────────
    // API response: { periods: [{key, label}], data: [...rows], summary: {...}, balanced: {...} }
    const rows   = bsData?.data    || [];
    const months = bsData?.periods || [];

    const navbarData = {
        heading: "Balance Sheet",
        subheading: "Understand where your funds are applied and sourced",
        from: "reports",
    };

    const formatCurrency = (amount) =>
        `₹ ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // ── Spacer rows track ─────────────────────────────────────────────────
    // After a section_total we insert a visual spacer row (same as demo)
    const renderRows = () => {
        const rendered = [];
        rows.forEach((row, index) => {
            if (isRowCollapsed(index, rows, expandedHeaders)) {
                return;
            }

            const paddingClass = getPaddingClass(row.indent);
            const weightClass  = getRowWeight(row.row_type);
            const isSectionTotal = row.row_type === "section_total";
            const isSectionHeader = row.row_type === "section_header";
            const isHeader = row.row_type === "section_header" || row.row_type === "group_header";

            rendered.push(
                <tr
                    key={index}
                    onClick={() => {
                        if (isHeader) {
                            toggleHeader(row.label);
                        }
                    }}
                    className={`bg-white border-b border-gray-200 hover:bg-gray-50 transition-all ${isHeader ? "cursor-pointer" : ""}`}
                >
                    <td className={`px-6 py-5 whitespace-nowrap ${weightClass} ${paddingClass}`}>
                        {isHeader ? (
                            <div className="flex items-center gap-2 select-none">
                                <span className="text-gray-400">
                                    {expandedHeaders.has(row.label) ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
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
                    {months.map((month, mIdx) => (
                        <td
                            key={mIdx}
                            className={`px-6 py-5 text-right whitespace-nowrap ${isSectionTotal || isSectionHeader ? "font-bold text-black text-[15px]" : "text-gray-600 text-[14px]"}`}
                        >
                            {formatCurrency(row.amounts?.[month.key] || 0)}
                        </td>
                    ))}
                </tr>
            );

            // Spacer after every section_total or collapsed section_header
            const isCollapsedSectionHeader = isSectionHeader && !expandedHeaders.has(row.label);
            if (isSectionTotal || isCollapsedSectionHeader) {
                rendered.push(
                    <tr key={`spacer-${index}`} className="bg-white border-b border-gray-200">
                        <td colSpan={months.length + 1} className="py-8"></td>
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
                    <Loader message="Loading Balance Sheet..." />
                </div>
            ) : (
                <main className="flex-1 flex flex-col py-8">
                    <div className="w-full flex-1 flex flex-col">

                        {/* Action Buttons */}
                        {!isFilterVisible && (
                            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-3 mb-6 animate-in fade-in duration-300">
                                <button
                                    onClick={() => setIsFilterVisible(true)}
                                    className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-200 text-black rounded-lg text-[14px] font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 min-w-[120px] shadow-sm h-[48px]"
                                >
                                    <FiFilter size={18} /> Filter
                                </button>
                                <button
                                    onClick={handleExportBS}
                                    disabled={isExporting}
                                    className="w-full sm:w-auto px-4 py-2.5 bg-white border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-bold hover:bg-[#d9ac00]/5 flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-50 h-[48px]"
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

                                        {/* Months Limit */}
                                        <MonthsLimitField
                                            monthsLimit={monthsLimit}
                                            customRange={customRange}
                                            onPresetChange={(val) => { setMonthsLimit(val ?? ""); }}
                                            onCustomChange={(range) => { setCustomRange(range); }}
                                            onClear={() => setCustomRange(null)}
                                        />
                                    </div>

                                    {/* Clear + Back */}
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

                        {/* Balance Sheet Table */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            {/* Inline loading overlay */}
                            {isLoading && (
                                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                                    <div className="flex flex-col items-center gap-3 bg-white/80 p-6 rounded-2xl shadow-xl border border-white/50">
                                        <FiLoader className="animate-spin text-[#FFCA00]" size={40} />
                                        <p className="text-[#333] text-sm font-bold tracking-tight">Updating results...</p>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <div className="min-w-[800px] lg:min-w-0">
                                    <table className="w-full text-left border-collapse">
                                        {/* Header */}
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">
                                                    Account
                                                </th>
                                                {months.map((month, idx) => (
                                                    <th
                                                        key={idx}
                                                        className={`px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap ${idx === months.length - 1 ? "rounded-tr-lg" : ""}`}
                                                    >
                                                        {month.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {rows.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={months.length + 1}
                                                        className="px-6 py-16 text-center text-gray-400 text-sm"
                                                    >
                                                        No balance sheet data found.
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