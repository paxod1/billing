"use client";

import React, { useState, useEffect } from "react";
import { FiX, FiLoader } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import CustomSelect from "@/components/common/CustomSelect";
import { partyService } from "@/services/partyService";

const RestockModal = ({ isOpen, onClose, onConfirm, item, isSaving, suppliers = [], leafAccounts = [], type }) => {
    const dispatch = useDispatch();

    const unitPrice = item ? parseFloat(
        type === "Raw Materials" ? item.unit_price :
        (item.Production_cost || item.cost_price || item.rate)
    ) || 0 : 0;

    const [formData, setFormData] = useState({
        amount: "",
        supplier_id: "",
        payment_method: "",
        payment_status: "FULLY_PAID",
        paid_amount: "",
        email_to: ""
    });

    const [localSuppliers, setLocalSuppliers] = useState(suppliers);

    useEffect(() => {
        setLocalSuppliers(suppliers);
    }, [suppliers]);

    useEffect(() => {
        if (isOpen && item) {
            const supplierId = item?.supplier_id?.id || item?.supplier_id || "";
            const supplier = localSuppliers.find(s => s.id === supplierId);
            
            const prefilledAmt = item?.prefilledAmount ? parseFloat(item.prefilledAmount) || 0 : 0;
            const initPrice = prefilledAmt * unitPrice;

            setFormData({
                amount: item?.prefilledAmount ? item.prefilledAmount.toString() : "",
                supplier_id: supplierId,
                payment_method: "",
                payment_status: "FULLY_PAID",
                paid_amount: initPrice > 0 ? initPrice.toString() : "",
                email_to: supplier?.email || ""
            });
        }
    }, [isOpen, item, localSuppliers, unitPrice]);

    if (!isOpen || !item) return null;

    const currentStock = parseFloat(item.current_quantity || item.quantity || 0);
    const addedAmount = parseFloat(formData.amount) || 0;
    const newTotal = currentStock + addedAmount;

    const totalPrice = addedAmount * unitPrice;

    const isFormValid = () => {
        if (!formData.amount || parseFloat(formData.amount) <= 0) return false;
        
        if (type !== "Products") {
            if (!formData.supplier_id) return false;
            if (!formData.payment_method) return false;
            if (formData.payment_status === "PARTIALLY_PAID") {
                const paidAmt = parseFloat(formData.paid_amount) || 0;
                if (paidAmt < 1 || paidAmt >= totalPrice) return false;
            } else if (formData.payment_status === "FULLY_PAID") {
                if (totalPrice > 0 && (!formData.paid_amount || parseFloat(formData.paid_amount) !== totalPrice)) return false;
            }
        }
        return true;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isFormValid()) {
            return;
        }

        // Add validation for payment if visible
        if (type !== "Products") {
            const paidAmountNum = parseFloat(formData.paid_amount) || 0;
            if (formData.payment_status === "PARTIALLY_PAID") {
                if (paidAmountNum < 1) {
                    dispatch(showToast({ message: "Paid amount must be at least 1", type: "error" }));
                    return;
                }
                if (paidAmountNum >= totalPrice) {
                    dispatch(showToast({ message: `Partially paid amount must be less than total price (₹${totalPrice.toLocaleString()})`, type: "error" }));
                    return;
                }
            } else if (formData.payment_status === "FULLY_PAID") {
                if (totalPrice > 0 && paidAmountNum !== totalPrice) {
                    dispatch(showToast({ message: `Fully paid amount must equal total price (₹${totalPrice.toLocaleString()})`, type: "error" }));
                    return;
                }
            }
        }

        onConfirm(formData);
    };

    const handleChange = (field, value) => {
        const updates = { [field]: value };
        
        // Auto-populate email when supplier changes
        if (field === "supplier_id") {
            const supplier = localSuppliers.find(s => s.id === value);
            updates.email_to = supplier?.email || "";
        }

        // Handle payment logic
        if (field === "amount") {
            const newAddedAmount = parseFloat(value) || 0;
            const newTotalPrice = newAddedAmount * unitPrice;
            if (formData.payment_status === "FULLY_PAID") {
                updates.paid_amount = newTotalPrice > 0 ? newTotalPrice.toString() : "";
            } else if (formData.payment_status === "PARTIALLY_PAID") {
                const currentPaid = parseFloat(formData.paid_amount) || 0;
                if (currentPaid >= newTotalPrice) {
                    updates.paid_amount = newTotalPrice > 0 ? Math.max(0, newTotalPrice - 1).toString() : "";
                }
            }
        }

        if (field === "paid_amount") {
            const enteredAmount = parseFloat(value) || 0;
            if (enteredAmount < totalPrice) {
                updates.payment_status = "PARTIALLY_PAID";
            } else if (enteredAmount >= totalPrice && totalPrice > 0) {
                updates.payment_status = "FULLY_PAID";
            }
        }

        if (field === "payment_status") {
            if (value === "FULLY_PAID") {
                updates.paid_amount = totalPrice > 0 ? totalPrice.toString() : "";
            } else if (value === "PARTIALLY_PAID") {
                updates.paid_amount = totalPrice > 0 ? Math.max(0, totalPrice - 1).toString() : "";
            }
        }
        
        setFormData(prev => ({
            ...prev,
            ...updates
        }));
    };

    return (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200 max-h-[95dvh] overflow-y-auto">
                {/* Header */}
                <div className="px-10 pt-10 pb-6 bg-white flex items-start justify-between">
                    <div>
                        <h2 className="text-[28px] font-bold text-gray-900 leading-tight">Restock Item</h2>
                        <p className="text-gray-500 text-[15px] mt-1">Update inventory for this item</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 no-print"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                <div className="px-10 pb-4">
                    <div className="w-full h-[1px] bg-gray-100"></div>
                </div>

                <form onSubmit={handleSubmit} className="px-10 pb-10 font-poppins">
                    {/* Summary Card */}
                    <div className="mb-10 p-8 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-[14px]">Current Quantity:</span>
                                <span className="font-bold text-gray-900 text-[15px]">{currentStock.toLocaleString()} {item.unit || "Pcs"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-[14px]">Adding Quantity:</span>
                                <span className="font-bold text-[#FFCA00] text-[15px]">+ {addedAmount.toLocaleString()} {item.unit || "Pcs"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-[14px]">Unit Price:</span>
                                <span className="font-bold text-gray-900 text-[15px]">₹ {unitPrice.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-900 font-bold text-[15px]">Total Price:</span>
                                <span className="font-bold text-gray-900 text-[16px]">₹ {totalPrice.toLocaleString()}</span>
                            </div>
                            <div className="pt-4 mt-2 border-t border-gray-200/60 flex items-center justify-between">
                                <span className="text-gray-900 font-bold text-[15px]">Total New Quantity:</span>
                                <span className="font-bold text-gray-900 text-[18px]">
                                    {newTotal.toLocaleString()} <span className="text-[14px] text-gray-400 font-medium">{item.unit || "Pcs"}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Restock Amount */}
                        <div className="flex flex-col gap-3">
                            <label className="text-[15px] font-semibold text-gray-900">Restock Amount</label>
                            <div className="relative">
                                <input
                                    autoFocus
                                    type="number"
                                    step="any"
                                    value={formData.amount}
                                    onChange={(e) => handleChange("amount", e.target.value)}
                                    placeholder="Enter quantity to add"
                                    className="w-full px-5 py-3.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[15px] placeholder:text-gray-400 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    required
                                />
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                                    {item.unit || "Pcs"}
                                </div>
                            </div>
                        </div>

                        {type !== "Products" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
                                {/* Supplier */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-[15px] font-semibold text-gray-900">Supplier</label>
                                    <CustomSelect
                                        value={formData.supplier_id}
                                        onChange={(val) => handleChange("supplier_id", val)}
                                        placeholder="Select"
                                        options={localSuppliers.map(s => ({ value: s.id, label: s.name }))}
                                    />
                                </div>

                                {/* Payment Mode */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-[15px] font-semibold text-gray-900">Payment Mode</label>
                                    <CustomSelect
                                        value={formData.payment_method}
                                        onChange={(val) => handleChange("payment_method", val)}
                                        placeholder="Select"
                                        options={[
                                            { value: "BANK_TRANSFER", label: "Bank Transfer" },
                                            { value: "UPI", label: "UPI" },
                                            { value: "NEFT", label: "NEFT" },
                                            { value: "CHEQUE", label: "Cheque" },
                                            { value: "CASH", label: "Cash" }
                                        ]}
                                    />
                                </div>
                                
                                {/* Payment Status */}
                                <div className="flex flex-col gap-4">
                                    <label className="text-[15px] font-semibold text-gray-900">Payment Status</label>
                                    <div className="flex items-center gap-6">
                                        <label className="flex items-center gap-2.5 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="radio"
                                                    name="payment_status"
                                                    className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-[#FFCA00] transition-all cursor-pointer"
                                                    checked={formData.payment_status === "FULLY_PAID"}
                                                    onChange={() => handleChange("payment_status", "FULLY_PAID")}
                                                />
                                                <div className="absolute w-2.5 h-2.5 bg-[#FFCA00] rounded-full scale-0 peer-checked:scale-100 transition-transform duration-200 hover:bg-[#d9ac00]"></div>
                                            </div>
                                            <span className="text-[14px] font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Fully Paid</span>
                                        </label>
                                        <label className="flex items-center gap-2.5 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="radio"
                                                    name="payment_status"
                                                    className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-[#FFCA00] transition-all cursor-pointer"
                                                    checked={formData.payment_status === "PARTIALLY_PAID"}
                                                    onChange={() => handleChange("payment_status", "PARTIALLY_PAID")}
                                                />
                                                <div className="absolute w-2.5 h-2.5 bg-[#FFCA00] rounded-full scale-0 peer-checked:scale-100 transition-transform duration-200 hover:bg-[#d9ac00]"></div>
                                            </div>
                                            <span className="text-[14px] font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Partially Paid</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Amount Paid */}
                                <div className="flex flex-col gap-3 relative">
                                    <label className="text-[15px] font-semibold text-gray-900">Amount Paid</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[15px]">₹</div>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.paid_amount}
                                            onChange={(e) => handleChange("paid_amount", e.target.value)}
                                            placeholder="0.00"
                                            className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[15px] placeholder:text-gray-400 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-white text-gray-900 ${parseFloat(formData.paid_amount) > totalPrice ? 'border-red-500' : 'border-gray-200'}`}
                                        />
                                    </div>
                                    {parseFloat(formData.paid_amount) > totalPrice && (
                                        <p className="text-red-500 text-[12px] font-medium absolute -bottom-5 left-0">
                                            Amount cannot exceed total price
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-full h-[1px] bg-gray-100 my-10"></div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-4 mt-8 no-print">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto px-6 py-2.5 text-[14px] font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !isFormValid()}
                            className="w-full sm:w-auto px-10 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-[#d9ac00]"
                        >
                            {isSaving ? (
                                <>
                                    <FiLoader className="animate-spin" size={18} />
                                    <span>Updating...</span>
                                </>
                            ) : (
                                "Update Stock"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RestockModal;

