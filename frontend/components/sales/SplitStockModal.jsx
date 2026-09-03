"use client";

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { showToast } from "@/lib/features/toast/toastSlice";
import { inventoryService } from "@/services/inventoryService";

const SplitStockModal = ({ isOpen, onClose, sourceItem, onSplitSuccess }) => {
    const dispatch = useDispatch();
    const [isSaving, setIsSaving] = useState(false);
    
    const [grades, setGrades] = useState({
        "8 mm": "",
        "7-8 mm": "",
        "7 mm": "",
        "6-7 mm": "",
        "6 mm": "",
        "< 6 mm": ""
    });

    useEffect(() => {
        if (isOpen) {
            setGrades({
                "8 mm": "",
                "7-8 mm": "",
                "7 mm": "",
                "6-7 mm": "",
                "6 mm": "",
                "< 6 mm": ""
            });
        }
    }, [isOpen]);

    const handleChange = (grade, value) => {
        setGrades(prev => ({ ...prev, [grade]: value }));
    };

    const totalSplitWeight = Object.values(grades).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const maxAvailable = parseFloat(sourceItem?.current_quantity || sourceItem?.opening_quantity || 0);

    const handleSplit = async () => {
        if (totalSplitWeight <= 0) {
            dispatch(showToast({ message: "Total split weight must be greater than 0", type: "error" }));
            return;
        }
        if (totalSplitWeight > maxAvailable) {
            dispatch(showToast({ message: `Cannot split more than available stock (${maxAvailable} kg)`, type: "error" }));
            return;
        }

        setIsSaving(true);
        try {
            // First update the source item by decrementing
            const newSourceQty = maxAvailable - totalSplitWeight;
            const sourcePayload = {
                ...sourceItem,
                current_quantity: newSourceQty
            };
            
            await inventoryService.updateCustomizedProduct(sourceItem.id, sourcePayload);

            // Now create or update each target grade
            for (const [grade, weightStr] of Object.entries(grades)) {
                const weight = parseFloat(weightStr) || 0;
                if (weight > 0) {
                    // Try to find if this grade already exists
                    const existingRes = await inventoryService.getCustomizedProducts({ search: grade, limit: 100 });
                    const existing = existingRes?.data?.find(p => p.name.includes(grade));

                    if (existing) {
                        const newTargetQty = parseFloat(existing.current_quantity || existing.opening_quantity || 0) + weight;
                        await inventoryService.updateCustomizedProduct(existing.id, {
                            ...existing,
                            current_quantity: newTargetQty
                        });
                    } else {
                        // Create new
                        const uniqueCode = `GRD-${new Date().getTime().toString().slice(-6)}`;
                        await inventoryService.saveCustomizedProduct({
                            name: `Cardamom - ${grade}`,
                            item_code: uniqueCode,
                            item_type: "CUSTOMISED PRODUCTS",
                            category: "SALES",
                            unit: sourceItem.unit || "Kg",
                            rate: sourceItem.rate || 0,
                            Production_cost: sourceItem.Production_cost || 0,
                            opening_quantity: weight,
                            current_quantity: weight,
                            tax: sourceItem.tax || null
                        });
                    }
                }
            }

            dispatch(showToast({ message: "Stock successfully split into grades!", type: "success" }));
            onSplitSuccess();
            onClose();
        } catch (error) {
            console.error("Split error:", error);
            dispatch(showToast({ message: "Failed to split stock", type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !sourceItem) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-4">Split Stock - {sourceItem.name}</h2>
                    <p className="text-sm text-gray-600 mb-4">Available Stock: <span className="font-bold">{maxAvailable} kg</span></p>

                    <div className="space-y-4">
                        {Object.keys(grades).map(grade => (
                            <div key={grade} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                                <span className="font-medium">{grade}</span>
                                <input 
                                    type="number" 
                                    value={grades[grade]}
                                    onChange={(e) => handleChange(grade, e.target.value)}
                                    placeholder="Enter kg"
                                    className="border p-2 rounded w-1/3 focus:outline-none focus:ring-2 focus:ring-[#FFCA00]"
                                    disabled={isSaving}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex justify-between items-center border-t pt-4">
                        <div className="text-sm">
                            <span className="text-gray-500">Total Allocated: </span>
                            <span className={`font-bold ${totalSplitWeight > maxAvailable ? 'text-red-600' : 'text-green-600'}`}>{totalSplitWeight} kg</span>
                            <br />
                            <span className="text-gray-500">Remaining Bulk: </span>
                            <span className="font-bold text-blue-600">{Math.max(0, maxAvailable - totalSplitWeight)} kg</span>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium disabled:opacity-50" disabled={isSaving}>Cancel</button>
                            <button onClick={handleSplit} className="px-6 py-2 bg-[#FFCA00] text-white font-bold rounded-lg disabled:opacity-50" disabled={isSaving || totalSplitWeight <= 0 || totalSplitWeight > maxAvailable}>
                                {isSaving ? "Splitting..." : "Split Stock"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SplitStockModal;
