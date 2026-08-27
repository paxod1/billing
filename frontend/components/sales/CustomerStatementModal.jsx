"use client";

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { IoClose } from "react-icons/io5";
import { FiFilter, FiX } from "react-icons/fi";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import Pagination from "@/components/commonComp/Pagination";
import { partyService } from "@/services/partyService";
import { showToast } from "@/lib/features/toast/toastSlice";

export default function CustomerStatementModal({ isOpen, onClose, customerId }) {
    const dispatch = useDispatch();
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [allInvoices, setAllInvoices] = useState([]);
    const [paginatedInvoices, setPaginatedInvoices] = useState([]);
    const [partyInfo, setPartyInfo] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [activePaymentInvoice, setActivePaymentInvoice] = useState(null);
    
    // Totals
    const [totalPaid, setTotalPaid] = useState(0);
    const [totalDue, setTotalDue] = useState(0);
    const [totalInvoiced, setTotalInvoiced] = useState(0);

    const pageSize = 10;

    // Filters state
    const [filters, setFilters] = useState({
        from_date: "",
        to_date: "",
        type: "SALES" // Default to SALES for customers
    });

    const handleClearFilters = () => {
        setFilters({
            from_date: "",
            to_date: "",
            type: "SALES"
        });
        setCurrentPage(1);
    };

    useEffect(() => {
        if (!isOpen || !customerId) return;
        
        // Reset states on opening new customer
        setIsInitialLoading(true);
        setCurrentPage(1);
        setActivePaymentInvoice(null);
        setIsFilterVisible(false);
        
        const fetchParty = async () => {
            try {
                const party = await partyService.getPartyById(customerId);
                if (party) {
                    setPartyInfo(party);
                }
            } catch (error) {
                console.error("Error fetching party details:", error);
            }
        };
        fetchParty();
    }, [customerId, isOpen]);

    useEffect(() => {
        if (!isOpen || !customerId) return;
        fetchStatement(isInitialLoading);
    }, [customerId, filters, isOpen]);

    const fetchStatement = async (initial = false) => {
        try {
            if (initial) setIsInitialLoading(true);
            else setIsFetching(true);

            const payload = {
                party_id: customerId,
                from_date: filters.from_date || undefined,
                to_date: filters.to_date || undefined,
                type: filters.type,
                limit: 5000, // Fetch all matching for calculations
                skip: 0
            };

            const res = await partyService.getPartyStatement(payload);
            const responseData = res?.data || res || {};
            const invoiceList = responseData.invoices || responseData.purchases || responseData.data || [];

            setAllInvoices(invoiceList);

            // Calculate overall totals from the filtered dataset
            let paidSum = 0;
            let dueSum = 0;
            let invoicedSum = 0;

            invoiceList.forEach((inv) => {
                paidSum += parseFloat(inv.total_paid || 0);
                dueSum += parseFloat(inv.due_amount || 0);
                invoicedSum += parseFloat(inv.invoice_total || 0);
            });

            setTotalPaid(paidSum);
            setTotalDue(dueSum);
            setTotalInvoiced(invoicedSum);

            if (responseData.party) {
                setPartyInfo(responseData.party);
            }
        } catch (error) {
            console.error("Error fetching party statement details:", error);
            dispatch(showToast({ message: "Failed to load customer statement", type: "error" }));
        } finally {
            setIsInitialLoading(false);
            setIsFetching(false);
        }
    };

    // Client-side pagination slice
    useEffect(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        setPaginatedInvoices(allInvoices.slice(startIndex, endIndex));
    }, [allInvoices, currentPage]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(allInvoices.length / pageSize) || 1;

    const fmt = (num) =>
        parseFloat(num || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const getStatusBadge = (status) => {
        const standardStatus = status?.toUpperCase() || "";
        switch (standardStatus) {
            case "FULLY_PAID":
            case "PAID":
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>;
            case "PARTIALLY_PAID":
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Partially Paid</span>;
            case "SENT":
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Sent</span>;
            case "DRAFT":
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Draft</span>;
            case "OVERDUE":
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Overdue</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">{status || "—"}</span>;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4" onClick={onClose}>
            <div 
                onClick={(e) => e.stopPropagation()} 
                className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200 flex flex-col"
            >
                {/* Header */}
                <div className="p-6 bg-white border-b border-gray-200 rounded-t-2xl flex items-center justify-between sticky top-0 z-20 shadow-sm">
                    <div>
                        <h2 className="text-xl md:text-[22px] font-bold text-gray-900">
                            {partyInfo?.name ? `${partyInfo.name} - Statement` : "Customer Statement"}
                        </h2>
                        {partyInfo && (
                            <p className="text-gray-500 text-xs md:text-sm mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                {partyInfo.email && <span>Email: <strong className="text-gray-700">{partyInfo.email}</strong></span>}
                                {partyInfo.phone && <span>Phone: <strong className="text-gray-700">{partyInfo.phone}</strong></span>}
                                {partyInfo.address && <span className="hidden sm:inline">Address: <strong className="text-gray-700">{partyInfo.address}</strong></span>}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                        title="Close Modal"
                    >
                        <IoClose size={24} />
                    </button>
                </div>

                <div className="p-6 flex-1 flex flex-col gap-6">
                    {isInitialLoading ? (
                        <div className="py-20 flex items-center justify-center">
                            <Loader message="Loading statement details..." />
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards Section */}
                            {!activePaymentInvoice && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                                        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Total Invoiced</span>
                                        <span className="text-2xl font-bold text-slate-800 mt-2">₹ {fmt(totalInvoiced)}</span>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                                        <span className="text-[12px] font-bold text-emerald-600 uppercase tracking-wider">Total Paid</span>
                                        <span className="text-2xl font-bold text-emerald-600 mt-2">₹ {fmt(totalPaid)}</span>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-rose-100 shadow-sm flex flex-col justify-between">
                                        <span className="text-[12px] font-bold text-rose-600 uppercase tracking-wider">Total Due</span>
                                        <span className="text-2xl font-bold text-rose-600 mt-2">₹ {fmt(totalDue)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Combined Card Container: Filters, Statement Table & Payments Sub-view */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative min-h-[350px]">
                                {activePaymentInvoice ? (
                                    /* Payments Sub-view */
                                    <div className="flex flex-col flex-1 animate-in fade-in duration-200">
                                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setActivePaymentInvoice(null)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-black rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors shadow-sm cursor-pointer"
                                                >
                                                    ← Back to Statement
                                                </button>
                                                <span className="text-gray-300">|</span>
                                                <h3 className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">
                                                    Payment Allocations for {activePaymentInvoice.invoice_number || "—"}
                                                </h3>
                                            </div>
                                            <span className="text-xs font-semibold text-gray-500 hidden sm:inline">
                                                Total Payments: {activePaymentInvoice.payments?.length || 0}
                                            </span>
                                        </div>

                                        <div className="overflow-x-auto flex-1">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Payment Date</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Payment Number</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Description</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Payment Mode</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Amount Paid</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {activePaymentInvoice.payments.map((pay, pIdx) => (
                                                        <tr key={pay.payment_number ?? pIdx} className="hover:bg-slate-50/30 transition-colors">
                                                            <td className="px-6 py-4 text-[14px] text-gray-500 whitespace-nowrap">
                                                                {pay.payment_date
                                                                    ? new Date(pay.payment_date).toLocaleDateString("en-IN", {
                                                                        day: "2-digit",
                                                                        month: "short",
                                                                        year: "numeric",
                                                                    })
                                                                    : "—"}
                                                            </td>
                                                            <td className="px-6 py-4 text-[14px] font-bold text-gray-800 whitespace-nowrap">
                                                                {pay.payment_number || "—"}
                                                            </td>
                                                            <td className="px-6 py-4 text-[14px] text-gray-500 max-w-[250px] truncate" title={pay.payment_name}>
                                                                {pay.payment_name || "—"}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-semibold uppercase">
                                                                    {pay.payment_mode || "—"}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-[14px] text-right text-emerald-600 font-bold whitespace-nowrap">
                                                                ₹ {fmt(pay.amount)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    /* Main Statement list view */
                                    <div className="flex flex-col flex-1 animate-in fade-in duration-200">
                                        {/* Filter Header Panel */}
                                        <div className="p-4 bg-white border-b border-gray-100 flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Statement Entries</h3>
                                                <button
                                                    onClick={() => setIsFilterVisible(!isFilterVisible)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
                                                >
                                                    <FiFilter size={15} /> Filter {(filters.from_date || filters.to_date) && "(*)"}
                                                </button>
                                            </div>

                                            {isFilterVisible && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 items-end gap-3 mt-1 pt-3 border-t border-gray-100 animate-in fade-in duration-200">
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">From Date</label>
                                                        <input
                                                            type="date"
                                                            value={filters.from_date}
                                                            onChange={(e) => handleFilterChange("from_date", e.target.value)}
                                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors h-[38px]"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">To Date</label>
                                                        <input
                                                            type="date"
                                                            value={filters.to_date}
                                                            onChange={(e) => handleFilterChange("to_date", e.target.value)}
                                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors h-[38px]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 h-[38px]">
                                                        <button
                                                            onClick={handleClearFilters}
                                                            className="text-gray-400 cursor-pointer hover:text-red-500 transition-colors p-2 bg-white border border-gray-200 rounded-lg flex items-center justify-center h-[38px] w-[38px]"
                                                            title="Reset Filters"
                                                        >
                                                            <FiX size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Table Section */}
                                        <div className="relative flex-1 flex flex-col">
                                            {isFetching && (
                                                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                                                    <div className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-xl shadow border border-gray-100 text-sm font-medium text-gray-500">
                                                        <svg className="animate-spin w-4 h-4 text-[#FFCA00]" viewBox="0 0 24 24" fill="none">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                        </svg>
                                                        Updating...
                                                    </div>
                                                </div>
                                            )}

                                            {paginatedInvoices.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="bg-gray-50 border-b border-gray-200">
                                                            <tr>
                                                                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                                                                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Invoice Number</th>
                                                                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                                                                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                                                                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Total Amount</th>
                                                                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Paid</th>
                                                                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Due</th>
                                                                <th className="px-4 lg:px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap w-36">Payments</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {paginatedInvoices.map((inv, index) => {
                                                                const hasPayments = inv.payments && inv.payments.length > 0;

                                                                return (
                                                                    <tr key={inv.invoice_number ?? index} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100">
                                                                        <td className="px-4 lg:px-6 py-4 text-[14px] text-gray-500 whitespace-nowrap">
                                                                            {inv.invoice_date
                                                                                ? new Date(inv.invoice_date).toLocaleDateString("en-IN", {
                                                                                    day: "2-digit",
                                                                                    month: "short",
                                                                                    year: "numeric",
                                                                                })
                                                                                : "—"}
                                                                        </td>
                                                                        <td className="px-4 lg:px-6 py-4 text-[14px] text-gray-900 font-semibold whitespace-nowrap">
                                                                            {inv.invoice_number || "—"}
                                                                        </td>
                                                                        <td className="px-4 lg:px-6 py-4 text-[14px] text-gray-700 max-w-[200px] truncate" title={inv.invoice_name}>
                                                                            {inv.invoice_name || "—"}
                                                                        </td>
                                                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                                                            {getStatusBadge(inv.status)}
                                                                        </td>
                                                                        <td className="px-4 lg:px-6 py-4 text-[14px] text-right whitespace-nowrap text-gray-900 font-semibold">
                                                                            ₹ {fmt(inv.invoice_total)}
                                                                        </td>
                                                                        <td className="px-4 lg:px-6 py-4 text-[14px] text-right whitespace-nowrap text-emerald-600 font-medium">
                                                                            ₹ {fmt(inv.total_paid)}
                                                                        </td>
                                                                        <td className="px-4 lg:px-6 py-4 text-[14px] text-right whitespace-nowrap text-rose-600 font-semibold">
                                                                            ₹ {fmt(inv.due_amount)}
                                                                        </td>
                                                                        <td className="px-4 lg:px-6 py-4 text-center whitespace-nowrap">
                                                                            {hasPayments ? (
                                                                                <button
                                                                                    onClick={() => setActivePaymentInvoice(inv)}
                                                                                    className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-[#d1fae5] hover:border-emerald-300 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm"
                                                                                >
                                                                                    View Payments
                                                                                </button>
                                                                            ) : (
                                                                                <span className="text-gray-400">—</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <EmptyState
                                                    title="No Statements Found"
                                                    message="There are no invoice records for this customer statement within the selected filters."
                                                    actionLabel=""
                                                    onActionClick={() => { }}
                                                />
                                            )}
                                        </div>

                                        {/* Pagination */}
                                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                                            {allInvoices.length > pageSize && (
                                                <Pagination
                                                    currentPage={currentPage}
                                                    totalPages={totalPages}
                                                    totalItems={allInvoices.length}
                                                    pageSize={pageSize}
                                                    onPageChange={setCurrentPage}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
