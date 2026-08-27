"use client";

import React, { useState, useMemo, Suspense, useEffect, useRef } from "react";
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

export default function InventoryPage() {
    return (
        <Suspense fallback={<Loader />}>
            <InventoryContent />
        </Suspense>
    );
}

function InventoryContent() {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState("Items");

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
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isProductFormOpen, setIsProductFormOpen] = useState(false);
    const [isMaterialFormOpen, setIsMaterialFormOpen] = useState(false);
    const [isSpecialItemFormOpen, setIsSpecialItemFormOpen] = useState(false);
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
    const [restockItem, setRestockItem] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [restockingItemIds, setRestockingItemIds] = useState([]);

    // Filter states
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [tempPrice, setTempPrice] = useState("");
    const [filters, setFilters] = useState({
        supplier_id: "",
        unit: "",
        unit_price: "",
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
                                } catch (e) {}
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
        if (isSilent) setIsFilterLoading(true);
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
            } else if (activeTab === "Customized Products") {
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
            setIsFilterLoading(false);
            setIsFirstLoad(false);
        }
    };

    // Instant search - call API on every keystroke
    useEffect(() => {
        setSearchQuery(searchInput);
    }, [searchInput]);

    // Fetch when filters change
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
            fetchData(!isFirstLoad);
        }
    }, [filters, searchQuery]);

    // Fetch when page changes or tab changes
    useEffect(() => {
        fetchData(true);
    }, [currentPage, activeTab]);

    // Reset search on tab change
    useEffect(() => {
        setSearchInput("");
        setSearchQuery("");
        setFilters({
            supplier_id: "",
            unit: "",
            unit_price: "",
            purpose: ""
        });
        setTempPrice("");
        setIsFilterVisible(false);
        setCurrentPage(1);
        setOpenMenuId(null);
    }, [activeTab]);

    const handleClearFilters = () => {
        setFilters({
            supplier_id: "",
            unit: "",
            unit_price: "",
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
                await itemService.updateItem(editingItem.id, data);
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
                await inventoryService.updateRawMaterial(editingItem.id, apiPayload);
                dispatch(showToast({ message: "Raw material updated successfully", type: "success" }));
            } else {
                const response = await inventoryService.saveRawMaterial(apiPayload);
                dispatch(showToast({ message: "Raw material created successfully", type: "success" }));
                const createdId = findIdInObject(response);
                if (data.enableRestock && createdId) {
                    const itemId = String(createdId);
                    const createdMaterial = {
                        ...apiPayload,
                        id: createdId
                    };
                    setRestockingItemIds(prev => [...prev, itemId]);

                    const restockData = {
                        amount: parseFloat(data.restock_quantity) || 0,
                        supplier_id: data.restock_supplier_id ? parseInt(data.restock_supplier_id) : null,
                        payment_method: data.restock_payment_method || null,
                        payment_status: data.restock_payment_status || null,
                        paid_amount: parseFloat(data.restock_payment_amount) || 0
                    };
                    const storageKey = `pending_restock_material_${itemId}`;
                    try {
                        localStorage.setItem(storageKey, JSON.stringify({ createdMaterial, restockData }));
                    } catch (err) {
                        console.error("localStorage error:", err);
                    }

                    // Silently call the restock API in the background
                    (async () => {
                        try {
                            await inventoryService.restockRawMaterial(createdMaterial, restockData);
                            try {
                                localStorage.removeItem(storageKey);
                            } catch (e) {}
                            setRestockingItemIds(prev => prev.filter(id => id !== itemId));
                            dispatch(showToast({ message: "Initial stock added successfully", type: "success" }));
                            fetchData(true);
                        } catch (error) {
                            console.error("Silent restock error:", error);
                            try {
                                localStorage.removeItem(storageKey);
                            } catch (e) {}
                            setRestockingItemIds(prev => prev.filter(id => id !== itemId));
                            dispatch(showToast({ message: "Failed to add initial stock. Please restock manually.", type: "error" }));
                            fetchData(true);
                        }
                    })();
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
                    quantity_used: parseFloat(c.quantity || c.quantity_used)
                })) || []
            };

            if (editingItem) {
                payload.id = editingItem.id;
                await inventoryService.updateProduct(payload);
                dispatch(showToast({ message: "Product updated successfully", type: "success" }));
            } else {
                const response = await inventoryService.saveProduct(payload);
                dispatch(showToast({ message: "Product created successfully", type: "success" }));
                const createdId = findIdInObject(response);
                if (data.enableRestock && createdId) {
                    const itemId = String(createdId);
                    setRestockingItemIds(prev => [...prev, itemId]);

                    const costPrice = parseFloat(payload.cost_price || 0);
                    const restockQty = parseFloat(data.restock_quantity) || 0;
                    const restockData = {
                        amount: restockQty,
                        supplier_id: null,
                        payment_method: null,
                        payment_status: "FULLY_PAID",
                        paid_amount: costPrice * restockQty,
                        email_to: null
                    };
                    const storageKey = `pending_restock_product_${itemId}`;
                    try {
                        localStorage.setItem(storageKey, JSON.stringify({ createdProduct: { id: createdId, ...payload }, restockData }));
                    } catch (err) {
                        console.error("localStorage error:", err);
                    }

                    // Silently call the restock API in the background
                    (async () => {
                        try {
                            // 1. Fetch all raw materials
                            const allMaterialsRes = await inventoryService.getRawMaterials();
                            const allMaterials = allMaterialsRes.data || [];

                            // 2. Fetch the created product to get database composition ids
                            const dbProductRes = await inventoryService.getProducts({ id: createdId });
                            const dbProduct = dbProductRes.data?.[0];

                            const mappedComposition = dbProduct?.composition?.map(c => {
                                const rawMatObj = Array.isArray(c.raw_material_id) ? c.raw_material_id[0] : c.raw_material_id;
                                const rawMatId = parseInt(rawMatObj?.id || rawMatObj);
                                const fullMat = allMaterials.find(rm => rm.id === rawMatId);
                                const formattedMat = fullMat ? {
                                    ...fullMat,
                                    quantity: typeof fullMat.quantity === 'number' ? fullMat.quantity.toFixed(2) : parseFloat(fullMat.quantity).toFixed(2),
                                    unit_price: typeof fullMat.unit_price === 'number' ? fullMat.unit_price.toFixed(2) : parseFloat(fullMat.unit_price).toFixed(2),
                                    tax_percent: typeof fullMat.tax_percent === 'number' ? fullMat.tax_percent.toString() : fullMat.tax_percent,
                                    tax_id: fullMat.tax_id?.id || fullMat.tax_id || null
                                } : null;

                                return {
                                    id: c.id,
                                    item_id: createdId,
                                    raw_material_id: formattedMat ? [formattedMat] : [],
                                    quantity_used: parseFloat(c.quantity_used || 0).toFixed(2)
                                };
                            }) || [];

                            const createdProduct = {
                                id: createdId,
                                name: payload.name,
                                item_type: "PRODUCTS",
                                category: "SALES",
                                item_code: payload.item_code,
                                hsn_sac_code: payload.hsn_sac_code || null,
                                unit: payload.unit || null,
                                description: payload.description || null,
                                rate: typeof payload.selling_price === 'number' ? payload.selling_price.toFixed(2) : parseFloat(payload.selling_price || 0).toFixed(2),
                                tax: payload.tax ? parseInt(payload.tax) : null,
                                Production_cost: typeof payload.cost_price === 'number' ? payload.cost_price.toFixed(2) : parseFloat(payload.cost_price || 0).toFixed(2),
                                opening_quantity: "0",
                                current_quantity: "0",
                                composition: mappedComposition,
                                selling_price: parseFloat(payload.selling_price || 0),
                                cost_price: parseFloat(payload.cost_price || 0),
                                restock: restockQty,
                                supplier_id: null,
                                payment_mode: null,
                                payment_status: "FULLY_PAID",
                                payment_amount: costPrice * restockQty,
                                email_to: null
                            };

                            try {
                                localStorage.setItem(storageKey, JSON.stringify({ createdProduct, restockData }));
                            } catch (e) {}

                            await inventoryService.restockProduct(createdProduct, restockData);
                            try {
                                localStorage.removeItem(storageKey);
                            } catch (e) {}
                            setRestockingItemIds(prev => prev.filter(id => id !== itemId));
                            dispatch(showToast({ message: "Initial stock added successfully", type: "success" }));
                            fetchData(true);
                        } catch (error) {
                            console.error("Silent restock error:", error);
                            try {
                                localStorage.removeItem(storageKey);
                            } catch (e) {}
                            setRestockingItemIds(prev => prev.filter(id => id !== itemId));
                            dispatch(showToast({ message: "Failed to add initial stock. Please restock manually.", type: "error" }));
                            fetchData(true);
                        }
                    })();
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
                min_order_quantity: null,
                tax: parseInt(data.tax) || null,
                Production_cost: parseFloat(data.production_cost) || 0,
                opening_quantity: parseFloat(data.opening_quantity) || 0,
                current_quantity: parseFloat(data.current_quantity) || 0,
                supplier_id: parseInt(data.supplier_id) || null
            };

            if (editingItem) {
                await inventoryService.updateCustomizedProduct(editingItem.id, payload);
                dispatch(showToast({ message: "Customized product updated successfully", type: "success" }));
            } else {
                const response = await inventoryService.saveCustomizedProduct(payload);
                dispatch(showToast({ message: "Customized product created successfully", type: "success" }));
                const createdId = findIdInObject(response);
                if (data.enableRestock && createdId) {
                    const itemId = String(createdId);
                    const createdProduct = {
                        ...payload,
                        id: createdId
                    };
                    setRestockingItemIds(prev => [...prev, itemId]);

                    const restockData = {
                        amount: parseFloat(data.restock_quantity) || 0,
                        supplier_id: data.restock_supplier_id ? parseInt(data.restock_supplier_id) : null,
                        payment_method: data.restock_payment_method || null,
                        payment_status: data.restock_payment_status || null,
                        paid_amount: parseFloat(data.restock_payment_amount) || 0
                    };
                    const storageKey = `pending_restock_customized_product_${itemId}`;
                    try {
                        localStorage.setItem(storageKey, JSON.stringify({ createdProduct, restockData }));
                    } catch (err) {
                        console.error("localStorage error:", err);
                    }

                    // Silently call the restock API in the background
                    (async () => {
                        try {
                            await inventoryService.restockCustomizedProduct(createdProduct, restockData);
                            try {
                                localStorage.removeItem(storageKey);
                            } catch (e) {}
                            setRestockingItemIds(prev => prev.filter(id => id !== itemId));
                            dispatch(showToast({ message: "Initial stock added successfully", type: "success" }));
                            fetchData(true);
                        } catch (error) {
                            console.error("Silent restock error:", error);
                            try {
                                localStorage.removeItem(storageKey);
                            } catch (e) {}
                            setRestockingItemIds(prev => prev.filter(id => id !== itemId));
                            dispatch(showToast({ message: "Failed to add initial stock. Please restock manually.", type: "error" }));
                            fetchData(true);
                        }
                    })();
                }
            }
            setIsSpecialItemFormOpen(false);
            setEditingItem(null);
            fetchData(true);
        } catch (error) {
            console.error("Error saving customized product:", error);
            const operation = editingItem ? "update" : "create";
            const errorMsg = handleCrudError(error, operation, "customized product");
            dispatch(showToast({ message: errorMsg, type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestockConfirm = async (data) => {
        const restockType = restockItem?.unit_price !== undefined ? "Raw Materials" : (restockItem?.item_type === "CUSTOMISED PRODUCTS" || activeTab === "Customized Products" ? "Customized Products" : activeTab);
        setIsSaving(true);
        try {
            if (restockType === "Raw Materials") {
                await inventoryService.restockRawMaterial(restockItem, data);
            } else if (restockType === "Products") {
                await inventoryService.restockProduct(restockItem, data);
            } else {
                await inventoryService.restockCustomizedProduct(restockItem, data);
            }
            dispatch(showToast({ message: "Stock updated successfully", type: "success" }));
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
        else if (activeTab === "Customized Products") title = "Special Item";

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
                dispatch(showToast({ message: "Customized product deleted successfully", type: "success" }));
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
            : "Manage special or customized product stock",
        from: "inventory",
    };

    return (
        <div className="flex-1 flex flex-col">
            <Navbar data={navbarData} />
            {isLoading && isFirstLoad ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader message="Loading Inventory..." />
                </div>
            ) : (
                <>
                    <main className="flex-1 flex flex-col py-6 md:py-8">
                        <div className="w-full flex-1 flex flex-col">
                            {/* Tabs */}
                            <div className="flex mb-8 overflow-x-auto pb-2 scrollbar-hide">
                                <div className="bg-[#EFEFEF]/50 p-1 rounded-xl inline-flex shadow-sm min-w-max">
                                    {["Items", "Raw Materials", "Products", "Customized Products"].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-8 py-2.5 rounded-lg text-[14px] lg:text-[15px] font-medium transition-all cursor-pointer ${activeTab === tab
                                                ? "bg-white text-[#FFCA00] shadow-sm"
                                                : "text-gray-400 hover:text-gray-600"
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>

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
                                                dispatch,
                                                setIsExporting,
                                                payload: activeTab === "Items" ? { category: "both" } : undefined,
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
                                            <span>Add New {activeTab === "Raw Materials" ? "Material" : activeTab === "Products" ? "Product" : activeTab.slice(0, -1)}</span>
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
                                                <label className="block text-[12px] font-medium text-gray-500 mb-1.5 ml-0.5">Supplier</label>
                                                <CustomSelect
                                                    value={filters.supplier_id}
                                                    onChange={(val) => setFilters(prev => ({ ...prev, supplier_id: val }))}
                                                    options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                                    placeholder="Select Supplier"
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
                                                    { value: "Kg", label: "Kg" },
                                                    { value: "Liter", label: "Liter" },
                                                    { value: "Meter", label: "Meter" },
                                                    { value: "Box", label: "Box" },
                                                    { value: "Pcs", label: "Pcs" },
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
                                {/* Small filter loading spinner */}
                                {isFilterLoading && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg">
                                        <div className="w-8 h-8 border-3 border-[#FFCA00] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}

                                {isLoading && isFirstLoad ? (
                                    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                                        <FiLoader className="animate-spin text-[#FFCA00] mb-4" size={40} />
                                        <p className="text-gray-500 text-sm font-medium">Loading inventory...</p>
                                    </div>
                                ) : filteredData.length > 0 ? (
                                    <div className="overflow-x-auto scrollbar-hide">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    {activeTab === "Items" && (
                                                        <>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Item Name</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-center">Purpose</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Unit Type</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Tax</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Rate</th>
                                                        </>
                                                    )}
                                                    {activeTab === "Raw Materials" && (
                                                        <>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Name</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Quantity</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Unit</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Unit Price</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Supplier</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Tax</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Last Updated</th>
                                                        </>
                                                    )}
                                                    {activeTab === "Products" && (
                                                        <>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Name</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">In Stock</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Cost Price</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Selling Price</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Composition</th>
                                                        </>
                                                    )}
                                                    {activeTab === "Customized Products" && (
                                                        <>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap rounded-tl-lg">Item Name</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">In Stock</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Unit Type</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap">Tax</th>
                                                            <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 whitespace-nowrap text-right">Rate</th>
                                                        </>
                                                    )}
                                                    <th className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] font-semibold text-gray-700 text-center whitespace-nowrap rounded-tr-lg">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {filteredData.map((item, idx) => (
                                                    <tr 
                                                        key={item.id} 
                                                        className="hover:bg-gray-50 transition-colors"
                                                    >
                                                        {activeTab === "Items" && (
                                                            <>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">{item.name}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-center">
                                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                                                        item.category === "SALES" ? "bg-blue-50 text-blue-500 border-blue-100" : item.category === "PURCHASE" ? "bg-purple-50 text-purple-500 border-purple-100" : "bg-green-50 text-green-500 border-green-100"
                                                                    }`}>
                                                                        {item.category?.charAt(0).toUpperCase() + item.category?.slice(1).toLowerCase() || "—"}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{item.unit || "Unit"}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{getTaxName(item.tax)}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap text-right">₹ {parseFloat(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            </>
                                                        )}
                                                        {activeTab === "Raw Materials" && (
                                                            <>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">{item.name}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 text-right">
                                                                    {restockingItemIds.includes(String(item.id)) ? (
                                                                        <span className="text-[12px] font-semibold text-yellow-600 animate-pulse block">Stock adding...</span>
                                                                    ) : (
                                                                        item.quantity
                                                                    )}
                                                                </td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{item.unit}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap text-right">₹ {parseFloat(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{getSupplierName(item.supplier_id)}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{getTaxName(item.tax_id || item.tax)}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{item.last_updated ? new Date(item.last_updated).toLocaleDateString() : "N/A"}</td>
                                                            </>
                                                        )}
                                                        {activeTab === "Products" && (
                                                            <>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">{item.name}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 text-right">
                                                                    {restockingItemIds.includes(String(item.id)) ? (
                                                                        <span className="text-[12px] font-semibold text-yellow-600 animate-pulse block">Stock adding...</span>
                                                                    ) : (
                                                                        item.current_quantity || item.quantity || 0
                                                                    )}
                                                                </td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap text-right">₹ {parseFloat(item.Production_cost || item.cost_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap text-right">₹ {parseFloat(item.rate || item.selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">
                                                                    {item.composition?.map((comp, i) => (
                                                                        <span key={i}>
                                                                            {comp.quantity_used} x {comp.raw_material_id?.name || getRawMaterialName(comp.raw_material_id)}{i < item.composition.length - 1 ? ", " : ""}
                                                                        </span>
                                                                    ))}
                                                                </td>
                                                            </>
                                                        )}
                                                        {activeTab === "Customized Products" && (
                                                            <>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap">{item.name}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 text-right">
                                                                    {restockingItemIds.includes(String(item.id)) ? (
                                                                        <span className="text-[12px] font-semibold text-yellow-600 animate-pulse block">Stock adding...</span>
                                                                    ) : (
                                                                        item.current_quantity || item.opening_quantity || 0
                                                                    )}
                                                                </td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{item.unit || "Unit"}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700">{getTaxName(item.tax)}</td>
                                                                <td className="px-4 lg:px-6 py-4 text-[14px] lg:text-[15px] text-gray-700 whitespace-nowrap text-right">₹ {parseFloat(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            </>
                                                        )}
                                                        <td className="px-4 lg:px-6 py-4 text-center relative whitespace-nowrap">
                                                            <button
                                                                ref={el => actionButtonsRef.current[item.id] = el}
                                                                onClick={(e) => handleActionButtonClick(e, item.id)}
                                                                className={`p-2 rounded-lg transition-all cursor-pointer border ${openMenuId === item.id ? "bg-white border-[#FFCA00] text-[#FFCA00]" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
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
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalCount}
                                    pageSize={pageSize}
                                    onPageChange={setCurrentPage}
                                />
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
                                        const mappedComp = (item.composition || []).map(c => ({
                                            id: c.id,
                                            raw_material_id: c.raw_material_id?.id || c.raw_material_id,
                                            quantity: c.quantity_used,
                                            cost_per_unit: c.raw_material_id?.unit_price || 0
                                        }));
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
                        type={restockItem?.unit_price !== undefined ? "Raw Materials" : (restockItem?.item_type === "CUSTOMISED PRODUCTS" || activeTab === "Customized Products" ? "Customized Products" : activeTab)}
                    />
                </>
            )}
        </div>
    );
}
