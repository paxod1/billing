"use client";

import React, { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import Pagination from "@/components/commonComp/Pagination";
import { showToast } from "@/lib/features/toast/toastSlice";
import { openDeleteModal, closeDeleteModal, setDeleteLoading } from "@/lib/features/ui/uiSlice";
import { IoSearchOutline } from "react-icons/io5";
import { handleExport } from "@/utils/exportHelper";
import { FiFilter, FiDownload, FiPlus, FiMoreVertical, FiTrash2, FiLoader, FiX, FiPrinter, FiMail, FiFileText } from "react-icons/fi";
import ProformaInvoiceForm from "@/components/sales/ProformaInvoiceForm";
import ActionMenu from "@/components/commonComp/ActionMenu";
import CustomSelect from "@/components/common/CustomSelect";
import { partyService } from "@/services/partyService";
import { proformaInvoiceService } from "@/services/proformaInvoiceService";

export default function ProformaInvoicesPage() {
    return (
        <Suspense fallback={<Loader />}>
            <ProformaInvoicesContent />
        </Suspense>
    );
}

function ProformaInvoicesContent() {
    const dispatch = useDispatch();
    const [proformas, setProformas] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const actionButtonsRef = useRef({});
    const isMounted = useRef(false);
    const lastFetchParams = useRef("");

    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [searchInput, setSearchInput] = useState("");
    const [sendingProformas, setSendingProformas] = useState({});
    const [creatingInvoices, setCreatingInvoices] = useState({});
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [tempAmount, setTempAmount] = useState("");
    const [filters, setFilters] = useState({
        status: "",
        invoice_date: "",
        total_amount: "",
        search: ""
    });
    
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

    const fetchProformas = async (isSilent = false) => {
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

            const response = await proformaInvoiceService.getProformaInvoices({
                ...finalFilters,
                limit: pageSize,
                skip: (currentPage - 1) * pageSize
            });
            if (response.success) {
                setProformas(response.data);
                setTotalItems(response.totalCount);
            }
        } catch (error) {
            console.error("Error fetching proformas:", error);
            dispatch(showToast({ message: "Failed to fetch proforma invoices", type: "error" }));
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

    // Initial load
    useEffect(() => {
        fetchCustomers();
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => {
        if (isMounted.current) {
            setCurrentPage(1);
        }
    }, [filters]);

    // Single fetch effect
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            setIsInitialLoading(true);
            const startTime = Date.now();
            fetchProformas().then(() => {
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
        fetchProformas(true);
    }, [filters, currentPage]);

    const handleClearFilters = () => {
        setFilters({
            status: "",
            invoice_date: "",
            total_amount: "",
            search: ""
        });
        setSearchInput("");
        setTempAmount("");
    };

    const [isFormOpen, setIsFormOpen] = useState(false);

    // Auto-open form if resuming from customer add or create action
    useEffect(() => {
        const action = searchParams.get("action");
        if (action === "resume" || action === "create") {
            setIsFormOpen(true);
        }
    }, [searchParams]);

    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedProformas = proformas; // Already paginated from server

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const [editData, setEditData] = useState(null);
    const [isViewOnly, setIsViewOnly] = useState(false);

    const handleSaveProforma = (proformaId, actionType) => {
        if (actionType === "EMAIL_SENT" && proformaId) {
            setSendingProformas(prev => ({ ...prev, [proformaId]: true }));
            fetchProformas(true);
            setTimeout(() => {
                setSendingProformas(prev => {
                    const newSending = { ...prev };
                    delete newSending[proformaId];
                    return newSending;
                });
                fetchProformas(true);
            }, 1000);
        } else {
            fetchProformas(true);
        }
        setIsFormOpen(false);
        setEditData(null);
    };

    const handleMakeInvoice = async (pf) => {
        setOpenMenuId(null);
        try {
            await proformaInvoiceService.createInvoice(pf.id);
            dispatch(showToast({ message: "Invoice created successfully!", type: "success" }));
            // Mark row as "INVOICE CREATING..." — same pattern as email sending
            setCreatingInvoices(prev => ({ ...prev, [pf.id]: true }));
            // After 1 second: clear state & silently refresh table
            setTimeout(() => {
                setCreatingInvoices(prev => {
                    const next = { ...prev };
                    delete next[pf.id];
                    return next;
                });
                fetchProformas(true);
            }, 1000);
        } catch (error) {
            console.error("Error creating invoice:", error);
            dispatch(showToast({ message: "Failed to create invoice", type: "error" }));
        }
    };

    const handleSendToClientDirect = async (pf) => {
        setOpenMenuId(null);
        try {
            let customerEmail = "";
            let customerObj = null;

            if (Array.isArray(pf.customer_id) && pf.customer_id.length > 0) {
                customerObj = pf.customer_id[0];
            } else if (typeof pf.customer_id === "object" && pf.customer_id !== null) {
                customerObj = pf.customer_id;
            }

            if (customerObj) {
                customerEmail = customerObj.email || "";
            }

            if (!customerEmail) {
                const targetId = customerObj ? customerObj.id : pf.customer_id;
                const customer = customers.find(c => String(c.id) === String(targetId));
                customerEmail = customer?.email || "";
            }

            const emailData = {
                documentType: "PROFORMA_INVOICE",
                documentId: pf.id,
                email: {
                    to: customerEmail || "",
                    cc: [],
                    bcc: [],
                    message: ""
                }
            };
            setSendingProformas(prev => ({ ...prev, [pf.id]: true }));
            const response = await proformaInvoiceService.sendProformaEmail(emailData);
            if (response && response.success === false) {
                throw new Error(response.message || "Failed to send email");
            }
            dispatch(showToast({ message: "Proforma Invoice sent to client successfully!", type: "success" }));
            setTimeout(() => {
                setSendingProformas(prev => {
                    const newSending = { ...prev };
                    delete newSending[pf.id];
                    return newSending;
                });
                fetchProformas(true);
            }, 1000);
        } catch (error) {
            console.error("Error sending proforma email:", error);
            dispatch(showToast({ message: error.message || "Failed to send email to client", type: "error" }));
            setSendingProformas(prev => {
                const newSending = { ...prev };
                delete newSending[pf.id];
                return newSending;
            });
        }
    };


    const handleDeleteClick = (pf) => {
        setOpenMenuId(null);
        dispatch(openDeleteModal({
            title: `Delete Proforma Invoice`,
            message: `Are you sure you want to delete proforma invoice ${pf.invoice_number}? This action cannot be undone.`,
            onConfirm: () => handleDeleteConfirm(pf.id),
        }));
    };

    const handleDeleteConfirm = async (id) => {
        try {
            dispatch(setDeleteLoading(true));
            await proformaInvoiceService.deleteProformaInvoice(id);
            dispatch(showToast({ message: "Proforma Invoice deleted successfully", type: "success" }));
            fetchProformas(true);
            dispatch(closeDeleteModal());
        } catch (error) {
            console.error("Error deleting proforma:", error);
            dispatch(showToast({ message: "Failed to delete proforma invoice", type: "error" }));
        } finally {
            dispatch(setDeleteLoading(false));
            setOpenMenuId(null);
        }
    };

    const handleEdit = async (pf) => {
        try {
            setIsLoading(true);
            const response = await proformaInvoiceService.getProformaInvoiceById(pf.id);
            if (response.success) {
                setEditData(response.data);
                setIsViewOnly(false);
                setIsFormOpen(true);
            } else {
                dispatch(showToast({ message: response.message || "Failed to fetch proforma data", type: "error" }));
            }
        } catch (error) {
            console.error("Error fetching proforma for edit:", error);
            dispatch(showToast({ message: "Error fetching proforma data", type: "error" }));
        } finally {
            setIsLoading(false);
            setOpenMenuId(null);
        }
    };

    const handleView = async (pf) => {
        try {
            setIsLoading(true);
            const response = await proformaInvoiceService.getProformaInvoiceById(pf.id);
            if (response.success) {
                setEditData(response.data);
                setIsViewOnly(true);
                setIsFormOpen(true);
            } else {
                dispatch(showToast({ message: response.message || "Failed to fetch proforma data", type: "error" }));
            }
        } catch (error) {
            console.error("Error fetching proforma for view:", error);
            dispatch(showToast({ message: "Error fetching proforma data", type: "error" }));
        } finally {
            setIsLoading(false);
            setOpenMenuId(null);
        }
    };

    const handleAddNew = () => {
        setEditData(null);
        setIsViewOnly(false);
        setIsFormOpen(true);
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

    const navbarData = {
        heading: "Proforma Invoice",
        subheading: "Non-binding invoice issued for approval and confirmation",
        from: "common",
    };

    const getStatusColor = (status) => {
        const s = status?.toUpperCase()?.replace(/_/g, " ");
        switch (s) {
            case "PAID":
            case "FULLY PAID":
            case "ACCEPTED":
            case "COMPLETED":
            case "INVOICE CREATED":
                return "bg-green-50 text-green-600 border-green-100";
            case "PARTIALLY PAID":
            case "SENDING...":
            case "SENDING..":
            case "SENDING":
            case "INVOICE CREATING...":
            case "PROFORMA CREATED":
                return "bg-amber-50 text-amber-600 border-amber-100";
            case "SENT":
                return "bg-blue-50 text-blue-600 border-blue-100";
            case "UNPAID":
            case "CANCELLED":
            case "REJECTED":
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
                    <Loader message="Loading Proforma Invoices..." />
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
                                            placeholder="Search by customer name.."
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
                                            endpoint: "custom-api/admin/proforma/proforma_export",
                                            dispatch,
                                            setIsExporting,
                                            defaultFileName: "proforma_invoices_export.xlsx"
                                        })}
                                        disabled={isExporting}
                                        className="flex-1 sm:flex-none px-4 py-2.5 cursor-pointer bg-white border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-medium hover:bg-[#d9ac00]/5 flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-50"
                                    >
                                        {isExporting ? <FiLoader className="animate-spin" size={16} /> : <FiDownload size={16} />}
                                        {isExporting ? "Exporting..." : "Export"}
                                    </button>
                                    <button
                                        onClick={handleAddNew}
                                        className="flex-1 sm:flex-none px-4 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 min-w-[140px] cursor-pointer hover:bg-[#d9ac00]"
                                    >
                                        Add New Invoice <FiPlus size={18} />
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
                                        ]}
                                        placeholder="Select status"
                                        isClearable
                                    />
                                </div>
                                <div className="flex-1 min-w-[140px]">
                                    <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={filters.invoice_date}
                                        onChange={(e) => setFilters(prev => ({ ...prev, invoice_date: e.target.value }))}
                                        className={`w-full cursor-pointer px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors ${!filters.invoice_date ? "text-gray-400" : "text-gray-900"}`}
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
                        {paginatedProformas.length > 0 ? (
                            <div className="overflow-x-auto">
                                <div className="min-w-[700px] lg:min-w-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">
                                                    Proforma No
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
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">
                                                    Amount
                                                </th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {paginatedProformas.map((pf) => (
                                                <tr key={pf.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {pf.invoice_number}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                                        {(() => {
                                                        const isSending = sendingProformas[pf.id];
                                                        const isCreating = creatingInvoices[pf.id];
                                                        const displayStatus = isCreating
                                                            ? "INVOICE CREATING..."
                                                            : isSending
                                                            ? "sending.."
                                                            : (pf.status || "N/A");
                                                        return (
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getStatusColor(displayStatus)}`}>
                                                                {displayStatus.replace(/_/g, " ")}
                                                            </span>
                                                        );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {getCustomerName(pf.customer_id)}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {pf.invoice_date ? new Date(pf.invoice_date).toLocaleDateString() : "-"}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap text-right">
                                                        ₹ {parseFloat(pf.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-center relative whitespace-nowrap">
                                                        <button
                                                            ref={el => actionButtonsRef.current[pf.id] = el}
                                                            onClick={(e) => handleActionButtonClick(e, pf.id)}
                                                            className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === pf.id ? "border-blue-500 bg-blue-50 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                                                            aria-label="More actions"
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
                                title="No Proforma Invoices Found"
                                message={filters.search ? `No customers match your search "${filters.search}".` : "Start by creating your first proforma invoice."}
                                actionLabel="Add New Invoice"
                                onActionClick={handleAddNew}
                            />
                        )}
                    </div>

                    {/* Pagination */}
                    {totalItems > 0 && (
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
                        const pf = paginatedProformas.find(p => p.id === openMenuId);
                        const isDraft = ["DRAFT", "IMPORTED"].includes(pf?.status?.toUpperCase() || "DRAFT");
                        const isSent  = pf?.status?.toUpperCase() === "SENT";
                        const isSending = sendingProformas[pf?.id];
                        const isCreating = creatingInvoices[pf?.id];
                        const canMakeInvoice = (isDraft || isSent) && !isCreating;

                        return (
                            <ActionMenu
                                isOpen={true}
                                onClose={() => setOpenMenuId(null)}
                                onView={() => handleView(pf)}
                                onEdit={isDraft && !isSending ? () => handleEdit(pf) : null}
                                onDelete={isDraft && !isSending ? () => handleDeleteClick(pf) : null}
                                actions={[
                                    {
                                        label: isSending ? "Sending..." : "Send to Client",
                                        icon: isSending
                                            ? <FiLoader size={16} className="animate-spin" />
                                            : <FiMail size={16} />,
                                        onClick: () => handleSendToClientDirect(pf),
                                        disabled: isSending || isCreating,
                                        hide: !isDraft,
                                    },
                                    {
                                        label: isCreating ? "Invoice Creating..." : "Make Invoice",
                                        icon: isCreating
                                            ? <FiLoader size={16} className="animate-spin" />
                                            : <FiFileText size={16} />,
                                        onClick: () => handleMakeInvoice(pf),
                                        disabled: !canMakeInvoice || isCreating,
                                        hide: false,
                                    }
                                ]}
                            />
                        );
                    })()}
                </div>
            )}
            <ProformaInvoiceForm
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditData(null);
                    setIsViewOnly(false);
                }}
                onSave={handleSaveProforma}
                editData={editData}
                isViewOnly={isViewOnly}
            />
        </div>
    );
}