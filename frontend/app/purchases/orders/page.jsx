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
import PurchaseOrderForm from "@/components/purchases/PurchaseOrderForm";
import ActionMenu from "@/components/commonComp/ActionMenu";
import CustomSelect from "@/components/common/CustomSelect";
import { purchaseOrderService } from "@/services/purchaseOrderService";
import { handleExport } from "@/utils/exportHelper";
import { openDeleteModal, closeDeleteModal, setDeleteLoading } from "@/lib/features/ui/uiSlice";

export default function PurchaseOrdersPage() {
    return (
        <Suspense fallback={<Loader />}>
            <PurchaseOrdersContent />
        </Suspense>
    );
}

function PurchaseOrdersContent() {
    const dispatch = useDispatch();
    const searchParams = useSearchParams();
    
    // State
    const [orders, setOrders] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [tempAmount, setTempAmount] = useState("");
    const [filters, setFilters] = useState({
        status: "",
        order_date: "",
        net_amount: "",
        search: ""
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    
    // Modal/Menu state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [sendingOrders, setSendingOrders] = useState({});
    const [editData, setEditData] = useState(null);
    const [viewOnly, setViewOnly] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    
    const actionButtonsRef = useRef({});

    // Instant search - call API on every keystroke via filter update
    useEffect(() => {
        setFilters(prev => {
            if (prev.search === searchQuery) return prev;
            return { ...prev, search: searchQuery };
        });
    }, [searchQuery]);

    // Fetch data
    const fetchOrders = useCallback(async () => {
        try {
            if (isInitialLoading) {
                setIsLoading(true);
            }
            if (!isInitialLoading) setIsFilterLoading(true);
            const conditions = [];
            if (filters.status) {
                conditions.push({ status: filters.status });
            }
            if (filters.order_date) {
                conditions.push({ order_date: filters.order_date });
            }
            if (filters.net_amount) {
                conditions.push({ net_amount: filters.net_amount });
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
            const response = await purchaseOrderService.queryOrders(params);
            setOrders(response.data);
            setTotalCount(response.totalCount);
        } catch (error) {
            console.error("Error fetching purchase orders:", error);
            dispatch(showToast({ message: "Failed to load purchase orders", type: "error" }));
        } finally {
            setIsLoading(false);
            setIsFilterLoading(false);
            setIsInitialLoading(false);
        }
    }, [currentPage, pageSize, filters, dispatch, isInitialLoading]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Handle initial redirect actions
    useEffect(() => {
        const action = searchParams.get("action");
        if (action === "resume" || action === "create") {
            setIsFormOpen(true);
        }
    }, [searchParams]);

    const handleSaveOrder = (orderId, isEmailSent = false) => {
        setIsFormOpen(false);
        setEditData(null);
        setViewOnly(false);
        
        if (isEmailSent && orderId) {
            setSendingOrders(prev => ({ ...prev, [orderId]: true }));
            fetchOrders();
            setTimeout(() => {
                setSendingOrders(prev => {
                    const newSending = { ...prev };
                    delete newSending[orderId];
                    return newSending;
                });
                fetchOrders();
            }, 1000);
        } else {
            fetchOrders();
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

    const handleDelete = (id) => {
        setOpenMenuId(null);
        dispatch(openDeleteModal({
            title: "Delete Purchase Order",
            message: "Are you sure you want to delete this purchase order? This action cannot be undone.",
            onConfirm: () => handleDeleteConfirm(id)
        }));
    };

    const handleDeleteConfirm = async (id) => {
        try {
            dispatch(setDeleteLoading(true));
            await purchaseOrderService.deleteOrder(id);
            dispatch(showToast({ message: "Purchase Order deleted successfully", type: "success" }));
            fetchOrders();
            dispatch(closeDeleteModal());
        } catch (error) {
            console.error("Error deleting order:", error);
            dispatch(showToast({ message: "Failed to delete order", type: "error" }));
        } finally {
            dispatch(setDeleteLoading(false));
        }
    };

    const handleSendToSupplierDirect = async (id) => {
        setOpenMenuId(null);
        try {
            const order = orders.find(o => o.id === id);
            if (!order) return;
            const supplier = order.supplier_id;
            const emailData = {
                documentType: "PURCHASE_ORDER",
                documentId: id.toString(),
                email: {
                    to: (Array.isArray(supplier) ? supplier[0]?.email : supplier?.email) || "",
                    cc: [],
                    bcc: [],
                    message: ""
                }
            };
            
            setSendingOrders(prev => ({ ...prev, [id]: true }));

            const response = await purchaseOrderService.sendOrderEmail(emailData);
            if (response && response.success === false) {
                throw new Error(response.message || "Failed to send email");
            }
            dispatch(showToast({ message: "Purchase Order sent successfully!", type: "success" }));
            setTimeout(() => {
                setSendingOrders(prev => {
                    const newSending = { ...prev };
                    delete newSending[id];
                    return newSending;
                });
                fetchOrders();
            }, 1000);
        } catch (error) {
            console.error("Error sending purchase order email:", error);
            dispatch(showToast({ message: error.message || "Failed to send email", type: "error" }));
            setSendingOrders(prev => {
                const newSending = { ...prev };
                delete newSending[id];
                return newSending;
            });
            fetchOrders();
        }
    };

    const handleClearFilters = () => {
        setFilters({
            status: "",
            order_date: "",
            net_amount: "",
            search: ""
        });
        setSearchQuery("");
        setTempAmount("");
    };

    const navbarData = {
        heading: "Purchase Orders",
        subheading: "Create and manage purchase orders",
        from: "purchases",
    };

    const getStatusColor = (status) => {
        const s = status?.toUpperCase()?.replace(/_/g, " ");
        switch (s) {
            case "PAID":
            case "FULLY PAID":
            case "COMPLETED":
            case "APPROVED":
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
                        <Loader message="Loading Purchase Orders..." />
                    </div>
                ) : (
                    <div className="w-full flex-1 flex flex-col">
                        {/* Header Section: Search & Actions OR Filter inputs */}
                        <div className="mb-6">
                            {!isFilterVisible ? (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
                                    {/* Search Bar */}
                                    <div className="w-full sm:w-96">
                                        <div className="relative">
                                            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search order no"
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
                                                endpoint: "custom-api/admin/pur_orders/export",
                                                dispatch,
                                                setIsExporting,
                                                defaultFileName: "purchase_orders_export.xlsx"
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
                                            Add New Order <FiPlus size={18} />
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
                                                { value: "APPROVED", label: "Approved" },
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
                                            value={filters.order_date}
                                            onChange={(e) => setFilters(prev => ({ ...prev, order_date: e.target.value }))}
                                            className={`w-full cursor-pointer px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors ${!filters.order_date ? "text-gray-400" : "text-gray-900"}`}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="block text-[12px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-wider">Amount</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={tempAmount}
                                                onChange={(e) => setTempAmount(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && setFilters(prev => ({ ...prev, net_amount: tempAmount }))}
                                                placeholder="Enter amount"
                                                className="w-full cursor-pointer pl-3 pr-10 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] placeholder-gray-400 bg-white transition-colors"
                                            />
                                            <button
                                                onClick={() => setFilters(prev => ({ ...prev, net_amount: tempAmount }))}
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
                            {orders.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Order No</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Status</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Date</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Supplier</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Net Amount</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">Actions</th>
                                                </tr>
                                            </thead>
                                        <tbody className="divide-y divide-gray-100 font-poppins">
                                            {orders.map((order) => (
                                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {order.order_no}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                                        {(() => {
                                                            const isSending = sendingOrders[order.id];
                                                            const displayStatus = isSending ? "sending.." : (order.status || "DRAFT");
                                                            return (
                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getStatusColor(displayStatus)}`}>
                                                                    {displayStatus === "sending.." ? displayStatus : (displayStatus?.replace(/_/g, " ") || "DRAFT")}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {order.order_date ? new Date(order.order_date).toLocaleDateString() : "N/A"}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {order.supplier_id?.name || "N/A"}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap text-right">
                                                        ₹ {(parseFloat(order.net_amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-center relative whitespace-nowrap">
                                                        <button
                                                            onClick={(e) => handleActionButtonClick(e, order.id)}
                                                            className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === order.id ? "border-[#FFCA00] bg-white text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                                                        >
                                                            <FiMoreVertical size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState
                                    title="No Orders Found"
                                    message={searchQuery ? `No orders match your search "${searchQuery}".` : "Start by creating your first purchase order."}
                                    actionLabel="Add New Order"
                                    onActionClick={() => setIsFormOpen(true)}
                                />
                            )}
                        </div>

                        {/* Pagination */}
                        {orders.length > 0 && (
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
                        const order = orders.find(o => o.id === openMenuId);
                        const isDraft = ["DRAFT", "IMPORTED"].includes(order?.status?.toUpperCase());
                        const isSending = sendingOrders[openMenuId] || order?.status?.toUpperCase() === "SENDING...";

                        return (
                            <ActionMenu
                                isOpen={true}
                                onClose={() => setOpenMenuId(null)}
                                onView={() => {
                                    setEditData(order);
                                    setViewOnly(true);
                                    setIsFormOpen(true);
                                }}
                                onEdit={isDraft && !isSending ? () => {
                                    setEditData(order);
                                    setViewOnly(false);
                                    setIsFormOpen(true);
                                } : null}
                                onDelete={isDraft && !isSending ? () => handleDelete(openMenuId) : null}
                                actions={[
                                    {
                                        label: isSending ? "sending.." : "Send to Client",
                                        icon: <FiMail size={16} />,
                                        onClick: () => handleSendToSupplierDirect(openMenuId),
                                        disabled: isSending,
                                        hide: !isDraft
                                    }
                                ]}
                            />
                        );
                    })()}
                </div>
            )}

            <PurchaseOrderForm
                isOpen={isFormOpen}
                editData={editData}
                viewOnly={viewOnly}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditData(null);
                    setViewOnly(false);
                }}
                onSave={handleSaveOrder}
            />
        </div>
    );
}
