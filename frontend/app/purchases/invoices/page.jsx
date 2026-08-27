"use client";

import React, { useState, useEffect, useMemo, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import Pagination from "@/components/commonComp/Pagination";
import { showToast } from "@/lib/features/toast/toastSlice";
import { IoSearchOutline } from "react-icons/io5";
import { FiFilter, FiDownload, FiPlus, FiMoreVertical, FiX, FiLoader, FiMail } from "react-icons/fi";
import PurchaseInvoiceForm from "@/components/purchases/PurchaseInvoiceForm";
import ActionMenu from "@/components/commonComp/ActionMenu";
import CustomSelect from "@/components/common/CustomSelect";
import { purchaseInvoiceService } from "@/services/purchaseInvoiceService";
import { purchasePaymentService } from "@/services/purchasePaymentService";
import PaymentPromptModal from "@/components/common/PaymentPromptModal";
import { generateUniqueId } from "@/utils/idGenerator";
import { handleExport } from "@/utils/exportHelper";
import { openDeleteModal, closeDeleteModal, setDeleteLoading } from "@/lib/features/ui/uiSlice";

export default function PurchaseInvoicesPage() {
    return (
        <Suspense fallback={<Loader />}>
            <PurchaseInvoicesContent />
        </Suspense>
    );
}

function PurchaseInvoicesContent() {
    const dispatch = useDispatch();
    const searchParams = useSearchParams();
    
    // State
    const [invoices, setInvoices] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [tempAmount, setTempAmount] = useState("");
    const [filters, setFilters] = useState({
        status: "",
        invoice_date: "",
        total_amount: "",
        search: ""
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    
    // Modal/Menu state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [sendingInvoices, setSendingInvoices] = useState({});
    const [editData, setEditData] = useState(null);
    const [viewOnly, setViewOnly] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [loadingEditId, setLoadingEditId] = useState(null);
    const [isPaymentPromptOpen, setIsPaymentPromptOpen] = useState(false);
    const [promptAmount, setPromptAmount] = useState(0);
    const pendingPaymentDetails = useRef(null);
    const activeInvoiceForSend = useRef(null);
    
    const actionButtonsRef = useRef({});

    // Instant search - call API on every keystroke via filter update
    useEffect(() => {
        setFilters(prev => {
            if (prev.search === searchInput) return prev;
            return { ...prev, search: searchInput };
        });
    }, [searchInput]);

    // Fetch data
    const fetchInvoices = useCallback(async () => {
        try {
            if (isInitialLoading) {
                setIsLoading(true);
            }
            if (!isInitialLoading) setIsFilterLoading(true);
            const conditions = [];
            if (filters.status) {
                conditions.push({ status: filters.status });
            }
            if (filters.invoice_date) {
                conditions.push({ invoice_date: filters.invoice_date });
            }
            if (filters.total_amount) {
                conditions.push({ total_amount: filters.total_amount });
            }

            const find = conditions.length > 0 ? { "$and": conditions } : {};

            const params = {
                skip: (currentPage - 1) * pageSize,
                limit: pageSize,
                find: conditions.length > 0 ? { "$and": conditions } : {},
                search: filters.search || "",
                sort: "-id",
                deep: [
                    {
                        "s_key": "supplier_id",
                        "isMultiple": false
                    }
                ],
                getTotalCount: true
            };
            const response = await purchaseInvoiceService.queryInvoices(params);
            setInvoices(response.data);
            setTotalCount(response.totalCount);
        } catch (error) {
            console.error("Error fetching purchase invoices:", error);
            dispatch(showToast({ message: "Failed to load purchase invoices", type: "error" }));
        } finally {
            setIsLoading(false);
            setIsFilterLoading(false);
            setIsInitialLoading(false);
        }
    }, [currentPage, pageSize, filters, dispatch, isInitialLoading]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    // Handle initial redirect actions
    useEffect(() => {
        const action = searchParams.get("action");
        if (action === "resume" || action === "create") {
            setIsFormOpen(true);
        }
    }, [searchParams]);

    const handleSaveInvoice = (invoiceId, isEmailSent = false) => {
        setIsFormOpen(false);
        setEditData(null);
        setViewOnly(false);
        
        if (isEmailSent && invoiceId) {
            setSendingInvoices(prev => ({ ...prev, [invoiceId]: true }));
            fetchInvoices();
            setTimeout(() => {
                setSendingInvoices(prev => {
                    const newSending = { ...prev };
                    delete newSending[invoiceId];
                    return newSending;
                });
                fetchInvoices();
            }, 1000);
        } else {
            fetchInvoices();
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

    const openEditForm = async (id, isViewOnly = false) => {
        try {
            setOpenMenuId(null);
            setLoadingEditId(id);
            const result = await purchaseInvoiceService.getInvoiceByIdDeep(id);
            if (result.success) {
                setEditData(result.data);
                setViewOnly(isViewOnly);
                setIsFormOpen(true);
            } else {
                dispatch(showToast({ message: "Failed to load invoice details", type: "error" }));
            }
        } catch (error) {
            console.error("Error fetching invoice deep data:", error);
            dispatch(showToast({ message: "Failed to load invoice details", type: "error" }));
        } finally {
            setLoadingEditId(null);
        }
    };

    const handleDelete = (id) => {
        setOpenMenuId(null);
        dispatch(openDeleteModal({
            title: "Delete Purchase Invoice",
            message: "Are you sure you want to delete this purchase invoice? This action cannot be undone.",
            onConfirm: () => handleDeleteConfirm(id)
        }));
    };

    const handleDeleteConfirm = async (id) => {
        try {
            dispatch(setDeleteLoading(true));
            await purchaseInvoiceService.deleteInvoice(id);
            dispatch(showToast({ message: "Purchase Invoice deleted successfully", type: "success" }));
            fetchInvoices();
            dispatch(closeDeleteModal());
        } catch (error) {
            console.error("Error deleting invoice:", error);
            dispatch(showToast({ message: "Failed to delete invoice", type: "error" }));
        } finally {
            dispatch(setDeleteLoading(false));
        }
    };

    const handleSendToSupplierDirect = async (id) => {
        setOpenMenuId(null);
        try {
            const inv = invoices.find(i => i.id === id);
            if (!inv) return;
            const supplier = inv.supplier_id;
            const emailData = {
                documentType: "PURCHASE_INVOICE",
                documentId: id.toString(),
                email: {
                    to: (Array.isArray(supplier) ? supplier[0]?.email : supplier?.email) || "",
                    cc: [],
                    bcc: [],
                    message: ""
                }
            };
            
            setSendingInvoices(prev => ({ ...prev, [id]: true }));

            const response = await purchaseInvoiceService.sendInvoiceEmail(emailData);
            if (response && response.success === false) {
                throw new Error(response.message || "Failed to send email");
            }
            dispatch(showToast({ message: "Purchase Invoice sent successfully!", type: "success" }));

            // Silently create the payment if pending payment details exist
            if (pendingPaymentDetails.current && id) {
                const { amountPaid, paymentMode } = pendingPaymentDetails.current;
                pendingPaymentDetails.current = null; // Clear to prevent double trigger

                purchaseInvoiceService.getInvoiceByIdDeep(id).then(res => {
                    if (res?.success && res?.data) {
                        const deepInv = res.data;
                        const itemsList = Array.isArray(deepInv.purchase_item) ? deepInv.purchase_item : [];
                        let supplierIdVal = null;
                        if (Array.isArray(inv.supplier_id) && inv.supplier_id.length > 0) {
                            supplierIdVal = inv.supplier_id[0].id || inv.supplier_id[0];
                        } else if (typeof inv.supplier_id === "object" && inv.supplier_id !== null) {
                            supplierIdVal = inv.supplier_id.id;
                        } else {
                            supplierIdVal = inv.supplier_id;
                        }

                        const paymentPayload = {
                            payment_number: generateUniqueId("PAY"),
                            payment_name: `Payment for ${inv.invoice_number}`,
                            supplier_id: Number(supplierIdVal),
                            invoice_id: id,
                            payment_date: new Date().toISOString().split('T')[0],
                            payment_mode: paymentMode,
                            amount: amountPaid,
                            due_amount: Number(inv.total_amount) - amountPaid,
                            notes: "Auto-recorded payment on invoice send.",
                            status: "DRAFT",
                            items: itemsList.map(item => ({
                                source_type: item.source_type || "item",
                                item_id: item.source_type === "service" ? null : Number(item.item_id || item.source_id),
                                source_id: item.source_type === "service" ? null : Number(item.source_id || item.item_id),
                                quantity: Number(item.quantity) || 0,
                                rate: parseFloat(item.rate) || 0,
                                tax_percent: parseFloat(item.tax_percent) || 0,
                                amount: Number((Number(item.quantity) * parseFloat(item.rate)).toFixed(2)),
                                tax_id: item.tax_id ? Number(item.tax_id) : null,
                                ...(item.source_type === "service" ? { description: item.description || "" } : {})
                            }))
                        };

                        purchasePaymentService.createPayment(paymentPayload).then((res) => {
                            console.log("Silent purchase payment recorded successfully on client send.");
                            const paymentId = res?.data?.data?.id || res?.data?.id || res?.data?.[0]?.id || res?.id;
                            if (paymentId) {
                                const supplierEmail = (Array.isArray(supplier) ? supplier[0]?.email : supplier?.email) || "";
                                const emailPayload = {
                                    documentType: "PURCHASE_PAYMENT",
                                    documentId: paymentId.toString(),
                                    email: {
                                        to: supplierEmail,
                                        cc: [],
                                        bcc: [],
                                        message: ""
                                    }
                                };
                                purchasePaymentService.sendPaymentEmail(emailPayload).then(() => {
                                    console.log("Silent purchase payment email sent successfully on client send.");
                                }).catch(e => {
                                    console.error("Silent purchase payment email sending failed on client send:", e);
                                });
                            }
                        }).catch(e => {
                            console.error("Silent purchase payment failed on client send:", e);
                        });
                    }
                }).catch(err => {
                    console.error("Failed to fetch purchase invoice details for silent payment:", err);
                });
            }

            setTimeout(() => {
                setSendingInvoices(prev => {
                    const newSending = { ...prev };
                    delete newSending[id];
                    return newSending;
                });
                fetchInvoices();
            }, 1000);
        } catch (error) {
            console.error("Error sending purchase invoice email:", error);
            dispatch(showToast({ message: error.message || "Failed to send email", type: "error" }));
            setSendingInvoices(prev => {
                const newSending = { ...prev };
                delete newSending[id];
                return newSending;
            });
            fetchInvoices();
        }
    };

    const handleSendToSupplierClick = (invoice) => {
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
            handleSendToSupplierDirect(activeInvoiceForSend.current.id);
        }
    };

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

    const navbarData = {
        heading: "Purchase Invoices",
        subheading: "Manage and track your supplier invoices",
        from: "purchases",
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
            case "CANCELLED":
                return "bg-red-50 text-red-600 border-red-100";
            case "DRAFT":
                return "bg-gray-50 text-gray-600 border-gray-100";
            default:
                return "bg-gray-50 text-gray-500 border-gray-100";
        }
    };

    const [isExporting, setIsExporting] = useState(false);
    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />

            <main className="flex-1 flex flex-col py-6 md:py-8">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <Loader message="Loading Purchase Invoices..." />
                    </div>
                ) : (
                    <div className="w-full flex-1 flex flex-col">
                        {/* Header Section */}
                        <div className="mb-6">
                            {!isFilterVisible ? (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
                                    <div className="w-full sm:w-96">
                                        <div className="relative">
                                            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={searchInput}
                                                onChange={(e) => setSearchInput(e.target.value)}
                                                placeholder="Search invoice number"
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] text-[14px] bg-white transition-all hover:border-gray-300"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                        <button
                                            onClick={() => setIsFilterVisible(true)}
                                            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-200 text-black rounded-lg text-[14px] font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <FiFilter size={16} /> Filter
                                        </button>
                                        <button
                                            onClick={() => handleExport({
                                                endpoint: "custom-api/admin/purchase_inv/purchase_invoice_export",
                                                payload: { find: filters.search ? { invoice_number: { "$like": `%${filters.search}%` } } : {} },
                                                dispatch,
                                                setIsExporting,
                                                defaultFileName: "purchase_invoices_export.xlsx"
                                            })}
                                            disabled={isExporting}
                                            className="flex-1 sm:flex-none px-4 py-2.5 cursor-pointer bg-white border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-medium hover:bg-[#d9ac00]/5 flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-50"
                                        >
                                            {isExporting ? <FiLoader className="animate-spin" size={16} /> : <FiDownload size={16} />}
                                            {isExporting ? "Exporting..." : "Export"}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditData(null);
                                                setViewOnly(false);
                                                setIsFormOpen(true);
                                            }}
                                            className="flex-1 sm:flex-none px-4 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 min-w-[140px] cursor-pointer hover:bg-[#d9ac00]"
                                        >
                                            Add New Invoice <FiPlus size={18} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-end gap-4 animate-in slide-in-from-top duration-300 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="block text-[12px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-wider">Status</label>
                                        <CustomSelect
                                            value={filters.status}
                                            onChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
                                            options={[
                                                { value: "DRAFT", label: "Draft" },
                                                { value: "SENT", label: "Sent" },
                                                { value: "FULLY_PAID", label: "Fully Paid" },
                                                { value: "PARTIALLY_PAID", label: "Partially Paid" },
                                            ]}
                                            placeholder="Select status"
                                            isClearable
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[140px]">
                                        <label className="block text-[12px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-wider">Date</label>
                                        <input
                                            type="date"
                                            value={filters.invoice_date}
                                            onChange={(e) => setFilters(prev => ({ ...prev, invoice_date: e.target.value }))}
                                            className={`w-full cursor-pointer px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors ${!filters.invoice_date ? "text-gray-400" : "text-gray-900"}`}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="block text-[12px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-wider">Amount</label>
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
                                            className="text-gray-400 cursor-pointer hover:text-red-500 transition-colors p-2.5 bg-white border border-gray-200 rounded-lg hover:border-red-200"
                                            title="Reset Filters"
                                        >
                                            <FiX size={18} />
                                        </button>
                                        <button
                                            onClick={() => setIsFilterVisible(false)}
                                            className="px-6 py-2.5 cursor-pointer bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors"
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
                            {invoices.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Invoice No</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Status</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Date</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Supplier</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Total Amount</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">Actions</th>
                                                </tr>
                                            </thead>
                                        <tbody className="divide-y divide-gray-100 font-poppins">
                                            {invoices.map((inv) => (
                                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                                     <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                         {inv.invoice_number}
                                                     </td>
                                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                                        {(() => {
                                                            const isSending = sendingInvoices[inv.id];
                                                            const displayStatus = isSending ? "sending.." : (inv.status || "DRAFT");
                                                            return (
                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getStatusColor(displayStatus)}`}>
                                                                    {displayStatus === "sending.." ? displayStatus : (displayStatus?.replace(/_/g, " ") || "DRAFT")}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : "N/A"}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {(Array.isArray(inv.supplier_id) ? inv.supplier_id[0]?.name : inv.supplier_id?.name) || "N/A"}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap text-right">
                                                        ₹ {(parseFloat(inv.total_amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-center relative whitespace-nowrap">
                                                        <button
                                                            onClick={(e) => handleActionButtonClick(e, inv.id)}
                                                            disabled={loadingEditId === inv.id}
                                                            className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === inv.id ? "border-[#FFCA00] bg-white text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"} disabled:opacity-60`}
                                                        >
                                                            {loadingEditId === inv.id
                                                                ? <FiLoader className="animate-spin" size={18} />
                                                                : <FiMoreVertical size={18} />}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState
                                    title="No Invoices Found"
                                    message={searchInput ? `No invoices match your search "${searchInput}".` : "Start by creating your first purchase invoice."}
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
                                totalItems={totalCount}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </div>
                )}
            </main>

            {/* Action Menu */}
            {openMenuId && (
                <div
                    className="fixed z-[10001]"
                    style={{
                        left: `${menuPosition.x}px`,
                        top: `${menuPosition.y}px`,
                        transform: 'translateX(-50%)'
                    }}
                >
                    {(() => {
                        const inv = invoices.find(i => i.id === openMenuId);
                        const isDraft = ["DRAFT", "IMPORTED"].includes(inv?.status?.toUpperCase());
                        const isSending = sendingInvoices[openMenuId] || inv?.status?.toUpperCase() === "SENDING...";

                        return (
                            <ActionMenu
                                isOpen={true}
                                onClose={() => setOpenMenuId(null)}
                                onView={() => openEditForm(openMenuId, true)}
                                onEdit={isDraft && !isSending ? () => openEditForm(openMenuId, false) : null}
                                onDelete={isDraft && !isSending ? () => handleDelete(openMenuId) : null}
                                actions={[
                                    {
                                        label: isSending ? "sending.." : "Send to Client",
                                        icon: <FiMail size={16} />,
                                        onClick: () => handleSendToSupplierClick(inv),
                                        disabled: isSending,
                                        hide: !isDraft
                                    }
                                ]}
                            />
                        );
                    })()}
                </div>
            )}

            <PurchaseInvoiceForm
                isOpen={isFormOpen}
                editData={editData}
                viewOnly={viewOnly}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditData(null);
                    setViewOnly(false);
                }}
                onSave={handleSaveInvoice}
            />

            <PaymentPromptModal
                isOpen={isPaymentPromptOpen}
                onClose={() => setIsPaymentPromptOpen(false)}
                onConfirm={handlePaymentPromptConfirm}
                totalAmount={promptAmount}
                isPurchase={true}
            />
        </div>
    );
}
