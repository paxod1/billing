import React, { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import Pagination from "@/components/commonComp/Pagination";
import { showToast } from "@/lib/features/toast/toastSlice";
import { openDeleteModal, closeDeleteModal, setDeleteLoading } from "@/lib/features/ui/uiSlice";
import { itemService } from "@/services/itemService";
import { accountService } from "@/services/accountService";
import { taxService } from "@/services/taxService";
import { getErrorMessage, handleCrudError } from "@/utils/errorHandler";
import { IoSearchOutline } from "react-icons/io5";
import { FiFilter, FiDownload, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiLoader, FiX } from "react-icons/fi";
import ItemFormModal from "./ItemFormModal";
import ActionMenu from "./ActionMenu";
import CustomSelect from "@/components/common/CustomSelect";
import { handleExport } from "@/utils/exportHelper";

const ItemsPageTemplate = ({ heading, subheading, category = "ALL", from = "common" }) => {
    const dispatch = useDispatch();
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [leafAccounts, setLeafAccounts] = useState([]);
    const [taxCodes, setTaxCodes] = useState([]);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const actionButtonsRef = useRef({});
    const pageSize = 10;

    // Filter states — does NOT include category to avoid conflicts
    const [filters, setFilters] = useState({
        name: "",
        purpose: "",
        unit: "",
        search: "",
        rate: ""
    });
    const [searchInput, setSearchInput] = useState("");
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [totalItems, setTotalItems] = useState(0);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== filters.search) {
                setFilters(prev => ({ ...prev, search: searchInput }));
                setCurrentPage(1);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Fetch when filters or page changes
    useEffect(() => {
        fetchItems();
    }, [filters, currentPage]);

    // Fetch leaf accounts and tax codes on mount
    useEffect(() => {
        fetchLeafAccounts();
        fetchTaxCodes();
    }, []);

    const fetchItems = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);

            const response = await itemService.getFilteredItems({
                ...filters,
                category: category,   // pass the PAGE-level category (ALL / SALES / PURCHASE) explicitly
                limit: pageSize,
                skip: (currentPage - 1) * pageSize
            });

            setItems(response.data || []);
            setTotalItems(response.totalCount || 0);
        } catch (error) {
            console.error("Error fetching items:", error);
            const errorMsg = getErrorMessage(error, "Failed to fetch items");
            dispatch(showToast({ message: errorMsg, type: "error" }));
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    };

    const fetchLeafAccounts = async () => {
        try {
            const data = await accountService.fetchLeaves();
            setLeafAccounts(data);
        } catch (error) {
            console.error("Error fetching accounts:", error);
        }
    };

    const fetchTaxCodes = async () => {
        try {
            const data = await taxService.getTaxCodes();
            setTaxCodes(data);
        } catch (error) {
            console.error("Error fetching tax codes:", error);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    // Clear filters handler
    const handleClearFilters = () => {
        setFilters({
            name: "",
            purpose: "",
            unit: "",
            search: "",
            rate: ""
        });
        setSearchInput("");
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedItems = items;

    const handleSave = async (formData) => {
        try {
            setIsSaving(true);
            if (selectedItem) {
                await itemService.updateItem(selectedItem.id, formData);
                dispatch(showToast({ message: "Item updated successfully", type: "success" }));
            } else {
                await itemService.createItem(formData);
                dispatch(showToast({ message: "Item created successfully", type: "success" }));
            }
            await fetchItems(true);
            setIsModalOpen(false);
            setSelectedItem(null);
        } catch (error) {
            console.error("Error saving item:", error);
            const operation = selectedItem ? "update" : "create";
            const errorMsg = handleCrudError(error, operation, "item");
            dispatch(showToast({ message: errorMsg, type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleDeleteClick = (item) => {
        setOpenMenuId(null);
        dispatch(openDeleteModal({
            title: `Delete ${item.name}`,
            message: `Are you sure you want to delete this item? This action cannot be undone.`,
            onConfirm: () => handleDeleteConfirm(item.id),
        }));
    };

    const handleDeleteConfirm = async (id) => {
        try {
            dispatch(setDeleteLoading(true));
            await itemService.deleteItem(id);
            dispatch(showToast({ message: "Item deleted successfully", type: "success" }));
            await fetchItems(true);
            dispatch(closeDeleteModal());
        } catch (error) {
            console.error("Error deleting item:", error);
            const errorMsg = handleCrudError(error, "delete", "item");
            dispatch(showToast({ message: errorMsg, type: "error" }));
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

    const navbarData = { heading, subheading, from };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />
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
                                                placeholder="Search by name or code"
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00]/20 focus:border-[#FFCA00] text-[14px] lg:text-[15px] transition-all placeholder-gray-400 h-[48px]"
                                            />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => setIsFilterVisible(true)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-black rounded-lg text-[14px] lg:text-[15px] font-bold hover:bg-gray-50 transition-all shadow-sm cursor-pointer h-[48px]"
                                    >
                                        <FiFilter size={18} /> Filter
                                    </button>
                                    <button
                                        onClick={() => {
                                            let exportCategory = "both";
                                            if (category !== "ALL") {
                                                exportCategory = category.toLowerCase();
                                            } else if (filters.purpose && filters.purpose !== "" && filters.purpose !== "ALL") {
                                                exportCategory = filters.purpose.toLowerCase();
                                            }
                                            handleExport({
                                                endpoint: "custom-api/admin/items_export",
                                                method: "POST",
                                                payload: { category: exportCategory },
                                                dispatch,
                                                setIsExporting,
                                                defaultFileName: `items_${exportCategory}_export.xlsx`
                                            });
                                        }}
                                        disabled={isExporting}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-[#FFCA00]/30 text-[#FFCA00] rounded-lg text-[14px] lg:text-[15px] font-bold hover:bg-[#d9ac00]/5 shadow-sm disabled:opacity-50 cursor-pointer h-[48px]"
                                    >
                                        {isExporting ? <FiLoader className="animate-spin" size={18} /> : <FiDownload size={18} />}
                                        <span>{isExporting ? "Exporting..." : "Export"}</span>
                                    </button>
                                    <button
                                        onClick={() => { setSelectedItem(null); setIsModalOpen(true); }}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#FFCA00] text-white rounded-lg text-[14px] lg:text-[15px] font-bold hover:bg-[#d9ac00] cursor-pointer h-[48px]"
                                    >
                                        <span>Add New Item</span>
                                        <FiPlus size={20} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-end gap-3">
                                {category === "ALL" && (
                                    <div className="flex-1 min-w-[160px]">
                                        <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Category</label>
                                        <CustomSelect
                                            value={filters.purpose}
                                            onChange={(val) => handleFilterChange("purpose", val || "")}
                                            options={[
                                                { value: "SALES", label: "Sales" },
                                                { value: "PURCHASE", label: "Purchase" },
                                            ]}
                                            placeholder="All Categories"
                                            isClearable
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-[140px]">
                                    <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Price / Rate</label>
                                    <input
                                        type="number"
                                        value={filters.rate}
                                        onChange={(e) => handleFilterChange("rate", e.target.value)}
                                        placeholder="Enter price"
                                        className="w-full px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors"
                                    />
                                </div>
                                <div className="flex-1 min-w-[140px]">
                                    <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Unit</label>
                                    <CustomSelect
                                        value={filters.unit}
                                        onChange={(val) => handleFilterChange("unit", val)}
                                        options={[
                                            { value: "Pcs", label: "Pcs" },
                                            { value: "Unit", label: "Unit" },
                                            { value: "Meter", label: "Meter" },
                                            { value: "Kg", label: "Kg" },
                                            { value: "Liter", label: "Liter" },
                                            { value: "Box", label: "Box" },
                                        ]}
                                        placeholder="Select unit"
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

                    {/* Items Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                        {/* Continuous Loading Overlay */}
                        {isLoading && items.length > 0 && (
                            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                                <div className="flex flex-col items-center gap-3 bg-white/80 p-6 rounded-2xl shadow-xl border border-white/50">
                                    <FiLoader className="animate-spin text-[#FFCA00]" size={40} />
                                    <p className="text-[#333] text-sm font-bold tracking-tight">Updating results...</p>
                                </div>
                            </div>
                        )}

                        {isLoading && items.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-20">
                                <FiLoader className="animate-spin text-[#FFCA00] mb-4" size={40} />
                                <p className="text-gray-500 text-sm font-medium">Loading items...</p>
                            </div>
                        ) : paginatedItems.length > 0 ? (
                            <div className="overflow-x-auto">
                                <div className="min-w-[800px] lg:min-w-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Item Name</th>
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Purpose</th>
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Unit Type</th>
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Tax</th>
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Rate</th>
                                                <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {paginatedItems.map((item, index) => (
                                                <tr 
                                                    key={item.id} 
                                                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                                                    onClick={() => handleEdit(item)}
                                                >
                                                    <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap group-hover:text-[#FFCA00] transition-colors">
                                                        {item.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                                            item.category === "SALES"
                                                                ? "bg-blue-50 text-blue-500 border-blue-100"
                                                                : item.category === "PURCHASE"
                                                                ? "bg-purple-50 text-purple-500 border-purple-100"
                                                                : "bg-green-50 text-green-500 border-green-100"
                                                        }`}>
                                                            {item.category
                                                                ? item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase()
                                                                : "—"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">{item.unit || "Unit"}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-[14px] lg:text-[15px] text-gray-700">
                                                        {taxCodes.find(t => t.id === item.tax)?.name || `GST - ${item.tax || 0}`}
                                                    </td>
                                                    <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap text-right">₹ {parseFloat(item.rate)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</td>
                                                    <td className="px-6 py-4 text-center relative whitespace-nowrap">
                                                        <button
                                                            ref={el => actionButtonsRef.current[item.id] = el}
                                                            onClick={(e) => handleActionButtonClick(e, item.id)}
                                                            className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === item.id ? "border-[#FFCA00] bg-white text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
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
                                title="No Items Found"
                                message={searchInput || filters.name || filters.item_code ? "No items match your search criteria." : `Start by adding your first ${category !== "ALL" ? category.toLowerCase() : ""} item.`}
                                actionLabel="Add New Item"
                                onActionClick={() => { setSelectedItem(null); setIsModalOpen(true); }}
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
                        onEdit={() => handleEdit(items.find(i => i.id === openMenuId))}
                        onDelete={() => handleDeleteClick(items.find(i => i.id === openMenuId))}
                    />
                </div>
            )}

            <ItemFormModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedItem(null); }}
                onSave={handleSave}
                itemData={selectedItem}
                isSaving={isSaving}
                leafAccounts={leafAccounts}
                taxCodes={taxCodes}
                pageCategory={category}
            />
        </div>
    );
};

export default ItemsPageTemplate;
