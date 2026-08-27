"use client";

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { IoClose } from "react-icons/io5";
import CustomSelect from "@/components/common/CustomSelect";

const ItemFormModal = ({ isOpen, onClose, onSave, itemData, isSaving, leafAccounts, taxCodes, pageCategory = "ALL" }) => {
    const dispatch = useDispatch();
    const defaultCategory = pageCategory === "ALL" ? "SALES" : pageCategory;

    const generateItemCode = () => {
        const d = new Date();
        return `ITM-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
    };

    const [formData, setFormData] = useState({
        name: "",
        item_type: pageCategory === "PURCHASE" ? "PURCHASE" : "PRODUCT",
        item_code: "",
        hsn_sac_code: "",
        unit: "",
        rate: 0,
        description: "",
        tax: "",
        category: defaultCategory
    });

    useEffect(() => {
        if (itemData) {
            setFormData({
                name: itemData.name || "",
                item_type: itemData.item_type || "PRODUCT",
                item_code: itemData.item_code || "",
                hsn_sac_code: itemData.hsn_sac_code || "",
                unit: itemData.unit || "",
                rate: parseFloat(itemData.rate) || 0,
                description: itemData.description || "",
                tax: itemData.tax || "",
                category: itemData.category || defaultCategory
            });
        } else if (isOpen) {
            setFormData({
                name: "",
                item_type: pageCategory === "PURCHASE" ? "PURCHASE" : "PRODUCT",
                item_code: generateItemCode(),
                hsn_sac_code: "",
                unit: "",
                rate: 0,
                description: "",
                tax: "",
                category: defaultCategory
            });
        }
    }, [itemData, isOpen, defaultCategory]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!formData.name.trim()) {
            dispatch(showToast({ message: "Please enter Item Name", type: "error" }));
            return;
        }
        if (!formData.category) {
            dispatch(showToast({ message: "Please select Category", type: "error" }));
            return;
        }
        if (formData.rate === "" || formData.rate === null || formData.rate === undefined) {
            dispatch(showToast({ message: "Please enter Rate", type: "error" }));
            return;
        }
        if (!formData.unit) {
            dispatch(showToast({ message: "Please select Unit", type: "error" }));
            return;
        }
        if (!formData.tax) {
            dispatch(showToast({ message: "Please select Tax", type: "error" }));
            return;
        }


        const apiPayload = {
            name: formData.name,
            item_type: formData.item_type,
            item_code: formData.item_code,
            hsn_sac_code: formData.hsn_sac_code,
            unit: formData.unit,
            rate: parseFloat(formData.rate) || 0,
            description: formData.description,
            category: formData.category,
            tax: formData.tax ? parseInt(formData.tax) : null
        };

        onSave(apiPayload);
    };

    if (!isOpen) return null;

    const isEditMode = !!itemData;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200">
                <div className="p-6 sm:p-10">

                    <div className="mb-6 border-b pb-4 pr-10">
                        <h2 className="text-xl sm:text-[28px] font-bold text-gray-900">{isEditMode ? "Edit Item" : "Add New Item"}</h2>
                        <p className="text-gray-500 text-xs sm:text-[14px] mt-1">Setup item details and accounts</p>
                    </div>

                    <div className="pt-2">
                        {/* Item Details Section */}
                        <div className="mb-4">
                            <h3 className="text-[16px] font-bold text-gray-900 mb-4 uppercase tracking-wider">Item Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Item Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Enter Item Name"
                                        value={formData.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                        className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        disabled={isSaving}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Item Code</label>
                                    <input
                                        type="text"
                                        placeholder="Item Code"
                                        value={formData.item_code}
                                        className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none transition-all text-[14px] text-gray-600"
                                        disabled={true}
                                    />
                                </div>
                                {pageCategory !== 'PURCHASE' && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[13px] font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
                                        <CustomSelect
                                            value={formData.category}
                                            onChange={(val) => handleChange("category", val)}
                                            options={[
                                                ...(pageCategory === "ALL" || pageCategory === "SALES" ? [{ value: "SALES", label: "SALES" }] : []),
                                                ...(pageCategory === "ALL" || pageCategory === "PURCHASE" ? [{ value: "PURCHASE", label: "PURCHASE" }] : [])
                                            ]}
                                            disabled={isSaving}
                                        />
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Rate <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.rate}
                                            onChange={(e) => handleChange("rate", parseFloat(e.target.value))}
                                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px]"
                                            step="0.01"
                                            disabled={isSaving}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Unit <span className="text-red-500">*</span></label>
                                    <CustomSelect
                                        value={formData.unit}
                                        onChange={(val) => handleChange("unit", val)}
                                        options={[
                                            { value: "Pcs", label: "Pcs" },
                                            { value: "Unit", label: "Unit" },
                                            { value: "Meter", label: "Meter" },
                                            { value: "Kg", label: "Kg" },
                                            { value: "Liter", label: "Liter" },
                                            { value: "Box", label: "Box" },
                                        ]}
                                        placeholder="Select Unit"
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Tax <span className="text-red-500">*</span></label>
                                    <CustomSelect
                                        value={formData.tax}
                                        onChange={(val) => handleChange("tax", val)}
                                        options={taxCodes.map(taxItem => ({ value: taxItem.id, label: taxItem.name }))}
                                        placeholder="Select Tax"
                                        disabled={isSaving}
                                    />
                                </div>

                                <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
                                    <label className="text-[13px] font-medium text-gray-700">Item Description</label>
                                    <input
                                        type="text"
                                        placeholder="Enter Item Description"
                                        value={formData.description}
                                        onChange={(e) => handleChange("description", e.target.value)}
                                        className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                        </div>
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
                            className="w-full sm:w-auto px-10 py-3 bg-[#FFCA00] text-white rounded-lg text-[15px] font-bold hover:bg-[#d9ac00] disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSaving}
                        >
                            {isSaving ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Item" : "Create Item")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemFormModal;
