"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/commonComp/Navbar";
import Pagination from "@/components/commonComp/Pagination";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import { IoClose, IoSearchOutline } from "react-icons/io5";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { openDeleteModal, closeDeleteModal, setDeleteLoading } from "@/lib/features/ui/uiSlice";
import { partyService } from "@/services/partyService";
import { accountService } from "@/services/accountService";
import ActionMenu from "@/components/commonComp/ActionMenu";
import CustomSelect from "@/components/common/CustomSelect";
import { handleExport } from "@/utils/exportHelper";
import { useRef } from "react";
import { FiFilter, FiDownload, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiLoader, FiX } from "react-icons/fi";


const PartyModal = ({ isOpen, onClose, onSave, partyData, isSaving, leafAccounts }) => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        name: partyData?.name || "",
        role: partyData?.role || "",
        email: partyData?.email || "",
        phone: partyData?.phone || "",
        address: partyData?.address || "",
        currency: partyData?.currency || "INR",
        gst_reg: partyData?.gst_reg || "Registered Regular",
        gstin_no: partyData?.gstin_no || "",
    });

    React.useEffect(() => {
        if (partyData) {
            setFormData({
                name: partyData.name || "",
                role: partyData.role || "",
                email: partyData.email || "",
                phone: partyData.phone || "",
                address: partyData.address || "",
                currency: partyData.currency || "INR",
                gst_reg: partyData.gst_reg || "Registered Regular",
                gstin_no: partyData.gstin_no || "",
            });
        } else {
            setFormData({
                name: "",
                role: "",
                email: "",
                phone: "",
                address: "",
                currency: "INR",
                gst_reg: "Registered Regular",
                gstin_no: "",
            });
        }
    }, [partyData, isOpen]);

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        if (field === "phone") {
            value = value.replace(/\D/g, "");
        }
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!formData.name.trim()) {
            dispatch(showToast({ message: "Please enter party name", type: "error" }));
            return;
        }
        if (!formData.email.trim()) {
            dispatch(showToast({ message: "Please enter email", type: "error" }));
            return;
        }
        onSave(formData);
    };

    const isEditMode = !!partyData;
    const isUnregistered = formData.gst_reg === "Unregistered";

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200">
                <div className="p-6 sm:p-10">
                    {/* Close Icon */}
                    <button
                        onClick={onClose}
                        className="absolute cursor-pointer top-6 right-6 text-gray-400 hover:text-black transition-colors"
                        disabled={isSaving}
                    >
                        <IoClose size={24} />
                    </button>

                    <div className="mb-6 border-b pb-4 pr-10">
                        <h2 className="text-xl sm:text-[24px] font-bold text-gray-900">{isEditMode ? "Edit Party" : "Add New Party"}</h2>
                        <p className="text-gray-500 text-xs sm:text-[14px] mt-1">Setup party details and accounts</p>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                        {/* Party Details Section */}
                        <div className="mb-8">
                            <h3 className="text-[16px] font-bold text-gray-900 mb-4 uppercase tracking-wider">Party Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                        className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        placeholder="Enter Party Name"
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Role</label>
                                    <CustomSelect
                                        value={formData.role}
                                        onChange={(val) => handleChange("role", val)}
                                        options={[
                                            { value: "CUSTOMER", label: "CUSTOMER" },
                                            { value: "SUPPLIER", label: "SUPPLIER" },
                                            { value: "BOTH", label: "BOTH" },
                                        ]}
                                        placeholder="Select"
                                        isDisabled={isSaving}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleChange("email", e.target.value)}
                                        className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        placeholder="Enter Party Email"
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Phone</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => handleChange("phone", e.target.value)}
                                        className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        placeholder="Enter Party Phone Number"
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Address</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => handleChange("address", e.target.value)}
                                        className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        placeholder="Enter Party Address"
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Billing Details Section */}
                        <div className="mt-8">
                            <h3 className="text-[16px] font-bold text-gray-900 mb-4 uppercase tracking-wider">Billing Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                                        value={formData.gst_reg}
                                        onChange={(val) => handleChange("gst_reg", val)}
                                        options={[
                                            { value: "Registered Regular", label: "Registered Regular" },
                                            { value: "Unregistered", label: "Unregistered" },
                                        ]}
                                        isDisabled={isSaving}
                                    />
                                </div>
                                {/* GSTIN field: only show when NOT Unregistered */}
                                {!isUnregistered && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[13px] font-medium text-gray-700">GSTIN No</label>
                                        <input
                                            type="text"
                                            value={formData.gstin_no}
                                            onChange={(e) => handleChange("gstin_no", e.target.value.toUpperCase())}
                                            className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400 uppercase"
                                            placeholder="Enter GSTIN No"
                                            maxLength={15}
                                            disabled={isSaving}
                                        />
                                        <span className="text-[11px] text-gray-500">Max 15 characters</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 mt-10 pt-6 border-t">
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto px-8 py-3 text-[15px] font-medium text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="w-full sm:w-auto px-10 py-3 bg-[#FFCA00] text-white rounded-lg text-[15px] font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d9ac00]"
                            disabled={isSaving}
                        >
                            {isSaving ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update" : "Create")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function PartyPage() {
    const dispatch = useDispatch();
    const [parties, setParties] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedParty, setSelectedParty] = useState(null);
    const [searchInput, setSearchInput] = useState("");
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [filters, setFilters] = useState({
        role: "ALL",
        name: "",
        phone: "",
        currency: "",
        search: ""
    });
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [leafAccounts, setLeafAccounts] = useState([]);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const actionButtonsRef = useRef({});
    const isFirstLoad = useRef(true);
    const pageSize = 10;

    // Fetch leaf accounts on component mount
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

    const fetchParties = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);
            if (isSilent) setIsFilterLoading(true);
            const response = await partyService.getParties({
                ...filters,
                limit: pageSize,
                skip: (currentPage - 1) * pageSize
            });

            // Map API response to component format
            const mappedData = (response.data || []).map(party => ({
                id: party.id,
                name: party.name,
                role: party.role,
                email: party.email,
                phone: party.phone,
                dueAmount: parseFloat(party.due_amount || 0),
                address: party.address || "",
                defaultAccount: party.default_account || "",
                currency: party.currency || "INR",
                gst_reg: party.gst_reg || "Registered Regular",
                gstin_no: party.gstin_no || "",
            }));

            setParties(mappedData);
            setTotalItems(response.totalCount || 0);
        } catch (error) {
            console.error("Error fetching parties:", error);
            dispatch(showToast({ message: "Failed to load parties", type: "error" }));
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

    useEffect(() => {
        if (isFirstLoad.current) {
            fetchParties(false);
            isFirstLoad.current = false;
        } else {
            fetchParties(true);
        }
    }, [filters, currentPage]);

    const handleClearFilters = () => {
        setFilters({
            role: "ALL",
            name: "",
            phone: "",
            currency: "",
            search: ""
        });
        setSearchInput("");
    };

    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedData = parties; // Already paginated from server

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
                role: formData.role,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                currency: formData.currency,
                gst_reg: formData.gst_reg,
                gstin_no: formData.gst_reg === "Unregistered" ? "" : formData.gstin_no,
            };

            if (selectedParty) {
                await partyService.updateParty(selectedParty.id, apiData);
                dispatch(showToast({ message: "Party updated successfully", type: "success" }));
            } else {
                await partyService.createParty(apiData);
                dispatch(showToast({ message: "Party created successfully", type: "success" }));
            }

            await fetchParties(true);
            setIsModalOpen(false);
            setSelectedParty(null);
        } catch (error) {
            console.error("Error saving party:", error);
            const errorMessage = error.response?.data?.errors?.[0]?.message || error.response?.data?.message || (selectedParty ? "Failed to update party" : "Failed to create party");
            dispatch(showToast({ message: errorMessage, type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (party) => {
        setSelectedParty(party);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleDeleteClick = (party) => {
        setOpenMenuId(null);
        dispatch(openDeleteModal({
            title: `Delete ${party.name}`,
            message: `Are you sure you want to delete this party? This action cannot be undone.`,
            onConfirm: () => handleDeleteConfirm(party.id),
        }));
    };

    const handleDeleteConfirm = async (partyId) => {
        try {
            dispatch(setDeleteLoading(true));
            await partyService.deleteParty(partyId);
            dispatch(showToast({ message: "Party deleted successfully", type: "success" }));
            await fetchParties(true);
            dispatch(closeDeleteModal());
        } catch (error) {
            console.error("Error deleting party:", error);
            if (!error.isHandled) {
                dispatch(showToast({ message: "Failed to delete party", type: "error" }));
            }
            dispatch(closeDeleteModal());
        } finally {
            dispatch(setDeleteLoading(false));
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

    const navbarData = {
        heading: "Party",
        subheading: "Create and manage both customer and supplier details",
        from: "common",
    };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />
            <main className="flex-1 flex flex-col py-8 ">
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
                                        className="flex-1 sm:flex-none px-6 py-3 bg-white border border-gray-200 text-black rounded-lg text-[14px] lg:text-[15px] font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 cursor-pointer h-[48px]"
                                    >
                                        <FiFilter size={18} /> Filter {filters.role !== "ALL" && `(${filters.role})`}
                                    </button>
                                    <button
                                        onClick={() => handleExport({
                                            endpoint: "custom-api/admin/party_export",
                                            method: "POST",
                                            payload: { role: filters.role === "ALL" ? "all" : filters.role.toLowerCase() },
                                            dispatch,
                                            setIsExporting,
                                            defaultFileName: `parties_${filters.role.toLowerCase()}_export.xlsx`
                                        })}
                                        disabled={isExporting}
                                        className="flex-1 sm:flex-none px-6 py-3 cursor-pointer border border-[#FFCA00]/30 text-[#FFCA00] rounded-lg text-[14px] lg:text-[15px] font-bold hover:bg-[#d9ac00]/5 flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-50 h-[48px]"
                                    >
                                        {isExporting ? <FiLoader className="animate-spin" size={18} /> : <FiDownload size={18} />}
                                        {isExporting ? "Exporting..." : "Export"}
                                    </button>
                                    <button
                                        onClick={() => { setSelectedParty(null); setIsModalOpen(true); }}
                                        className="flex-1 sm:flex-none px-6 py-3 bg-[#FFCA00] text-white rounded-lg text-[14px] lg:text-[15px] font-bold flex items-center justify-center gap-2 min-w-[160px] cursor-pointer h-[48px] hover:bg-[#d9ac00]"
                                    >
                                        Add New Party <FiPlus size={20} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="flex-1 min-w-[180px]">
                                    <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Role</label>
                                    <CustomSelect
                                        value={filters.role}
                                        onChange={(val) => setFilters(prev => ({ ...prev, role: val }))}
                                        options={[
                                            { value: "ALL", label: "All Parties" },
                                            { value: "CUSTOMER", label: "Customers" },
                                            { value: "SUPPLIER", label: "Suppliers" },
                                        ]}
                                        placeholder="Select role"
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
                                <div className="flex-1 min-w-[180px]">
                                    <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Currency</label>
                                    <CustomSelect
                                        value={filters.currency}
                                        onChange={(val) => setFilters(prev => ({ ...prev, currency: val }))}
                                        options={[
                                            { value: "AED", label: "AED - UAE Dirham" },
                                            { value: "AFN", label: "AFN - Afghan Afghani" },
                                            { value: "ALL", label: "ALL - Albanian Lek" },
                                            { value: "AMD", label: "AMD - Armenian Dram" },
                                            { value: "ANG", label: "ANG - Netherlands Antillean Guilder" },
                                            { value: "AOA", label: "AOA - Angolan Kwanza" },
                                            { value: "ARS", label: "ARS - Argentine Peso" },
                                            { value: "AUD", label: "AUD - Australian Dollar" },
                                            { value: "AWG", label: "AWG - Aruban Florin" },
                                            { value: "AZN", label: "AZN - Azerbaijani Manat" },
                                            { value: "BAM", label: "BAM - Bosnia-Herzegovina Convertible Mark" },
                                            { value: "BBD", label: "BBD - Barbadian Dollar" },
                                            { value: "BDT", label: "BDT - Bangladeshi Taka" },
                                            { value: "BGN", label: "BGN - Bulgarian Lev" },
                                            { value: "BHD", label: "BHD - Bahraini Dinar" },
                                            { value: "BND", label: "BND - Brunei Dollar" },
                                            { value: "BOB", label: "BOB - Bolivian Boliviano" },
                                            { value: "BRL", label: "BRL - Brazilian Real" },
                                            { value: "BSD", label: "BSD - Bahamian Dollar" },
                                            { value: "BTN", label: "BTN - Bhutanese Ngultrum" },
                                            { value: "BWP", label: "BWP - Botswanan Pula" },
                                            { value: "BYN", label: "BYN - Belarusian Ruble" },
                                            { value: "BZD", label: "BZD - Belize Dollar" },
                                            { value: "CAD", label: "CAD - Canadian Dollar" },
                                            { value: "CDF", label: "CDF - Congolese Franc" },
                                            { value: "CHF", label: "CHF - Swiss Franc" },
                                            { value: "CLP", label: "CLP - Chilean Peso" },
                                            { value: "CNY", label: "CNY - Chinese Yuan" },
                                            { value: "COP", label: "COP - Colombian Peso" },
                                            { value: "CRC", label: "CRC - Costa Rican Colón" },
                                            { value: "CUP", label: "CUP - Cuban Peso" },
                                            { value: "CVE", label: "CVE - Cape Verdean Escudo" },
                                            { value: "CZK", label: "CZK - Czech Koruna" },
                                            { value: "DJF", label: "DJF - Djiboutian Franc" },
                                            { value: "DKK", label: "DKK - Danish Krone" },
                                            { value: "DOP", label: "DOP - Dominican Peso" },
                                            { value: "DZD", label: "DZD - Algerian Dinar" },
                                            { value: "EGP", label: "EGP - Egyptian Pound" },
                                            { value: "ERN", label: "ERN - Eritrean Nakfa" },
                                            { value: "ETB", label: "ETB - Ethiopian Birr" },
                                            { value: "EUR", label: "EUR - Euro" },
                                            { value: "FJD", label: "FJD - Fijian Dollar" },
                                            { value: "GBP", label: "GBP - British Pound" },
                                            { value: "GEL", label: "GEL - Georgian Lari" },
                                            { value: "GHS", label: "GHS - Ghanaian Cedi" },
                                            { value: "GMD", label: "GMD - Gambian Dalasi" },
                                            { value: "GNF", label: "GNF - Guinean Franc" },
                                            { value: "GTQ", label: "GTQ - Guatemalan Quetzal" },
                                            { value: "HKD", label: "HKD - Hong Kong Dollar" },
                                            { value: "HNL", label: "HNL - Honduran Lempira" },
                                            { value: "HRK", label: "HRK - Croatian Kuna" },
                                            { value: "HTG", label: "HTG - Haitian Gourde" },
                                            { value: "HUF", label: "HUF - Hungarian Forint" },
                                            { value: "IDR", label: "IDR - Indonesian Rupiah" },
                                            { value: "ILS", label: "ILS - Israeli New Shekel" },
                                            { value: "INR", label: "INR - Indian Rupee" },
                                            { value: "IQD", label: "IQD - Iraqi Dinar" },
                                            { value: "IRR", label: "IRR - Iranian Rial" },
                                            { value: "ISK", label: "ISK - Icelandic Króna" },
                                            { value: "JMD", label: "JMD - Jamaican Dollar" },
                                            { value: "JOD", label: "JOD - Jordanian Dinar" },
                                            { value: "JPY", label: "JPY - Japanese Yen" },
                                            { value: "KES", label: "KES - Kenyan Shilling" },
                                            { value: "KGS", label: "KGS - Kyrgystani Som" },
                                            { value: "KHR", label: "KHR - Cambodian Riel" },
                                            { value: "KWD", label: "KWD - Kuwaiti Dinar" },
                                            { value: "KYD", label: "KYD - Cayman Islands Dollar" },
                                            { value: "KZT", label: "KZT - Kazakhstani Tenge" },
                                            { value: "LAK", label: "LAK - Laotian Kip" },
                                            { value: "LBP", label: "LBP - Lebanese Pound" },
                                            { value: "LKR", label: "LKR - Sri Lankan Rupee" },
                                            { value: "LRD", label: "LRD - Liberian Dollar" },
                                            { value: "LYD", label: "LYD - Libyan Dinar" },
                                            { value: "MAD", label: "MAD - Moroccan Dirham" },
                                            { value: "MDL", label: "MDL - Moldovan Leu" },
                                            { value: "MKD", label: "MKD - Macedonian Denar" },
                                            { value: "MMK", label: "MMK - Myanmar Kyat" },
                                            { value: "MNT", label: "MNT - Mongolian Tögrög" },
                                            { value: "MOP", label: "MOP - Macanese Pataca" },
                                            { value: "MRU", label: "MRU - Mauritanian Ouguiya" },
                                            { value: "MUR", label: "MUR - Mauritian Rupee" },
                                            { value: "MVR", label: "MVR - Maldivian Rufiyaa" },
                                            { value: "MWK", label: "MWK - Malawian Kwacha" },
                                            { value: "MXN", label: "MXN - Mexican Peso" },
                                            { value: "MYR", label: "MYR - Malaysian Ringgit" },
                                            { value: "MZN", label: "MZN - Mozambican Metical" },
                                            { value: "NAD", label: "NAD - Namibian Dollar" },
                                            { value: "NGN", label: "NGN - Nigerian Naira" },
                                            { value: "NIO", label: "NIO - Nicaraguan Córdoba" },
                                            { value: "NOK", label: "NOK - Norwegian Krone" },
                                            { value: "NPR", label: "NPR - Nepalese Rupee" },
                                            { value: "NZD", label: "NZD - New Zealand Dollar" },
                                            { value: "OMR", label: "OMR - Omani Rial" },
                                            { value: "PAB", label: "PAB - Panamanian Balboa" },
                                            { value: "PEN", label: "PEN - Peruvian Sol" },
                                            { value: "PGK", label: "PGK - Papua New Guinean Kina" },
                                            { value: "PHP", label: "PHP - Philippine Peso" },
                                            { value: "PKR", label: "PKR - Pakistani Rupee" },
                                            { value: "PLN", label: "PLN - Polish Złoty" },
                                            { value: "PYG", label: "PYG - Paraguayan Guaraní" },
                                            { value: "QAR", label: "QAR - Qatari Riyal" },
                                            { value: "RON", label: "RON - Romanian Leu" },
                                            { value: "RSD", label: "RSD - Serbian Dinar" },
                                            { value: "RUB", label: "RUB - Russian Ruble" },
                                            { value: "RWF", label: "RWF - Rwandan Franc" },
                                            { value: "SAR", label: "SAR - Saudi Riyal" },
                                            { value: "SBD", label: "SBD - Solomon Islands Dollar" },
                                            { value: "SCR", label: "SCR - Seychellois Rupee" },
                                            { value: "SDG", label: "SDG - Sudanese Pound" },
                                            { value: "SEK", label: "SEK - Swedish Krona" },
                                            { value: "SGD", label: "SGD - Singapore Dollar" },
                                            { value: "SLL", label: "SLL - Sierra Leonean Leone" },
                                            { value: "SOS", label: "SOS - Somali Shilling" },
                                            { value: "SRD", label: "SRD - Surinamese Dollar" },
                                            { value: "STN", label: "STN - São Tomé & Príncipe Dobra" },
                                            { value: "SYP", label: "SYP - Syrian Pound" },
                                            { value: "SZL", label: "SZL - Swazi Lilangeni" },
                                            { value: "THB", label: "THB - Thai Baht" },
                                            { value: "TJS", label: "TJS - Tajikistani Somoni" },
                                            { value: "TMT", label: "TMT - Turkmenistani Manat" },
                                            { value: "TND", label: "TND - Tunisian Dinar" },
                                            { value: "TOP", label: "TOP - Tongan Paʻanga" },
                                            { value: "TRY", label: "TRY - Turkish Lira" },
                                            { value: "TTD", label: "TTD - Trinidad & Tobago Dollar" },
                                            { value: "TWD", label: "TWD - New Taiwan Dollar" },
                                            { value: "TZS", label: "TZS - Tanzanian Shilling" },
                                            { value: "UAH", label: "UAH - Ukrainian Hryvnia" },
                                            { value: "UGX", label: "UGX - Ugandan Shilling" },
                                            { value: "USD", label: "USD - US Dollar" },
                                            { value: "UYU", label: "UYU - Uruguayan Peso" },
                                            { value: "UZS", label: "UZS - Uzbekistani Som" },
                                            { value: "VES", label: "VES - Venezuelan Bolívar" },
                                            { value: "VND", label: "VND - Vietnamese Đồng" },
                                            { value: "VUV", label: "VUV - Vanuatu Vatu" },
                                            { value: "WST", label: "WST - Samoan Tālā" },
                                            { value: "XAF", label: "XAF - Central African CFA Franc" },
                                            { value: "XCD", label: "XCD - East Caribbean Dollar" },
                                            { value: "XOF", label: "XOF - West African CFA Franc" },
                                            { value: "YER", label: "YER - Yemeni Rial" },
                                            { value: "ZAR", label: "ZAR - South African Rand" },
                                            { value: "ZMW", label: "ZMW - Zambian Kwacha" },
                                            { value: "ZWL", label: "ZWL - Zimbabwean Dollar" },
                                        ]}
                                        placeholder="Select currency"
                                        isClearable
                                    />
                                </div>
                                <div className="flex items-center gap-2 pb-0.5 ml-auto">
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors p-2 bg-white border border-gray-200 rounded-lg"
                                        title="Reset Filters"
                                    >
                                        <FiX size={18} />
                                    </button>
                                    <button
                                        onClick={() => setIsFilterVisible(false)}
                                        className="px-6 py-2 cursor-pointer bg-gray-50 border border-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                                    >
                                        Back
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table Content */}
                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                            <Loader message="Loading Parties..." />
                        </div>
                    ) : parties.length > 0 ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            {isFilterLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg">
                                    <div className="w-8 h-8 border-3 border-[#FFCA00] border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                            <div className="overflow-x-auto">
                                <div className="min-w-[800px] lg:min-w-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg text-center w-16">#</th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Name</th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Role</th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Email</th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Phone</th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Due Amount</th>
                                                <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {parties.map((party, index) => (
                                                <tr key={party.id} className="transition-colors border-b border-gray-100">
                                                    <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-500 text-center whitespace-nowrap">
                                                        {(currentPage - 1) * pageSize + index + 1}
                                                    </td>
                                                    <td key={party.id} className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700  whitespace-nowrap">
                                                        {party.name}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${party.role === "CUSTOMER"
                                                            ? "bg-blue-50 text-blue-700"
                                                            : party.role === "SUPPLIER"
                                                                ? "bg-purple-50 text-purple-700"
                                                                : "bg-green-50 text-green-700"
                                                            }`}>
                                                            {party.role
                                                                ? party.role.charAt(0).toUpperCase() + party.role.slice(1).toLowerCase()
                                                                : "—"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">{party.email}</td>
                                                    <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">{party.phone}</td>
                                                    <td className="px-4 lg:px-6 py-5 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap text-right">
                                                        ₹ {party.dueAmount.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 lg:px-6 py-5 text-center whitespace-nowrap">
                                                        <button
                                                            ref={el => actionButtonsRef.current[party.id] = el}
                                                            onClick={(e) => handleActionButtonClick(e, party.id)}
                                                            className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === party.id ? "border-[#FFCA00] bg-white text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
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
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            <EmptyState
                                title="No Parties Found"
                                message={searchInput || filters.name || filters.phone ? "No parties match your search criteria." : "Start by adding your first party using the button above."}
                                actionLabel="Add New Party"
                                onActionClick={() => { setSelectedParty(null); setIsModalOpen(true); }}
                            />
                        </div>
                    )}

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
                        onEdit={() => handleEdit(parties.find(p => p.id === openMenuId))}
                        onDelete={() => handleDeleteClick(parties.find(p => p.id === openMenuId))}
                    />
                </div>
            )}

            <PartyModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedParty(null); }}
                onSave={handleSave}
                partyData={selectedParty}
                isSaving={isSaving}
                leafAccounts={leafAccounts}
            />
        </div>
    );
}
