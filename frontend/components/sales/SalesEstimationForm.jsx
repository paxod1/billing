"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { FiX, FiPlus, FiTrash2, FiCalendar, FiBox, FiSettings, FiDollarSign, FiGitMerge, FiBriefcase, FiClock, FiMapPin, FiActivity, FiSmile, FiVolume2, FiGlobe, FiTool, FiTarget, FiLoader, FiShield, FiUsers } from "react-icons/fi";
import { estimationService } from "@/services/estimationService";
import { inventoryService } from "@/services/inventoryService";
import { taxService } from "@/services/taxService";
import CustomSelect from "@/components/common/CustomSelect";
import { showToast } from "@/lib/features/toast/toastSlice";
import { useDispatch } from "react-redux";
import { generateUniqueId } from "@/utils/idGenerator";
import AttachmentUploader from "@/components/common/AttachmentUploader";

const initialEstimationFormData = {
    id: null,
    estimationNumber: "",
    estimationName: "",
    quoteDate: "",
    expiryDate: "",
    items: [],
    notes: "",
    attachment: null
};

// Generate unique estimation number
const generateEstimationNumber = () => generateUniqueId("EST");

// Find matching tax code by rate percentage
const findTaxCodeByRate = (rate, taxList) => {
    if (!rate || isNaN(parseFloat(rate))) return null;
    const target = parseFloat(rate);
    return taxList.find(t => {
        const rates = t.tax_rates || {};
        const sum = Object.values(rates).reduce((s, r) => s + (parseFloat(r) || 0), 0);
        return Math.abs(sum - target) < 0.01;
    });
};

const SalesEstimationForm = ({ isOpen, onClose, onSave, editData = null, viewOnly = false }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [customizedProducts, setCustomizedProducts] = useState([]);
    const [lockedCountry, setLockedCountry] = useState(null);
    const [taxes, setTaxes] = useState([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const menuRef = useRef(null);
    const dispatch = useDispatch();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState(initialEstimationFormData);
    const [initialSnapshot, setInitialSnapshot] = useState(null);

    const hasChanges = useMemo(() => {
        if (!initialSnapshot) return false;
        return JSON.stringify(formData) !== initialSnapshot;
    }, [formData, initialSnapshot]);

    const handleSave = async () => {
        try {
            // Material inventory validation
            const overstockItem = formData.items.find(item => {
                if (item.type !== "Materials") return false;
                const pool = item.materialType === "product" ? products : customizedProducts;
                const stock = pool.find(p => p.name === item.name)?.current_quantity || 0;
                return (parseFloat(item.qty) || 0) > stock;
            });

            if (overstockItem) {
                dispatch(showToast({ message: "One or more materials exceed available stock quantity.", type: "error" }));
                return;
            }

            setIsSaving(true);

            const lines = formData.items.map(item => {
                const base = {
                    category: item.type.toLowerCase(),
                    description: item.description || item.name || item.type,
                    amount: parseFloat(item.amount) || 0
                };

                // Add existing ID if editing
                if (editData && item.id && !String(item.id).startsWith("item_")) {
                    base.id = item.id;
                }

                switch (item.type) {
                    case "Manpower":
                        return { ...base, source: item.source.toLowerCase(), role: item.role, hours: parseFloat(item.hours) || 0, rate: parseFloat(item.rate) || 0 };
                    case "Materials":
                        return {
                            ...base,
                            type: item.materialType.toLowerCase() === "customised_products" || item.materialType.toLowerCase() === "customized product" ? "customised_products" : "products",
                            name: item.name,
                            qty: parseFloat(item.qty) || 0,
                            cost: parseFloat(item.cost) || 0,
                            tax_id: item.tax_id ? Number(item.tax_id) : null,
                            tax: parseFloat(item.taxPercentage || 0),
                            material_id: item.material_id || null,
                            production_cost: parseFloat(item.production_cost) || 0,
                            unit: item.unit || "pcs"
                        };
                    case "Machinery":
                        return { ...base, qty: parseFloat(item.qty) || 0, rate: parseFloat(item.rate) || 0 };
                    case "Minutes":
                        return { ...base, minutes: parseFloat(item.minutes) || 0, rate: parseFloat(item.rate) || 0 };
                    case "Mileage":
                        return { ...base, distance: parseFloat(item.distance) || 0, rate: parseFloat(item.rate) || 0 };
                    case "Measurement":
                        return { ...base, type: item.materialType.toLowerCase(), unit: item.unit, qty: parseFloat(item.qty) || 0, rate: parseFloat(item.rate) || 0 };
                    case "Milieu":
                        return { ...base, milieu_category: item.category.toLowerCase(), rate: parseFloat(item.rate) || 0 };
                    case "Middlemen":
                        return { ...base, qty: parseFloat(item.qty) || 0, rate: parseFloat(item.rate) || 0 };
                    default:
                        return base;
                }
            });

            const payload = {
                name: formData.estimationName,
                date: formData.quoteDate,
                expiry_date: formData.expiryDate,
                tax: calculateTaxTotal() || 0,
                note: formData.notes || "",
                attachmentkey: formData.attachment || null,
                lines: lines
            };

            // Include root ID if editing
            if (editData?.id) {
                payload.id = editData.id;
            }
            
            if (formData.id) {
                payload.id = formData.id;
            }

            const response = await estimationService.saveEstimation(payload);
            
            if (response.success === false) {
                throw new Error(response.message || "Failed to save estimation");
            }

            setInitialSnapshot(JSON.stringify(formData));
            dispatch(showToast({ 
                message: editData ? "Estimation updated successfully!" : "Estimation created successfully!", 
                type: "success" 
            }));
            
            onSave();
            handleClose();
        } catch (error) {
            console.error("Error saving estimation:", error);
            if (!error.isHandled) {
                dispatch(showToast({ message: error.message || "Error saving estimation.", type: "error" }));
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setFormData(initialEstimationFormData);
        setInitialSnapshot(null);
        setLockedCountry(null);
        onClose();
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchInventory = async (countryFilter = null) => {
        try {
            setIsLoadingInventory(true);
            const [prodRes, custRes, taxRes] = await Promise.all([
                inventoryService.getProducts({ country: countryFilter }),
                inventoryService.getCustomizedProducts({ country: countryFilter }),
                taxService.getTaxCodes()
            ]);
            setProducts(prodRes.data || []);
            setCustomizedProducts(custRes.data || []);
            setTaxes(taxRes || []);
        } catch (error) {
            console.error("Error fetching inventory:", error);
        } finally {
            setIsLoadingInventory(false);
        }
    };

    // Fetch data only once when form opens
    useEffect(() => {
        if (isOpen) {
            const checkEditTaxAndFetch = async () => {
                try {
                    setIsLoadingInventory(true);
                    // Fetch everything first without country filter to resolve country
                    const [prodRes, custRes, taxRes] = await Promise.all([
                        inventoryService.getProducts(),
                        inventoryService.getCustomizedProducts(),
                        taxService.getTaxCodes()
                    ]);
                    
                    let countryToFilter = null;
                    if (editData && editData.lines) {
                        const firstMaterialLine = editData.lines.find(line => line.category === "materials");
                        if (firstMaterialLine) {
                            const materialName = firstMaterialLine.metadata?.name || firstMaterialLine.name || firstMaterialLine.description;
                            const isCustom = (firstMaterialLine.metadata?.type || firstMaterialLine.type || "").toLowerCase() === "customized product";
                            const pool = isCustom ? (custRes.data || []) : (prodRes.data || []);
                            const matchedProduct = pool.find(p => p.name === materialName || p.id == firstMaterialLine.source_id);
                            if (matchedProduct && matchedProduct.tax) {
                                const taxVal = matchedProduct.tax;
                                const taxId = (typeof taxVal === 'object' ? taxVal?.id : taxVal);
                                if (taxId) {
                                    const taxResponse = await taxService.getTaxCodeById(taxId);
                                    const countryVal = taxResponse?.data?.country;
                                    if (countryVal) {
                                        countryToFilter = countryVal;
                                        setLockedCountry(countryVal);
                                    }
                                }
                            }
                        }
                    }

                    if (countryToFilter) {
                        // Refetch filtered by country
                        const [filteredProds, filteredCust] = await Promise.all([
                            inventoryService.getProducts({ country: countryToFilter }),
                            inventoryService.getCustomizedProducts({ country: countryToFilter })
                        ]);
                        setProducts(filteredProds.data || []);
                        setCustomizedProducts(filteredCust.data || []);
                    } else {
                        setProducts(prodRes.data || []);
                        setCustomizedProducts(custRes.data || []);
                    }
                    setTaxes(taxRes || []);
                } catch (error) {
                    console.error("Error in checkEditTaxAndFetch:", error);
                } finally {
                    setIsLoadingInventory(false);
                }
            };
            checkEditTaxAndFetch();
        }
    }, [isOpen, editData]);

    // Reset state after cancel or close
    useEffect(() => {
        if (!isOpen) {
            setLockedCountry(null);
        }
    }, [isOpen]);

    // Automatically reset/refetch products if all items are cleared
    useEffect(() => {
        if (!isOpen) return;

        const hasActiveItems = formData.items && formData.items.some(
            item => item.type === "Materials" && item.name
        );

        if (lockedCountry && !hasActiveItems) {
            setLockedCountry(null);
            fetchInventory(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.items, lockedCountry, isOpen]);

    // Initialize form when opening for create or edit
    useEffect(() => {
        if (isOpen) {
            if (editData) {
                const dataToSet = {
                    ...editData,
                    estimationName: editData.name || "",
                    estimationNumber: editData.estimation_number || "",
                    quoteDate: editData.date?.split('T')[0] || "",
                    expiryDate: editData.expiry_date?.split('T')[0] || "",
                    items: editData.lines ? editData.lines.map((line, idx) => {
                        const type = line.category?.charAt(0).toUpperCase() + line.category?.slice(1).toLowerCase();
                        const meta = line.metadata || {};
                        
                        let item = {
                            id: line.id || `item_${idx}_${Date.now()}`,
                            type: type,
                            description: meta.description || line.description || "",
                            amount: parseFloat(line.amount) || parseFloat(meta.amount) || 0,
                            rate: parseFloat(line.rate) || parseFloat(meta.rate) || 0,
                            qty: parseFloat(line.quantity) || parseFloat(meta.qty) || 0,
                            unit: line.unit || meta.unit || ""
                        };

                        // Map category-specific fields
                        switch (type) {
                            case "Manpower":
                                item.source = (meta.source || line.source || "internal").toLowerCase();
                                item.role = meta.role || line.role || line.description || "";
                                item.hours = meta.hours || line.hours || line.quantity || 0;
                                break;
                            case "Materials":
                                {
                                    const rawType = (meta.type || line.type || "").toLowerCase();
                                    item.materialType = (rawType === "customised_products" || rawType === "customized product" || rawType === "customised" || rawType === "customized") ? "customized product" : "product";
                                    item.name = meta.name || line.name || line.description || "";
                                    item.qty = meta.qty || line.qty || line.quantity || 0;
                                    item.cost = meta.cost || line.cost || line.rate || 0;
                                    
                                    let resolvedTaxPercent = 0;
                                    let resolvedTaxId = null;

                                    if (line.tax !== undefined && line.tax !== null) {
                                        resolvedTaxPercent = parseFloat(line.tax);
                                        resolvedTaxId = line.tax_id;
                                    } else if (meta.tax !== undefined && meta.tax !== null) {
                                        resolvedTaxPercent = parseFloat(meta.tax);
                                        resolvedTaxId = meta.tax_id;
                                    } else {
                                        // Old data format where tax_id stores the percentage
                                        resolvedTaxPercent = parseFloat(line.tax_id || meta.tax_id || 0);
                                    }

                                    item.taxPercentage = resolvedTaxPercent;
                                    item.tax_id = resolvedTaxId;

                                    item.material_id = line.material_id || meta.material_id || null;
                                    item.production_cost = parseFloat(line.production_cost || meta.production_cost || 0);
                                    item.unit = line.unit || meta.unit || "pcs";
                                    item.amount = item.qty * item.cost;
                                }
                                break;
                            case "Machinery":
                                item.qty = meta.qty || line.qty || line.quantity || 0;
                                item.rate = meta.rate || line.rate || 0;
                                break;
                            case "Minutes":
                                item.minutes = meta.minutes || line.minutes || line.quantity || 0;
                                item.rate = meta.rate || line.rate || 0;
                                break;
                            case "Mileage":
                                item.distance = meta.distance || line.distance || line.quantity || 0;
                                item.rate = meta.rate || line.rate || 0;
                                break;
                            case "Measurement":
                                item.materialType = (meta.type || line.type || "").toLowerCase();
                                item.unit = meta.unit || line.unit || "";
                                item.qty = meta.qty || line.qty || line.quantity || 0;
                                item.rate = meta.rate || line.rate || 0;
                                break;
                            case "Milieu":
                                item.category = (meta.category || meta.milieu_category || line.category || "").toLowerCase();
                                item.rate = parseFloat(meta.rate || line.rate || 0);
                                break;
                            case "Middlemen":
                                item.qty = meta.qty || line.qty || line.quantity || 0;
                                item.rate = meta.rate || line.rate || 0;
                                break;
                            default:
                                break;
                        }
                        return item;
                    }) : [],
                    notes: editData.note || ""
                };
                setFormData(dataToSet);
                setInitialSnapshot(JSON.stringify(dataToSet));
            } else {
                const today = new Date();
                const expiry = new Date();
                expiry.setDate(today.getDate() + 30);
                const dataToSet = {
                    ...initialEstimationFormData,
                    estimationNumber: generateEstimationNumber(),
                    quoteDate: today.toISOString().split('T')[0],
                    expiryDate: expiry.toISOString().split('T')[0],
                    items: []
                };
                setFormData(dataToSet);
                setInitialSnapshot(JSON.stringify(dataToSet));
            }
        }
    }, [isOpen, editData]);

    const itemTypes = [
        { id: "Manpower", icon: FiUsers, label: "Manpower" },
        { id: "Materials", icon: FiBox, label: "Materials" },
        { id: "Machinery", icon: FiSettings, label: "Machinery" },
        { id: "Money", icon: FiDollarSign, label: "Money" },
        { id: "Method", icon: FiGitMerge, label: "Method" },
        { id: "Management", icon: FiBriefcase, label: "Management" },
        { id: "Minutes", icon: FiClock, label: "Minutes" },
        { id: "Mileage", icon: FiMapPin, label: "Mileage" },
        { id: "Measurement", icon: FiActivity, label: "Measurement" },
        { id: "Morale", icon: FiSmile, label: "Morale" },
        { id: "Marketing", icon: FiVolume2, label: "Marketing" },
        { id: "Milieu", icon: FiGlobe, label: "Milieu" },
        { id: "Maintenance", icon: FiTool, label: "Maintenance" },
        { id: "Mission", icon: FiTarget, label: "Mission" },
        { id: "Mitigation", icon: FiShield, label: "Mitigation" },
        { id: "Middlemen", icon: FiUsers, label: "Middlemen" },
    ];

    const handleAddItem = (type) => {
        const newItem = {
            id: Date.now(),
            type,
            description: "",
            amount: 0,
            source: "Internal",
            role: "",
            hours: 1,
            rate: 0,
            materialType: "Product",
            name: "",
            qty: 1,
            cost: 0,
            taxPercentage: 0,
            tax_id: null,
            minutes: 1,
            distance: 1,
            unit: "",
            category: ""
        };
        setFormData(prev => ({ ...prev, items: [newItem, ...prev.items] }));
        setIsMenuOpen(false);
    };

    const handleUpdateItem = (id, fieldOrFields, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item => {
                if (item.id === id) {
                    let updatedItem = { ...item };
                    if (typeof fieldOrFields === "object" && fieldOrFields !== null) {
                        for (const [f, v] of Object.entries(fieldOrFields)) {
                            let val = v;
                            if (["qty", "hours", "minutes", "distance"].includes(f)) {
                                if (v === "") {
                                    val = "";
                                } else {
                                    const parsed = parseFloat(v);
                                    val = isNaN(parsed) ? 0 : parsed;
                                }
                            }
                            updatedItem[f] = val;
                        }
                    } else {
                        let val = value;
                        if (["qty", "hours", "minutes", "distance"].includes(fieldOrFields)) {
                            if (value === "") {
                                val = "";
                            } else {
                                const parsed = parseFloat(value);
                                val = isNaN(parsed) ? 0 : parsed;
                            }
                        }
                        updatedItem[fieldOrFields] = val;
                    }

                    // Auto-calculate amount based on type
                    if (item.type === "Manpower") {
                        updatedItem.amount = (parseFloat(updatedItem.hours) || 0) * (parseFloat(updatedItem.rate) || 0);
                    } else if (item.type === "Materials") {
                        updatedItem.amount = (parseFloat(updatedItem.qty) || 0) * (parseFloat(updatedItem.cost) || 0);
                    } else if (item.type === "Machinery" || item.type === "Minutes" || item.type === "Measurement" || item.type === "Middlemen") {
                        const q = item.type === "Minutes" ? updatedItem.minutes : updatedItem.qty;
                        updatedItem.amount = (parseFloat(q) || 0) * (parseFloat(updatedItem.rate) || 0);
                    } else if (item.type === "Mileage") {
                        updatedItem.amount = (parseFloat(updatedItem.distance) || 0) * (parseFloat(updatedItem.rate) || 0);
                    } else if (item.type === "Milieu") {
                        updatedItem.amount = parseFloat(updatedItem.rate) || 0;
                    }

                    return updatedItem;
                }
                return item;
            })
        }));
    };

    const handleRemoveItem = (id) => {
        setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
    };

    const calculateSubtotal = () => {
        return formData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    };

    const calculateTaxTotal = () => {
        return formData.items.reduce((sum, item) => {
            const amount = parseFloat(item.amount) || 0;
            const taxPercentage = parseFloat(item.taxPercentage) || 0;
            return sum + (amount * taxPercentage / 100);
        }, 0);
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTaxTotal();
    };

    const renderItemFields = (item) => {
        const commonInputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 font-medium placeholder:text-gray-300 transition-all shadow-none h-[40px]";
        const commonLabelClass = "text-[11px] font-bold text-gray-600 mb-1.5 block tracking-tight";

        if (item.type === "Manpower") {
            return (
                <div className="grid grid-cols-10 gap-4 min-w-[900px] md:min-w-full">
                    <div className="col-span-3">
                        <label className={commonLabelClass}>Source</label>
                        <CustomSelect
                            value={item.source}
                            onChange={(val) => handleUpdateItem(item.id, "source", val)}
                            options={[
                                { value: "internal", label: "Internal" },
                                { value: "external", label: "External" },
                            ]}
                            placeholder="Select Source"
                            className="rounded-lg h-[40px] shadow-none"
                            disabled={viewOnly}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className={commonLabelClass}>Role</label>
                        <input type="text" placeholder="e.g. Engineer" value={item.role} onChange={(e) => handleUpdateItem(item.id, "role", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Hours</label>
                        <input type="number" placeholder="0" value={item.hours} onChange={(e) => handleUpdateItem(item.id, "hours", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Rate</label>
                        <input type="number" placeholder="0.00" value={item.rate} onChange={(e) => handleUpdateItem(item.id, "rate", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                </div>
            )
        }
        else if (item.type === "Materials") {
            const pool = item.materialType === "product" ? products : customizedProducts;
            const matchedProduct = pool.find(p => p.name === item.name);
            const stock = matchedProduct ? (parseFloat(matchedProduct.current_quantity) || 0) : 0;
            const productionCost = matchedProduct ? (parseFloat(matchedProduct.Production_cost || matchedProduct.production_cost) || 0) : (parseFloat(item.production_cost) || 0);
            const hasRateWarning = item.name && (parseFloat(item.cost) || 0) < productionCost;

            return (
                <div className="grid grid-cols-12 gap-4 min-w-[900px] md:min-w-full">
                    <div className="col-span-3">
                        <label className={commonLabelClass}>Type</label>
                        <CustomSelect
                            value={item.materialType} 
                            onChange={(val) => {
                                handleUpdateItem(item.id, "materialType", val);
                                handleUpdateItem(item.id, "name", "");
                                handleUpdateItem(item.id, "cost", 0);
                                handleUpdateItem(item.id, "unit", "");
                                handleUpdateItem(item.id, "taxPercentage", 0);
                                handleUpdateItem(item.id, "qty", 1);
                            }}
                            options={[
                                { value: "product", label: "Product" },
                                { value: "customized product", label: "Customized Product" },
                            ]}
                            placeholder="Select Type"
                            className="rounded-lg h-[40px] shadow-none"
                            disabled={viewOnly}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className={commonLabelClass}>Name</label>
                        {item.materialType ? (
                            <CustomSelect
                                value={item.name}
                                onChange={async (val) => {
                                    const pool = item.materialType === "product" ? products : customizedProducts;
                                    const selected = pool.find(p => p.name === val);
                                    if (selected) {
                                        const costVal = parseFloat(selected.rate || selected.unit_price || 0);
                                        const productionCostVal = parseFloat(selected.Production_cost || selected.production_cost || 0);
                                        const unitVal = selected.unit || "pcs";
                                        const materialIdVal = selected.id;
                                        
                                        const updates = {
                                            name: val,
                                            cost: costVal,
                                            qty: 1,
                                            unit: unitVal,
                                            material_id: materialIdVal,
                                            production_cost: productionCostVal,
                                            description: selected.description || val,
                                            taxPercentage: 0,
                                            tax_id: null
                                        };
 
                                        const taxVal = selected.tax;
                                        if (taxVal) {
                                            const taxId = (typeof taxVal === 'object' ? taxVal?.id : taxVal);
                                            updates.tax_id = taxId;

                                            if (typeof taxVal === 'object' && taxVal?.tax_rates) {
                                                const totalTaxRate = Object.values(taxVal.tax_rates).reduce((sum, rate) => sum + parseFloat(rate), 0);
                                                updates.taxPercentage = totalTaxRate;
                                                
                                                if (!lockedCountry && taxVal.country) {
                                                    setLockedCountry(taxVal.country);
                                                    fetchInventory(taxVal.country);
                                                }
                                            } else {
                                                const rateNum = parseFloat(taxVal);
                                                const matchedTax = findTaxCodeByRate(rateNum, taxes);
                                                if (matchedTax) {
                                                    updates.tax_id = matchedTax.id;
                                                    updates.taxPercentage = rateNum;
                                                } else {
                                                    try {
                                                        const taxResponse = await taxService.getTaxCodeById(taxId);
                                                        const taxData = taxResponse?.data || taxResponse;
                                                        const taxRates = taxData?.tax_rates || {};
                                                        const totalTaxRate = Object.values(taxRates).reduce((sum, rate) => sum + parseFloat(rate), 0);
                                                        updates.taxPercentage = totalTaxRate;
                                                        updates.tax_id = taxId;
                                                        
                                                        if (!lockedCountry && taxData?.country) {
                                                            setLockedCountry(taxData.country);
                                                            fetchInventory(taxData.country);
                                                        }
                                                    } catch (error) {
                                                        console.error("Error fetching tax code:", error);
                                                        if (!isNaN(parseFloat(taxId))) {
                                                            updates.taxPercentage = parseFloat(taxId);
                                                            updates.tax_id = parseFloat(taxId);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        handleUpdateItem(item.id, updates);
                                    }
                                }}
                                options={pool.map(p => {
                                    const stockVal = parseFloat(p.current_quantity) || 0;
                                    return { 
                                        value: p.name, 
                                        label: p.name,
                                        isDisabled: stockVal <= 0
                                    };
                                })}
                                placeholder="Select Name"
                                className="rounded-lg h-[40px] shadow-none"
                                disabled={viewOnly}
                            />
                        ) : (
                            <input type="text" placeholder="Select Type First" disabled className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 h-[40px]" />
                        )}
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Qty</label>
                        <input 
                            type="number" 
                            placeholder="0" 
                            value={item.qty} 
                            onChange={(e) => {
                                let val = parseFloat(e.target.value);
                                if (isNaN(val)) {
                                    handleUpdateItem(item.id, "qty", "");
                                } else {
                                    if (val > stock) {
                                        val = stock;
                                        dispatch(showToast({ message: `Quantity cannot exceed current stock (${stock}).`, type: "warning" }));
                                    }
                                    handleUpdateItem(item.id, "qty", val);
                                }
                            }}
                            max={stock}
                            className={commonInputClass} 
                            disabled={viewOnly} 
                        />
                        {item.name && (
                            <span className="text-[10px] font-bold text-[#10B981] mt-1.5 block tracking-tight">
                                Current Stock: {stock}
                            </span>
                        )}
                    </div>
                    <div className="col-span-2">
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-gray-600 block tracking-tight">Rate</label>
                            {hasRateWarning && (
                                <span className="text-[9px] font-bold text-red-500 animate-pulse bg-red-50 px-1 rounded">Below Cost!</span>
                            )}
                        </div>
                        <input 
                            type="number" 
                            placeholder="0.00" 
                            value={item.cost} 
                            onChange={(e) => handleUpdateItem(item.id, "cost", e.target.value)} 
                            className={`${commonInputClass} ${hasRateWarning ? 'border-red-300 focus:ring-red-400 focus:border-red-400 text-red-600 bg-red-50/10' : ''}`}
                            disabled={viewOnly}
                        />
                        {item.name && (
                            <span className="text-[10px] font-bold text-gray-400 mt-1.5 block tracking-tight">
                                Prod. Cost: ₹{productionCost.toFixed(2)}
                            </span>
                        )}
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Tax (%)</label>
                        <input 
                            type="number" 
                            placeholder="0" 
                            value={item.taxPercentage} 
                            onChange={(e) => {
                                const rateVal = e.target.value;
                                const matchedTax = findTaxCodeByRate(rateVal, taxes);
                                handleUpdateItem(item.id, {
                                    taxPercentage: rateVal,
                                    tax_id: matchedTax ? matchedTax.id : null
                                });
                            }}
                            className={commonInputClass} 
                            disabled={viewOnly} 
                        />
                    </div>
                </div>
            )
        }
        else if (item.type === "Machinery") {
            return (
                <div className="grid grid-cols-10 gap-4 min-w-[900px] md:min-w-full">
                    <div className="col-span-6">
                        <label className={commonLabelClass}>Description</label>
                        <input type="text" placeholder="Machinery details" value={item.description} onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Qty</label>
                        <input type="number" placeholder="0" value={item.qty} onChange={(e) => handleUpdateItem(item.id, "qty", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Rate</label>
                        <input type="number" placeholder="0.00" value={item.rate} onChange={(e) => handleUpdateItem(item.id, "rate", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                </div>
            )
        }
        else if (item.type === "Minutes") {
            return (
                <div className="grid grid-cols-10 gap-4 min-w-[900px] md:min-w-full">
                    <div className="col-span-6">
                        <label className={commonLabelClass}>Description</label>
                        <input type="text" placeholder="Task description" value={item.description} onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Minutes</label>
                        <input type="number" placeholder="0" value={item.minutes} onChange={(e) => handleUpdateItem(item.id, "minutes", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Rate</label>
                        <input type="number" placeholder="0.00" value={item.rate} onChange={(e) => handleUpdateItem(item.id, "rate", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                </div>
            )
        }
        else if (item.type === "Mileage") {
            return (
                <div className="grid grid-cols-10 gap-4 min-w-[900px] md:min-w-full">
                    <div className="col-span-6">
                        <label className={commonLabelClass}>Description</label>
                        <input type="text" placeholder="Travel details" value={item.description} onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Distance (km)</label>
                        <input type="number" placeholder="0" value={item.distance} onChange={(e) => handleUpdateItem(item.id, "distance", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Rate</label>
                        <input type="number" placeholder="0.00" value={item.rate} onChange={(e) => handleUpdateItem(item.id, "rate", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                </div>
            )
        }
        else if (item.type === "Measurement") {
            return (
                <div className="grid grid-cols-10 gap-4 min-w-[900px] md:min-w-full">
                    <div className="col-span-3">
                        <label className={commonLabelClass}>Type</label>
                        <CustomSelect
                            value={item.materialType}
                            onChange={(val) => handleUpdateItem(item.id, "materialType", val)}
                            options={[
                                { value: "heating", label: "Heating" },
                                { value: "cooling", label: "Cooling" },
                                { value: "electricity", label: "Electricity" },
                                { value: "water", label: "Water" },
                                { value: "fuel", label: "Fuel" },
                                { value: "consumables", label: "Consumables" },
                            ]}
                            placeholder="Select Type"
                            className="rounded-lg h-[40px] shadow-none"
                            disabled={viewOnly}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className={commonLabelClass}>Unit</label>
                        <input type="text" placeholder="e.g. kWh/Liters" value={item.unit} onChange={(e) => handleUpdateItem(item.id, "unit", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Qty</label>
                        <input type="number" placeholder="0" value={item.qty} onChange={(e) => handleUpdateItem(item.id, "qty", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Rate</label>
                        <input type="number" placeholder="0.00" value={item.rate} onChange={(e) => handleUpdateItem(item.id, "rate", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                </div>
            )
        }
        else if (item.type === "Milieu") {
            return (
                <div className="grid grid-cols-10 gap-4 min-w-[900px] md:min-w-full">
                    <div className="col-span-3">
                        <label className={commonLabelClass}>Category</label>
                        <CustomSelect
                            value={item.category}
                            onChange={(val) => handleUpdateItem(item.id, "category", val)}
                            options={[
                                { value: "carbon credits", label: "Carbon Credits" },
                                { value: "sustainability", label: "Sustainability" },
                                { value: "workplace safety", label: "Workplace Safety" },
                            ]}
                            placeholder="Select Category"
                            className="rounded-lg h-[40px] shadow-none"
                            disabled={viewOnly}
                        />
                    </div>
                    <div className="col-span-5">
                        <label className={commonLabelClass}>Description</label>
                        <input type="text" placeholder="Compliance or Offset description" value={item.description} onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Rate</label>
                        <input type="number" placeholder="0.00" value={item.rate} onChange={(e) => handleUpdateItem(item.id, "rate", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                </div>
            )
        }
        else if (item.type === "Middlemen") {
            return (
                <div className="grid grid-cols-10 gap-4 min-w-[900px] md:min-w-full">
                    <div className="col-span-6">
                        <label className={commonLabelClass}>Description</label>
                        <input type="text" placeholder="Details" value={item.description} onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Qty</label>
                        <input type="number" placeholder="0" value={item.qty} onChange={(e) => handleUpdateItem(item.id, "qty", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Rate</label>
                        <input type="number" placeholder="0.00" value={item.rate} onChange={(e) => handleUpdateItem(item.id, "rate", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                </div>
            )
        }
        else {
            return (
                <div className="grid grid-cols-10 gap-4 min-w-[900px] md:min-w-full">
                    <div className="col-span-8">
                        <label className={commonLabelClass}>Description</label>
                        <input type="text" placeholder="Details" value={item.description} onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                    <div className="col-span-2">
                        <label className={commonLabelClass}>Amount</label>
                        <input type="number" placeholder="0.00" value={item.amount} onChange={(e) => handleUpdateItem(item.id, "amount", e.target.value)} className={commonInputClass} disabled={viewOnly} />
                    </div>
                </div>
            )
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95dvh] overflow-y-auto relative custom-scrollbar">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between px-8 py-6 border-b border-gray-100 bg-white gap-4 no-print">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-poppins">
                            {viewOnly ? "View Estimation" : "Configure Estimate"}
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">
                            {viewOnly ? "View details of your estimation" : "Setup estimation details and items"}
                        </p>
                    </div>
                    <div className="px-2 py-1 bg-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider rounded-md shrink-0">
                        {(!editData || hasChanges) ? "Not Saved" : "SAVED"}
                    </div>
                </div>

                <div className="p-8 bg-white">
                    <div className="space-y-12 pb-10">
                        {/* Details Section */}
                        <section>
                            <h3 className="text-[14px] font-bold text-gray-900 mb-6 font-poppins uppercase tracking-wide">Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-x-8 gap-y-6">
                                <div className="md:col-span-3">
                                    <label className="text-[13px] font-bold text-gray-800 mb-2 block">Estimation Name</label>
                                    <input
                                        type="text"
                                        value={formData.estimationName}
                                        onChange={(e) => setFormData({ ...formData, estimationName: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm bg-gray-50/20 focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 transition-all placeholder:text-gray-300 h-[48px]"
                                        placeholder="Enter Estimate Name"
                                        disabled={viewOnly}
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-[13px] font-bold text-gray-800 mb-2 block">Estimation Number Series</label>
                                    <input
                                        type="text"
                                        value={formData.estimationNumber}
                                        readOnly
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed font-medium h-[48px]"
                                        placeholder="EST"
                                    />
                                </div>

                                <div className="md:col-span-3">
                                    <label className="text-[13px] font-bold text-gray-800 mb-2 block">Quote Date</label>
                                    <div className="relative group">
                                        <input
                                            type="date"
                                            value={formData.quoteDate}
                                            onChange={(e) => setFormData({ ...formData, quoteDate: e.target.value })}
                                            className={`w-full px-4 py-3 border border-gray-200 rounded-lg text-sm bg-gray-50/20 focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all cursor-pointer h-[48px] ${!formData.quoteDate ? "text-gray-400" : "text-gray-900"}`}
                                            disabled={viewOnly}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-3">
                                    <label className="text-[13px] font-bold text-gray-800 mb-2 block">Expiry Date</label>
                                    <div className="relative group">
                                        <input
                                            type="date"
                                            value={formData.expiryDate}
                                            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                            className={`w-full px-4 py-3 border border-gray-200 rounded-lg text-sm bg-gray-50/20 focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all cursor-pointer h-[48px] ${!formData.expiryDate ? "text-gray-400" : "text-gray-900"}`}
                                            disabled={viewOnly}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Estimation Parameters */}
                        <section>
                            <div className="flex flex-wrap items-center justify-between mb-8 pb-4 border-b border-gray-50 gap-4">
                                <h3 className="text-[14px] font-bold text-gray-900 font-poppins uppercase tracking-wide">Estimation Parameters</h3>
                                {!viewOnly && (
                                    <div className="relative" ref={menuRef}>
                                        <button
                                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                                            className="px-3 py-1.5 bg-[#FFCA00]/10 text-[#B8940A] border border-[#FFCA00]/20 rounded-lg text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#FFCA00]/20 transition-all"
                                        >
                                            <FiPlus size={14} className="text-[#B8940A]" /> Add Item
                                        </button>
                                        {isMenuOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-2 max-h-72 overflow-y-auto ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                                                {itemTypes.map((type) => (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => {
                                                            handleAddItem(type.id);
                                                            setIsMenuOpen(false);
                                                        }}
                                                        className="w-full text-left px-5 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-[13px] text-gray-700 font-medium transition-colors"
                                                    >
                                                        <type.icon size={16} className="text-gray-400" />
                                                        {type.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                {formData.items.map((item) => (
                                    <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all relative">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-2 text-gray-900">
                                                {itemTypes.find(t => t.id === item.type)?.icon({ size: 16, className: "text-gray-400" })}
                                                <span className="text-[14px] font-bold tracking-tight">{item.type}</span>
                                            </div>
                                            {!viewOnly && (
                                                <button onClick={() => handleRemoveItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                    <FiTrash2 size={16} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="overflow-x-auto pb-4">
                                            <div className="flex items-start gap-8 min-w-[1050px] md:min-w-full">
                                                <div className="flex-1">
                                                    {renderItemFields(item)}
                                                </div>
                                                <div className="min-w-[120px] text-right pt-6 shrink-0">
                                                    <span className="text-[16px] font-bold text-gray-900">₹ {(parseFloat(item.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {formData.items.length === 0 && (
                                    <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                                        <p className="text-[13px] text-gray-400 font-medium">Add parameters to calculate your estimate</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-end mt-12 space-y-4 pr-4">
                                <div className="flex items-center justify-between w-full max-w-[240px] text-gray-600">
                                    <span className="text-[13px] font-medium">Subtotal:</span>
                                    <span className="text-[14px] font-bold text-gray-900">₹ {calculateSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex items-center justify-between w-full max-w-[240px] text-gray-600">
                                    <span className="text-[13px] font-medium">Tax:</span>
                                    <span className="text-[14px] font-bold text-gray-900">₹ {calculateTaxTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex items-center justify-between w-full max-w-[240px] pt-4 mt-2 border-t border-gray-100">
                                    <span className="text-[14px] font-bold text-gray-900">Total (INR):</span>
                                    <span className="text-[18px] font-bold text-[#10B981]">₹ {calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </section>

                        {/* References Section */}
                        <section className="pt-12 border-t border-gray-50 mt-10 md:mt-0">
                            <h3 className="text-[16px] font-bold text-[#1e293b] mb-6 font-poppins">References</h3>
                            <div className="space-y-6">
                                <div className="w-full">
                                    <label className="text-[13px] font-bold text-gray-500 mb-2 block font-poppins">Notes</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full h-32 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 placeholder:text-gray-300 resize-none transition-all shadow-sm"
                                        placeholder="Enter Notes"
                                        disabled={viewOnly}
                                    ></textarea>
                                </div>
                                <div className="w-full">
                                    <label className="text-[13px] font-bold text-gray-500 mb-2 block font-poppins">Attachment</label>
                                    <AttachmentUploader
                                        context="estimation"
                                        existingUrl={formData.attachment}
                                        onUploaded={(url) => setFormData(prev => ({ ...prev, attachment: url }))}
                                        disabled={viewOnly}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
                <div className="p-6 md:px-12 md:py-6 border-t border-gray-200 flex flex-wrap justify-end items-center bg-gray-50/10 rounded-b-lg gap-4 no-print">
                    <button 
                        onClick={handleClose} 
                        className="px-6 py-2.5 text-[14px] font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>

                    {!viewOnly && (
                        <button
                            type="button"
                            onClick={() => handleSave()}
                            disabled={isSaving || (!hasChanges && editData)}
                            className="px-6 py-2.5 bg-[#FFCA00] text-white hover:bg-[#d9ac00] text-[14px] font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                            {isSaving ? <FiLoader className="animate-spin" /> : null} Save
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesEstimationForm;
