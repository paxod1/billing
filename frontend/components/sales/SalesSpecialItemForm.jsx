"use client";

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import CustomSelect from "@/components/common/CustomSelect";

const getUserRoleInfo = () => {
    if (typeof window === "undefined") return { isSuperAdmin: false, isAdmin: true };
    try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            const user = JSON.parse(userStr);
            const roleStr = (user?.role || "").toString().toUpperCase().replace(/[\s_]/g, "");
            const isSuperAdmin = user?.isSuperAdmin === true || roleStr === "SUPERADMIN";
            return { isSuperAdmin, isAdmin: !isSuperAdmin, role: user?.role };
        }
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.startsWith("user_data=")) {
                const val = decodeURIComponent(c.substring("user_data=".length));
                const user = JSON.parse(val);
                const roleStr = (user?.role || "").toString().toUpperCase().replace(/[\s_]/g, "");
                const isSuperAdmin = user?.isSuperAdmin === true || roleStr === "SUPERADMIN";
                return { isSuperAdmin, isAdmin: !isSuperAdmin, role: user?.role };
            }
        }
    } catch (e) {
        console.error("Error reading user role:", e);
    }
    return { isSuperAdmin: false, isAdmin: true, role: "ADMIN" };
};

const SalesSpecialItemForm = ({ isOpen, onClose, onSave, itemData, isSaving, taxes = [], suppliers = [], hideRestockToggle = false, forceRestock = false }) => {
    const dispatch = useDispatch();
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    useEffect(() => {
        const { isSuperAdmin: superAdminCheck } = getUserRoleInfo();
        setIsSuperAdmin(superAdminCheck);
    }, [isOpen]);

    const [formData, setFormData] = useState({
        name: "",
        item_code: "",
        unit: "",
        rate: 0,
        production_cost: 0,
        opening_quantity: 0,
        current_quantity: 0,
        description: "",
        category: "Product",
        tax: "",
        enableRestock: false,
        restock_quantity: "",
        restock_supplier_id: "",
        restock_payment_method: "",
        restock_payment_status: "FULLY_PAID",
        restock_payment_amount: "",
    });

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
            const uniqueCode = `CUST-${year}${month}${day}${hours}${minutes}${seconds}${ms}`;
            setFormData({
                name: "",
                item_code: uniqueCode,
                unit: "",
                rate: 0,
                production_cost: 0,
                opening_quantity: 0,
                current_quantity: 0,
                description: "",
                category: "Product",
                tax: "",
                enableRestock: forceRestock ? true : false,
                restock_quantity: "",
                restock_supplier_id: "",
                restock_payment_method: "",
                restock_payment_status: "FULLY_PAID",
                restock_payment_amount: "",
            });
        }
    }, [isOpen, itemData, forceRestock]);

    useEffect(() => {
        if (itemData) {
            setFormData({
                name: itemData.name || "",
                item_code: itemData.item_code || "",
                unit: itemData.unit || "",
                rate: parseFloat(itemData.rate || itemData.selling_price) || 0,
                production_cost: parseFloat(itemData.Production_cost || itemData.production_cost || itemData.cost_price) || 0,
                opening_quantity: parseFloat(itemData.opening_quantity) || 0,
                current_quantity: parseFloat(itemData.current_quantity) || 0,
                description: itemData.description || "",
                category: itemData.category || "Product",
                tax: itemData.tax || "",
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
            
            // Calculate total price if quantity or production cost changes
            const restockQty = parseFloat(field === "restock_quantity" ? value : prev.restock_quantity) || 0;
            const productionCostVal = parseFloat(field === "production_cost" ? value : prev.production_cost) || 0;
            const totalPrice = restockQty * productionCostVal;

            if (field === "restock_quantity" || field === "production_cost") {
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
            dispatch(showToast({ message: "Please enter item name", type: "error" }));
            return;
        }
        if (!formData.unit) {
            dispatch(showToast({ message: "Please select unit", type: "error" }));
            return;
        }
        if (!formData.rate || parseFloat(formData.rate) <= 0) {
            dispatch(showToast({ message: "Please enter a valid selling price", type: "error" }));
            return;
        }
        if (formData.production_cost === "" || formData.production_cost === null || isNaN(formData.production_cost)) {
            dispatch(showToast({ message: "Please enter production cost", type: "error" }));
            return;
        }

        if (!isSuperAdmin && !formData.tax) {
            dispatch(showToast({ message: "Please select a tax template", type: "error" }));
            return;
        }

        if (!isEditMode && (forceRestock || (!hideRestockToggle && formData.enableRestock))) {
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
            const productionCostVal = parseFloat(formData.production_cost) || 0;
            const totalPrice = restockQty * productionCostVal;
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

        const finalPayload = { 
            ...formData,
            enableRestock: !isEditMode && (forceRestock || (!hideRestockToggle && formData.enableRestock))
        };
        if (!isEditMode) {
            // On create, set both current and opening to the opening value
            const qty = parseFloat(formData.opening_quantity) || 0;
            finalPayload.opening_quantity = qty;
            finalPayload.current_quantity = qty;
        } else {
            // On edit, update current quantity, keep opening quantity as is
            finalPayload.current_quantity = parseFloat(formData.current_quantity) || 0;
            // opening_quantity remains what was originally loaded in useEffect
        }

        onSave(finalPayload);
    };

    const calculateTotalPriceInclTax = () => {
        const sellingPrice = parseFloat(formData.rate) || 0;
        if (!formData.tax) return sellingPrice;

        const selectedTax = taxes.find(t => t.id.toString() === formData.tax?.toString());
        if (!selectedTax || !selectedTax.tax_rates) return sellingPrice;

        const totalTaxPercent = Object.values(selectedTax.tax_rates).reduce((sum, rate) => sum + (parseFloat(rate) || 0), 0);
        const taxAmount = (sellingPrice * totalTaxPercent) / 100;
        return sellingPrice + taxAmount;
    };

    if (!isOpen) return null;

    const isEditMode = !!itemData;
    const totalPriceInclTax = calculateTotalPriceInclTax();

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200">
                <div className="p-6 sm:p-10">
                    <div className="mb-6 border-b pb-4 pr-10">
                        <h2 className="text-xl sm:text-[28px] font-bold text-gray-900">{isEditMode ? "Edit Customized Product" : "Add New Customized Product"}</h2>
                        <p className="text-gray-500 text-xs sm:text-[14px] mt-1">Setup item details and accounts</p>
                    </div>

                    <div className="space-y-8">
                        {/* Item Details Section */}
                        <section>
                            <h3 className="text-[16px] font-bold text-gray-900 mb-6 font-mono uppercase tracking-wide">Item Details</h3>
                            <div className="grid grid-cols-12 gap-6 mb-6">
                                <div className="flex flex-col gap-2 col-span-12 md:col-span-4">
                                    <label className="text-[13px] font-medium text-gray-700">Item Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter Item Name"
                                        value={formData.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                        className="px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="flex flex-col gap-2 col-span-12 md:col-span-4">
                                    <label className="text-[13px] font-medium text-gray-700">Item Code</label>
                                    <input
                                        type="text"
                                        placeholder="Enter Item Code"
                                        value={formData.item_code}
                                        className="px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        readOnly
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
                                            { value: "Litre", label: "Litre" },
                                        ]}
                                        placeholder="Select"
                                        isDisabled={isSaving}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-6 mb-6">
                                <div className="flex flex-col gap-2 col-span-12 md:col-span-10">
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
                                <div className="flex flex-col gap-2 col-span-12 md:col-span-2">
                                    <label className="text-[13px] font-medium text-gray-700">
                                        Tax {isSuperAdmin ? <span className="text-gray-400 font-normal text-xs">(Optional)</span> : <span className="text-red-500">*</span>}
                                    </label>
                                    <CustomSelect
                                        value={formData.tax}
                                        onChange={(val) => handleChange("tax", val)}
                                        options={[
                                            ...(isSuperAdmin ? [{ value: "", label: "None" }] : []),
                                            ...taxes.map(t => ({ value: t.id, label: t.name }))
                                        ]}
                                        placeholder="Select"
                                        isDisabled={isSaving}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-6 mb-6">
                                <div className="flex flex-col gap-2 col-span-12 md:col-span-6">
                                    <label className="text-[13px] font-medium text-gray-700">Production Cost</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.production_cost}
                                            onChange={(e) => handleChange("production_cost", e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px]"
                                            disabled={isSaving}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 col-span-12 md:col-span-6">
                                    <label className="text-[13px] font-medium text-gray-700">Selling Price</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.rate}
                                            onChange={(e) => handleChange("rate", e.target.value)}
                                            className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all text-[14px] ${
                                                parseFloat(formData.rate) < parseFloat(formData.production_cost)
                                                    ? "border-red-300 focus:ring-red-500"
                                                    : "border-gray-200 focus:ring-[#FFCA00]"
                                            }`}
                                            disabled={isSaving}
                                        />
                                    </div>
                                    {parseFloat(formData.rate) < parseFloat(formData.production_cost) && (
                                        <span className="text-[11px] text-red-500 mt-1">
                                            Selling Price must be greater than or equal to Production Cost (₹{parseFloat(formData.production_cost || 0).toLocaleString()})
                                        </span>
                                    )}
                                </div>
                            </div>

                            {!isEditMode && !hideRestockToggle && !forceRestock && (
                                <div className="grid grid-cols-12 gap-6 mt-6 border-t border-gray-100 pt-6">
                                    <div className="col-span-12 flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100 mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-[15px] font-semibold text-gray-900">Restock Customized Product?</span>
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
                                </div>
                            )}

                            {!isEditMode && formData.enableRestock && (
                                <div className="grid grid-cols-12 gap-6 mt-2 animate-in slide-in-from-top-2 duration-200">
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
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 mt-12 pt-8 border-t">
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto px-8 py-3 text-[15px] font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="w-full sm:w-auto px-10 py-3 bg-[#FFCA00] text-white rounded-lg text-[15px] font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d9ac00]"
                            disabled={isSaving || parseFloat(formData.rate) < parseFloat(formData.production_cost)}
                        >
                            {isSaving ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update" : "Create")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
;

export default SalesSpecialItemForm;
