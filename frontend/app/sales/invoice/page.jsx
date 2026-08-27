"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import Pagination from "@/components/commonComp/Pagination";
import { showToast } from "@/lib/features/toast/toastSlice";
import { IoSearchOutline } from "react-icons/io5";
import { FiFilter, FiDownload, FiPlus, FiMoreVertical, FiTrash2, FiLoader, FiX, FiCreditCard, FiPrinter, FiMail } from "react-icons/fi";
import SalesInvoiceForm from "@/components/sales/SalesInvoiceForm";
import ActionMenu from "@/components/commonComp/ActionMenu";
import CustomSelect from "@/components/common/CustomSelect";
import { handleExport } from "@/utils/exportHelper";
import { salesInvoiceService } from "@/services/salesInvoiceService";
import { salesPaymentService } from "@/services/salesPaymentService";
import PaymentPromptModal from "@/components/common/PaymentPromptModal";
import { generateUniqueId } from "@/utils/idGenerator";
import { partyService } from "@/services/partyService";

export default function SalesInvoicesPage() {
    return (
        <Suspense fallback={<Loader />}>
            <SalesInvoicesContent />
        </Suspense>
    );
}

function SalesInvoicesContent() {
    const dispatch = useDispatch();
    const [invoices, setInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const actionButtonsRef = useRef({});
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [formMode, setFormMode] = useState("edit"); // "edit" or "payment"
    const [isFetchingEdit, setIsFetchingEdit] = useState(false);
    const [isPaymentPromptOpen, setIsPaymentPromptOpen] = useState(false);
    const [promptAmount, setPromptAmount] = useState(0);
    const pendingPaymentDetails = useRef(null);
    const activeInvoiceForSend = useRef(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [sendingInvoices, setSendingInvoices] = useState({});
    const [searchInput, setSearchInput] = useState("");
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [tempAmount, setTempAmount] = useState("");
    const [filters, setFilters] = useState({
        status: "",
        total_amount: "",
        customer_id: "",
        invoice_date: "",
        search: ""
    });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [openMenuId, setOpenMenuId] = useState(null);
    const searchParams = useSearchParams();
    const pageSize = 10;

    const fetchInvoices = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);
            if (isSilent) setIsFilterLoading(true);
            const response = await salesInvoiceService.getSalesInvoices({
                ...filters,
                limit: pageSize,
                skip: (currentPage - 1) * pageSize
            });
            setInvoices(response.data);
            setTotalItems(response.totalCount);
        } catch (error) {
            console.error("Error fetching invoices:", error);
            dispatch(showToast({ message: "Failed to load sales invoices", type: "error" }));
        } finally {
            if (!isSilent) setIsLoading(false);
            setIsFilterLoading(false);
            setIsFirstLoad(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const data = await partyService.queryParties("CUSTOMER");
            setCustomers(data);
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    };

    // Instant search - call API on every keystroke via filter update
    useEffect(() => {
        setFilters(prev => ({ ...prev, search: searchInput }));
    }, [searchInput]);

    useEffect(() => {
        // Reset to page 1 when filters change
        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
            fetchInvoices(!isFirstLoad);
        }
    }, [filters]);

    useEffect(() => {
        fetchInvoices(!isFirstLoad);
    }, [currentPage]);

    useEffect(() => {
        fetchCustomers();
    }, []);

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
            total_amount: "",
            customer_id: "",
            invoice_date: "",
            search: ""
        });
        setSearchInput("");
        setTempAmount("");
    };

    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedInvoices = invoices;

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const handleSaveInvoice = (invoiceId, actionType) => {
        if (actionType === "EMAIL_SENT" && invoiceId) {
            setSendingInvoices(prev => ({ ...prev, [invoiceId]: true }));
            fetchInvoices(true);
            setTimeout(() => {
                setSendingInvoices(prev => {
                    const newSending = { ...prev };
                    delete newSending[invoiceId];
                    return newSending;
                });
                fetchInvoices(true);
            }, 1000);
        } else {
            fetchInvoices(true);
        }
        setIsFormOpen(false);
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

    const handleEditClick = async (invoice) => {
        setOpenMenuId(null);
        try {
            setIsFetchingEdit(true);
            const result = await salesInvoiceService.getInvoiceByIdDeep(invoice.id);
            if (result?.success && result?.data) {
                setSelectedInvoice(result.data);
            } else {
                setSelectedInvoice(invoice);
            }
        } catch (err) {
            console.error("Error fetching deep invoice:", err);
            setSelectedInvoice(invoice);
        } finally {
            setIsFetchingEdit(false);
        }
        setFormMode("edit");
        setIsFormOpen(true);
    };

    const handleViewClick = (invoice) => {
        setSelectedInvoice(invoice);
        setFormMode("view");
        setIsFormOpen(true);
        setOpenMenuId(null);
    };

    const handlePaymentUpdateClick = (invoice) => {
        setSelectedInvoice(invoice);
        setFormMode("payment");
        setIsFormOpen(true);
        setOpenMenuId(null);
    };

    const handleDeleteClick = (invoice) => {
        setInvoiceToDelete(invoice);
        setIsDeleteModalOpen(true);
        setOpenMenuId(null);
    };

    const handleDeleteInvoice = async () => {
        if (!invoiceToDelete) return;
        try {
            setIsDeleting(true);
            await salesInvoiceService.deleteInvoice(invoiceToDelete.id);
            dispatch(showToast({ message: "Sales invoice deleted successfully", type: "success" }));
            setIsDeleteModalOpen(false);
            setInvoiceToDelete(null);
            fetchInvoices(true);
        } catch (error) {
            console.error("Delete Error:", error);
            dispatch(showToast({ message: "Failed to delete sales invoice", type: "error" }));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSendToClientDirect = async (invoice) => {
        setOpenMenuId(null);
        try {
            let customerEmail = "";
            let customerObj = null;

            if (Array.isArray(invoice.customer_id) && invoice.customer_id.length > 0) {
                customerObj = invoice.customer_id[0];
            } else if (typeof invoice.customer_id === "object" && invoice.customer_id !== null) {
                customerObj = invoice.customer_id;
            }

            if (customerObj) {
                customerEmail = customerObj.email || "";
            }

            if (!customerEmail) {
                const targetId = customerObj ? customerObj.id : invoice.customer_id;
                const customer = customers.find(c => String(c.id) === String(targetId));
                customerEmail = customer?.email || "";
            }

            const emailData = {
                documentType: "SALES_INVOICE",
                documentId: invoice.id,
                email: {
                    to: customerEmail || "",
                    cc: [],
                    bcc: [],
                    message: ""
                }
            };
            setSendingInvoices(prev => ({ ...prev, [invoice.id]: true }));
            const response = await salesInvoiceService.sendInvoiceEmail(emailData);
            if (response && response.success === false) {
                throw new Error(response.message || "Failed to send email");
            }
            dispatch(showToast({ message: "Sales Invoice sent to client successfully!", type: "success" }));

            // Silently create the payment if pending payment details exist
            if (pendingPaymentDetails.current && invoice.id) {
                const { amountPaid, paymentMode } = pendingPaymentDetails.current;
                pendingPaymentDetails.current = null; // Clear to prevent double trigger

                // We need to fetch the deep invoice details to get the items
                salesInvoiceService.getInvoiceByIdDeep(invoice.id).then(res => {
                    if (res?.success && res?.data) {
                        const deepInv = res.data;
                        const itemsList = Array.isArray(deepInv.sales_item) ? deepInv.sales_item : [];
                        let customerIdVal = null;
                        if (Array.isArray(invoice.customer_id) && invoice.customer_id.length > 0) {
                            customerIdVal = invoice.customer_id[0].id || invoice.customer_id[0];
                        } else if (typeof invoice.customer_id === "object" && invoice.customer_id !== null) {
                            customerIdVal = invoice.customer_id.id;
                        } else {
                            customerIdVal = invoice.customer_id;
                        }
                        
                        const paymentPayload = {
                            payment_number: generateUniqueId("PAY"),
                            payment_name: `Payment for ${invoice.invoice_number}`,
                            customer_id: Number(customerIdVal),
                            invoice_id: invoice.id,
                            payment_date: new Date().toISOString().split('T')[0],
                            payment_mode: paymentMode,
                            amount: amountPaid.toFixed(2),
                            due_amount: (invoice.total_amount - amountPaid).toFixed(2),
                            notes: "Auto-recorded payment on invoice send.",
                            attachmentkey: null,
                            status: "DRAFT",
                            items: itemsList.map(item => ({
                                source_type: item.source_type || "item",
                                quantity: parseFloat(item.quantity) || 0,
                                rate: parseFloat(item.rate) || 0,
                                tax_percent: parseFloat(item.tax_percent) || 0,
                                amount: parseFloat(item.amount) || 0,
                                tax_id: item.tax_id ? Number(item.tax_id) : null,
                                item_id: Number(item.item_id || item.source_id),
                                source_id: Number(item.source_id || item.item_id),
                                description: item.description || "",
                                production_cost: 0
                            }))
                        };

                        salesPaymentService.createPayment(paymentPayload).then((res) => {
                            console.log("Silent payment recorded successfully on client send.");
                            const paymentId = res?.data?.data?.id || res?.data?.id || res?.data?.[0]?.id || res?.id;
                            if (paymentId) {
                                const emailPayload = {
                                    documentType: "SALES_PAYMENT",
                                    documentId: paymentId,
                                    email: {
                                        to: customerEmail || "",
                                        cc: [],
                                        bcc: [],
                                        message: ""
                                    }
                                };
                                salesPaymentService.sendPaymentEmail(emailPayload).then(() => {
                                    console.log("Silent payment email sent successfully on client send.");
                                }).catch(e => {
                                    console.error("Silent payment email sending failed on client send:", e);
                                });
                            }
                        }).catch(e => {
                            console.error("Silent payment failed on client send:", e);
                        });
                    }
                }).catch(err => {
                    console.error("Failed to fetch invoice details for silent payment:", err);
                });
            }

            setTimeout(() => {
                setSendingInvoices(prev => {
                    const newSending = { ...prev };
                    delete newSending[invoice.id];
                    return newSending;
                });
                fetchInvoices(true);
            }, 1000);
        } catch (error) {
            console.error("Error sending invoice email:", error);
            dispatch(showToast({ message: error.message || "Failed to send email to client", type: "error" }));
            setSendingInvoices(prev => {
                const newSending = { ...prev };
                delete newSending[invoice.id];
                return newSending;
            });
        }
    };

    const handleSendToClientClick = (invoice) => {
        activeInvoiceForSend.current = invoice;
        setPromptAmount(invoice.total_amount);
        setIsPaymentPromptOpen(true);
    };

    const handlePaymentPromptConfirm = ({ paymentStatus, amountPaid, paymentMode }) => {
        setIsPaymentPromptOpen(false);
        if (paymentStatus !== "UNPAID") {
            pendingPaymentDetails.current = { amountPaid, paymentMode };
        } else {
            pendingPaymentDetails.current = null;
        }
        if (activeInvoiceForSend.current) {
            handleSendToClientDirect(activeInvoiceForSend.current);
        }
    };

    const navbarData = {
        heading: "Sales Invoices",
        subheading: "Create and manage sales invoices",
        from: "common",
    };

    const getStatusColor = (status) => {
        const s = status?.toUpperCase()?.replace(/_/g, " ");
        switch (s) {
            case "PAID":
            case "FULLY PAID":
            case "COMPLETED":
                return "bg-green-50 text-green-600 border-green-100";
            case "PARTIALLY PAID":
            case "SENDING...":
            case "SENDING..":
            case "SENDING":
                return "bg-amber-50 text-amber-600 border-amber-100";
            case "SENT":
                return "bg-blue-50 text-blue-600 border-blue-100";
            case "UNPAID":
            case "CANCELLED":
                return "bg-red-50 text-red-600 border-red-100";
            case "DRAFT":
                return "bg-gray-50 text-gray-600 border-gray-100";
            case "INVOICE CREATED":
                return "bg-purple-50 text-purple-600 border-purple-100";
            case "PROFORMA CREATED":
                return "bg-indigo-50 text-indigo-600 border-indigo-100";
            default:
                return "bg-gray-50 text-gray-500 border-gray-100";
        }
    };

    // Get customer name from ID or nested object
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

            <main className="flex-1 flex flex-col py-6 md:py-8">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <Loader message="Loading Sales Invoices..." />
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
                                                    placeholder="Search by invoice no or name..."
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
                                                <FiFilter size={16} /> Filter
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        setIsExporting(true);
                                                        const response = await salesInvoiceService.exportSalesInvoices({ find: filters });
                                                        if (response?.success !== false) {
                                                            dispatch(showToast({ message: "Invoices exported successfully", type: "success" }));
                                                        }
                                                    } catch (error) {
                                                        console.error("Export error:", error);
                                                        dispatch(showToast({ message: "Failed to export invoices", type: "error" }));
                                                    } finally {
                                                        setIsExporting(false);
                                                    }
                                                }}
                                                disabled={isExporting}
                                                className="flex-1 sm:flex-none px-4 py-2.5 cursor-pointer bg-white border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-medium hover:bg-[#d9ac00]/5 flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-50"
                                            >
                                                {isExporting ? <FiLoader className="animate-spin" size={16} /> : <FiDownload size={16} />}
                                                {isExporting ? "Exporting..." : "Export"}
                                            </button>
                                            <button
                                                onClick={() => setIsFormOpen(true)}
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
                                                { value: "FULLY_PAID", label: "Fully Paid" },
                                                { value: "PARTIALLY_PAID", label: "Partially Paid" },
                                                { value: "UNPAID", label: "Unpaid" },
                                            ]}
                                            placeholder="Select status"
                                            isClearable
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Filter by Customer</label>
                                        <CustomSelect
                                            value={filters.customer_id}
                                            onChange={(val) => setFilters(prev => ({ ...prev, customer_id: val }))}
                                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                                            placeholder="Select customer"
                                            isClearable
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Invoice Date</label>
                                        <input
                                            type="date"
                                            value={filters.invoice_date}
                                            onChange={(e) => setFilters(prev => ({ ...prev, invoice_date: e.target.value }))}
                                            className="w-full px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors"
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
                            {isFilterLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg">
                                    <div className="w-8 h-8 border-3 border-[#FFCA00] border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                            {paginatedInvoices.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[1000px] lg:min-w-0">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Invoice No</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Status</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Customer</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Date</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Amount</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {paginatedInvoices.map((invoice) => (
                                                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                            {invoice.invoice_number}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                                            {(() => {
                                                                const isSending = sendingInvoices[invoice.id];
                                                                const displayStatus = isSending ? "sending.." : (invoice.status || "N/A");
                                                                return (
                                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getStatusColor(displayStatus)}`}>
                                                                        {displayStatus ? displayStatus.replace(/_/g, " ") : "N/A"}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                            {getCustomerName(invoice.customer_id)}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                            {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : "N/A"}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap text-right">
                                                            ₹ {parseFloat(invoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-4 text-center relative whitespace-nowrap">
                                                            <button
                                                                ref={el => actionButtonsRef.current[invoice.id] = el}
                                                                onClick={(e) => handleActionButtonClick(e, invoice.id)}
                                                                className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === invoice.id ? "border-[#FFCA00] bg-white text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
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
                                    title="No Invoices Found"
                                    message={filters.search ? `No invoices match your search "${filters.search}".` : "Start by creating your first sales invoice."}
                                    actionLabel="Add New Invoice"
                                    onActionClick={() => setIsFormOpen(true)}
                                />
                            )}
                        </div>

                        {/* Pagination */}
                        {invoices.length > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                            />
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
                        onView={() => {
                            handleViewClick(invoices.find(i => i.id === openMenuId));
                        }}
                        onEdit={["DRAFT", "IMPORTED"].includes(invoices.find(i => i.id === openMenuId)?.status?.toUpperCase()) ? () => {
                            handleEditClick(invoices.find(i => i.id === openMenuId));
                        } : null}
                        onDelete={["DRAFT", "IMPORTED"].includes(invoices.find(i => i.id === openMenuId)?.status?.toUpperCase()) ? () => {
                            handleDeleteClick(invoices.find(i => i.id === openMenuId));
                        } : null}
                    >
                        {(invoices.find(i => i.id === openMenuId)?.status?.toUpperCase() === "SENT" ||
                            invoices.find(i => i.id === openMenuId)?.status?.toUpperCase() === "PARTIALLY PAID") && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePaymentUpdateClick(invoices.find(i => i.id === openMenuId));
                                    }}
                                    className="w-full px-4 py-3 text-left text-[15px] font-medium text-[#374151] hover:bg-gray-50 hover:text-blue-600 transition-colors flex items-center gap-3 cursor-pointer group border-t border-gray-100 whitespace-nowrap"
                                >
                                    <FiCreditCard size={16} className="text-[#374151] group-hover:text-blue-600 transition-colors" /> Update Payment
                                </button>
                            )}
                        {["DRAFT", "IMPORTED"].includes(invoices.find(i => i.id === openMenuId)?.status?.toUpperCase()) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendToClientClick(invoices.find(i => i.id === openMenuId));
                                }}
                                disabled={sendingInvoices[openMenuId]}
                                className="w-full px-4 py-3 text-left text-[15px] font-medium text-[#374151] hover:bg-gray-50 hover:text-yellow-600 transition-colors flex items-center gap-3 cursor-pointer group border-t border-gray-100 whitespace-nowrap disabled:opacity-50"
                            >
                                <FiMail size={16} className="text-[#374151] group-hover:text-yellow-600 transition-colors" />
                                {sendingInvoices[openMenuId] ? "Sending..." : "Send to Client"}
                            </button>
                        )}
                    </ActionMenu>
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
                            <h3 className="text-lg font-medium text-gray-900">Delete Sales Invoice</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Are you sure you want to delete invoice <span className="font-bold">{invoiceToDelete?.invoice_number}</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="mt-6 flex gap-3 justify-center">
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setInvoiceToDelete(null);
                                }}
                                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteInvoice}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none shadow-lg shadow-red-500/30 cursor-pointer disabled:opacity-50"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SalesInvoiceForm
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelectedInvoice(null);
                    setFormMode("edit");
                }}
                onSave={handleSaveInvoice}
                editData={selectedInvoice}
                mode={formMode}
            />

            <PaymentPromptModal
                isOpen={isPaymentPromptOpen}
                onClose={() => setIsPaymentPromptOpen(false)}
                onConfirm={handlePaymentPromptConfirm}
                totalAmount={promptAmount}
                isPurchase={false}
            />
        </div>
    );
}
