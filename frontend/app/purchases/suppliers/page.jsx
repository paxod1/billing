"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Navbar from "@/components/commonComp/Navbar";
import Pagination from "@/components/commonComp/Pagination";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import { IoClose, IoSearchOutline } from "react-icons/io5";
import { FiFilter, FiDownload, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiLoader, FiX } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { openDeleteModal, closeDeleteModal, setDeleteLoading } from "@/lib/features/ui/uiSlice";
import { partyService } from "@/services/partyService";
import ActionMenu from "@/components/commonComp/ActionMenu";
import SupplierStatementModal from "@/components/purchases/SupplierStatementModal";
import CustomSelect from "@/components/common/CustomSelect";
import { useRouter, useSearchParams } from "next/navigation";

const SupplierModal = ({ isOpen, onClose, onSave, supplierData, isSaving }) => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        name: supplierData?.name || "",
        role: supplierData?.role || "SUPPLIER",
        email: supplierData?.email || "",
        phone: supplierData?.phone || "",
        address: supplierData?.address || "",
        defaultAccount: supplierData?.defaultAccount || "",
        currency: supplierData?.currency || "INR",
        gstRegistration: supplierData?.gstRegistration || "Registered Regular",
        gstin: supplierData?.gstin || "",
    });

    React.useEffect(() => {
        if (supplierData) {
            setFormData({
                name: supplierData.name || "",
                role: supplierData.role || "SUPPLIER",
                email: supplierData.email || "",
                phone: supplierData.phone || "",
                address: supplierData.address || "",
                defaultAccount: supplierData.defaultAccount || "",
                currency: supplierData.currency || "INR",
                gstRegistration: supplierData.gstRegistration || "Registered Regular",
                gstin: supplierData.gstin || "",
            });
        } else {
            setFormData({
                name: "",
                role: "SUPPLIER",
                email: "",
                phone: "",
                address: "",
                defaultAccount: "",
                currency: "INR",
                gstRegistration: "Registered Regular",
                gstin: "",
            });
        }
    }, [supplierData, isOpen]);

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!formData.name.trim()) {
            dispatch(showToast({ message: "Please enter supplier name", type: "error" }));
            return;
        }
        if (!formData.email.trim()) {
            dispatch(showToast({ message: "Please enter email", type: "error" }));
            return;
        }
        onSave(formData);
    };

    const isEditMode = !!supplierData;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 md:p-10 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
           


                <div className="mb-6">
                    <h2 className="text-[20px] md:text-[24px] font-bold text-gray-900">{isEditMode ? "Edit Supplier" : "Add New Supplier"}</h2>
                    <p className="text-gray-500 text-[13px] md:text-[14px] mt-1">Setup supplier details and accounts</p>
                </div>

                <div className="border-t border-gray-200 pt-6">
                    {/* Supplier Details Section */}
                    <div className="mb-8">
                        <h3 className="text-[16px] font-bold text-gray-900 mb-4">Supplier Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-[14px]"
                                    placeholder="Enter Supplier Name"
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-[14px]"
                                    placeholder="Enter Supplier Email"
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-gray-700">Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => handleChange("phone", e.target.value)}
                                    className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-[14px]"
                                    placeholder="Enter Supplier Phone Number"
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-gray-700">Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => handleChange("address", e.target.value)}
                                    className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-[14px]"
                                    placeholder="Enter Supplier Address"
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Billing Details Section */}
                    <div>
                        <h3 className="text-[16px] font-bold text-gray-900 mb-4">Billing Details</h3>
                        <div className={`grid grid-cols-1 ${formData.gstRegistration !== "Unregistered" ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-gray-700">Currency</label>
                                <CustomSelect
                                    value={formData.currency}
                                    onChange={(val) => handleChange("currency", val)}
                                    options={[
                                        { value: "INR", label: "INR" },
                                        { value: "USD", label: "USD" },
                                    ]}
                                    isDisabled={isSaving}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-gray-700">GST Registration</label>
                                <CustomSelect
                                    value={formData.gstRegistration}
                                    onChange={(val) => handleChange("gstRegistration", val)}
                                    options={[
                                        { value: "Registered Regular", label: "Registered Regular" },
                                        { value: "Unregistered", label: "Unregistered" },
                                    ]}
                                    isDisabled={isSaving}
                                />
                            </div>
                            {formData.gstRegistration !== "Unregistered" && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">GSTIN No</label>
                                    <div className="flex flex-col gap-1">
                                        <input
                                            type="text"
                                            value={formData.gstin}
                                            onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())}
                                            className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-[14px] uppercase"
                                            placeholder="Enter GSTIN No"
                                            maxLength={15}
                                            disabled={isSaving}
                                        />
                                        <span className="text-[11px] text-gray-500">Max 15 characters</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row items-center justify-end gap-3 md:gap-4 mt-10">
                    <button
                        onClick={onClose}
                        className="w-full md:w-auto px-8 py-3 text-[15px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="w-full md:w-auto px-10 py-3 bg-[#FFCA00] text-white rounded-lg text-[15px] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d9ac00]"
                        disabled={isSaving}
                    >
                        {isSaving ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update" : "Create")}
                    </button>
                </div>
            </div>
        </div>
    );
};

function SuppliersContent() {
    const dispatch = useDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [suppliers, setSuppliers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [isStatementOpen, setIsStatementOpen] = useState(false);
    const [viewingPartyId, setViewingPartyId] = useState(null);
    const [searchInput, setSearchInput] = useState("");
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [filters, setFilters] = useState({
        role: "SUPPLIER",
        name: "",
        phone: "",
        search: ""
    });
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const actionButtonsRef = useRef({});
    const pageSize = 10;

    const isInitialMount = useRef(true);

    // Handle '?action=create' from URL
    useEffect(() => {
        const action = searchParams.get("action");
        if (action === "create" && !isLoading && !isModalOpen) {
            setSelectedSupplier(null);
            setIsModalOpen(true);
        }
    }, [searchParams, isLoading]);

    // Fetch suppliers when filters or page changes
    useEffect(() => {
        if (isInitialMount.current) {
            fetchSuppliers(false);
            isInitialMount.current = false;
        } else {
            fetchSuppliers(true);
        }
    }, [filters, currentPage]);

    const fetchSuppliers = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);
            if (isSilent) setIsFilterLoading(true);
            const response = await partyService.getParties({
                ...filters,
                limit: pageSize,
                skip: (currentPage - 1) * pageSize
            });

            // Map API response to component format
            const mappedData = response.data.map(supplier => ({
                id: supplier.id,
                name: supplier.name,
                role: supplier.role,
                email: supplier.email,
                phone: supplier.phone,
                dueAmount: parseFloat(supplier.purchase_due_amount || 0) - parseFloat(supplier.supplierCredit || 0),
                purchase_due_amount: supplier.purchase_due_amount,
                supplierCredit: supplier.supplierCredit,
                address: supplier.address || "",
                defaultAccount: supplier.default_account || "",
                currency: supplier.currency || "INR",
                gstRegistration: supplier.gst_reg || "Registered Regular",
                gstin: supplier.gstin_no || "",
            }));

            setSuppliers(mappedData);
            setTotalItems(response.totalCount);
        } catch (error) {
            console.error("Error fetching suppliers:", error);
            dispatch(showToast({ message: "Failed to load suppliers", type: "error" }));
        } finally {
            if (!isSilent) setIsLoading(false);
            setIsFilterLoading(false);
        }
    };

    // Instant search - call API on every keystroke via filter update
    useEffect(() => {
        if (searchInput !== filters.search) {
            setFilters(prev => ({ ...prev, search: searchInput }));
            setCurrentPage(1);
        }
    }, [searchInput]);

    const handleClearFilters = () => {
        setFilters({
            role: "SUPPLIER",
            name: "",
            phone: "",
            search: ""
        });
        setSearchInput("");
    };

    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedData = suppliers; // Already paginated from server

    // Handle pagination correction when data is deleted
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const handleSave = async (formData) => {
        setIsSaving(true);
        try {
            // Map form data to API format
            const apiData = {
                name: formData.name,
                role: "SUPPLIER", // Always set role to SUPPLIER
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                currency: formData.currency,
                gst_reg: formData.gstRegistration,
                gstin_no: formData.gstin,
            };

            if (selectedSupplier) {
                await partyService.updateParty(selectedSupplier.id, apiData);
                dispatch(showToast({ message: "Supplier updated successfully", type: "success" }));
            } else {
                await partyService.createParty(apiData);
                dispatch(showToast({ message: "Supplier created successfully", type: "success" }));
            }

            await fetchSuppliers(true);
            setIsModalOpen(false);
            setSelectedSupplier(null);
        } catch (error) {
            console.error("Error saving supplier:", error);

            // Extract specific error message from API response
            let errorMessage = selectedSupplier ? "Failed to update supplier" : "Failed to create supplier";

            if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                const firstError = error.response.data.errors[0];
                if (firstError?.message) {
                    errorMessage = firstError.message;
                }
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            dispatch(showToast({
                message: errorMessage,
                type: "error"
            }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (supplier) => {
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleDeleteClick = (supplier) => {
        setOpenMenuId(null);
        dispatch(openDeleteModal({
            title: `Delete ${supplier.name}`,
            message: `Are you sure you want to delete this supplier? This action cannot be undone.`,
            onConfirm: () => handleDeleteConfirm(supplier.id),
        }));
    };

    const handleDeleteConfirm = async (supplierId) => {
        try {
            dispatch(setDeleteLoading(true));
            await partyService.deleteParty(supplierId);
            dispatch(showToast({ message: "Supplier deleted successfully", type: "success" }));
            await fetchSuppliers(true);
            dispatch(closeDeleteModal());
        } catch (error) {
            console.error("Error deleting supplier:", error);
            dispatch(showToast({ message: "Failed to delete supplier", type: "error" }));
        } finally {
            dispatch(setDeleteLoading(false));
        }
    };

    const handleActionButtonClick = (e, id) => {
        e.stopPropagation();

        // Get the position of the clicked button
        const rect = e.currentTarget.getBoundingClientRect();
        // Position menu below the button
        setMenuPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom
        });

        setOpenMenuId(openMenuId === id ? null : id);
    };

    const navbarData = {
        heading: "Suppliers",
        subheading: "Manage your supplier details and accounts",
        from: "purchases",
    };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />
            <main className="flex-1 flex flex-col py-6 md:py-8">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <Loader message="Loading Suppliers..." />
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
                                                placeholder="Search by name"
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
                                            <FiFilter size={16} /> Filter {filters.role !== "SUPPLIER" && `(${filters.role})`}
                                        </button>
                                        <button className="flex-1 sm:flex-none px-4 py-2.5 cursor-pointer bg-white border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-medium hover:bg-[#d9ac00]/5 flex items-center justify-center gap-2 min-w-[120px]">
                                            <FiDownload size={16} /> Export
                                        </button>
                                        <button
                                            onClick={() => { setSelectedSupplier(null); setIsModalOpen(true); }}
                                            className="flex-1 sm:flex-none px-4 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 min-w-[160px] cursor-pointer hover:bg-[#d9ac00]"
                                        >
                                            Add New Supplier <FiPlus size={18} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-end gap-3 p-4">
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Phone</label>
                                        <input
                                            type="text"
                                            value={filters.phone}
                                            onChange={(e) => setFilters(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="Enter phone"
                                            className="w-full px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors"
                                        />
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

                        {/* Suppliers Table */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            {isFilterLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg">
                                    <div className="w-8 h-8 border-3 border-[#FFCA00] border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                            {paginatedData.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[800px] lg:min-w-0">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Name</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Email</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Phone</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Due Amount</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {paginatedData.map((supplier, index) => (
                                                    <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                            {supplier.name}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">{supplier.email}</td>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">{supplier.phone}</td>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 text-right whitespace-nowrap">
                                                            ₹ {parseFloat(supplier.dueAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-4 text-center relative whitespace-nowrap">
                                                            <button
                                                                ref={el => actionButtonsRef.current[supplier.id] = el}
                                                                onClick={(e) => handleActionButtonClick(e, supplier.id)}
                                                                className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === supplier.id ? "border-[#FFCA00] bg-white text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
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
                                    title="No Suppliers Found"
                                    message={searchInput || filters.name || filters.phone ? "No suppliers match your search criteria." : "Start by adding your first supplier using the button above."}
                                    actionLabel="Add New Supplier"
                                    onActionClick={() => { setSelectedSupplier(null); setIsModalOpen(true); }}
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
                            setViewingPartyId(openMenuId);
                            setIsStatementOpen(true);
                            setOpenMenuId(null);
                        }}
                        onEdit={() => {
                            const supplier = suppliers.find(s => s.id === openMenuId);
                            if (supplier) handleEdit(supplier);
                        }}
                        onDelete={() => {
                            const supplier = suppliers.find(s => s.id === openMenuId);
                            if (supplier) handleDeleteClick(supplier);
                        }}
                    />
                </div>
            )}

            <SupplierModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedSupplier(null); }}
                onSave={handleSave}
                supplierData={selectedSupplier}
                isSaving={isSaving}
            />

            <SupplierStatementModal
                isOpen={isStatementOpen}
                onClose={() => {
                    setIsStatementOpen(false);
                    setViewingPartyId(null);
                }}
                supplierId={viewingPartyId}
            />
        </div>
    );
}

export default function SuppliersPage() {
    return (
        <Suspense fallback={<Loader />}>
            <SuppliersContent />
        </Suspense>
    );
}
