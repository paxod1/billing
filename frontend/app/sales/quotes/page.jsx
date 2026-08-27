"use client";

import React, { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import Pagination from "@/components/commonComp/Pagination";
import { showToast } from "@/lib/features/toast/toastSlice";
import { IoSearchOutline } from "react-icons/io5";

import SalesQuoteForm from "@/components/sales/SalesQuoteForm";
import ActionMenu from "@/components/commonComp/ActionMenu";
import CustomSelect from "@/components/common/CustomSelect";
import { handleExport } from "@/utils/exportHelper";
import { FiFilter, FiDownload, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiLoader, FiX, FiEye, FiMail } from "react-icons/fi";
import { partyService } from "@/services/partyService";

export default function SalesQuotesPage() {
    return (
        <Suspense fallback={<Loader />}>
            <SalesQuotesContent />
        </Suspense>
    );
}

import { salesQuoteService } from "@/services/salesQuoteService";

function SalesQuotesContent() {
    const dispatch = useDispatch();
    const [quotes, setQuotes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const actionButtonsRef = useRef({});
    const isMounted = useRef(false);
    const lastFetchParams = useRef("");
    const [selectedQuote, setSelectedQuote] = useState(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [sendingQuotes, setSendingQuotes] = useState({});
    const [searchInput, setSearchInput] = useState("");
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [tempAmount, setTempAmount] = useState("");
    const [filters, setFilters] = useState({
        status: "",
        expiry_date: "",
        quote_date: "",
        total_amount: "",
        search: ""
    });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [quoteToDelete, setQuoteToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [openMenuId, setOpenMenuId] = useState(null);
    const searchParams = useSearchParams();
    const pageSize = 10;

    const fetchCustomers = async () => {
        try {
            const data = await partyService.queryParties("CUSTOMER");
            setCustomers(data);
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    };

    const fetchQuotes = async (isSilent = false) => {
        try {
            const params = JSON.stringify({ ...filters, currentPage });
            if (params === lastFetchParams.current && !isSilent) return;
            lastFetchParams.current = params;

            if (!isSilent) setIsLoading(true);
            if (isSilent) setIsFilterLoading(true);

            // Customer Name -> ID mapping for restricted search
            let finalFilters = { ...filters };
            if (filters.search && filters.search.trim() !== "") {
                const searchVal = filters.search.toLowerCase().trim();
                const matchingCustomerIds = customers
                    .filter(c => c.name?.toLowerCase().includes(searchVal))
                    .map(c => c.id);

                // If no customers match, pass a dummy ID to ensure no results
                finalFilters.customer_ids = matchingCustomerIds.length > 0 ? matchingCustomerIds : [-1];
                delete finalFilters.search;
            }

            const response = await salesQuoteService.getSalesQuotes({
                ...finalFilters,
                limit: pageSize,
                skip: (currentPage - 1) * pageSize
            });
            setQuotes(response.data);
            setTotalItems(response.totalCount);
        } catch (error) {
            console.error("Error fetching quotes:", error);
            dispatch(showToast({ message: "Failed to load sales quotes", type: "error" }));
        } finally {
            setIsLoading(false);
            setIsFilterLoading(false);
        }
    };

    // Instant search - call API on every keystroke via filter update
    useEffect(() => {
        setFilters(prev => {
            if (prev.search === searchInput) return prev;
            return { ...prev, search: searchInput };
        });
    }, [searchInput]);

    // Reset page to 1 when filters change
    useEffect(() => {
        if (isMounted.current) {
            setCurrentPage(1);
        }
    }, [filters]);

    // Initial load: fetch customers
    useEffect(() => {
        fetchCustomers();
    }, []);

    // Single unified fetch effect
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            setIsInitialLoading(true);
            const startTime = Date.now();
            fetchQuotes().then(() => {
                const elapsed = Date.now() - startTime;
                const minTime = 1000; // 1 second minimum
                if (elapsed < minTime) {
                    setTimeout(() => setIsInitialLoading(false), minTime - elapsed);
                } else {
                    setIsInitialLoading(false);
                }
            });
            return;
        }
        fetchQuotes(true);
    }, [filters, currentPage]);

    // Auto-open form if resuming from customer add or create action
    useEffect(() => {
        const action = searchParams.get("action");
        if (action === "resume" || action === "create") {
            setIsFormOpen(true);
        }
    }, [searchParams]);

    const handleClearFilters = () => {
        setFilters({
            status: "",
            expiry_date: "",
            quote_date: "",
            total_amount: "",
            search: ""
        });
        setSearchInput("");
        setTempAmount("");
    };

    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedQuotes = quotes; // Already paginated from server

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const handleSaveQuote = (quoteId, actionType) => {
        if (actionType === "EMAIL_SENT" && quoteId) {
            setSendingQuotes(prev => ({ ...prev, [quoteId]: true }));
            fetchQuotes(true);
            setTimeout(() => {
                setSendingQuotes(prev => {
                    const newSending = { ...prev };
                    delete newSending[quoteId];
                    return newSending;
                });
                fetchQuotes(true);
            }, 1000);
        } else {
            fetchQuotes(true);
        }
        setIsFormOpen(false);
    };

    const handleActionButtonClick = (e, id) => {
        e.stopPropagation();

        // Get the position of the clicked button
        const rect = e.currentTarget.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        const scrollX = window.scrollX || window.pageXOffset;

        // Position menu below the button
        setMenuPosition({
            x: rect.left + scrollX + rect.width / 2,
            y: rect.bottom + scrollY
        });

        setOpenMenuId(openMenuId === id ? null : id);
    };

    const handleEditClick = (quote) => {
        setSelectedQuote(quote);
        setIsViewOnly(false);
        setIsFormOpen(true);
        setOpenMenuId(null);
    };

    const handleViewClick = (quote) => {
        setSelectedQuote(quote);
        setIsViewOnly(true);
        setIsFormOpen(true);
        setOpenMenuId(null);
    };

    const handleSendToClientDirect = async (quote) => {
        setOpenMenuId(null);
        try {
            let customerEmail = "";
            let customerObj = null;

            if (Array.isArray(quote.customer_id) && quote.customer_id.length > 0) {
                customerObj = quote.customer_id[0];
            } else if (typeof quote.customer_id === "object" && quote.customer_id !== null) {
                customerObj = quote.customer_id;
            }

            if (customerObj) {
                customerEmail = customerObj.email || "";
            }

            if (!customerEmail) {
                const targetId = customerObj ? customerObj.id : quote.customer_id;
                const customer = customers.find(c => String(c.id) === String(targetId));
                customerEmail = customer?.email || "";
            }

            const emailData = {
                documentType: "QUOTE",
                documentId: Number(quote.id),
                email: {
                    to: customerEmail || "",
                    cc: [],
                    bcc: [],
                    message: ""
                }
            };
            setSendingQuotes(prev => ({ ...prev, [quote.id]: true }));
            const response = await salesQuoteService.sendQuoteEmail(emailData);
            if (response && response.success === false) {
                throw new Error(response.message || "Failed to send email");
            }
            dispatch(showToast({ message: "Sales Quote sent to client successfully!", type: "success" }));
            setTimeout(() => {
                setSendingQuotes(prev => {
                    const newSending = { ...prev };
                    delete newSending[quote.id];
                    return newSending;
                });
                fetchQuotes(true);
            }, 1000);
        } catch (error) {
            console.error("Error sending quote email:", error);
            dispatch(showToast({ message: error.message || "Failed to send email to client", type: "error" }));
            setSendingQuotes(prev => {
                const newSending = { ...prev };
                delete newSending[quote.id];
                return newSending;
            });
        }
    };

    const handleDeleteClick = (quote) => {
        setQuoteToDelete(quote);
        setIsDeleteModalOpen(true);
        setOpenMenuId(null);
    };

    const handleDeleteQuote = async () => {
        if (!quoteToDelete) return;
        try {
            setIsDeleting(true);
            await salesQuoteService.deleteQuote(quoteToDelete.id);
            dispatch(showToast({ message: "Sales quote deleted successfully", type: "success" }));
            setIsDeleteModalOpen(false);
            setQuoteToDelete(null);
            fetchQuotes(true);
        } catch (error) {
            console.error("Delete Error:", error);
            dispatch(showToast({ message: "Failed to delete sales quote", type: "error" }));
        } finally {
            setIsDeleting(false);
        }
    };

    const navbarData = {
        heading: "Sales Quotes",
        subheading: "Create and manage sales quotes",
        from: "common",
    };

    const getStatusColor = (status) => {
        const s = status?.toUpperCase()?.replace(/_/g, " ");
        switch (s) {
            case "ACCEPTED":
            case "FULLY PAID":
            case "COMPLETED":
            case "INVOICE CREATED":
                return "bg-green-50 text-green-600 border-green-100";
            case "SENDING...":
            case "SENDING..":
            case "SENDING":
            case "PROFORMA CREATED":
                return "bg-amber-50 text-amber-600 border-amber-100";
            case "SENT":
                return "bg-blue-50 text-blue-600 border-blue-100";
            case "REJECTED":
            case "CANCELLED":
                return "bg-red-50 text-red-600 border-red-100";
            case "DRAFT":
                return "bg-gray-50 text-gray-600 border-gray-100";
            default:
                return "bg-gray-50 text-gray-500 border-gray-100";
        }
    };

    // Helper to get customer name from ID or nested object
    const getCustomerName = (customerId) => {
        if (typeof customerId === 'object' && customerId !== null) {
            return customerId.name || "N/A";
        }
        const customer = customers.find(c => String(c.id) === String(customerId));
        return customer?.name || "N/A";
    };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />

            {isInitialLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message="Loading Sales Quotes..." />
                </div>
            ) : (
                <main className="flex-1 flex flex-col py-6 md:py-8">
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
                                            placeholder="Search by customer name only..."
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] hover:border-[#FFCA00] placeholder-gray-400 text-[14px] bg-white transition-colors"
                                        />
                                    </div>
                                </div>

                                { /* Action Buttons */}
                                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => setIsFilterVisible(true)}
                                        className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-200 text-black rounded-lg text-[14px] font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <FiFilter size={16} /> Filter
                                    </button>
                                    <button
                                        onClick={() => handleExport({
                                            endpoint: "custom-api/admin/sales_quot/quotes_export",
                                            dispatch,
                                            setIsExporting,
                                            defaultFileName: "sales_quotes_export.xlsx"
                                        })}
                                        disabled={isExporting}
                                        className="flex-1 sm:flex-none px-4 py-2.5 cursor-pointer bg-white border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-medium hover:bg-[#d9ac00]/5 flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-50"
                                    >
                                        {isExporting ? <FiLoader className="animate-spin" size={16} /> : <FiDownload size={16} />}
                                        {isExporting ? "Exporting..." : "Export"}
                                    </button>
                                    <button
                                        onClick={() => setIsFormOpen(true)}
                                        className="flex-1 sm:flex-none px-4 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium hover:bg-[#d9ac00] flex items-center justify-center gap-2 min-w-[140px] cursor-pointer"
                                    >
                                        Add New Quote <FiPlus size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-end gap-4">
                                <div className="flex-1 min-w-[180px]">
                                    <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Filter by Status</label>
                                    <CustomSelect
                                        value={filters.status}
                                        onChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
                                        options={[
                                            { value: "DRAFT", label: "Draft" },
                                            { value: "SENT", label: "Sent" },
                                            { value: "PROFORMA_CREATED", label: "Proforma Created" },
                                            { value: "INVOICE_CREATED", label: "Invoice Created" },
                                            { value: "REJECTED", label: "Rejected" },
                                        ]}
                                        placeholder="Select status"
                                        isClearable
                                    />
                                </div>
                                <div className="flex-1 min-w-[140px]">
                                    <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Expiry Date</label>
                                    <input
                                        type="date"
                                        value={filters.expiry_date}
                                        onChange={(e) => setFilters(prev => ({ ...prev, expiry_date: e.target.value }))}
                                        className={`w-full cursor-pointer px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors ${!filters.expiry_date ? "text-gray-400" : "text-gray-900"}`}
                                    />
                                </div>
                                <div className="flex-1 min-w-[140px]">
                                    <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Quote Date</label>
                                    <input
                                        type="date"
                                        value={filters.quote_date}
                                        onChange={(e) => setFilters(prev => ({ ...prev, quote_date: e.target.value }))}
                                        className={`w-full cursor-pointer px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors ${!filters.quote_date ? "text-gray-400" : "text-gray-900"}`}
                                    />
                                </div>
                                <div className="flex-1 min-w-[180px]">
                                    <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Amount</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={tempAmount}
                                            onChange={(e) => setTempAmount(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && setFilters(prev => ({ ...prev, total_amount: tempAmount }))}
                                            placeholder="Enter amount"
                                            className="w-full cursor-pointer pl-3 pr-10 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] placeholder-gray-400 bg-white transition-colors"
                                        />
                                        <button
                                            onClick={() => setFilters(prev => ({ ...prev, total_amount: tempAmount }))}
                                            className="absolute cursor-pointer right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-[#FFCA00] text-white rounded-md hover:bg-[#d9ac00]"
                                            title="Search"
                                        >
                                            <IoSearchOutline size={15} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pb-0.5 ml-auto">
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-gray-400 cursor-pointer hover:text-red-500 transition-colors p-1.5 bg-white border border-gray-200 rounded-lg"
                                        title="Reset Filters"
                                    >
                                        <FiX size={18} />
                                    </button>
                                    <button
                                        onClick={() => setIsFilterVisible(false)}
                                        className="px-4 py-2 cursor-pointer bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Back
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table Content */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                        {/* Small filter loading spinner */}
                        {isFilterLoading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg">
                                <div className="w-8 h-8 border-3 border-[#FFCA00] border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                        {paginatedQuotes.length > 0 ? (
                            <div className="overflow-x-auto">
                                <div className="min-w-[700px] lg:min-w-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">
                                                    Quote No
                                                </th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">
                                                    Status
                                                </th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">
                                                    Customer
                                                </th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">
                                                    Date
                                                </th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">
                                                    Expiry Date
                                                </th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">
                                                    Amount
                                                </th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {paginatedQuotes.map((quote) => (
                                                <tr 
                                                    key={quote.id} 
                                                    className="hover:bg-gray-50 transition-colors"
                                                >
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {quote.invoice_number || quote.quote_number}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                                        {(() => {
                                                            const isSending = sendingQuotes[quote.id];
                                                            const displayStatus = isSending ? "sending.." : (quote.status || "N/A");
                                                            return (
                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getStatusColor(displayStatus)}`}>
                                                                    {displayStatus.replace(/_/g, " ")}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {getCustomerName(quote.customer_id)}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {quote.invoice_date ? new Date(quote.invoice_date).toLocaleDateString() : (quote.quote_date ? new Date(quote.quote_date).toLocaleDateString() : "N/A")}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString() : "-"}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap text-right">
                                                        ₹ {parseFloat(quote.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-center relative whitespace-nowrap">
                                                        <button
                                                            ref={el => actionButtonsRef.current[quote.id] = el}
                                                            onClick={(e) => handleActionButtonClick(e, quote.id)}
                                                            className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === quote.id ? "border-[#FFCA00] bg-white text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                                                        >
                                                            <FiMoreVertical size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <EmptyState
                                title="No Quotes Found"
                                message={filters.search ? `No customers match your search "${filters.search}".` : "Start by creating your first sales quote."}
                                actionLabel="Add New Quote"
                                onActionClick={() => setIsFormOpen(true)}
                            />
                        )}
                    </div>

                    {/* Pagination */}
                    {quotes.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </div>
            </main>
            )}

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
                    {(() => {
                                const quote = quotes.find(q => q.id === openMenuId);
                                const isDraft = ["DRAFT", "IMPORTED"].includes((quote?.status || "DRAFT").toUpperCase());
                                const isSending = sendingQuotes[quote?.id];

                                return (
                                    <ActionMenu
                                        isOpen={true}
                                        onClose={() => setOpenMenuId(null)}
                                        onView={() => handleViewClick(quote)}
                                        onEdit={isDraft && !isSending ? () => handleEditClick(quote) : null}
                                        onDelete={isDraft && !isSending ? () => handleDeleteClick(quote) : null}
                                        actions={[
                                            {
                                                label: isSending ? "Sending..." : "Send to Client",
                                                icon: <FiMail size={16} />,
                                                onClick: () => handleSendToClientDirect(quote),
                                                disabled: isSending,
                                                hide: !isDraft
                                            }
                                        ]}
                                    />
                                );
                    })()}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsDeleteModalOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <FiTrash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Delete Sales Quote</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Are you sure you want to delete quote <span className="font-bold">{quoteToDelete?.quote_number}</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="mt-6 flex gap-3 justify-center">
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setQuoteToDelete(null);
                                }}
                                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteQuote}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg shadow-red-500/30 cursor-pointer disabled:opacity-50"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SalesQuoteForm
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelectedQuote(null);
                    setIsViewOnly(false);
                }}
                onSave={handleSaveQuote}
                editData={selectedQuote}
                viewOnly={isViewOnly}
            />
        </div>
    );
}
