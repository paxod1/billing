/* eslint-disable react-hooks/set-state-in-effect */
"use client";
// Updated to fix ActionMenu positioning and event handling

import React, { useState, useEffect, useRef } from "react";
import Navbar from "@/components/commonComp/Navbar";
import Pagination from "@/components/commonComp/Pagination";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import { FiPlus, FiTrash2, FiMoreVertical, FiDownload, FiLoader } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { taxService } from "@/services/taxService";
import { useDispatch } from "react-redux";
import { openDeleteModal, closeDeleteModal, setDeleteLoading } from "@/lib/features/ui/uiSlice";
import { showToast } from "@/lib/features/toast/toastSlice";
import ActionMenu from "@/components/commonComp/ActionMenu";
import { handleExport } from "@/utils/exportHelper";

const countriesList = [
    { code: "AF", name: "Afghanistan" },
    { code: "AL", name: "Albania" },
    { code: "DZ", name: "Algeria" },
    { code: "AD", name: "Andorra" },
    { code: "AO", name: "Angola" },
    { code: "AG", name: "Antigua and Barbuda" },
    { code: "AR", name: "Argentina" },
    { code: "AM", name: "Armenia" },
    { code: "AU", name: "Australia" },
    { code: "AT", name: "Austria" },
    { code: "AZ", name: "Azerbaijan" },
    { code: "BS", name: "Bahamas" },
    { code: "BH", name: "Bahrain" },
    { code: "BD", name: "Bangladesh" },
    { code: "BB", name: "Barbados" },
    { code: "BY", name: "Belarus" },
    { code: "BE", name: "Belgium" },
    { code: "BZ", name: "Belize" },
    { code: "BJ", name: "Benin" },
    { code: "BT", name: "Bhutan" },
    { code: "BO", name: "Bolivia" },
    { code: "BA", name: "Bosnia and Herzegovina" },
    { code: "BW", name: "Botswana" },
    { code: "BR", name: "Brazil" },
    { code: "BN", name: "Brunei" },
    { code: "BG", name: "Bulgaria" },
    { code: "BF", name: "Burkina Faso" },
    { code: "BI", name: "Burundi" },
    { code: "KH", name: "Cambodia" },
    { code: "CM", name: "Cameroon" },
    { code: "CA", name: "Canada" },
    { code: "CV", name: "Cape Verde" },
    { code: "CF", name: "Central African Republic" },
    { code: "TD", name: "Chad" },
    { code: "CL", name: "Chile" },
    { code: "CN", name: "China" },
    { code: "CO", name: "Colombia" },
    { code: "KM", name: "Comoros" },
    { code: "CG", name: "Congo" },
    { code: "CR", name: "Costa Rica" },
    { code: "HR", name: "Croatia" },
    { code: "CU", name: "Cuba" },
    { code: "CY", name: "Cyprus" },
    { code: "CZ", name: "Czech Republic" },
    { code: "DK", name: "Denmark" },
    { code: "DJ", name: "Djibouti" },
    { code: "DM", name: "Dominica" },
    { code: "DO", name: "Dominican Republic" },
    { code: "EC", name: "Ecuador" },
    { code: "EG", name: "Egypt" },
    { code: "SV", name: "El Salvador" },
    { code: "GQ", name: "Equatorial Guinea" },
    { code: "ER", name: "Eritrea" },
    { code: "EE", name: "Estonia" },
    { code: "SZ", name: "Eswatini" },
    { code: "ET", name: "Ethiopia" },
    { code: "FJ", name: "Fiji" },
    { code: "FI", name: "Finland" },
    { code: "FR", name: "France" },
    { code: "GA", name: "Gabon" },
    { code: "GM", name: "Gambia" },
    { code: "GE", name: "Georgia" },
    { code: "DE", name: "Germany" },
    { code: "GH", name: "Ghana" },
    { code: "GR", name: "Greece" },
    { code: "GD", name: "Grenada" },
    { code: "GT", name: "Guatemala" },
    { code: "GN", name: "Guinea" },
    { code: "GW", name: "Guinea-Bissau" },
    { code: "GY", name: "Guyana" },
    { code: "HT", name: "Haiti" },
    { code: "HN", name: "Honduras" },
    { code: "HU", name: "Hungary" },
    { code: "IS", name: "Iceland" },
    { code: "IN", name: "India" },
    { code: "ID", name: "Indonesia" },
    { code: "IR", name: "Iran" },
    { code: "IQ", name: "Iraq" },
    { code: "IE", name: "Ireland" },
    { code: "IL", name: "Israel" },
    { code: "IT", name: "Italy" },
    { code: "JM", name: "Jamaica" },
    { code: "JP", name: "Japan" },
    { code: "JO", name: "Jordan" },
    { code: "KZ", name: "Kazakhstan" },
    { code: "KE", name: "Kenya" },
    { code: "KI", name: "Kiribati" },
    { code: "KP", name: "North Korea" },
    { code: "KR", name: "South Korea" },
    { code: "KW", name: "Kuwait" },
    { code: "KG", name: "Kyrgyzstan" },
    { code: "LA", name: "Laos" },
    { code: "LV", name: "Latvia" },
    { code: "LB", name: "Lebanon" },
    { code: "LS", name: "Lesotho" },
    { code: "LR", name: "Liberia" },
    { code: "LY", name: "Libya" },
    { code: "LI", name: "Liechtenstein" },
    { code: "LT", name: "Lithuania" },
    { code: "LU", name: "Luxembourg" },
    { code: "MG", name: "Madagascar" },
    { code: "MW", name: "Malawi" },
    { code: "MY", name: "Malaysia" },
    { code: "MV", name: "Maldives" },
    { code: "ML", name: "Mali" },
    { code: "MT", name: "Malta" },
    { code: "MH", name: "Marshall Islands" },
    { code: "MR", name: "Mauritania" },
    { code: "MU", name: "Mauritius" },
    { code: "MX", name: "Mexico" },
    { code: "FM", name: "Micronesia" },
    { code: "MD", name: "Moldova" },
    { code: "MC", name: "Monaco" },
    { code: "MN", name: "Mongolia" },
    { code: "ME", name: "Montenegro" },
    { code: "MA", name: "Morocco" },
    { code: "MZ", name: "Mozambique" },
    { code: "MM", name: "Myanmar" },
    { code: "NA", name: "Namibia" },
    { code: "NR", name: "Nauru" },
    { code: "NP", name: "Nepal" },
    { code: "NL", name: "Netherlands" },
    { code: "NZ", name: "New Zealand" },
    { code: "NI", name: "Nicaragua" },
    { code: "NE", name: "Niger" },
    { code: "NG", name: "Nigeria" },
    { code: "MK", name: "North Macedonia" },
    { code: "NO", name: "Norway" },
    { code: "OM", name: "Oman" },
    { code: "PK", name: "Pakistan" },
    { code: "PW", name: "Palau" },
    { code: "PS", name: "Palestine" },
    { code: "PA", name: "Panama" },
    { code: "PG", name: "Papua New Guinea" },
    { code: "PY", name: "Paraguay" },
    { code: "PE", name: "Peru" },
    { code: "PH", name: "Philippines" },
    { code: "PL", name: "Poland" },
    { code: "PT", name: "Portugal" },
    { code: "QA", name: "Qatar" },
    { code: "RO", name: "Romania" },
    { code: "RU", name: "Russia" },
    { code: "RW", name: "Rwanda" },
    { code: "KN", name: "Saint Kitts and Nevis" },
    { code: "LC", name: "Saint Lucia" },
    { code: "VC", name: "Saint Vincent and the Grenadines" },
    { code: "WS", name: "Samoa" },
    { code: "SM", name: "San Marino" },
    { code: "ST", name: "Sao Tome and Principe" },
    { code: "SA", name: "Saudi Arabia" },
    { code: "SN", name: "Senegal" },
    { code: "RS", name: "Serbia" },
    { code: "SC", name: "Seychelles" },
    { code: "SL", name: "Sierra Leone" },
    { code: "SG", name: "Singapore" },
    { code: "SK", name: "Slovakia" },
    { code: "SI", name: "Slovenia" },
    { code: "SB", name: "Solomon Islands" },
    { code: "SO", name: "Somalia" },
    { code: "ZA", name: "South Africa" },
    { code: "SS", name: "South Sudan" },
    { code: "ES", name: "Spain" },
    { code: "LK", name: "Sri Lanka" },
    { code: "SD", name: "Sudan" },
    { code: "SR", name: "Suriname" },
    { code: "SE", name: "Sweden" },
    { code: "CH", name: "Switzerland" },
    { code: "SY", name: "Syria" },
    { code: "TW", name: "Taiwan" },
    { code: "TJ", name: "Tajikistan" },
    { code: "TZ", name: "Tanzania" },
    { code: "TH", name: "Thailand" },
    { code: "TL", name: "Timor-Leste" },
    { code: "TG", name: "Togo" },
    { code: "TO", name: "Tonga" },
    { code: "TT", name: "Trinidad and Tobago" },
    { code: "TN", name: "Tunisia" },
    { code: "TR", name: "Turkey" },
    { code: "TM", name: "Turkmenistan" },
    { code: "TV", name: "Tuvalu" },
    { code: "UG", name: "Uganda" },
    { code: "UA", name: "Ukraine" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "GB", name: "United Kingdom" },
    { code: "US", name: "United States" },
    { code: "UY", name: "Uruguay" },
    { code: "UZ", name: "Uzbekistan" },
    { code: "VU", name: "Vanuatu" },
    { code: "VE", name: "Venezuela" },
    { code: "VN", name: "Vietnam" },
    { code: "YE", name: "Yemen" },
    { code: "ZM", name: "Zambia" },
    { code: "ZW", name: "Zimbabwe" }
];

const TaxModal = ({ isOpen, onClose, onSave, taxItem, isSaving }) => {
    const dispatch = useDispatch();
    const [name, setName] = useState(taxItem?.name || "");
    const [country, setCountry] = useState(taxItem?.country || "");
    const [accounts, setAccounts] = useState(() =>
        taxItem?.tax_rates
            ? Object.entries(taxItem.tax_rates).map(([key, value], index) => ({
                id: Date.now() + index,
                name: key,
                rate: value
            }))
            : [{ id: Date.now(), name: "", rate: 0 }]
    );

    useEffect(() => {
        if (taxItem) {
            setName(taxItem.name || "");
            setCountry(taxItem.country || "");
            setAccounts(
                taxItem.tax_rates
                    ? Object.entries(taxItem.tax_rates).map(([key, value], index) => ({
                        id: Date.now() + index,
                        name: key,
                        rate: value
                    }))
                    : [{ id: Date.now(), name: "", rate: 0 }]
            );
        } else {
            setName("");
            setCountry("");
            setAccounts([{ id: Date.now(), name: "", rate: 0 }]);
        }
    }, [taxItem]);

    if (!isOpen) return null;

    const handleAddRow = () => {
        setAccounts([...accounts, { id: Date.now(), name: "", rate: 0 }]);
    };

    const handleRemoveRow = (id) => {
        if (accounts.length > 1) {
            setAccounts(accounts.filter(acc => acc.id !== id));
        }
    };

    const handleAccountChange = (id, field, value) => {
        setAccounts(accounts.map(acc => acc.id === id ? { ...acc, [field]: value } : acc));
    };

    const handleSubmit = () => {
        if (!name.trim()) {
            dispatch(showToast({ message: "Please enter a tax template name", type: "error" }));
            return;
        }

        const hasEmptyAccount = accounts.some(acc => !acc.name.trim());
        if (hasEmptyAccount) {
            dispatch(showToast({ message: "Please fill in all tax account names", type: "error" }));
            return;
        }

        // Convert accounts array to tax_rates object
        const tax_rates = accounts.reduce((acc, item) => {
            acc[item.name] = parseFloat(item.rate) || 0;
            return acc;
        }, {});

        onSave({ name, tax_rates, country });
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-gray-500" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 md:p-8 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute cursor-pointer top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isSaving}
                >
                    <IoClose size={24} />
                </button>

                <h2 className="text-[20px] md:text-[24px] font-bold text-gray-900 mb-6">{taxItem ? "Edit Tax Template" : "New Tax Template"}</h2>

                <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-gray-700">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value.toUpperCase())}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-[14px] uppercase"
                            placeholder="Enter tax group name"
                            disabled={isSaving}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-medium text-gray-700">Country</label>
                        <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-[14px] text-gray-900"
                            disabled={isSaving}
                        >
                            <option value="">Select Country</option>
                            {countriesList.map((c) => (
                                <option key={c.code} value={c.name}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden mt-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[400px]">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-[13px] font-semibold text-gray-700 w-12">#</th>
                                        <th className="px-4 py-3 text-[13px] font-semibold text-gray-700">Tax Account</th>
                                        <th className="px-4 py-3 text-[13px] font-semibold text-gray-700">Rate (%)</th>
                                        <th className="px-4 py-3 text-[13px] font-semibold text-gray-700 w-12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map((acc, index) => (
                                        <tr key={acc.id} className="border-b border-gray-50 last:border-0 group">
                                            <td className="px-4 py-3 text-[14px] font-medium text-gray-400">{index + 1}</td>
                                            <td className="px-4 py-3 text-black">
                                                <input
                                                    type="text"
                                                    value={acc.name}
                                                    onChange={(e) => handleAccountChange(acc.id, "name", e.target.value.toUpperCase())}
                                                    className="w-full bg-transparent border-0 focus:outline-none text-[14px] text-gray-900 placeholder-gray-300 font-medium uppercase"
                                                    placeholder="e.g., CGST"
                                                    disabled={isSaving}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-black">
                                                <input
                                                    type="number"
                                                    value={acc.rate}
                                                    onChange={(e) => handleAccountChange(acc.id, "rate", e.target.value)}
                                                    className="w-full bg-transparent border-0 focus:outline-none text-[14px] text-gray-900 placeholder-gray-300 font-medium"
                                                    placeholder="Rate"
                                                    disabled={isSaving}
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleRemoveRow(acc.id)}
                                                    className="text-red-400 hover:text-red-500 transition-colors sm:invisible sm:group-hover:visible disabled:opacity-50"
                                                    disabled={isSaving || accounts.length === 1}
                                                >
                                                    <FiTrash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button
                            onClick={handleAddRow}
                            className="w-full cursor-pointer py-2.5 text-[13px] font-bold text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2 border-t border-gray-50 disabled:opacity-50"
                            disabled={isSaving}
                        >
                            <FiPlus /> Add Row
                        </button>
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4 mt-8">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2.5 text-[14px] font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50 order-2 sm:order-1"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="w-full sm:w-auto px-10 py-3 cursor-pointer bg-[#FFCA00] text-white rounded-lg text-[15px] font-bold disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2 hover:bg-[#d9ac00]"
                        disabled={isSaving}
                    >
                        {isSaving ? "Saving..." : taxItem ? "Save Changes" : "Create Tax"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function TaxTemplatesPage() {
    const dispatch = useDispatch();
    const [taxData, setTaxData] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTax, setSelectedTax] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const actionButtonsRef = useRef({});
    const pageSize = 10;

    // Fetch tax codes on component mount
    useEffect(() => {
        fetchTaxCodes();
    }, []);

    const fetchTaxCodes = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);
            const data = await taxService.getTaxCodes();
            setTaxData(data || []);
        } catch (error) {
            console.error("Error fetching tax codes:", error);
            if (!error.isHandled) {
                dispatch(showToast({ message: "Failed to load tax templates", type: "error" }));
            }
        } finally {
            if (!isSilent) {
                setIsLoading(false);
                setIsFirstLoad(false);
            }
        }
    };

    const totalPages = Math.ceil(taxData.length / pageSize);
    const paginatedData = taxData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Handle pagination correction when data is deleted
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const handleEdit = (tax) => {
        setSelectedTax(tax);
        setIsModalOpen(true);
    };

    const handleSave = async (updatedTax) => {
        try {
            setIsSaving(true);

            if (selectedTax) {
                await taxService.updateTaxCode(selectedTax.id, updatedTax);
                dispatch(showToast({ message: "Tax template updated successfully", type: "success" }));
            } else {
                await taxService.createTaxCode(updatedTax);
                dispatch(showToast({ message: "Tax template created successfully", type: "success" }));
            }

            await fetchTaxCodes(true);
            setIsModalOpen(false);
            setSelectedTax(null);
        } catch (error) {
            console.error("Error saving tax code:", error);
            dispatch(showToast({
                message: selectedTax ? "Failed to update tax template" : "Failed to create tax template",
                type: "error"
            }));
        } finally {
            setIsSaving(false);
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

    const handleDeleteClick = (tax) => {
        setOpenMenuId(null);

        dispatch(openDeleteModal({
            title: 'Delete Tax Template',
            message: `Are you sure you want to delete ${tax.name}? This action cannot be undone.`,
            onConfirm: () => handleDeleteConfirm(tax.id),
        }));
    };

    const handleDeleteConfirm = async (taxId) => {
        try {
            dispatch(setDeleteLoading(true));
            await taxService.deleteTaxCode(taxId);
            dispatch(showToast({ message: "Tax template deleted successfully", type: "success" }));
            await fetchTaxCodes(true);
            dispatch(closeDeleteModal());
        } catch (error) {
            console.error("Error deleting tax code:", error);
            if (!error.isHandled) {

            }
            dispatch(closeDeleteModal());
        } finally {
            dispatch(setDeleteLoading(false));
        }
    };

    const navbarData = {
        heading: "Tax Templates",
        subheading: "Standardize Tax Rates for Purchases and Sales",
        from: "setup",
    };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />

            {isLoading && isFirstLoad ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message="Loading tax templates..." />
                </div>
            ) : (
                <main className="flex-1 flex flex-col py-10">
                    <div className="w-full flex-1 flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mb-8">
                            <button
                                onClick={() => handleExport({
                                    endpoint: "api/accounting/tax-codes/export",
                                    dispatch,
                                    setIsExporting,
                                    defaultFileName: "tax_templates_export.xlsx"
                                })}
                                disabled={isExporting}
                                className="w-full sm:w-auto px-6 py-3 border border-[#FFCA00]/30 text-[#FFCA00] rounded-lg text-[14px] lg:text-[15px] font-bold hover:bg-[#d9ac00]/5 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer h-[48px]"
                            >
                                {isExporting ? <FiLoader className="animate-spin" size={18} /> : <FiDownload size={18} />}
                                {isExporting ? "Exporting..." : "Export"}
                            </button>
                            <button
                                onClick={() => { setSelectedTax(null); setIsModalOpen(true); }}
                                className="w-full sm:w-auto px-6 py-3 bg-[#FFCA00] text-white rounded-lg text-[14px] lg:text-[15px] font-bold flex items-center justify-center gap-2 cursor-pointer h-[48px] hover:bg-[#d9ac00]"
                            >
                                Add New Tax <FiPlus size={20} />
                            </button>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                            {/* Continuous Loading Overlay */}
                            {isLoading && !isFirstLoad && (
                                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                                    <div className="flex flex-col items-center gap-3 bg-white/80 p-6 rounded-2xl shadow-xl border border-white/50">
                                        <Loader message="Updating results..." />
                                    </div>
                                </div>
                            )}

                            {taxData.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[800px] lg:min-w-0">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 w-20 rounded-tl-lg whitespace-nowrap">#</th>
                                                    <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Name</th>
                                                    <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Country</th>
                                                    <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Tax Rates</th>
                                                    <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 w-32 text-right rounded-tr-lg whitespace-nowrap">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {paginatedData.map((tax, index) => (
                                                    <tr
                                                        key={tax.id}
                                                        className="transition-colors border-b border-gray-100"
                                                    >
                                                        <td className="px-6 py-4 text-[14px] lg:text-[15px] font-medium text-gray-400 whitespace-nowrap">
                                                            {(currentPage - 1) * pageSize + index + 1}
                                                        </td>
                                                        <td className="px-6 py-4 text-[14px] lg:text-[15px] font-bold text-gray-900 whitespace-nowrap">
                                                            {tax.name}
                                                        </td>
                                                        <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                            {tax.country || "-"}
                                                        </td>
                                                        <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                            {tax.tax_rates && Object.entries(tax.tax_rates).map(([key, value]) => (
                                                                <span key={key} className="inline-block mr-3 mb-1">
                                                                    <span className="font-semibold">{key}:</span> {value}%
                                                                </span>
                                                            ))}
                                                        </td>
                                                        <td className="px-6 py-4 text-right relative whitespace-nowrap">
                                                            <button
                                                                ref={el => actionButtonsRef.current[tax.id] = el}
                                                                onClick={(e) => handleActionButtonClick(e, tax.id)}
                                                                className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === tax.id ? "border-[#FFCA00] bg-white text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
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
                                    title="No Tax Templates"
                                    message="Start by adding your first tax template using the button above."
                                    actionLabel="Add New Tax"
                                    onActionClick={() => { setSelectedTax(null); setIsModalOpen(true); }}
                                />
                            )}
                        </div>

                        {taxData.length > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={taxData.length}
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
                    className="fixed z-[50]"
                    style={{
                        left: `${menuPosition.x}px`,
                        top: `${menuPosition.y}px`,
                        transform: 'translateX(-50%)'
                    }}
                >
                    <ActionMenu
                        isOpen={true}
                        onClose={() => setOpenMenuId(null)}
                        onEdit={() => {
                            const tax = taxData.find(t => t.id === openMenuId);
                            handleEdit(tax);
                            setOpenMenuId(null);
                        }}
                        onDelete={() => {
                            const tax = taxData.find(t => t.id === openMenuId);
                            handleDeleteClick(tax);
                        }}
                    />
                </div>
            )}

            <TaxModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedTax(null);
                }}
                onSave={handleSave}
                taxItem={selectedTax}
                isSaving={isSaving}
            />
        </div>
    );
}
