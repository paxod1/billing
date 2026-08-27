"use client";

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { partyService } from "@/services/partyService";
import CustomSelect from "@/components/common/CustomSelect";

const SupplierModal = ({ isOpen, onClose, onSave, supplierData = null, isSaving: externalIsSaving = false }) => {
    const dispatch = useDispatch();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        role: "SUPPLIER",
        email: "",
        phone: "",
        address: "",
        defaultAccount: "",
        currency: "INR",
        gstRegistration: "Registered Regular",
        gstin: "",
    });

    useEffect(() => {
        if (supplierData) {
            setFormData({
                name: supplierData.name || "",
                role: "SUPPLIER",
                email: supplierData.email || "",
                phone: supplierData.phone || "",
                address: supplierData.address || "",
                defaultAccount: supplierData.defaultAccount || "",
                currency: supplierData.currency || "INR",
                gstRegistration: supplierData.gstRegistration || "Registered Regular",
                gstin: supplierData.gstin || "",
            });
        } else {
            setFormData({
                name: "",
                role: "SUPPLIER",
                email: "",
                phone: "",
                address: "",
                defaultAccount: "",
                currency: "INR",
                gstRegistration: "Registered Regular",
                gstin: "",
            });
        }
    }, [supplierData, isOpen]);

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        if (field === "phone") {
            value = value.replace(/\D/g, "");
        }
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            dispatch(showToast({ message: "Please enter supplier name", type: "error" }));
            return;
        }

        setIsSaving(true);
        try {
            const apiData = {
                name: formData.name,
                role: "SUPPLIER",
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                currency: formData.currency,
                gst_reg: formData.gstRegistration,
                gstin_no: formData.gstin,
            };

            let response;
            if (supplierData?.id) {
                response = await partyService.updateParty(supplierData.id, apiData);
                dispatch(showToast({ message: "Supplier updated successfully", type: "success" }));
            } else {
                response = await partyService.createParty(apiData);
                dispatch(showToast({ message: "Supplier created successfully", type: "success" }));
            }

            if (onSave) {
                // Return the response so the parent can get the new ID
                onSave(response);
            }
            onClose();
        } catch (error) {
            console.error("Error saving supplier:", error);
            let errorMessage = "Failed to save supplier";
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            dispatch(showToast({ message: errorMessage, type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const isEditMode = !!supplierData?.id;
    const saving = isSaving || externalIsSaving;

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 md:p-10 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                <div className="mb-6">
                    <h2 className="text-[20px] md:text-[24px] font-bold text-gray-900">{isEditMode ? "Edit Supplier" : "Add New Supplier"}</h2>
                    <p className="text-gray-500 text-[13px] md:text-[14px] mt-1">Setup supplier details and accounts</p>
                </div>

                <div className="border-t border-gray-200 pt-6">
                    {/* Supplier Details Section */}
                    <div className="mb-8">
                        <h3 className="text-[16px] font-bold text-gray-900 mb-4">Supplier Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-[14px]"
                                    placeholder="Enter Supplier Name"
                                    disabled={saving}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-[14px]"
                                    placeholder="Enter Supplier Email"
                                    disabled={saving}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-gray-700">Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => handleChange("phone", e.target.value)}
                                    className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-[14px]"
                                    placeholder="Enter Supplier Phone Number"
                                    disabled={saving}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-gray-700">Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => handleChange("address", e.target.value)}
                                    className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-[14px]"
                                    placeholder="Enter Supplier Address"
                                    disabled={saving}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Billing Details Section */}
                    <div>
                        <h3 className="text-[16px] font-bold text-gray-900 mb-4">Billing Details</h3>
                        <div className={`grid grid-cols-1 ${formData.gstRegistration !== "Unregistered" ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-gray-700">Currency</label>
                                <CustomSelect
                                    value={formData.currency}
                                    onChange={(val) => handleChange("currency", val)}
                                    options={[
                                        { value: "INR", label: "INR" },
                                        { value: "USD", label: "USD" },
                                    ]}
                                    isDisabled={saving}
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
                                    isDisabled={saving}
                                />
                            </div>
                            {formData.gstRegistration !== "Unregistered" && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-gray-700">GSTIN No</label>
                                    <div className="flex flex-col gap-1">
                                        <input
                                            type="text"
                                            value={formData.gstin}
                                            onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())}
                                            className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] transition-all text-[14px] uppercase"
                                            placeholder="Enter GSTIN No"
                                            maxLength={15}
                                            disabled={saving}
                                        />
                                        <span className="text-[11px] text-gray-500">Max 15 characters</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row items-center justify-end gap-3 md:gap-4 mt-10">
                    <button
                        onClick={onClose}
                        className="w-full md:w-auto px-6 py-2.5 text-[14px] font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="w-full md:w-auto px-10 py-3 bg-[#FFCA00] text-white rounded-lg text-[15px] font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d9ac00]"
                        disabled={saving}
                    >
                        {saving ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update" : "Create")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SupplierModal;
