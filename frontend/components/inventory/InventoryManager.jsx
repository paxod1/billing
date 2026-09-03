"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import Navbar from "@/components/commonComp/Navbar";
import Loader from "@/components/commonComp/Loader";
import EmptyState from "@/components/commonComp/EmptyState";
import Pagination from "@/components/commonComp/Pagination";
import { showToast } from "@/lib/features/toast/toastSlice";
import { openDeleteModal, closeDeleteModal, setDeleteLoading } from "@/lib/features/ui/uiSlice";
import { getErrorMessage, handleCrudError } from "@/utils/errorHandler";
import { IoSearchOutline } from "react-icons/io5";
import SalesProductForm from "@/components/sales/SalesProductForm";
import RawMaterialForm from "@/components/sales/RawMaterialForm";
import SalesSpecialItemForm from "@/components/sales/SalesSpecialItemForm";
import ItemFormModal from "@/components/commonComp/ItemFormModal";
import ActionMenu from "@/components/commonComp/ActionMenu";
import CustomSelect from "@/components/common/CustomSelect";
import { handleExport } from "@/utils/exportHelper";
import { inventoryService } from "@/services/inventoryService";
import { itemService } from "@/services/itemService";
import { partyService } from "@/services/partyService";
import { taxService } from "@/services/taxService";
import { accountService } from "@/services/accountService";

const findIdInObject = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.item_id !== undefined && obj.item_id !== null) return obj.item_id;
    if (obj.id !== undefined && obj.id !== null) return obj.id;
    for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
            const found = findIdInObject(obj[key]);
            if (found !== null && found !== undefined) return found;
        }
    }
    return null;
};
import { FiFilter, FiDownload, FiPlus, FiMoreVertical, FiLoader, FiX } from "react-icons/fi";
import RestockModal from "@/components/sales/RestockModal";
import SplitStockModal from "@/components/sales/SplitStockModal";
import { processRestock } from "@/utils/restockHelper";

export default function InventoryManager({ type }) {
    const dispatch = useDispatch();
    const activeTab = type; // Use prop instead of state
    const searchParams = useSearchParams();

    // Data State
    const [items, setItems] = useState([]);
    const [totalItemsCount, setTotalItemsCount] = useState(0);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [totalRawMaterials, setTotalRawMaterials] = useState(0);
    const [products, setProducts] = useState([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [specialItems, setSpecialItems] = useState([]);
    const [totalSpecialItems, setTotalSpecialItems] = useState(0);

    // Auxiliary Data
    const [suppliers, setSuppliers] = useState([]);
    const [taxes, setTaxes] = useState([]);
    const [leafAccounts, setLeafAccounts] = useState([]);

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isProductFormOpen, setIsProductFormOpen] = useState(false);
    const [isMaterialFormOpen, setIsMaterialFormOpen] = useState(false);
    const [isSpecialItemFormOpen, setIsSpecialItemFormOpen] = useState(false);
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
    const [isSplitStockModalOpen, setIsSplitStockModalOpen] = useState(false);
    const [restockItem, setRestockItem] = useState(null);
    const [splitItem, setSplitItem] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [restockingItemIds, setRestockingItemIds] = useState([]);
    const [viewingSupplier, setViewingSupplier] = useState(null);

    // Filter states
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [tempPrice, setTempPrice] = useState("");
    const [filters, setFilters] = useState({
        unit: "",
        unit_price: "",
        tax_id: "",
        purpose: "" // for Items tab
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const actionButtonsRef = useRef({});
    const [restockSuccessCount, setRestockSuccessCount] = useState(0);
    const pageSize = 10;

    useEffect(() => {
        fetchSuppliers();
        fetchTaxes();
        fetchLeafAccounts();
    }, []);

    useEffect(() => {
        const retryPendingRestocks = async () => {
            try {
                if (typeof window === "undefined" || !window.localStorage) return;
                const initialIds = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith("pending_restock_material_") || key.startsWith("pending_restock_customized_product_") || key.startsWith("pending_restock_product_"))) {
                        const itemStr = localStorage.getItem(key);
                        if (!itemStr) continue;
                        const { createdMaterial, createdProduct, restockData } = JSON.parse(itemStr);

                        let itemId;
                        if (key.startsWith("pending_restock_material_")) {
                            itemId = key.replace("pending_restock_material_", "");
                        } else if (key.startsWith("pending_restock_customized_product_")) {
                            itemId = key.replace("pending_restock_customized_product_", "");
                        } else {
                            itemId = key.replace("pending_restock_product_", "");
                        }
                        initialIds.push(String(itemId));

                        (async () => {
                            try {
                                if (key.startsWith("pending_restock_material_")) {
                                    const mat = createdMaterial || createdProduct;
                                    await inventoryService.restockRawMaterial(mat, restockData);
                                } else if (key.startsWith("pending_restock_customized_product_")) {
                                    const prod = createdProduct || createdMaterial;
                                    await inventoryService.restockCustomizedProduct(prod, restockData);
                                } else {
                                    const prod = createdProduct || createdMaterial;
                                    await inventoryService.restockProduct(prod, restockData);
                                }
                                localStorage.removeItem(key);
                                setRestockingItemIds(prev => prev.filter(id => id !== String(itemId)));
                                dispatch(showToast({ message: "Completed pending initial stock addition successfully", type: "success" }));
                                fetchData(true);
                            } catch (err) {
                                console.error("Silent retry error:", err);
                                try {
                                    localStorage.removeItem(key);
                                } catch (e) { }
                                setRestockingItemIds(prev => prev.filter(id => id !== String(itemId)));
                                fetchData(true);
                            }
                        })();
                    }
                }
                if (initialIds.length > 0) {
                    setRestockingItemIds(initialIds);
                }
            } catch (err) {
                console.error("Error retrying pending restocks:", err);
            }
        };
        retryPendingRestocks();
    }, []);

    useEffect(() => {
        if (searchParams.get("action") === "create") {
            if (type === "Products") {
                setIsProductFormOpen(true);
            } else if (type === "Raw Materials") {
                setIsMaterialFormOpen(true);
            } else if (type === "Stocks") {
                setIsSpecialItemFormOpen(true);
            } else if (type === "Items") {
                setIsItemModalOpen(true);
            }
        }
    }, [searchParams, type]);

    const fetchSuppliers = async () => {
        try {
            const data = await partyService.queryParties("SUPPLIER");
            setSuppliers(data || []);
        } catch (error) {
            console.error("Error fetching suppliers:", error);
        }
    };

    const fetchTaxes = async () => {
        try {
            const data = await taxService.getTaxCodes();
            setTaxes(data);
        } catch (error) {
            console.error("Error fetching taxes:", error);
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

    const fetchData = async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        const minDelay = !isSilent ? new Promise(resolve => setTimeout(resolve, 500)) : Promise.resolve();
        try {
            const commonParams = {
                limit: pageSize,
                skip: (currentPage - 1) * pageSize,
                search: searchQuery,
                ...filters
            };

            if (activeTab === "Items") {
                const response = await itemService.getFilteredItems({
                    ...commonParams,
                    category: "ALL"
                });
                setItems(response.data);
                setTotalItemsCount(response.totalCount);
            } else if (activeTab === "Raw Materials") {
                const response = await inventoryService.getRawMaterials(commonParams);
                setRawMaterials(response.data);
                setTotalRawMaterials(response.totalCount);
            } else if (activeTab === "Products") {
                const response = await inventoryService.getProducts(commonParams);
                setProducts(response.data);
                setTotalProducts(response.totalCount);
            } else if (activeTab === "Stocks") {
                const response = await inventoryService.getCustomizedProducts(commonParams);
                setSpecialItems(response.data);
                setTotalSpecialItems(response.totalCount);
            }
            await minDelay;
        } catch (error) {
            console.error(`Error fetching ${activeTab} data:`, error);
            const errorMsg = getErrorMessage(error, `Failed to load ${activeTab.toLowerCase()}`);
            dispatch(showToast({ message: errorMsg, type: "error" }));
        } finally {
            setIsLoading(false);
            setIsFirstLoad(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(searchInput);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Fetch when filters change
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
            fetchData(!isFirstLoad);
        }
    }, [filters, searchQuery]);

    // Fetch when page changes or type changes
    useEffect(() => {
        fetchData(true);
    }, [currentPage, activeTab]);

    // Reset when type changes
    useEffect(() => {
        setSearchInput("");
        setSearchQuery("");
        setFilters({
            unit: "",
            unit_price: "",
            tax_id: "",
            purpose: ""
        });
        setTempPrice("");
        setIsFilterVisible(false);
        setCurrentPage(1);
        setOpenMenuId(null);
    }, [activeTab]);

    const handleClearFilters = () => {
        setFilters({
            unit: "",
            unit_price: "",
            tax_id: "",
            purpose: ""
        });
        setSearchInput("");
        setSearchQuery("");
        setTempPrice("");
    };

    const filteredData = useMemo(() => {
        if (activeTab === "Items") return items;
        if (activeTab === "Raw Materials") return rawMaterials;
        if (activeTab === "Products") return products;
        return specialItems;
    }, [items, rawMaterials, products, specialItems, activeTab]);

    const totalCount = useMemo(() => {
        if (activeTab === "Items") return totalItemsCount;
        if (activeTab === "Raw Materials") return totalRawMaterials;
        if (activeTab === "Products") return totalProducts;
        return totalSpecialItems;
    }, [activeTab, totalItemsCount, totalRawMaterials, totalProducts, totalSpecialItems]);

    const totalPages = Math.ceil(totalCount / pageSize);

    // --- CRUD Handlers ---

    const handleSaveItem = async (data) => {
        setIsSaving(true);
        try {
            if (editingItem) {
                const itemId = Number(editingItem.id?.id || editingItem.id);
                await itemService.updateItem(itemId, data);
                dispatch(showToast({ message: "Item updated successfully", type: "success" }));
            } else {
                await itemService.createItem(data);
                dispatch(showToast({ message: "Item created successfully", type: "success" }));
            }
            setIsItemModalOpen(false);
            setEditingItem(null);
            fetchData(true);
        } catch (error) {
            console.error("Error saving item:", error);
            const operation = editingItem ? "update" : "create";
            const errorMsg = handleCrudError(error, operation, "item");
            dispatch(showToast({ message: errorMsg, type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveMaterial = async (data) => {
        setIsSaving(true);
        try {
            const selectedTax = taxes.find(t => t.id?.toString() === data.tax?.toString());
            const taxPercent = selectedTax && selectedTax.tax_rates
                ? Object.values(selectedTax.tax_rates).reduce((sum, r) => sum + (parseFloat(r) || 0), 0)
                : 0;

            const apiPayload = {
                name: data.name,
                description: data.description,
                quantity: parseFloat(data.quantity) || 0,
                unit: data.unit,
                unit_price: parseFloat(data.unit_price) || 0,
                last_updated: data.last_updated || new Date().toISOString(),
                tax_id: data.tax ? parseInt(data.tax) : null,
                tax_percent: taxPercent
            };

            if (editingItem) {
                const materialId = Number(editingItem.id?.id || editingItem.id);
                await inventoryService.updateRawMaterial(materialId, apiPayload);
                dispatch(showToast({ message: "Raw material updated successfully", type: "success" }));
            } else {
                const response = await inventoryService.saveRawMaterial(apiPayload);
                dispatch(showToast({ message: "Raw material created successfully", type: "success" }));
                const createdId = findIdInObject(response);
                if (data.enableRestock && createdId) {
                    const createdMaterial = {
                        ...apiPayload,
                        id: createdId
                    };
                    const restockData = {
                        amount: parseFloat(data.restock_quantity) || 0,
                        supplier_id: data.restock_supplier_id ? (data.restock_supplier_id.id || data.restock_supplier_id) : null,
                        payment_method: data.restock_payment_method || null,
                        payment_status: data.restock_payment_status || "FULLY_PAID",
                        paid_amount: parseFloat(data.restock_payment_amount) || 0
                    };

                    try {
                        await processRestock(createdMaterial, restockData, "Raw Materials");
                        dispatch(showToast({ message: "Stock restocked and purchase invoice & payment recorded successfully", type: "success" }));
                    } catch (restockErr) {
                        console.error("Restock error after material creation:", restockErr);
                        dispatch(showToast({ message: "Material created, but restock purchase flow failed", type: "error" }));
                    }
                }
            }
            setIsMaterialFormOpen(false);
            setEditingItem(null);
            fetchData(true);
        } catch (error) {
            console.error("Error saving material:", error);
            const operation = editingItem ? "update" : "create";
            const errorMsg = handleCrudError(error, operation, "raw material");
            dispatch(showToast({ message: errorMsg, type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveProduct = async (data) => {
        setIsSaving(true);
        try {
            const { composition, ...productData } = data;
            const payload = {
                ...productData,
                selling_price: parseFloat(productData.rate || productData.selling_price || 0),
                cost_price: parseFloat(productData.Production_cost || productData.cost_price || 0),
                quantity: parseFloat(productData.current_quantity || productData.quantity || 0),
                tax: parseInt(productData.tax) || null,
                composition: composition?.map(c => ({
                    raw_material_id: parseInt(c.raw_material_id?.id || c.raw_material_id),
                    quantity_used: parseFloat(c.quantity || c.quantity_used),
                    tax_percent: 0,
                    tax_percentage: 0
                })) || []
            };

            if (editingItem) {
                payload.id = Number(editingItem.id?.id || editingItem.id);
                await inventoryService.updateProduct(payload);
                dispatch(showToast({ message: "Product updated successfully", type: "success" }));
            } else {
                const response = await inventoryService.saveProduct(payload);
                dispatch(showToast({ message: "Product created successfully", type: "success" }));
                const createdId = findIdInObject(response);
                if (data.enableRestock && createdId) {
                    const createdProduct = {
                        ...payload,
                        id: createdId
                    };
                    const restockData = {
                        amount: parseFloat(data.restock_quantity) || 0,
                        supplier_id: data.restock_supplier_id ? (data.restock_supplier_id.id || data.restock_supplier_id) : null,
                        payment_method: data.restock_payment_method || null,
                        payment_status: data.restock_payment_status || "FULLY_PAID",
                        paid_amount: parseFloat(data.restock_payment_amount) || 0
                    };

                    try {
                        await processRestock(createdProduct, restockData, "Products");
                        dispatch(showToast({ message: "Stock restocked and purchase invoice & payment recorded successfully", type: "success" }));
                    } catch (restockErr) {
                        console.error("Restock error after product creation:", restockErr);
                        dispatch(showToast({ message: "Product created, but restock purchase flow failed", type: "error" }));
                    }
                }
            }
            setIsProductFormOpen(false);
            setEditingItem(null);
            fetchData(true);
        } catch (error) {
            console.error("Error saving product:", error);
            const operation = editingItem ? "update" : "create";
            const errorMsg = handleCrudError(error, operation, "product");
            dispatch(showToast({ message: errorMsg, type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSpecialItem = async (data) => {
        setIsSaving(true);
        try {
            const payload = {
                name: data.name,
                item_code: data.item_code,
                item_type: "CUSTOMISED PRODUCTS",
                category: "SALES",
                hsn_sac_code: data.hsn_sac_code || null,
                unit: data.unit || null,
                description: data.description || null,
                rate: parseFloat(data.rate) || 0,
                tax: parseInt(data.tax) || null,
                Production_cost: parseFloat(data.production_cost) || 0,
                opening_quantity: parseFloat(data.opening_quantity) || 0,
                current_quantity: parseFloat(data.current_quantity) || 0,
                supplier_id: data.enableRestock && data.isCardamom ? (data.restock_supplier_id?.id || data.restock_supplier_id) : null,
                gross_weight: data.enableRestock && data.isCardamom ? parseFloat(data.grossWeight) || 0 : 0,
                tare_weight: data.enableRestock && data.isCardamom ? parseFloat(data.tareWeight) || 0 : 0,
                sample_deduction: data.enableRestock && data.isCardamom ? parseFloat(data.sampleDeduction) || 0 : 0,
                net_weight: data.enableRestock && data.isCardamom ? parseFloat(data.restock_quantity) || 0 : 0,
                cardamom_size: data.enableRestock && data.isCardamom ? data.cardamomType : null,
            };

            if (editingItem) {
                const specialItemId = Number(editingItem.id?.id || editingItem.id);
                await inventoryService.updateCustomizedProduct(specialItemId, payload);
                dispatch(showToast({ message: "stocks updated successfully", type: "success" }));
            } else {
                const response = await inventoryService.saveCustomizedProduct(payload);
                dispatch(showToast({ message: "stocks created successfully", type: "success" }));
                const createdId = findIdInObject(response);
                if (data.enableRestock && createdId) {
                    const createdProduct = {
                        ...payload,
                        id: createdId
                    };
                    const restockData = {
                        amount: parseFloat(data.restock_quantity) || 0,
                        supplier_id: data.restock_supplier_id ? (data.restock_supplier_id.id || data.restock_supplier_id) : null,
                        payment_method: data.restock_payment_method || null,
                        payment_status: data.restock_payment_status || "FULLY_PAID",
                        paid_amount: parseFloat(data.restock_payment_amount) || 0,
                        isCardamom: data.isCardamom,
                        withTax: data.withTax,
                        grossWeight: parseFloat(data.grossWeight) || 0,
                        tareWeight: parseFloat(data.tareWeight) || 0,
                    };

                    try {
                        await processRestock(createdProduct, restockData, "Stocks");
                        dispatch(showToast({ message: "Stock restocked and purchase invoice & payment recorded successfully", type: "success" }));
                    } catch (restockErr) {
                        console.error("Restock error after creation:", restockErr);
                        dispatch(showToast({ message: "Product created, but restock purchase flow failed", type: "error" }));
                    }
                }
            }
            setIsSpecialItemFormOpen(false);
            setEditingItem(null);
            fetchData(true);
        } catch (error) {
            console.error("Error saving stocks:", error);
            const operation = editingItem ? "update" : "create";
            const errorMsg = handleCrudError(error, operation, "stocks");
            dispatch(showToast({ message: errorMsg, type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestockConfirm = async (data) => {
        const restockType = restockItem?.unit_price !== undefined ? "Raw Materials" : (restockItem?.item_type === "CUSTOMISED PRODUCTS" || activeTab === "Stocks" ? "Stocks" : activeTab);
        setIsSaving(true);
        try {
            await processRestock(restockItem, data, restockType);
            dispatch(showToast({ message: "Stock restocked and purchase invoice & payment recorded successfully", type: "success" }));
            setIsRestockModalOpen(false);
            setRestockItem(null);
            fetchData(true);
            setRestockSuccessCount(prev => prev + 1);
        } catch (error) {
            console.error("Restock error:", error);
            const errorMsg = getErrorMessage(error, "Failed to update stock");
            dispatch(showToast({ message: errorMsg, type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestockRawMaterialFromProductForm = (material, deficit) => {
        setRestockItem({
            ...material,
            prefilledAmount: deficit
        });
        setIsRestockModalOpen(true);
    };

    const handleDelete = (item) => {
        setOpenMenuId(null);
        let title = "Item";
        if (activeTab === "Raw Materials") title = "Material";
        else if (activeTab === "Products") title = "Product";
        else if (activeTab === "Stocks") title = "Special Item";

        dispatch(openDeleteModal({
            title: `Delete ${title}`,
            message: `Are you sure you want to delete this ${title.toLowerCase()}? This action cannot be undone.`,
            onConfirm: () => handleDeleteConfirm(item),
        }));
    };

    const handleDeleteConfirm = async (item) => {
        try {
            dispatch(setDeleteLoading(true));
            if (activeTab === "Items") {
                await itemService.deleteItem(item.id);
                dispatch(showToast({ message: "Item deleted successfully", type: "success" }));
            } else if (activeTab === "Raw Materials") {
                await inventoryService.deleteRawMaterial(item.id);
                dispatch(showToast({ message: "Raw material deleted successfully", type: "success" }));
            } else if (activeTab === "Products") {
                await inventoryService.deleteProduct(item.id);
                dispatch(showToast({ message: "Product deleted successfully", type: "success" }));
            } else {
                await inventoryService.deleteCustomizedProduct(item.id);
                dispatch(showToast({ message: "stocks deleted successfully", type: "success" }));
            }
            await fetchData(true);
            dispatch(closeDeleteModal());
        } catch (error) {
            console.error("Delete error:", error);
            const type = activeTab === "Items" ? "item" : activeTab === "Raw Materials" ? "raw material" : activeTab === "Products" ? "product" : "special item";
            const errorMsg = handleCrudError(error, "delete", type);
            dispatch(showToast({ message: errorMsg, type: "error" }));
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

    const getSupplierName = (id) => {
        if (Array.isArray(id)) return id[0]?.name || "N/A";
        const supplier = suppliers.find(s => s.id === id);
        return supplier ? supplier.name : "N/A";
    };

    const getRawMaterialName = (id) => {
        const material = rawMaterials.find(rm => rm.id === id);
        return material ? material.name : "N/A";
    };

    const getTaxName = (id) => {
        if (!id) return "N/A";
        const tax = taxes.find(t => t.id?.toString() === id.toString());
        return tax ? tax.name : "N/A";
    };

    const navbarData = {
        heading: activeTab === "Items" ? "Inventory Items" : activeTab,
        subheading: activeTab === "Items"
            ? "Manage all sales and purchase items"
            : activeTab === "Raw Materials"
                ? "Track and manage raw materials for production"
                : activeTab === "Products"
                    ? "Manage finished products and stock levels"
                    : "Manage special or stocks stock",
        from: "inventory",
    };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />
            {isLoading && isFirstLoad ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message={`Loading ${activeTab}...`} />
                </div>
            ) : (
                <>
                    <main className="flex-1 flex flex-col py-6 md:py-8">
                        <div className="w-full flex-1 flex flex-col ">
                            {/* Header Section */}
                            <div className="mb-8">
                                {!isFilterVisible ? (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        {/* Search Bar */}
                                        <div className="w-full sm:w-80">
                                            <div className="relative">
                                                <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                <input
                                                    type="text"
                                                    value={searchInput}
                                                    onChange={(e) => setSearchInput(e.target.value)}
                                                    placeholder={`Search ${activeTab.toLowerCase()}...`}
                                                    className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] hover:border-[#FFCA00] text-[14px] transition-all placeholder-gray-400"
                                                />
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                            <button
                                                onClick={() => setIsFilterVisible(true)}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-black rounded-lg text-[14px] font-medium hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap"
                                            >
                                                <FiFilter size={16} /> Filter
                                            </button>
                                            <button
                                                onClick={() => handleExport({
                                                    endpoint: activeTab === "Items" ? "custom-api/admin/items_export" : activeTab === "Raw Materials" ? "custom-api/admin/inventory/raw_materials_export" : activeTab === "Products" ? "custom-api/admin/inventory/products_export" : "custom-api/admin/items_export",
                                                    method: activeTab === "Stocks" ? "POST" : "GET",
                                                    payload: activeTab === "Items" ? { category: "both" } : activeTab === "Stocks" ? { category: "sales" } : undefined,
                                                    dispatch,
                                                    setIsExporting,
                                                    defaultFileName: `${activeTab.toLowerCase().replace(" ", "_")}_export.xlsx`
                                                })}
                                                disabled={isExporting}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#FFCA00] text-[#FFCA00] rounded-lg text-[14px] font-medium hover:bg-[#d9ac00]/5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                            >
                                                {isExporting ? <FiLoader className="animate-spin" size={16} /> : <FiDownload size={16} />}
                                                <span>{isExporting ? "Exporting..." : "Export"}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingItem(null);
                                                    if (activeTab === "Items") setIsItemModalOpen(true);
                                                    else if (activeTab === "Raw Materials") setIsMaterialFormOpen(true);
                                                    else if (activeTab === "Products") setIsProductFormOpen(true);
                                                    else setIsSpecialItemFormOpen(true);
                                                }}
                                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-medium cursor-pointer hover:bg-[#d9ac00] whitespace-nowrap"
                                            >
                                                <span>Add New {activeTab === "Raw Materials" ? "Material" : activeTab === "Products" ? "Product" : activeTab === "Items" ? "Item" : "stocks"}</span>
                                                <FiPlus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-end gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {activeTab === "Items" && (
                                            <div className="flex-1 min-w-[180px]">
                                                <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Category</label>
                                                <CustomSelect
                                                    value={filters.purpose}
                                                    onChange={(val) => setFilters(prev => ({ ...prev, purpose: val || "" }))}
                                                    options={[
                                                        { value: "SALES", label: "Sales" },
                                                        { value: "PURCHASE", label: "Purchase" },
                                                    ]}
                                                    placeholder="All Categories"
                                                    isClearable
                                                />
                                            </div>
                                        )}
                                        {activeTab === "Raw Materials" && (
                                            <div className="flex-1 min-w-[180px]">
                                                <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Tax</label>
                                                <CustomSelect
                                                    value={filters.tax_id}
                                                    onChange={(val) => setFilters(prev => ({ ...prev, tax_id: val }))}
                                                    options={taxes.map(t => ({ value: t.id, label: t.name }))}
                                                    placeholder="Select Tax"
                                                    isClearable
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-[180px]">
                                            <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Unit</label>
                                            <CustomSelect
                                                value={filters.unit}
                                                onChange={(val) => setFilters(prev => ({ ...prev, unit: val }))}
                                                options={[
                                                    { value: "Unit", label: "Unit" },
                                                    { value: "Pcs", label: "Pcs" },
                                                    { value: "Box", label: "Box" },
                                                    { value: "Kg", label: "Kg" },
                                                    { value: "Meter", label: "Meter" },
                                                ]}
                                                placeholder="Select Unit"
                                                isClearable
                                            />
                                        </div>
                                        <div className="flex-1 min-w-[180px]">
                                            <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Price</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={tempPrice}
                                                    onChange={(e) => setTempPrice(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setFilters(prev => ({ ...prev, unit_price: tempPrice }))}
                                                    placeholder="Enter price"
                                                    className="w-full px-3 py-[9px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] bg-white transition-colors"
                                                />
                                                <button
                                                    onClick={() => setFilters(prev => ({ ...prev, unit_price: tempPrice }))}
                                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-[#FFCA00] text-white rounded-md hover:bg-[#d9ac00] cursor-pointer"
                                                >
                                                    <IoSearchOutline size={15} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pb-0.5 ml-auto pt-2 sm:pt-0">
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
                                {/* Continuous Loading Overlay */}
                                {isLoading && !isFirstLoad && (
                                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                                        <div className="flex flex-col items-center gap-3 bg-white/80 p-6 rounded-2xl shadow-xl border border-white/50">
                                            <FiLoader className="animate-spin text-[#FFCA00]" size={40} />
                                            <p className="text-[#333] text-sm font-bold tracking-tight">Updating results...</p>
                                        </div>
                                    </div>
                                )}
                                {isLoading && isFirstLoad ? (
                                    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                                        <FiLoader className="animate-spin text-[#FFCA00] mb-4" size={40} />
                                        <p className="text-gray-500 text-sm font-medium">Loading {activeTab.toLowerCase()}...</p>
                                    </div>
                                ) : filteredData.length > 0 ? (
                                    <div className="overflow-x-auto scrollbar-hide">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    {activeTab === "Items" && (
                                                        <>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Item Name</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Purpose</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Unit Type</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Tax</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Rate</th>
                                                        </>
                                                    )}
                                                    {activeTab === "Raw Materials" && (
                                                        <>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Name</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-center">Quantity</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Unit</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Unit Price</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Tax</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Last Updated</th>
                                                        </>
                                                    )}
                                                    {activeTab === "Products" && (
                                                        <>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Name</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-center">In Stock</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Cost Price</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Selling Price</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap min-w-[200px]">Composition</th>
                                                        </>
                                                    )}
                                                    {activeTab === "Stocks" && (
                                                        <>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Item Name</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Supplier</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Weight Details</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-center">In Stock</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Rate</th>
                                                            <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Total Amount</th>
                                                        </>
                                                    )}
                                                    <th className="px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center rounded-tr-lg whitespace-nowrap">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {filteredData.map((item, idx) => (
                                                    <tr
                                                        key={item.id}
                                                        className="transition-colors border-b border-gray-100"
                                                    >
                                                        {activeTab === "Items" && (
                                                            <>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{item.name}</td>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">
                                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${item.category === "SALES" ? "bg-blue-50 text-blue-500 border-blue-100" : item.category === "PURCHASE" ? "bg-purple-50 text-purple-500 border-purple-100" : "bg-green-50 text-green-500 border-green-100"
                                                                        }`}>
                                                                        {item.category?.charAt(0).toUpperCase() + item.category?.slice(1).toLowerCase() || "—"}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{item.unit || "Unit"}</td>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 text-right">{getTaxName(item.tax)}</td>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 text-right whitespace-nowrap">₹ {parseFloat(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            </>
                                                        )}
                                                        {activeTab === "Raw Materials" && (
                                                            <>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{item.name}</td>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 text-center">
                                                                    {restockingItemIds.includes(String(item.id)) ? (
                                                                        <span className="text-[12px] font-semibold text-yellow-600 animate-pulse">Stock adding...</span>
                                                                    ) : (
                                                                        item.quantity
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{item.unit}</td>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 text-right whitespace-nowrap">₹ {parseFloat(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{getTaxName(item.tax_id || item.tax)}</td>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{item.last_updated ? new Date(item.last_updated).toLocaleDateString() : "N/A"}</td>
                                                            </>
                                                        )}
                                                        {activeTab === "Products" && (
                                                            <>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{item.name}</td>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 text-center">
                                                                    {restockingItemIds.includes(String(item.id)) ? (
                                                                        <span className="text-[12px] font-semibold text-yellow-600 animate-pulse">Stock adding...</span>
                                                                    ) : (
                                                                        item.current_quantity || item.quantity || 0
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 text-right whitespace-nowrap">₹ {parseFloat(item.Production_cost || item.cost_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 text-right whitespace-nowrap">₹ {parseFloat(item.rate || item.selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                <td className="px-6 py-4 text-[14px] lg:text-[13px] text-gray-500 min-w-[200px] max-w-[300px] whitespace-normal break-words leading-relaxed">
                                                                    {item.composition?.map((comp, i) => {
                                                                        const material = Array.isArray(comp.raw_material_id) ? comp.raw_material_id[0] : comp.raw_material_id;
                                                                        const name = material?.name || getRawMaterialName(material?.id || material);
                                                                        const rate = material?.unit_price || 0;
                                                                        return (
                                                                            <span key={i} className="inline-block py-0.5">
                                                                                {comp.quantity_used} x {name} (₹{parseFloat(rate).toFixed(2)})
                                                                                {i < item.composition.length - 1 ? ", " : ""}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </td>
                                                            </>
                                                        )}
                                                        {activeTab === "Stocks" && (
                                                            (() => {
                                                                const inStock = item.current_quantity || item.opening_quantity || 0;
                                                                const rate = parseFloat(item.rate || item.Production_cost || 0);
                                                                const taxPercent = parseFloat(item.tax_rate || item.tax_data?.rate || 0);
                                                                
                                                                let totalAmount = inStock * rate;
                                                                
                                                                // If tax is included or applied, we can show it. By default it is excluded if not specified.
                                                                let hasTax = taxPercent > 0;
                                                                let supplierId = item.supplier_id;
                                                                let supplierObj = supplierId ? suppliers.find(s => String(s.id) === String(supplierId)) : null;
                                                                let supplierName = supplierObj ? supplierObj.name : (supplierId ? "Unknown Supplier" : null);

                                                                const isCardamom = (item.gross_weight > 0 || item.packet_weight > 0 || item.sample_weight > 0);
                                                                
                                                                return (
                                                                    <>
                                                                        <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 font-medium">{item.name}</td>
                                                                        <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">
                                                                            {supplierId ? (
                                                                                <span 
                                                                                    className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium hover:underline"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (supplierObj) {
                                                                                            setViewingSupplier(supplierObj);
                                                                                        } else {
                                                                                            setViewingSupplier({ name: supplierName, email: "Loading...", phone: "Loading..." });
                                                                                            partyService.getPartyById(supplierId)
                                                                                                .then(res => setViewingSupplier(res || { name: supplierName, email: "N/A", phone: "N/A" }))
                                                                                                .catch(() => setViewingSupplier({ name: supplierName, email: "N/A", phone: "N/A" }));
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {supplierName}
                                                                                </span>
                                                                            ) : "—"}
                                                                        </td>
                                                                        <td className="px-6 py-4 text-[13px] text-gray-600 whitespace-nowrap">
                                                                            {isCardamom ? (
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <span className="font-medium text-gray-800">Net: {inStock} kg</span>
                                                                                    <span className="text-[11px] text-gray-500">
                                                                                        Gross: {item.gross_weight || 0} | Tare: {item.packet_weight || 0} | Sam: {item.sample_weight || 0}
                                                                                    </span>
                                                                                </div>
                                                                            ) : "—"}
                                                                        </td>
                                                                        <td className="px-6 py-4 text-[14px] lg:text-[15px] font-bold text-gray-900 text-center">
                                                                            {restockingItemIds.includes(String(item.id)) ? (
                                                                                <span className="text-[12px] font-semibold text-yellow-600 animate-pulse">Adding...</span>
                                                                            ) : (
                                                                                `${inStock} kg`
                                                                            )}
                                                                        </td>
                                                                        <td className="px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 text-right whitespace-nowrap">
                                                                            ₹ {rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kg
                                                                        </td>
                                                                        <td className="px-6 py-4 text-[14px] lg:text-[15px] font-bold text-[#FFCA00] text-right whitespace-nowrap">
                                                                            ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            <span className="block text-[11px] font-normal text-gray-400 mt-0.5">
                                                                                {hasTax ? `Tax (${taxPercent}%)` : "No Tax"}
                                                                            </span>
                                                                        </td>
                                                                    </>
                                                                );
                                                            })()
                                                        )}
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
                                ) : (
                                    <EmptyState
                                        title={`No ${activeTab} Found`}
                                        message={searchQuery ? `No items match your search "${searchQuery}".` : `Start by adding your first ${activeTab.toLowerCase().slice(0, -1)}.`}
                                        actionLabel={`Add ${activeTab.slice(0, -1)}`}
                                        onActionClick={() => {
                                            setEditingItem(null);
                                            if (activeTab === "Items") setIsItemModalOpen(true);
                                            else if (activeTab === "Raw Materials") setIsMaterialFormOpen(true);
                                            else if (activeTab === "Products") setIsProductFormOpen(true);
                                            else setIsSpecialItemFormOpen(true);
                                        }}
                                    />
                                )}
                            </div>

                            {/* Pagination */}
                            {totalCount > 0 && (
                                <div className="mt-8">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={totalCount}
                                        pageSize={pageSize}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            )}
                        </div>
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
                            <ActionMenu
                                isOpen={true}
                                onClose={() => setOpenMenuId(null)}
                                onEdit={() => {
                                    const item = filteredData.find(i => i.id === openMenuId);
                                    setEditingItem(item);
                                    if (activeTab === "Items") setIsItemModalOpen(true);
                                    else if (activeTab === "Raw Materials") setIsMaterialFormOpen(true);
                                    else if (activeTab === "Products") {
                                        const mappedComp = (item.composition || []).map(c => {
                                            const material = Array.isArray(c.raw_material_id) ? c.raw_material_id[0] : c.raw_material_id;
                                            return {
                                                id: c.id,
                                                raw_material_id: material?.id || material,
                                                quantity: c.quantity_used,
                                                cost_per_unit: material?.unit_price || 0
                                            };
                                        });
                                        setEditingItem({
                                            ...item,
                                            selling_price: item.rate,
                                            cost_price: item.Production_cost,
                                            quantity: item.current_quantity,
                                            composition: mappedComp
                                        });
                                        setIsProductFormOpen(true);
                                    } else setIsSpecialItemFormOpen(true);
                                    setOpenMenuId(null);
                                }}
                                onRestock={activeTab !== "Items" ? () => {
                                    const item = filteredData.find(i => i.id === openMenuId);
                                    setRestockItem(item);
                                    setIsRestockModalOpen(true);
                                    setOpenMenuId(null);
                                } : undefined}
                                onDelete={() => {
                                    const item = filteredData.find(i => i.id === openMenuId);
                                    handleDelete(item);
                                }}
                                actions={
                                    activeTab === "Stocks" && filteredData.find(i => i.id === openMenuId)?.name.toLowerCase().includes("bulk")
                                        ? [{
                                            label: "Split Stock",
                                            onClick: () => {
                                                const item = filteredData.find(i => i.id === openMenuId);
                                                setSplitItem(item);
                                                setIsSplitStockModalOpen(true);
                                                setOpenMenuId(null);
                                            }
                                        }]
                                        : []
                                }
                            />
                        </div>
                    )}

                    <ItemFormModal
                        isOpen={isItemModalOpen}
                        onClose={() => setIsItemModalOpen(false)}
                        onSave={handleSaveItem}
                        itemData={editingItem}
                        isSaving={isSaving}
                        leafAccounts={leafAccounts}
                        taxCodes={taxes}
                        pageCategory="ALL"
                    />

                    <SalesProductForm
                        isOpen={isProductFormOpen}
                        onClose={() => setIsProductFormOpen(false)}
                        onSave={handleSaveProduct}
                        itemData={editingItem}
                        isSaving={isSaving}
                        rawMaterials={rawMaterials}
                        taxes={taxes}
                        onRestockRawMaterial={handleRestockRawMaterialFromProductForm}
                        restockSuccessCount={restockSuccessCount}
                    />

                    <RawMaterialForm
                        isOpen={isMaterialFormOpen}
                        onClose={() => setIsMaterialFormOpen(false)}
                        onSave={handleSaveMaterial}
                        itemData={editingItem}
                        isSaving={isSaving}
                        taxes={taxes}
                        suppliers={suppliers}
                    />

                    <SalesSpecialItemForm
                        isOpen={isSpecialItemFormOpen}
                        onClose={() => setIsSpecialItemFormOpen(false)}
                        onSave={handleSaveSpecialItem}
                        itemData={editingItem}
                        isSaving={isSaving}
                        taxes={taxes}
                        suppliers={suppliers}
                    />

                    <RestockModal
                        isOpen={isRestockModalOpen}
                        onClose={() => {
                            setIsRestockModalOpen(false);
                            setRestockItem(null);
                        }}
                        onConfirm={handleRestockConfirm}
                        item={restockItem}
                        isSaving={isSaving}
                        suppliers={suppliers}
                        type={restockItem?.unit_price !== undefined ? "Raw Materials" : (restockItem?.item_type === "CUSTOMISED PRODUCTS" || activeTab === "Stocks" ? "Stocks" : activeTab)}
                    />

                    <SplitStockModal
                        isOpen={isSplitStockModalOpen}
                        onClose={() => {
                            setIsSplitStockModalOpen(false);
                            setSplitItem(null);
                        }}
                        sourceItem={splitItem}
                        onSplitSuccess={() => fetchData(true)}
                    />

                    {/* Supplier View Modal */}
                    {viewingSupplier && (
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => { e.stopPropagation(); setViewingSupplier(null); }}>
                            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-3">Supplier Details</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Name</label>
                                        <p className="text-[15px] text-gray-900 font-medium mt-0.5">{viewingSupplier.name || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Email</label>
                                        <p className="text-[15px] text-gray-900 font-medium mt-0.5">{viewingSupplier.email || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Phone</label>
                                        <p className="text-[15px] text-gray-900 font-medium mt-0.5">{viewingSupplier.phone || "N/A"}</p>
                                    </div>
                                    {viewingSupplier.gst_number && (
                                        <div>
                                            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">GST Number</label>
                                            <p className="text-[15px] text-gray-900 font-medium mt-0.5">{viewingSupplier.gst_number}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end mt-8 pt-4 border-t">
                                    <button onClick={() => setViewingSupplier(null)} className="px-6 py-2 bg-[#FFCA00] text-white rounded-lg font-bold text-[14px] hover:bg-[#d9ac00] shadow-sm transition-colors">Close</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
