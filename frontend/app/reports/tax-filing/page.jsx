"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { reportService } from "@/services/reportService";
import { handleExport } from "@/utils/exportHelper";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import CustomSelect from "@/components/common/CustomSelect";
import { FiFilter, FiDownload, FiX, FiLoader, FiCalendar, FiCheck, FiChevronDown, FiChevronRight } from "react-icons/fi";

// ─── Date Range Picker Popup ───────────────────────────────────────────────

/** Popup that lets the user pick specific From and To dates */
function CustomDateRangePopup({ value, onChange, onClose }) {
    const [fromDate, setFromDate] = useState(value?.from_date || "");
    const [toDate, setToDate]     = useState(value?.to_date || "");
    const [error, setError]       = useState("");

    const popupRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    const handleApply = () => {
        if (!fromDate || !toDate) {
            setError("Please select both From and To dates.");
            return;
        }
        if (new Date(fromDate) > new Date(toDate)) {
            setError("'From' date must be before or equal to 'To' date.");
            return;
        }

        onChange({ from_date: fromDate, to_date: toDate });
        onClose();
    };

    return (
        <div
            ref={popupRef}
            className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-5 w-[300px] animate-in fade-in slide-in-from-top-2 duration-200"
        >
            <p className="text-[13px] font-bold text-gray-700 mb-4 uppercase tracking-wider">Select Date Range</p>

            <div className="space-y-4 mb-5">
                <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-widest">From Date</label>
                    <input 
                        type="date" 
                        value={fromDate}
                        onChange={(e) => { setFromDate(e.target.value); setError(""); }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-widest">To Date</label>
                    <input 
                        type="date" 
                        value={toDate}
                        onChange={(e) => { setToDate(e.target.value); setError(""); }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                    />
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

function MonthsLimitField({ monthsLimit, customRange, onPresetChange, onCustomChange, onClear }) {
    const [showPopup, setShowPopup] = useState(false);

    const handleSelectChange = (val) => {
        if (val === "custom") {
            setShowPopup(true);
            onPresetChange("custom");
        } else {
            onPresetChange(val);
            onClear();
        }
    };

    return (
        <div className="flex flex-col gap-1.5 relative">
            <label className="text-[13px] text-gray-500 font-medium ml-1">Months Limit</label>
            {monthsLimit === "custom" && customRange ? (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowPopup(true)}
                        className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-white border border-[#FFCA00] rounded-lg text-sm font-semibold text-gray-700 shadow-sm hover:bg-yellow-50 transition-all"
                    >
                        <FiCalendar size={15} className="text-[#FFCA00]" />
                        {customRange.from_date} → {customRange.to_date}
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

export default function TaxFilingPage() {
    const dispatch = useDispatch();

    const [isLoading, setIsLoading]         = useState(true);
    const [isFirstLoad, setIsFirstLoad]     = useState(true);
    const [isExporting, setIsExporting]     = useState(false);
    const [isFilterVisible, setIsFilterVisible] = useState(false);

    const [taxData, setTaxData] = useState([]);

    const [section, setSection]         = useState("");
    const [monthsLimit, setMonthsLimit] = useState("");
    const [customRange, setCustomRange] = useState(null); 

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

    const buildParams = () => {
        const params = {};
        if (section) params.section = section;
        if (monthsLimit && monthsLimit !== "custom") {
            params.months_limit = monthsLimit;
        } else if (monthsLimit === "custom" && customRange) {
            params.from_date = customRange.from_date;
            params.to_date   = customRange.to_date;
        }
        return params;
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await reportService.getTaxFiling(buildParams());
            setTaxData(response?.data || []);
        } catch (err) {
            console.error("Failed to fetch Tax Filing:", err);
        } finally {
            setIsLoading(false);
            setIsFirstLoad(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section, monthsLimit, customRange]);

    const handleClearFilters = () => {
        setSection("");
        setMonthsLimit("");
        setCustomRange(null);
    };

    const handleExportTax = () => {
        const exportParams = { ...buildParams(), export: true };
        handleExport({
            endpoint: "custom-api/admin/reports/tax filing",
            payload: exportParams,
            dispatch,
            setIsExporting,
            defaultFileName: `tax_filing_${new Date().toISOString().split("T")[0]}.xlsx`
        });
    };

    const navbarData = {
        heading: "Tax Filing",
        subheading: "View and file GST returns with detailed breakdown of taxable, exempt, and export supplies",
        from: "reports",
    };

    const formatCurrency = (amount) =>
        `₹ ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const renderRows = () => {
        const rendered = [];
        taxData.forEach((entry, index) => {
            if (isRowCollapsed(index, taxData, expandedHeaders)) {
                return;
            }

            const amounts = entry.amounts?.total || {};
            const rowStyle = getRowStyle(entry.row_type);
            const isHeader = entry.row_type === "section_header";
            const isSectionTotal = entry.row_type === "section_total";

            rendered.push(
                <tr 
                    key={index} 
                    onClick={() => {
                        if (isHeader) {
                            toggleHeader(entry.label);
                        }
                    }}
                    className={`hover:bg-gray-50 border-b border-gray-200 transition-colors ${isHeader ? "cursor-pointer" : ""} ${rowStyle}`}
                >
                    <td className={`pr-6 py-5 whitespace-nowrap ${getIndentClass(entry.indent)}`}>
                        {isHeader ? (
                            <div className="flex items-center gap-2 select-none">
                                <span className="text-gray-400">
                                    {expandedHeaders.has(entry.label) ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                                </span>
                                <span>{entry.label}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="w-4 flex-shrink-0" />
                                <span>{entry.label}</span>
                            </div>
                        )}
                    </td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">{formatCurrency(amounts.taxable_amount)}</td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">{formatCurrency(amounts.igst)}</td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">{formatCurrency(amounts.cgst)}</td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">{formatCurrency(amounts.sgst)}</td>
                    <td className="px-6 py-5 text-right whitespace-nowrap font-medium">{formatCurrency(amounts.total_tax)}</td>
                </tr>
            );

            // Spacer after every section_total or collapsed section_header
            const isCollapsedSectionHeader = isHeader && !expandedHeaders.has(entry.label);
            if (isSectionTotal || isCollapsedSectionHeader) {
                rendered.push(
                    <tr key={`spacer-${index}`} className="bg-white border-b border-gray-200">
                        <td colSpan={6} className="py-8"></td>
                    </tr>
                );
            }
        });
        return rendered;
    };

    const getIndentClass = (indent) => {
        const indentMap = {
            1: "pl-12",
            2: "pl-20",
            3: "pl-28"
        };
        return indentMap[indent] || "pl-6";
    };

    const getRowStyle = (rowType) => {
        if (rowType === "section_header") return "font-bold text-[15px] text-gray-900 bg-gray-50/50";
        if (rowType === "section_total")  return "font-bold text-[15px] text-black border-t border-gray-100";
        if (rowType === "net_total")      return "font-bold text-[16px] text-black bg-yellow-50/30 border-t-2 border-gray-200";
        return "text-[14px] text-gray-600";
    };

    const SECTION_OPTIONS = [
        { value: "outward",     label: "Outward Supplies" },
        { value: "inward",      label: "Inward Supplies" },
        { value: "adjustments", label: "Adjustments" },
    ];

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />

            {isLoading && isFirstLoad ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message="Loading Tax Filing Report..." />
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
                                    onClick={handleExportTax}
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
                                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <MonthsLimitField
                                            monthsLimit={monthsLimit}
                                            customRange={customRange}
                                            onPresetChange={(val) => { setMonthsLimit(val ?? ""); }}
                                            onCustomChange={(range) => { setCustomRange(range); }}
                                            onClear={() => setCustomRange(null)}
                                        />
                                    </div>
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

                        {/* Tax Filing Table */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            {isLoading && (
                                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                                    <div className="flex flex-col items-center gap-3 bg-white/80 p-6 rounded-2xl shadow-xl border border-white/50">
                                        <FiLoader className="animate-spin text-[#FFCA00]" size={40} />
                                        <p className="text-[#333] text-sm font-bold tracking-tight">Updating results...</p>
                                    </div>
                                </div>
                            )}

                            {taxData.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[1000px] lg:min-w-0">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Tax Type</th>
                                                    <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">Taxable Amount</th>
                                                    <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">IGST</th>
                                                    <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">CGST</th>
                                                    <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">SGST</th>
                                                    <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap rounded-tr-lg">Total Tax</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {renderRows()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <EmptyState
                                    title="No Tax Filing Data Found"
                                    message="No tax filing data available for the selected period."
                                    actionLabel=""
                                    onActionClick={() => { }}
                                />
                            )}
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
}
