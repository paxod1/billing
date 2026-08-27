"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
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
import { accountService } from "@/services/accountService";
import CustomerFormModal from "@/components/sales/CustomerFormModal";
import CustomerStatementModal from "@/components/sales/CustomerStatementModal";
import ActionMenu from "@/components/commonComp/ActionMenu";
import CustomSelect from "@/components/common/CustomSelect";
import { handleExport } from "@/utils/exportHelper";
import { useRouter, useSearchParams } from "next/navigation";

export default function CustomersPage() {
    return (
        <CustomersContent />
    );
}

function CustomersContent() {
    const dispatch = useDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [customers, setCustomers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isStatementOpen, setIsStatementOpen] = useState(false);
    const [viewingPartyId, setViewingPartyId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [leafAccounts, setLeafAccounts] = useState([]);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const actionButtonsRef = useRef({});
    const pageSize = 10;

    // Filter states
    const [filters, setFilters] = useState({
        role: "CUSTOMER",
        name: "",
        phone: "",
        search: ""
    });
    const [searchInput, setSearchInput] = useState("");
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [isFirstLoad, setIsFirstLoad] = useState(true);

    // Handle '?action=add' or '?action=create' from URL
    useEffect(() => {
        const action = searchParams.get("action");
        if ((action === "add" || action === "create") && !isLoading && !isModalOpen) {
            setSelectedCustomer(null);
            setIsModalOpen(true);
        }
    }, [searchParams, isLoading]);

    // Instant search - call API on every keystroke via filter update
    useEffect(() => {
        if (searchInput !== filters.search) {
            setFilters(prev => ({ ...prev, search: searchInput }));
            setCurrentPage(1);
        }
    }, [searchInput]);

    // Fetch when filters or page changes
    useEffect(() => {
        fetchCustomers(!isFirstLoad);
    }, [filters, currentPage]);

    // Fetch leaf accounts on mount
    useEffect(() => {
        fetchLeafAccounts();
    }, []);

    const fetchLeafAccounts = async () => {
        try {
            const accounts = await accountService.fetchLeaves();
            setLeafAccounts(accounts);
        } catch (error) {
            console.error("Error fetching leaf accounts:", error);
        }
    };

    const fetchCustomers = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);
            if (isSilent) setIsFilterLoading(true);

            const response = await partyService.getParties({
                ...filters,
                limit: pageSize,
                skip: (currentPage - 1) * pageSize
            });

            // Map API response to component format
            const mappedData = (response.data || []).map(customer => ({
                id: customer.id,
                name: customer.name, // For Modal
                display_name: customer.name, // For Table
                role: customer.role,
                email: customer.email, // For Modal
                customer_email: customer.email, // For Table
                phone: customer.phone, // For Modal
                customer_phone: customer.phone, // For Table
                due_amount: customer.due_amount, 
                sales_due_amount: customer.sales_due_amount, // For Table
                address: customer.address || "",
                currency: customer.currency || "INR",
                gstRegistration: customer.gst_reg || "Registered Regular",
                gstin: customer.gstin_no || "",
            }));

            setCustomers(mappedData);
            setTotalItems(response.totalCount || 0);
        } catch (error) {
            console.error("Error fetching customers:", error);
            dispatch(showToast({ message: "Failed to load customers", type: "error" }));
        } finally {
            if (!isSilent) setIsLoading(false);
            setIsFilterLoading(false);
            setIsFirstLoad(false);
        }
    };

    // Clear filters handler
    const handleClearFilters = () => {
        setFilters({
            role: "CUSTOMER",
            name: "",
            phone: "",
            search: ""
        });
        setSearchInput("");
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedData = customers;

    const handleSave = async (response) => {
        try {
            // The API call is now handled inside CustomerFormModal
            // We just need to refresh the list and handle redirects if necessary
            
            if (!selectedCustomer) {
                // If coming from quotes via URL params (legacy support)
                if (searchParams.get("from") === "quotes") {
                    const newCustomerId = response.data?.[0]?.id || response.id;
                    router.push(`/sales/quotes?action=resume&newCustomerId=${newCustomerId}`);
                    return;
                }
            }

            // Refresh the customer list to show the new/updated record
            await fetchCustomers(true);
            setIsModalOpen(false);
            setSelectedCustomer(null);
        } catch (error) {
            console.error("Error in handleSave refresh:", error);
            dispatch(showToast({ message: "Failed to refresh customer list", type: "error" }));
        }
    };

    const handleEdit = (customer) => {
        setSelectedCustomer(customer);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleDeleteClick = (customer) => {
        setOpenMenuId(null);
        dispatch(openDeleteModal({
            title: `Delete ${customer.name}`,
            message: `Are you sure you want to delete this customer? This action cannot be undone.`,
            onConfirm: () => handleDeleteConfirm(customer.id),
        }));
    };

    const handleDeleteConfirm = async (customerId) => {
        try {
            dispatch(setDeleteLoading(true));
            await partyService.deleteParty(customerId);
            dispatch(showToast({ message: "Customer deleted successfully", type: "success" }));
            await fetchCustomers(true);
            dispatch(closeDeleteModal());
        } catch (error) {
            console.error("Error deleting customer:", error);
            dispatch(showToast({ message: "Failed to delete customer", type: "error" }));
        } finally {
            dispatch(setDeleteLoading(false));
        }
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
        heading: "Customers",
        subheading: "Manage your customer details and accounts",
        from: "sales",
    };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />
            <main className="flex-1 flex flex-col py-6 md:py-8">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <Loader message="Loading Customers..." />
                    </div>
                ) : (
                    <div className="w-full flex-1 flex flex-col">
                        {/* Header Section: Search & Actions OR Filter inputs */}
                        <div className="mb-6">
                            {!isFilterVisible ? (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    {/* Search Bar */}
                                    <div className="relative w-full sm:w-80">
                                        <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                            placeholder="Search customers..."
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] hover:border-[#FFCA00] placeholder-gray-400 text-[14px] bg-white transition-colors"
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                        <button
                                            onClick={() => setIsFilterVisible(true)}
                                            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-200 text-black rounded-lg text-[14px] font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <FiFilter size={16} /> Filter {filters.role !== "CUSTOMER" && `(${filters.role})`}
                                        </button>
                                        <button
                                            onClick={() => handleExport({
                                                endpoint: "custom-api/admin/party_export",
                                                method: "POST",
                                                payload: { role: "customer" },
                                                dispatch,
                                                setIsExporting,
                                                defaultFileName: "customers_export.xlsx"
                                            })}
                                            disabled={isExporting}
                                            className="flex-1 sm:flex-none px-4 py-2.5 cursor-pointer bg-white border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-medium hover:bg-[#d9ac00]/5 flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-50"
                                        >
                                            {isExporting ? <FiLoader className="animate-spin" size={16} /> : <FiDownload size={16} />}
                                            {isExporting ? "Exporting..." : "Export"}
                                        </button>
                                        <button
                                            onClick={() => { setSelectedCustomer(null); setIsModalOpen(true); }}
                                            className="flex-1 sm:flex-none px-4 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 min-w-[140px] cursor-pointer hover:bg-[#d9ac00]"
                                        >
                                            Add New Customer <FiPlus size={18} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-end gap-3 p-4">
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Name</label>
                                        <input
                                            type="text"
                                            value={filters.name}
                                            onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Enter name"
                                            className="w-full px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors"
                                        />
                                    </div>
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
                                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                                        >
                                            Back
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            {isFilterLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg">
                                    <div className="w-8 h-8 border-3 border-[#FFCA00] border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                            {customers.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[800px] lg:min-w-0">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Customer Name</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Email</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Phone</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Due Amount</th>
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 w-32 text-center rounded-tr-lg whitespace-nowrap">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {customers.map((customer, index) => (
                                                    <tr key={customer.id} className="transition-colors border-b border-gray-100">
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                            {customer.display_name}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                            {customer.customer_email || "—"}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                            {customer.customer_phone || "—"}
                                                        </td>
                                                        <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-right text-gray-700 whitespace-nowrap">
                                                            ₹ {parseFloat(customer.sales_due_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-6 py-4 text-center relative whitespace-nowrap">
                                                            <button
                                                                ref={el => actionButtonsRef.current[customer.id] = el}
                                                                onClick={(e) => handleActionButtonClick(e, customer.id)}
                                                                className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === customer.id ? "border-[#FFCA00] bg-white text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
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
                                    title="No Customers Found"
                                    message={searchInput || filters.name || filters.phone ? "No customers match your search criteria." : "Start by adding your first customer using the button above."}
                                    actionLabel="Add New Customer"
                                    onActionClick={() => { setSelectedCustomer(null); setIsModalOpen(true); }}
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
                        onEdit={() => handleEdit(customers.find(c => c.id === openMenuId))}
                        onDelete={() => handleDeleteClick(customers.find(c => c.id === openMenuId))}
                    />
                </div>
            )}

            <CustomerFormModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedCustomer(null);
                    // If we were in 'add' mode from quotes, and we cancel, maybe go back?
                    if (searchParams.get("from") === "quotes") {
                        router.push("/sales/quotes?action=resume");
                    }
                }}
                onSave={handleSave}
                customerData={selectedCustomer}
                isSaving={isSaving}
                leafAccounts={leafAccounts}
            />

            <CustomerStatementModal
                isOpen={isStatementOpen}
                onClose={() => {
                    setIsStatementOpen(false);
                    setViewingPartyId(null);
                }}
                customerId={viewingPartyId}
            />
        </div>
    );
}
