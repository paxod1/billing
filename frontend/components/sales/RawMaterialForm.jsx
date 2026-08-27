"use client";

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { IoClose } from "react-icons/io5";
import { partyService } from "@/services/partyService";
import CustomSelect from "@/components/common/CustomSelect";

const RawMaterialForm = ({ isOpen, onClose, onSave, itemData, isSaving, taxes = [], suppliers = [], hideRestockToggle = false }) => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        name: "",
        quantity: 0,
        unit: "",
        unit_price: 0,
        description: "",
        tax: "",
        enableRestock: false,
        restock_quantity: "",
        restock_supplier_id: "",
        restock_payment_method: "",
        restock_payment_status: "FULLY_PAID",
        restock_payment_amount: "",
    });

    useEffect(() => {
        if (itemData) {
            setFormData({
                name: itemData.name || "",
                quantity: parseFloat(itemData.quantity) || 0,
                unit: itemData.unit || "",
                unit_price: parseFloat(itemData.unit_price) || 0,
                description: itemData.description || "",
                tax: itemData.tax_id || itemData.tax || "",
                enableRestock: false,
                restock_quantity: "",
                restock_supplier_id: "",
                restock_payment_method: "",
                restock_payment_status: "FULLY_PAID",
                restock_payment_amount: "",
            });
        } else if (isOpen && !itemData) {
            setFormData({
                name: "",
                quantity: 0,
                unit: "",
                unit_price: 0,
                description: "",
                tax: "",
                enableRestock: false,
                restock_quantity: "",
                restock_supplier_id: "",
                restock_payment_method: "",
                restock_payment_status: "FULLY_PAID",
                restock_payment_amount: "",
            });
        }
    }, [itemData, isOpen]);

    const handleChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            
            // Calculate total price if quantity or unit price changes
            const restockQty = parseFloat(field === "restock_quantity" ? value : prev.restock_quantity) || 0;
            const unitPriceVal = parseFloat(field === "unit_price" ? value : prev.unit_price) || 0;
            const totalPrice = restockQty * unitPriceVal;

            if (field === "restock_quantity" || field === "unit_price") {
                if (updated.restock_payment_status === "FULLY_PAID") {
                    updated.restock_payment_amount = totalPrice > 0 ? totalPrice.toString() : "";
                } else if (updated.restock_payment_status === "PARTIALLY_PAID") {
                    const currentPaid = parseFloat(prev.restock_payment_amount) || 0;
                    if (currentPaid >= totalPrice) {
                        updated.restock_payment_amount = totalPrice > 0 ? Math.max(0, totalPrice - 1).toString() : "";
                    }
                }
            }

            if (field === "restock_payment_status") {
                if (value === "FULLY_PAID") {
                    updated.restock_payment_amount = totalPrice > 0 ? totalPrice.toString() : "";
                } else if (value === "PARTIALLY_PAID") {
                    updated.restock_payment_amount = totalPrice > 0 ? Math.max(0, totalPrice - 1).toString() : "";
                }
            }

            if (field === "restock_payment_amount") {
                const enteredAmount = parseFloat(value) || 0;
                if (enteredAmount < totalPrice) {
                    updated.restock_payment_status = "PARTIALLY_PAID";
                } else if (enteredAmount >= totalPrice && totalPrice > 0) {
                    updated.restock_payment_status = "FULLY_PAID";
                }
            }

            return updated;
        });
    };

    const handleSubmit = () => {
        if (!formData.name.trim()) {
            dispatch(showToast({ message: "Please enter material name", type: "error" }));
            return;
        }
        if (!formData.tax) {
            dispatch(showToast({ message: "Please select a tax template", type: "error" }));
            return;
        }

        if (!isEditMode && !hideRestockToggle && formData.enableRestock) {
            if (!formData.restock_supplier_id) {
                dispatch(showToast({ message: "Please select a supplier for restocking", type: "error" }));
                return;
            }
            if (!formData.restock_quantity || parseFloat(formData.restock_quantity) <= 0) {
                dispatch(showToast({ message: "Please enter a valid restock quantity", type: "error" }));
                return;
            }
            if (!formData.restock_payment_method) {
                dispatch(showToast({ message: "Please select a payment mode", type: "error" }));
                return;
            }
            const restockQty = parseFloat(formData.restock_quantity) || 0;
            const unitPrice = parseFloat(formData.unit_price) || 0;
            const totalPrice = restockQty * unitPrice;
            const paidAmount = parseFloat(formData.restock_payment_amount) || 0;

            if (formData.restock_payment_status === "PARTIALLY_PAID") {
                if (paidAmount < 1) {
                    dispatch(showToast({ message: "Paid amount must be at least 1", type: "error" }));
                    return;
                }
                if (paidAmount >= totalPrice) {
                    dispatch(showToast({ message: `Partially paid amount must be less than total price (₹${totalPrice.toLocaleString()})`, type: "error" }));
                    return;
                }
            } else if (formData.restock_payment_status === "FULLY_PAID") {
                if (totalPrice > 0 && paidAmount !== totalPrice) {
                    dispatch(showToast({ message: `Fully paid amount must equal total price (₹${totalPrice.toLocaleString()})`, type: "error" }));
                    return;
                }
            }
        }

        const apiPayload = {
            ...formData,
            enableRestock: !isEditMode && !hideRestockToggle && formData.enableRestock,
            quantity: parseFloat(formData.quantity) || 0,
            unit_price: parseFloat(formData.unit_price) || 0,
            last_updated: new Date().toISOString()
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
                        <h2 className="text-xl sm:text-[28px] font-bold text-gray-900">{isEditMode ? "Edit Raw Material" : "Add New Raw Material"}</h2>
                        <p className="text-gray-500 text-xs sm:text-[14px] mt-1">Setup item details and accounts</p>
                    </div>

                    <div className="pt-2">
                        <h3 className="text-[16px] font-bold text-gray-900 mb-6 font-mono uppercase tracking-wide">Item Details</h3>
                        <div className="grid grid-cols-12 gap-4 sm:gap-6">
                            <div className="flex flex-col gap-2 col-span-12 md:col-span-4">
                                <label className="text-[13px] font-medium text-gray-700">Item Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter Item Name"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    className="px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                    disabled={isSaving}
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-2 col-span-12 md:col-span-8">
                                <label className="text-[13px] font-medium text-gray-700">Item Description</label>
                                <input
                                    type="text"
                                    placeholder="Enter Item Description"
                                    value={formData.description}
                                    onChange={(e) => handleChange("description", e.target.value)}
                                    className="px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="flex flex-col gap-2 col-span-12 md:col-span-4">
                                <label className="text-[13px] font-medium text-gray-700">Unit</label>
                                <div className="relative">
                                    <CustomSelect
                                        value={formData.unit}
                                        onChange={(val) => handleChange("unit", val)}
                                        options={[
                                            { value: "Unit", label: "Unit" },
                                            { value: "Kg", label: "Kg" },
                                            { value: "Liter", label: "Liter" },
                                            { value: "Meter", label: "Meter" },
                                            { value: "Box", label: "Box" },
                                            { value: "Pcs", label: "Pcs" },
                                        ]}
                                        placeholder="Select"
                                        isDisabled={isSaving}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 col-span-12 md:col-span-4">
                                <label className="text-[13px] font-medium text-gray-700">Unit Price</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.unit_price}
                                        onChange={(e) => handleChange("unit_price", e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px]"
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
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

                            {!isEditMode && !hideRestockToggle && (
                                <div className="col-span-12 flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100 mt-4 mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-semibold text-gray-900">Restock Material?</span>
                                        <span className="text-[12px] text-gray-500">Enable to add initial stock immediately after creation</span>
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
                            )}

                            {!isEditMode && formData.enableRestock && (
                                <>
                                    {/* Supplier */}
                                    <div className="flex flex-col gap-2 col-span-12 md:col-span-4">
                                        <label className="text-[13px] font-medium text-gray-700">Supplier</label>
                                        <CustomSelect
                                            value={formData.restock_supplier_id}
                                            onChange={(val) => handleChange("restock_supplier_id", val)}
                                            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                            placeholder="Select Supplier"
                                            isDisabled={isSaving}
                                        />
                                    </div>

                                    {/* Quantity */}
                                    <div className="flex flex-col gap-2 col-span-12 md:col-span-4">
                                        <label className="text-[13px] font-medium text-gray-700">Quantity</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                placeholder="Enter quantity to add"
                                                value={formData.restock_quantity}
                                                onChange={(e) => handleChange("restock_quantity", e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px]"
                                                disabled={isSaving}
                                                required
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                                                {formData.unit || "Unit"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Mode */}
                                    <div className="flex flex-col gap-2 col-span-12 md:col-span-4">
                                        <label className="text-[13px] font-medium text-gray-700">Payment Mode</label>
                                        <CustomSelect
                                            value={formData.restock_payment_method}
                                            onChange={(val) => handleChange("restock_payment_method", val)}
                                            options={[
                                                { value: "BANK_TRANSFER", label: "Bank Transfer" },
                                                { value: "UPI", label: "UPI" },
                                                { value: "NEFT", label: "NEFT" },
                                                { value: "CHEQUE", label: "Cheque" },
                                                { value: "CASH", label: "Cash" }
                                            ]}
                                            placeholder="Select Payment Mode"
                                            isDisabled={isSaving}
                                        />
                                    </div>

                                    {/* Payment Status */}
                                    <div className="flex flex-col gap-2 col-span-12 md:col-span-6 mt-2">
                                        <label className="text-[13px] font-medium text-gray-700 mb-1">Payment Status</label>
                                        <div className="flex items-center gap-6 h-[44px]">
                                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                                <div className="relative flex items-center justify-center">
                                                    <input
                                                        type="radio"
                                                        name="restock_payment_status"
                                                        className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-[#FFCA00] transition-all cursor-pointer"
                                                        checked={formData.restock_payment_status === "FULLY_PAID"}
                                                        onChange={() => handleChange("restock_payment_status", "FULLY_PAID")}
                                                        disabled={isSaving}
                                                    />
                                                    <div className="absolute w-2.5 h-2.5 bg-[#FFCA00] rounded-full scale-0 peer-checked:scale-100 transition-transform duration-200"></div>
                                                </div>
                                                <span className="text-[14px] font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Fully Paid</span>
                                            </label>
                                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                                <div className="relative flex items-center justify-center">
                                                    <input
                                                        type="radio"
                                                        name="restock_payment_status"
                                                        className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-[#FFCA00] transition-all cursor-pointer"
                                                        checked={formData.restock_payment_status === "PARTIALLY_PAID"}
                                                        onChange={() => handleChange("restock_payment_status", "PARTIALLY_PAID")}
                                                        disabled={isSaving}
                                                    />
                                                    <div className="absolute w-2.5 h-2.5 bg-[#FFCA00] rounded-full scale-0 peer-checked:scale-100 transition-transform duration-200"></div>
                                                </div>
                                                <span className="text-[14px] font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Partially Paid</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Amount Paid */}
                                    <div className="flex flex-col gap-2 col-span-12 md:col-span-6 relative">
                                        <label className="text-[13px] font-medium text-gray-700">Amount Paid</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">₹</div>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={formData.restock_payment_amount}
                                                onChange={(e) => handleChange("restock_payment_amount", e.target.value)}
                                                className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px]"
                                                disabled={isSaving}
                                                required
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
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

export default RawMaterialForm;
