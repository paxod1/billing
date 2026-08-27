"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Navbar from "@/components/commonComp/Navbar";
import Pagination from "@/components/commonComp/Pagination";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import { IoSearchOutline } from "react-icons/io5";
import { FiFilter, FiDownload, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiLoader, FiX, FiEye, FiSettings, FiMail } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import ActionMenu from "@/components/commonComp/ActionMenu";
import CustomSelect from "@/components/common/CustomSelect";
import { purchasePaymentService } from "@/services/purchasePaymentService";
import PurchasePaymentForm from "@/components/purchases/PurchasePaymentForm";
import PaymentConfigModal from "@/components/purchases/PaymentConfigModal";
import { handleExport } from "@/utils/exportHelper";
import { useSearchParams } from "next/navigation";
import { openDeleteModal, closeDeleteModal, setDeleteLoading } from "@/lib/features/ui/uiSlice";

export default function PurchasePaymentsPage() {
    return (
        <Suspense fallback={<Loader />}>
            <PurchasePaymentsContent />
        </Suspense>
    );
}

function PurchasePaymentsContent() {
    const dispatch = useDispatch();
    const searchParams = useSearchParams();
    
    // State
    const [payments, setPayments] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [tempAmount, setTempAmount] = useState("");
    const [filters, setFilters] = useState({
        status: "",
        payment_date: "",
        amount: "",
        search: ""
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    
    // Modal/Menu state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [sendingPayments, setSendingPayments] = useState({});
    const [editData, setEditData] = useState(null);
    const [initialStep, setInitialStep] = useState(1);
    const [viewOnly, setViewOnly] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [isExporting, setIsExporting] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [configPayment, setConfigPayment] = useState(null);
    const [loadingEditId, setLoadingEditId] = useState(null);
    
    const actionButtonsRef = useRef({});

    // Fetch data
    const fetchPayments = useCallback(async () => {
        try {
            if (isInitialLoading) {
                setIsLoading(true);
            } else {
                setIsFilterLoading(true);
            }
            const conditions = [];
            if (filters.status) {
                conditions.push({ status: filters.status });
            }
            if (filters.payment_date) {
                conditions.push({ payment_date: filters.payment_date });
            }
            if (filters.amount) {
                conditions.push({ amount_paid: filters.amount });
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
                        "isMultiple": true
                    }
                ]
            };
            const response = await purchasePaymentService.getPurchasePayments(params);
            setPayments(response.data);
            setTotalCount(response.totalCount);
        } catch (error) {
            console.error("Error fetching purchase payments:", error);
            dispatch(showToast({ message: "Failed to load purchase payments", type: "error" }));
        } finally {
            setIsLoading(false);
            setIsFilterLoading(false);
            setIsInitialLoading(false);
        }
    }, [currentPage, pageSize, filters, dispatch, isInitialLoading]);

    // Instant search - call API on every keystroke via filter update
    useEffect(() => {
        setFilters(prev => ({ ...prev, search: searchInput }));
        setCurrentPage(1);
    }, [searchInput]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    useEffect(() => {
        if (searchParams.get("action") === "create") {
            setIsFormOpen(true);
        }
    }, [searchParams]);

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

    // Fetch deep payment data on edit / row-click and open form
    const openEditForm = async (id, { viewOnlyMode = false, step = 1 } = {}) => {
        try {
            setLoadingEditId(id);
            const result = await purchasePaymentService.getPaymentByIdDeep(id);
            const deepData = result?.data || null;
            setEditData(deepData);
            setViewOnly(viewOnlyMode);
            setInitialStep(step);
            setIsFormOpen(true);
        } catch (error) {
            console.error("Error fetching payment deep data:", error);
            dispatch(showToast({ message: "Failed to load payment details", type: "error" }));
        } finally {
            setLoadingEditId(null);
        }
    };

    const handleClearFilters = () => {
        setFilters({
            status: "",
            payment_date: "",
            amount: "",
            search: ""
        });
        setSearchInput("");
        setTempAmount("");
    };

    const handleSaveConfig = async (id, data) => {
        try {
            await purchasePaymentService.updatePayment(id, data);
            dispatch(showToast({ message: "Payment amount configured successfully", type: "success" }));
            fetchPayments();
        } catch (error) {
            console.error("Error updating configuration:", error);
            dispatch(showToast({ message: "Failed to update configuration", type: "error" }));
        }
    };

    const handleSavePayment = (paymentId, actionTypeOrIsEmailSent) => {
        setIsFormOpen(false);
        setEditData(null);
        setInitialStep(1);
        setViewOnly(false);
        
        const isEmailSent = actionTypeOrIsEmailSent === "EMAIL_SENT" || actionTypeOrIsEmailSent === true;

        if (isEmailSent && paymentId) {
            setSendingPayments(prev => ({ ...prev, [paymentId]: true }));
            fetchPayments();
            setTimeout(() => {
                setSendingPayments(prev => {
                    const newSending = { ...prev };
                    delete newSending[paymentId];
                    return newSending;
                });
                fetchPayments();
            }, 1000);
        } else {
            fetchPayments();
        }
    };

    const handleDelete = (id) => {
        setOpenMenuId(null);
        dispatch(openDeleteModal({
            title: "Delete Purchase Payment",
            message: "Are you sure you want to delete this purchase payment? This action cannot be undone.",
            onConfirm: () => handleDeleteConfirm(id)
        }));
    };

    const handleDeleteConfirm = async (id) => {
        try {
            dispatch(setDeleteLoading(true));
            await purchasePaymentService.deletePayment(id);
            dispatch(showToast({ message: "Purchase Payment deleted successfully", type: "success" }));
            fetchPayments();
            dispatch(closeDeleteModal());
        } catch (error) {
            console.error("Error deleting payment:", error);
            dispatch(showToast({ message: "Failed to delete payment", type: "error" }));
        } finally {
            dispatch(setDeleteLoading(false));
        }
    };

    const handleSendToSupplierDirect = async (id) => {
        setOpenMenuId(null);
        try {
            const payment = payments.find(p => p.id === id);
            if (!payment) return;
            const supplier = payment.supplier_id;
            const emailData = {
                documentType: "PURCHASE_PAYMENT",
                documentId: id.toString(),
                email: {
                    to: (Array.isArray(supplier) ? supplier[0]?.email : supplier?.email) || "",
                    cc: [],
                    bcc: [],
                    message: ""
                }
            };
            
            setSendingPayments(prev => ({ ...prev, [id]: true }));

            const response = await purchasePaymentService.sendPaymentEmail(emailData);
            if (response && response.success === false) {
                throw new Error(response.message || "Failed to send email");
            }
            dispatch(showToast({ message: "Purchase Payment receipt sent successfully!", type: "success" }));
            setTimeout(() => {
                setSendingPayments(prev => {
                    const newSending = { ...prev };
                    delete newSending[id];
                    return newSending;
                });
                fetchPayments();
            }, 1000);
        } catch (error) {
            console.error("Error sending purchase payment email:", error);
            dispatch(showToast({ message: error.message || "Failed to send email", type: "error" }));
            setSendingPayments(prev => {
                const newSending = { ...prev };
                delete newSending[id];
                return newSending;
            });
            fetchPayments();
        }
    };

    const navbarData = {
        heading: "Purchase Payments",
        subheading: "Track and manage your supplier payments and vouchers",
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

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />

            {isInitialLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message="Loading Purchase Payments..." />
                </div>
            ) : (
                <main className="flex-1 flex flex-col py-6 md:py-8">
                <div className="w-full flex-1 flex flex-col">
                    {/* Header Section */}
                    <div className="mb-6 px-4 md:px-0">
                        {!isFilterVisible ? (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
                                <div className="w-full sm:w-96">
                                    <div className="relative">
                                        <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                            placeholder="Search payment number"
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] text-[14px] bg-white transition-all hover:border-gray-300"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => setIsFilterVisible(true)}
                                        className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[14px] font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <FiFilter size={16} /> Filter
                                    </button>
                                    <button
                                        onClick={() => handleExport({
                                            endpoint: "custom-api/admin/purchase_pay/export",
                                            dispatch,
                                            setIsExporting,
                                            defaultFileName: "purchase_payments.xlsx"
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
                                            setIsFormOpen(true);
                                        }}
                                        className="flex-1 sm:flex-none px-4 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 min-w-[140px] cursor-pointer hover:bg-[#d9ac00]"
                                    >
                                        Add New Payment <FiPlus size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-end gap-4 animate-in slide-in-from-top duration-300 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                <div className="flex-1 min-w-[180px]">
                                    <label className="block text-[12px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-wider">Status</label>
                                    <CustomSelect
                                        value={filters.status}
                                        onChange={(val) => { setFilters(prev => ({ ...prev, status: val })); setCurrentPage(1); }}
                                        options={[
                                            { value: "DRAFT", label: "Draft" },
                                            { value: "SENT", label: "Sent" },
                                            { value: "PAID", label: "Paid" },
                                            { value: "CANCELLED", label: "Cancelled" },
                                        ]}
                                        placeholder="Select status"
                                        isClearable
                                    />
                                </div>
                                <div className="flex-1 min-w-[140px]">
                                    <label className="block text-[12px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-wider">Date</label>
                                    <input
                                        type="date"
                                        value={filters.payment_date}
                                        onChange={(e) => { setFilters(prev => ({ ...prev, payment_date: e.target.value })); setCurrentPage(1); }}
                                        className={`w-full cursor-pointer px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors ${!filters.payment_date ? "text-gray-400" : "text-gray-900"}`}
                                    />
                                </div>
                                <div className="flex-1 min-w-[180px]">
                                    <label className="block text-[12px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-wider">Amount</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={tempAmount}
                                            onChange={(e) => setTempAmount(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && setFilters(prev => ({ ...prev, amount: tempAmount }))}
                                            placeholder="Enter amount"
                                            className="w-full cursor-pointer pl-3 pr-10 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] placeholder-gray-400 bg-white transition-colors"
                                        />
                                        <button
                                            onClick={() => { setFilters(prev => ({ ...prev, amount: tempAmount })); setCurrentPage(1); }}
                                            className="absolute cursor-pointer right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-[#FFCA00] text-white rounded-md hover:bg-[#d9ac00]"
                                        >
                                            <IoSearchOutline size={15} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pb-0.5 ml-auto">
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-gray-400 cursor-pointer hover:text-red-500 transition-colors p-2.5 bg-white border border-gray-200 rounded-lg"
                                        title="Reset Filters"
                                    >
                                        <FiX size={18} />
                                    </button>
                                    <button
                                        onClick={() => setIsFilterVisible(false)}
                                        className="px-6 py-2.5 cursor-pointer bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300"
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

                        {payments.length === 0 ? (
                            <EmptyState
                                title="No purchase payments found"
                                description="Start recording payments to your suppliers and track your vouchers."
                                buttonText="Add New Payment"
                                onButtonClick={() => setIsFormOpen(true)}
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Payment No</th>
                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Supplier</th>
                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Date</th>
                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-right whitespace-nowrap">Amount Paid</th>
                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Status</th>
                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {payments.map((pay) => (
                                            <tr 
                                                key={pay.id} 
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                    {pay.payment_number}
                                                </td>
                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">
                                                    <div className="flex flex-col">
                                                        <span>
                                                            {(Array.isArray(pay.supplier_id) ? pay.supplier_id[0]?.name : pay.supplier_id?.name) || "N/A"}
                                                        </span>
                                                        <span className="text-[11px] text-gray-400">
                                                            {pay.payment_mode || "Cash"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">
                                                    {pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : "N/A"}
                                                </td>
                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 text-right whitespace-nowrap">
                                                    ₹ {parseFloat(pay.amount || pay.amount_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                                    {(() => {
                                                        const isSending = sendingPayments[pay.id];
                                                        const displayStatus = isSending ? "sending.." : (pay.status || "DRAFT");
                                                        return (
                                                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getStatusColor(displayStatus)}`}>
                                                                {displayStatus === "sending.." ? displayStatus : (displayStatus?.replace(/_/g, " ") || "DRAFT")}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-4 lg:px-6 py-4 text-center relative whitespace-nowrap">
                                                    <button
                                                        ref={el => actionButtonsRef.current[pay.id] = el}
                                                        onClick={(e) => handleActionButtonClick(e, pay.id)}
                                                        className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === pay.id ? "bg-white border-[#FFCA00] text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                                                        disabled={loadingEditId === pay.id}
                                                    >
                                                        {loadingEditId === pay.id ? <FiLoader className="animate-spin" size={18} /> : <FiMoreVertical size={18} />}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                        {totalCount > pageSize && (
                            <div className="p-6 border-t border-gray-50 flex justify-center">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </main>
            )}

            {/* Action Menu */}
            <ActionMenu
                isOpen={openMenuId !== null}
                onClose={() => setOpenMenuId(null)}
                position={menuPosition}
                actions={[
                    {
                        label: 'View',
                        onClick: () => {
                            const id = openMenuId;
                            setOpenMenuId(null);
                            openEditForm(id, { viewOnlyMode: true, step: 2 });
                        }
                    },
                    {
                        label: 'Edit',
                        icon: <FiEdit2 />,
                        hide: !(["DRAFT", "IMPORTED"].includes(payments.find(p => p.id === openMenuId)?.status?.toUpperCase())),
                        onClick: () => {
                            const id = openMenuId;
                            setOpenMenuId(null);
                            openEditForm(id);
                        }
                    },
                    {
                        label: 'Delete',
                        icon: <FiTrash2 />,
                        variant: 'danger',
                        hide: !(["DRAFT", "IMPORTED"].includes(payments.find(p => p.id === openMenuId)?.status?.toUpperCase())),
                        onClick: () => handleDelete(openMenuId)
                    },
                    {
                        label: 'Payment Config',
                        icon: <FiSettings />,
                        hide: !(parseFloat(payments.find(p => p.id === openMenuId)?.due_amount || 0) > 0),
                        onClick: () => {
                            const pay = payments.find(p => p.id === openMenuId);
                            setConfigPayment(pay);
                            setIsConfigOpen(true);
                        }
                    },
                    {
                        label: (sendingPayments[openMenuId] || payments.find(p => p.id === openMenuId)?.status?.toUpperCase() === "SENDING...") ? "sending.." : "Send to Client",
                        icon: <FiMail />,
                        disabled: sendingPayments[openMenuId],
                        hide: !(["DRAFT", "IMPORTED"].includes(payments.find(p => p.id === openMenuId)?.status?.toUpperCase())),
                        onClick: () => handleSendToSupplierDirect(openMenuId)
                    },
                    {
                        label: 'Send Email',
                        icon: <FiMail />,
                        onClick: () => {
                            const id = openMenuId;
                            setOpenMenuId(null);
                            openEditForm(id, { step: 2 });
                        }
                    }
                ]}
            />

            {/* Payment Form Modal */}
            <PurchasePaymentForm
                isOpen={isFormOpen}
                initialStep={initialStep}
                viewOnly={viewOnly}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditData(null);
                    setInitialStep(1);
                    setViewOnly(false);
                }}
                onSave={handleSavePayment}
                editData={editData}
            />

            <PaymentConfigModal
                isOpen={isConfigOpen}
                onClose={() => {
                    setIsConfigOpen(false);
                    setConfigPayment(null);
                }}
                onSave={handleSaveConfig}
                payment={configPayment}
            />
        </div>
    );
}
