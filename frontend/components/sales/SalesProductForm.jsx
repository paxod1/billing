"use client";

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { inventoryService } from "@/services/inventoryService";
import { IoClose } from "react-icons/io5";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import CustomSelect from "@/components/common/CustomSelect";

const SalesProductForm = ({ isOpen, onClose, onSave, itemData, isSaving, rawMaterials = [], taxes = [], onRestockRawMaterial, restockSuccessCount, forceRestock = false }) => {
    const dispatch = useDispatch();

    const [formData, setFormData] = useState({
        name: "",
        item_code: "",
        unit: "",
        quantity: 0,
        selling_price: 0,
        description: "",
        min_order_quantity: 1,
        composition: [],
        tax: "",
        enableRestock: false,
        restock_quantity: ""
    });

    const [allRawMaterials, setAllRawMaterials] = useState([]);
    const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

    useEffect(() => {
        if (rawMaterials && rawMaterials.length > 0) {
            setAllRawMaterials(rawMaterials);
        }
    }, [rawMaterials]);

    useEffect(() => {
        if (isOpen) {
            fetchAllMaterials();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && restockSuccessCount > 0) {
            fetchAllMaterials();
        }
    }, [restockSuccessCount, isOpen]);

    const fetchAllMaterials = async () => {
        setIsLoadingMaterials(true);
        try {
            const response = await inventoryService.getRawMaterials();
            setAllRawMaterials(response.data || []);
        } catch (error) {
            console.error("Failed to fetch raw materials:", error);
            dispatch(showToast({ message: "Failed to load raw materials", type: "error" }));
        } finally {
            setIsLoadingMaterials(false);
        }
    };

    useEffect(() => {
        if (isOpen && !itemData) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const day = String(now.getDate()).padStart(2, "0");
            const hours = String(now.getHours()).padStart(2, "0");
            const minutes = String(now.getMinutes()).padStart(2, "0");
            const seconds = String(now.getSeconds()).padStart(2, "0");
            const ms = String(now.getMilliseconds()).padStart(3, "0");
            const uniqueCode = `PROD-${year}${month}${day}${hours}${minutes}${seconds}${ms}`;
            setFormData({
                name: "",
                item_code: uniqueCode,
                unit: "",
                quantity: 0,
                selling_price: 0,
                description: "",
                min_order_quantity: 1,
                composition: [],
                tax: "",
                enableRestock: forceRestock ? true : false,
                restock_quantity: ""
            });
        }
    }, [isOpen, itemData, forceRestock]);

    useEffect(() => {
        if (itemData) {
            setFormData({
                name: itemData.name || "",
                item_code: itemData.item_code || "",
                unit: itemData.unit || "",
                quantity: parseFloat(itemData.quantity) || 0,
                selling_price: parseFloat(itemData.selling_price) || 0,
                description: itemData.description || "",
                min_order_quantity: itemData.min_order_quantity || 1,
                composition: itemData.composition || [],
                tax: itemData.tax || "",
                enableRestock: false,
                restock_quantity: ""
            });
        }
    }, [itemData, isOpen]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddCompositionItem = () => {
        setFormData(prev => ({
            ...prev,
            composition: [...prev.composition, { raw_material_id: "", quantity: 1, cost_per_unit: 0 }]
        }));
    };

    const handleUpdateCompositionItem = (index, field, value) => {
        const newComposition = [...formData.composition];
        newComposition[index] = { ...newComposition[index], [field]: value };

        if (field === "raw_material_id") {
            const selectedMaterial = allRawMaterials.find(rm => rm.id.toString() === value.toString());
            if (selectedMaterial) {
                newComposition[index].cost_per_unit = selectedMaterial.unit_price;
            }
        }

        setFormData(prev => ({ ...prev, composition: newComposition }));
    };

    const handleRemoveCompositionItem = (index) => {
        const newComposition = [...formData.composition];
        newComposition.splice(index, 1);
        setFormData(prev => ({ ...prev, composition: newComposition }));
    };

    const calculateTotalCost = () => {
        return formData.composition.reduce((sum, item) => {
            const material = allRawMaterials.find(rm => rm.id.toString() === item.raw_material_id?.toString());
            const taxPct = 0;
            const baseCost = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost_per_unit) || 0);
            return sum + (baseCost * (1 + taxPct / 100));
        }, 0);
    };

    const handleSubmit = () => {
        if (!formData.name.trim()) {
            dispatch(showToast({ message: "Please enter product name", type: "error" }));
            return;
        }
        if (!formData.unit) {
            dispatch(showToast({ message: "Please select unit", type: "error" }));
            return;
        }

        if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
            dispatch(showToast({ message: "Please enter a valid selling price", type: "error" }));
            return;
        }
        if (!formData.tax) {
            dispatch(showToast({ message: "Please select a tax template", type: "error" }));
            return;
        }

        const totalCost = calculateTotalCost();
        if (parseFloat(formData.selling_price) < totalCost) {
            dispatch(showToast({ 
                message: `Selling price (₹${formData.selling_price}) cannot be less than the production cost (₹${totalCost.toFixed(2)}).`, 
                type: "error" 
            }));
            return;
        }

        // ✅ Composition validation — at least one component required
        if (formData.composition.length === 0) {
            dispatch(showToast({ message: "Please add at least one composition (raw material) for this product", type: "error" }));
            return;
        }
        const hasEmptyMaterial = formData.composition.some(item => !item.raw_material_id || item.raw_material_id === "");
        if (hasEmptyMaterial) {
            dispatch(showToast({ message: "Please select a raw material for each composition row", type: "error" }));
            return;
        }
        const hasInvalidQty = formData.composition.some(item => !parseFloat(item.quantity) || parseFloat(item.quantity) <= 0);
        if (hasInvalidQty) {
            dispatch(showToast({ message: "Please enter a valid quantity (greater than 0) for each composition row", type: "error" }));
            return;
        }

        // Stock validation for composition - only on creation (when itemData is not present)
        if (!itemData) {
            const isRestockEnabled = forceRestock || formData.enableRestock;
            const multiplier = isRestockEnabled ? (parseFloat(formData.restock_quantity) || 0) : 1;
            if (isRestockEnabled) {
                const restockQty = parseFloat(formData.restock_quantity) || 0;
                if (restockQty <= 0) {
                    dispatch(showToast({ message: "Please enter a valid restocking quantity (greater than 0)", type: "error" }));
                    return;
                }
            }

            for (const item of formData.composition) {
                const material = allRawMaterials.find(rm => rm.id.toString() === item.raw_material_id?.toString());
                if (material) {
                    const stock = parseFloat(material.quantity || material.current_quantity || 0);
                    const requested = (parseFloat(item.quantity) || 0) * multiplier;
                    if (requested > stock) {
                        dispatch(showToast({
                            message: `Insufficient stock for ${material.name}. Available: ${stock} ${material.unit || ''}. Solution: Please restock or adjust composition.`,
                            type: "error"
                        }));
                        return;
                    }
                }
            }
        }

        const apiPayload = {
            ...formData,
            quantity: parseFloat(formData.quantity) || 0,
            selling_price: parseFloat(formData.selling_price) || 0,
            min_order_quantity: parseInt(formData.min_order_quantity) || 1,
            cost_price: calculateTotalCost(),
            composition: formData.composition.map(c => ({
                ...c,
                tax_percent: 0,
                tax_percentage: 0
            })),
            enableRestock: forceRestock || formData.enableRestock,
            restock_quantity: parseFloat(formData.restock_quantity) || 0
        };

        onSave(apiPayload);
    };

    const calculateTotalPriceInclTax = () => {
        const sellingPrice = parseFloat(formData.selling_price) || 0;
        if (!formData.tax) return sellingPrice;

        const selectedTax = taxes.find(t => t.id.toString() === formData.tax?.toString());
        if (!selectedTax || !selectedTax.tax_rates) return sellingPrice;

        const totalTaxPercent = Object.values(selectedTax.tax_rates).reduce((sum, rate) => sum + (parseFloat(rate) || 0), 0);
        const taxAmount = (sellingPrice * totalTaxPercent) / 100;
        return sellingPrice + taxAmount;
    };

    if (!isOpen) return null;

    const isEditMode = !!itemData;
    const totalCost = calculateTotalCost();
    const totalPriceInclTax = calculateTotalPriceInclTax();

    const getInsufficientMaterials = () => {
        const qty = parseFloat(formData.restock_quantity) || 0;
        if (qty <= 0) return [];
        const insufficient = [];
        for (const item of formData.composition) {
            const material = allRawMaterials.find(rm => rm.id.toString() === item.raw_material_id?.toString());
            if (material) {
                const stock = parseFloat(material.quantity || material.current_quantity || 0);
                const required = (parseFloat(item.quantity) || 0) * qty;
                if (required > stock) {
                    insufficient.push({
                        id: material.id,
                        material: material,
                        name: material.name,
                        available: stock,
                        required: required,
                        unit: material.unit || ""
                    });
                }
            }
        }
        return insufficient;
    };

    const insufficientMaterials = getInsufficientMaterials();

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200">
                <div className="p-6 sm:p-10">
                    <div className="mb-6 border-b pb-4 pr-10">
                        <h2 className="text-xl sm:text-[28px] font-bold text-gray-900">{isEditMode ? "Edit Product" : "Add Product"}</h2>
                        <p className="text-gray-500 text-xs sm:text-[14px] mt-1">Setup item details and accounts</p>
                    </div>

                    <div className="pt-2">
                        {/* Item Details Section */}
                        <div className="mb-8">
                            <h3 className="text-[16px] font-bold text-gray-900 mb-6 font-mono uppercase tracking-wide">Product Details</h3>
                            <div className="grid grid-cols-12 gap-6 mb-6">
                                <div className="flex flex-col gap-2 col-span-12 md:col-span-4">
                                    <label className="text-[13px] font-medium text-gray-700">Product Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter Product Name"
                                        value={formData.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                        className="px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="flex flex-col gap-2 col-span-12 md:col-span-4">
                                    <label className="text-[13px] font-medium text-gray-700">Product Code</label>
                                    <input
                                        type="text"
                                        placeholder="Enter Product Code"
                                        value={formData.item_code}
                                        onChange={(e) => handleChange("item_code", e.target.value)}
                                        className="px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="flex flex-col gap-2 col-span-12 md:col-span-4">
                                    <label className="text-[13px] font-medium text-gray-700">Unit</label>
                                    <CustomSelect
                                        value={formData.unit}
                                        onChange={(val) => handleChange("unit", val)}
                                        options={[
                                            { value: "Unit", label: "Unit" },
                                            { value: "Pcs", label: "Pcs" },
                                            { value: "Box", label: "Box" },
                                            { value: "Kg", label: "Kg" },
                                            { value: "Meter", label: "Meter" },
                                        ]}
                                        placeholder="Select"
                                        isDisabled={isSaving}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-6 mb-6">
                                <div className="flex flex-col gap-2 col-span-12 md:col-span-9">
                                    <label className="text-[13px] font-medium text-gray-700">Product Description</label>
                                    <input
                                        type="text"
                                        placeholder="Enter Product Description"
                                        value={formData.description}
                                        onChange={(e) => handleChange("description", e.target.value)}
                                        className="px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="flex flex-col gap-2 col-span-12 md:col-span-3">
                                    <label className="text-[13px] font-medium text-gray-700">Selling Price</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.selling_price}
                                            onChange={(e) => handleChange("selling_price", e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px]"
                                            disabled={isSaving}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-6 mb-6">
                                <div className="flex flex-col gap-2 col-span-12 md:col-span-4">
                                    <label className="text-[13px] font-medium text-gray-700">Tax</label>
                                    <CustomSelect
                                        value={formData.tax}
                                        onChange={(val) => handleChange("tax", val)}
                                        options={taxes.map(t => ({ value: t.id, label: t.name }))}
                                        placeholder="Select"
                                        isDisabled={isSaving}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Composition Section */}
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                <h3 className="text-[16px] font-bold text-gray-900">
                                    Composition (Raw Materials) <span className="text-red-500">*</span>
                                    <span className="ml-2 text-[11px] font-medium text-gray-400 normal-case tracking-normal">min. 1 required</span>
                                </h3>
                                <button
                                    onClick={handleAddCompositionItem}
                                    className="text-sm bg-yellow-50 text-[#FFCA00] px-4 py-1.5 rounded-md font-bold flex items-center gap-1 hover:bg-yellow-100 transition-colors cursor-pointer w-fit"
                                    disabled={isSaving}
                                >
                                    <FiPlus /> Add Material
                                </button>
                            </div>

                            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 overflow-x-auto">
                                <div className="min-w-[750px] space-y-3">
                                    {formData.composition.length === 0 && (
                                        <div className="text-center py-6 border-2 border-dashed border-red-100 rounded-lg bg-red-50/30">
                                            <p className="text-[13px] text-red-400 font-semibold">⚠ At least one raw material composition is required.</p>
                                            <p className="text-[12px] text-gray-400 mt-1">Click &quot;Add Material&quot; above to add a component.</p>
                                        </div>
                                    )}

                                    {formData.composition.map((item, index) => (
                                        <div key={index} className="flex items-start gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="flex-[3]">
                                                <label className="text-[11px] font-semibold text-gray-500 mb-1.5 block uppercase tracking-wider">Raw Material</label>
                                                <div className="relative">
                                                    <CustomSelect
                                                        value={item.raw_material_id}
                                                        onChange={(val) => handleUpdateCompositionItem(index, "raw_material_id", val)}
                                                        options={allRawMaterials
                                                            .filter(rm => !formData.composition.some((comp, idx) => comp.raw_material_id === rm.id && idx !== index))
                                                            .map(rm => ({ value: rm.id, label: `${rm.name} - ₹${rm.unit_price} (Stock: ${rm.quantity || rm.current_quantity || 0})` }))}
                                                        placeholder={isLoadingMaterials ? "Loading materials..." : "Select Material"}
                                                        isDisabled={isSaving || isLoadingMaterials}
                                                    />
                                                </div>
                                                {(() => {
                                                    const material = allRawMaterials.find(rm => rm.id.toString() === item.raw_material_id?.toString());
                                                    if (!material) return null;
                                                    const stockValue = parseFloat(material.quantity || material.current_quantity || 0);
                                                    const restockQty = formData.enableRestock ? (parseFloat(formData.restock_quantity) || 0) : 1;
                                                    const requiredVal = (parseFloat(item.quantity) || 0) * restockQty;
                                                    const isLow = requiredVal > stockValue;
                                                    return (
                                                        <div className="mt-1.5 flex flex-col gap-1.5 px-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className={`text-[10px] font-bold uppercase tracking-tight ${isLow ? 'text-red-500' : 'text-gray-400'}`}>
                                                                    Stock: {stockValue} {material.unit || ''}
                                                                </span>
                                                                {isLow && (
                                                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase animate-pulse">
                                                                        Low Stock
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {isLow && (
                                                                <div className="flex flex-col gap-2 mt-1 border border-red-100 bg-red-50/30 p-2 rounded-lg">
                                                                    <span className="text-red-500 text-[11px] font-medium leading-normal">
                                                                        Insufficient stock for {material.name}. Available: {stockValue} {material.unit || ''}. Required: {requiredVal} {material.unit || ''}.
                                                                    </span>
                                                                    {onRestockRawMaterial && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => onRestockRawMaterial(material, Math.max(0, requiredVal - stockValue))}
                                                                            className="w-fit px-2.5 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded font-bold transition-all cursor-pointer border border-red-200 text-[10px]"
                                                                        >
                                                                            Restock
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex-1 max-w-[120px]">
                                                <label className="text-[11px] font-semibold text-gray-500 mb-1.5 block uppercase tracking-wider text-right">Unit Price</label>
                                                <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[14px] text-gray-700 font-bold text-right">
                                                    ₹ {parseFloat(item.cost_per_unit || 0).toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="flex-1 max-w-[100px]">
                                                <label className="text-[11px] font-semibold text-gray-500 mb-1.5 block uppercase tracking-wider">Qty</label>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateCompositionItem(index, "quantity", e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-50"
                                                    placeholder="1"
                                                    disabled={isSaving}
                                                />
                                            </div>
                                            <div className="flex-1 max-w-[140px]">
                                                <label className="text-[11px] font-semibold text-gray-500 mb-1.5 block uppercase tracking-wider text-right">Ext. Cost</label>
                                                <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[14px] text-gray-700 font-bold text-right">
                                                    ₹ {(() => {
                                                        const material = allRawMaterials.find(rm => rm.id.toString() === item.raw_material_id?.toString());
                                                        const taxPct = 0;
                                                        const baseCost = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost_per_unit) || 0);
                                                        return (baseCost * (1 + taxPct / 100)).toFixed(2).toLocaleString();
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="flex items-center pt-6">
                                                <button
                                                    onClick={() => handleRemoveCompositionItem(index)}
                                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                    disabled={isSaving}
                                                    title="Remove"
                                                >
                                                    <FiTrash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end mt-6 pb-2">
                                <div className="text-right flex items-center gap-4">
                                    <span className="text-[16px] text-gray-900 font-bold">Estimated Total Cost:</span>
                                    <span className="text-[18px] text-[#2D8A6E] font-bold tracking-tight">₹ {totalCost.toFixed(2).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {!isEditMode && !forceRestock && (
                            <div className="grid grid-cols-12 gap-6 mt-6 border-t border-gray-100 pt-6">
                                <div className="col-span-12 flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100 mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-semibold text-gray-900">Restock Product?</span>
                                        <span className="text-[12px] text-gray-500">Enable to produce/restock the product immediately after creation</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleChange("enableRestock", !formData.enableRestock)}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.enableRestock ? "bg-[#FFCA00]" : "bg-gray-200"}`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.enableRestock ? "translate-x-5" : "translate-x-0"}`}
                                        />
                                    </button>
                                </div>
                            </div>
                        )}

                        {!isEditMode && (forceRestock || formData.enableRestock) && (
                            <div className="grid grid-cols-12 gap-6 mt-2 animate-in slide-in-from-top-2 duration-200 pb-4">
                                <div className="flex flex-col gap-2 col-span-12 md:col-span-4">
                                    <label className="text-[13px] font-medium text-gray-700">Quantity to Produce/Restock</label>
                                    <input
                                        type="number"
                                        placeholder="Enter Quantity"
                                        value={formData.restock_quantity}
                                        onChange={(e) => handleChange("restock_quantity", e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all text-[14px] ${
                                            insufficientMaterials.length > 0
                                                ? "border-red-300 focus:ring-red-500"
                                                : "border-gray-200 focus:ring-[#FFCA00]"
                                        }`}
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 mt-10 pt-6 border-t">
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto px-6 py-2.5 text-[14px] font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="w-full sm:w-auto px-10 py-3 bg-[#FFCA00] text-white rounded-lg text-[15px] font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d9ac00]"
                             disabled={isSaving}
                        >
                            {isSaving ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Product" : "Create Product")}
                        </button>
                    </div>
                </div>
            </div>
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all cursor-pointer shadow-sm"
                disabled={isSaving}
            >
                <IoClose size={24} />
            </button>
        </div>
    );
};

export default SalesProductForm;
