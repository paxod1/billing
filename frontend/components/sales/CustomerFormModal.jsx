"use client";

import React, { useState, useEffect } from "react";
import { IoClose } from "react-icons/io5";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { partyService } from "@/services/partyService";
import CustomSelect from "@/components/common/CustomSelect";


const CustomerFormModal = ({ isOpen, onClose, onSave, customerData, isSaving, leafAccounts }) => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        name: customerData?.name || "",
        role: customerData?.role || "CUSTOMER",
        email: customerData?.email || "",
        phone: customerData?.phone || "",
        address: customerData?.address || "",
        currency: customerData?.currency || "INR",
        gstRegistration: customerData?.gstRegistration || "Registered Regular",
        gstin: customerData?.gstin || "",
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (customerData) {
            setFormData({
                name: customerData.name || "",
                role: customerData.role || "CUSTOMER",
                email: customerData.email || "",
                phone: customerData.phone || "",
                address: customerData.address || "",
                currency: customerData.currency || "INR",
                gstRegistration: customerData.gstRegistration || "Registered Regular",
                gstin: customerData.gstin || "",
            });
        } else {
            setFormData({
                name: "",
                role: "CUSTOMER",
                email: "",
                phone: "",
                address: "",
                currency: "INR",
                gstRegistration: "Registered Regular",
                gstin: "",
            });
        }
    }, [customerData, isOpen]);

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        if (field === "phone") {
            value = value.replace(/\D/g, "");
        }
        setFormData(prev => {
            const newState = { ...prev, [field]: value };
            if (field === "gstRegistration" && value === "Unregistered") {
                newState.gstin = "";
            }
            return newState;
        });
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            dispatch(showToast({ message: "Please enter customer name", type: "error" }));
            return;
        }
        if (!formData.email.trim()) {
            dispatch(showToast({ message: "Please enter email", type: "error" }));
            return;
        }

        setLoading(true);
        try {
            const apiData = {
                name: formData.name,
                role: "CUSTOMER",
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                currency: formData.currency,
                gst_reg: formData.gstRegistration,
                gstin_no: formData.gstin,
                ...(formData.defaultAccount && { leaf_account_id: formData.defaultAccount }),
            };

            let response;
            if (customerData?.id) {
                response = await partyService.updateParty(customerData.id, apiData);
                dispatch(showToast({ message: "Customer updated successfully", type: "success" }));
            } else {
                response = await partyService.createParty(apiData);
                dispatch(showToast({ message: "Customer created successfully", type: "success" }));
            }

            if (onSave) {
                onSave(response);
            }
            onClose();
            dispatch(showToast({ message: errorMessage, type: "error" }));
        } finally {
            setLoading(false);
        }
    };

    const isEditMode = !!customerData;

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200">
                <div className="p-6 sm:p-10">
                    <div className="mb-6 border-b pb-4 pr-10">
                        <h2 className="text-xl sm:text-[24px] font-bold text-gray-900">{isEditMode ? "Edit Customer" : "Add New Customer"}</h2>
                        <p className="text-gray-500 text-xs sm:text-[14px] mt-1">Setup customer details and accounts</p>
                    </div>

                    <div className="pt-2">
                        {/* Customer Details Section */}
                        <div className="mb-8">
                            <h3 className="text-[16px] font-bold text-gray-900 mb-4 uppercase tracking-wider">Customer Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                        className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        placeholder="Enter Customer Name"
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleChange("email", e.target.value)}
                                        className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        placeholder="Enter Customer Email"
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Phone</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => handleChange("phone", e.target.value)}
                                        className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        placeholder="Enter Customer Phone Number"
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="flex flex-col gap-2 sm:col-span-2">
                                    <label className="text-[13px] font-medium text-gray-700">Address</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => handleChange("address", e.target.value)}
                                        className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400"
                                        placeholder="Enter Customer Address"
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Billing Details Section */}
                        <div>
                            <h3 className="text-[16px] font-bold text-gray-900 mb-4 uppercase tracking-wider">Billing Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">

                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">Currency</label>
                                    <CustomSelect
                                        value={formData.currency}
                                        onChange={(val) => handleChange("currency", val)}
                                        options={[
                                            { value: "INR", label: "INR" },
                                            { value: "USD", label: "USD" },
                                        ]}
                                        disabled={isSaving}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">GST Registration</label>
                                    <CustomSelect
                                        value={formData.gstRegistration}
                                        onChange={(val) => handleChange("gstRegistration", val)}
                                        options={[
                                            { value: "Registered Regular", label: "Registered Regular" },
                                            { value: "Unregistered", label: "Unregistered" },
                                        ]}
                                        disabled={isSaving}
                                    />
                                </div>
                                 {formData.gstRegistration !== "Unregistered" && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[13px] font-medium text-gray-700">GSTIN No</label>
                                        <input
                                            type="text"
                                            value={formData.gstin}
                                            onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())}
                                            className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FFCA00] focus:border-transparent transition-all text-[14px] placeholder-gray-400 uppercase"
                                            placeholder="Enter GSTIN No"
                                            maxLength={15}
                                            disabled={isSaving}
                                        />
                                        <span className="text-[11px] text-gray-500">Max 15 characters</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 mt-10 pt-6 border-t">
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto px-6 py-2.5 text-[14px] font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
                            disabled={loading || isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="w-full sm:w-auto px-10 py-3 bg-[#FFCA00] text-white rounded-lg text-[15px] font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d9ac00]"
                            disabled={loading || isSaving}
                        >
                            {(loading || isSaving) ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Customer" : "Create Customer")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerFormModal;
