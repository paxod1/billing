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

import SalesEstimationForm from "@/components/sales/SalesEstimationForm";
import ActionMenu from "@/components/commonComp/ActionMenu";
import CustomSelect from "@/components/common/CustomSelect";
import { handleExport } from "@/utils/exportHelper";
import { FiFilter, FiDownload, FiPlus, FiMoreVertical, FiTrash2, FiLoader, FiX, FiCheckCircle } from "react-icons/fi";
import { estimationService } from "@/services/estimationService";

export default function SalesEstimationPage() {
    return (
        <Suspense fallback={<Loader />}>
            <SalesEstimationContent />
        </Suspense>
    );
}

function SalesEstimationContent() {
    const dispatch = useDispatch();
    const [estimations, setEstimations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const actionButtonsRef = useRef({});
    const isMounted = useRef(false);
    const lastFetchParams = useRef("");
    const [selectedEstimation, setSelectedEstimation] = useState(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [tempAmount, setTempAmount] = useState("");
    const [filters, setFilters] = useState({
        status: "",
        expiry_date: "",
        date: "",
        total_amount: "",
        search: ""
    });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [estimationToDelete, setEstimationToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [openMenuId, setOpenMenuId] = useState(null);
    const searchParams = useSearchParams();
    const pageSize = 10;

    const fetchEstimations = async (isSilent = false) => {
        try {
            const params = JSON.stringify({ ...filters, currentPage });
            if (params === lastFetchParams.current && !isSilent) return;
            lastFetchParams.current = params;

            if (!isSilent) setIsLoading(true);
            if (isSilent) setIsFilterLoading(true);

            let finalFilters = { ...filters };

            const response = await estimationService.getEstimations({
                ...finalFilters,
                limit: pageSize,
                skip: (currentPage - 1) * pageSize
            });
            setEstimations(response.data);
            setTotalItems(response.totalCount);
        } catch (error) {
            console.error("Error fetching estimations:", error);
            dispatch(showToast({ message: "Failed to load estimations", type: "error" }));
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

    // Single unified fetch effect
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            setIsInitialLoading(true);
            const startTime = Date.now();
            fetchEstimations().then(() => {
                const elapsed = Date.now() - startTime;
                const minTime = 1000;
                if (elapsed < minTime) {
                    setTimeout(() => setIsInitialLoading(false), minTime - elapsed);
                } else {
                    setIsInitialLoading(false);
                }
            });
            return;
        }
        fetchEstimations(true);
    }, [filters, currentPage]);

    useEffect(() => {
        if (searchParams.get("action") === "create") {
            setIsFormOpen(true);
        }
    }, [searchParams]);

    const handleClearFilters = () => {
        setFilters({
            status: "",
            expiry_date: "",
            date: "",
            total_amount: "",
            search: ""
        });
        setSearchInput("");
        setTempAmount("");
    };

    const totalPages = Math.ceil(totalItems / pageSize);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const handleSaveCallback = () => {
        fetchEstimations(true);
        setIsFormOpen(false);
        setSelectedEstimation(null);
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

    const handleEditClick = (est) => {
        setSelectedEstimation(est);
        setIsViewOnly(false);
        setIsFormOpen(true);
        setOpenMenuId(null);
    };

    const handleViewClick = (est) => {
        setSelectedEstimation(est);
        setIsViewOnly(true);
        setIsFormOpen(true);
        setOpenMenuId(null);
    };

    const handleDeleteClick = (est) => {
        setEstimationToDelete(est);
        setIsDeleteModalOpen(true);
        setOpenMenuId(null);
    };

    const handlePostClick = async (est) => {
        setOpenMenuId(null);
        // Immediately change status to "POSTING" in local UI state silently
        setEstimations(prev => prev.map(e => e.id === est.id ? { ...e, status: "POSTING" } : e));
        
        try {
            await estimationService.postEstimation(est.id);
            dispatch(showToast({ message: "Estimation posted successfully!", type: "success" }));
        } catch (error) {
            console.error("Post Error:", error);
            // Revert back to original status if failed
            setEstimations(prev => prev.map(e => e.id === est.id ? { ...e, status: est.status } : e));
            dispatch(showToast({ message: "Failed to post estimation", type: "error" }));
        } finally {
            // After 1 second, silently fetch new data to update the table status to POSTED
            setTimeout(async () => {
                try {
                    await fetchEstimations(true);
                } catch (fetchErr) {
                    console.error("Error fetching estimations after post:", fetchErr);
                }
            }, 1000);
        }
    };

    const handleDeleteEstimation = async () => {
        if (!estimationToDelete) return;
        try {
            setIsDeleting(true);
            await estimationService.deleteEstimation(estimationToDelete.id);
            dispatch(showToast({ message: "Estimation deleted successfully", type: "success" }));
            setIsDeleteModalOpen(false);
            setEstimationToDelete(null);
            fetchEstimations(true);
        } catch (error) {
            console.error("Delete Error:", error);
            dispatch(showToast({ message: "Failed to delete estimation", type: "error" }));
        } finally {
            setIsDeleting(false);
        }
    };

    const navbarData = {
        heading: "Estimation",
        subheading: "Offer outlining prices, quantities, and service details",
        from: "common",
    };

    const getStatusColor = (status) => {
        const s = status?.toUpperCase()?.replace(/_/g, " ");
        switch (s) {
            case "COMPLETED":
            case "APPROVED":
            case "INVOICE CREATED":
            case "POST":
            case "POSTED":
                return "bg-green-50 text-green-600 border-green-100";
            case "PROFORMA CREATED":
            case "POSTING":
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

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />

            {isInitialLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message="Loading Estimations..." />
                </div>
            ) : (
                <main className="flex-1 flex flex-col py-6 md:py-8">
                    <div className="w-full flex-1 flex flex-col">
                        <div className="mb-6">
                            {!isFilterVisible ? (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="w-full sm:w-96">
                                        <div className="relative">
                                            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={searchInput}
                                                onChange={(e) => setSearchInput(e.target.value)}
                                                placeholder="Search estimation name.."
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] hover:border-[#FFCA00] placeholder-gray-400 text-[14px] bg-white transition-colors"
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
                                                endpoint: "custom-api/admin/estimation/export",
                                                dispatch,
                                                setIsExporting,
                                                defaultFileName: "estimations_export.xlsx"
                                            })}
                                            disabled={isExporting}
                                            className="flex-1 sm:flex-none px-4 py-2.5 cursor-pointer bg-white border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-medium hover:bg-[#d9ac00]/5 flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-50"
                                        >
                                            {isExporting ? <FiLoader className="animate-spin" size={16} /> : <FiDownload size={16} />}
                                            {isExporting ? "Exporting..." : "Export"}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedEstimation(null);
                                                setIsViewOnly(false);
                                                setIsFormOpen(true);
                                            }}
                                            className="flex-1 sm:flex-none px-4 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 min-w-[140px] cursor-pointer hover:bg-[#d9ac00]"
                                        >
                                            Create Estimation <FiPlus size={18} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-end gap-6 ">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-[13px] font-medium text-gray-500 mb-2 ml-0.5">Filter by Status</label>
                                        <CustomSelect
                                            value={filters.status}
                                            onChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
                                            options={[
                                                { value: "DRAFT", label: "Draft" },
                                                { value: "SENT", label: "Sent" },
                                                { value: "INVOICE_CREATED", label: "Invoice Created" },
                                                { value: "PROFORMA_CREATED", label: "Proforma Created" },
                                                { value: "REJECTED", label: "Rejected" },
                                            ]}
                                            placeholder="Select status"
                                            isClearable
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[160px]">
                                        <label className="block text-[13px] font-medium text-gray-500 mb-2 ml-0.5">Expiry Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={filters.expiry_date}
                                                onChange={(e) => setFilters(prev => ({ ...prev, expiry_date: e.target.value }))}
                                                className={`w-full cursor-pointer px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] bg-white transition-colors h-[40px] ${!filters.expiry_date ? "text-gray-400" : "text-gray-900"}`}
                                                placeholder="dd/mm/yyyy"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-[160px]">
                                        <label className="block text-[13px] font-medium text-gray-500 mb-2 ml-0.5">Quote Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={filters.date}
                                                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                                                className={`w-full cursor-pointer px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] bg-white transition-colors h-[40px] ${!filters.date ? "text-gray-400" : "text-gray-900"}`}
                                                placeholder="dd/mm/yyyy"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pb-0.5 ml-auto">
                                        <button
                                            onClick={handleClearFilters}
                                            className="p-2 border border-blue-50 text-gray-400 cursor-pointer hover:text-red-500 hover:border-red-100 transition-all bg-white rounded-lg flex items-center justify-center w-[40px] h-[40px] shadow-sm"
                                            title="Reset Filters"
                                        >
                                            <FiX size={20} />
                                        </button>
                                        <button
                                            onClick={() => setIsFilterVisible(false)}
                                            className="px-6 py-2 cursor-pointer bg-[#F8F9FB] text-gray-600 border border-transparent rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors h-[40px] min-w-[80px]"
                                        >
                                            Back
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            {/* Small filter loading spinner */}
                            {isFilterLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg">
                                    <div className="w-8 h-8 border-3 border-[#FFCA00] border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                            {estimations.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">
                                                    Estimation Number
                                                </th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-left">Estimate Name</th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-left">Date</th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Amount</th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-left">Status</th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {estimations.map((est, idx) => (
                                                <tr 
                                                    key={est.id} 
                                                    className="hover:bg-gray-50 transition-colors"
                                                >
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {est.estimation_number}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">{est.name}</td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        {est.date ? new Date(est.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap text-right font-bold">
                                                        ₹ {parseFloat(est.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                                        {(() => {
                                                            const displayStatus = est.status || "DRAFT";
                                                            return (
                                                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-bold tracking-tight border ${getStatusColor(displayStatus)}`}>
                                                                    {displayStatus.toUpperCase().replace(/_/g, " ")}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 text-center relative whitespace-nowrap">
                                                        {["DRAFT", "IMPORTED", "POSTED"].includes((est.status || "DRAFT").toUpperCase()) ? (
                                                            <button
                                                                ref={el => actionButtonsRef.current[est.id] = el}
                                                                onClick={(e) => handleActionButtonClick(e, est.id)}
                                                                className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === est.id ? "bg-white border-[#FFCA00] text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                                                            >
                                                                <FiMoreVertical size={18} />
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs font-semibold">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}   
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState
                                    title="No Estimations Found"
                                    message={filters.search ? `No results match your search "${filters.search}".` : "Start by creating your first estimation."}
                                    actionLabel="Create Estimation"
                                    onActionClick={() => setIsFormOpen(true)}
                                />
                            )}
                        </div>

                        {estimations.length > 0 && (
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
                        const est = estimations.find(e => e.id === openMenuId);
                        const isDraft = ["DRAFT", "IMPORTED"].includes(est?.status?.toUpperCase() || "DRAFT");

                        return (
                            <ActionMenu
                                isOpen={true}
                                onClose={() => setOpenMenuId(null)}
                                onEdit={["DRAFT", "IMPORTED", "POSTED"].includes(est?.status?.toUpperCase() || "DRAFT") ? () => handleEditClick(est) : null}
                                onDelete={isDraft ? () => handleDeleteClick(est) : null}
                                actions={isDraft ? [
                                    {
                                        label: "Post",
                                        icon: <FiCheckCircle size={16} />,
                                        onClick: () => handlePostClick(est),
                                        disabled: !isDraft
                                    }
                                ] : []}
                            />
                        );
                    })()}
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsDeleteModalOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <FiTrash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Delete Estimation</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Are you sure you want to delete estimation <span className="font-bold">{estimationToDelete?.estimation_number}</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="mt-6 flex gap-3 justify-center">
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setEstimationToDelete(null);
                                }}
                                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteEstimation}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg shadow-red-500/30 cursor-pointer disabled:opacity-50"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SalesEstimationForm
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelectedEstimation(null);
                    setIsViewOnly(false);
                }}
                onSave={handleSaveCallback}
                editData={selectedEstimation}
                viewOnly={isViewOnly}
            />
        </div>
    );
}
