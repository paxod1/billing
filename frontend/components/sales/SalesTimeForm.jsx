"use client";

import React, { useState, useMemo, useEffect } from "react";
import { FiX, FiLoader } from "react-icons/fi";
import { showToast } from "@/lib/features/toast/toastSlice";
import { useDispatch } from "react-redux";
import AttachmentUploader from "@/components/common/AttachmentUploader";

const initialData = {
    entryName: "",
    description: "",
    date: "",
    useStartEndTime: false,
    hours: "",
    minutes: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    ratePerHour: "",
    notes: "",
    status: "DRAFT",
    attachment: null
};

const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const SalesTimeForm = ({ isOpen, onClose, onSave, editData = null, viewOnly = false, isSaving = false }) => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState(initialData);
    const [initialSnapshot, setInitialSnapshot] = useState(null);

    useEffect(() => {
        if (isOpen) {
            let dataToSet = {
                ...initialData,
                date: getTodayDateString()
            };
            
            if (editData) {
                let hrs = editData.hours || "";
                let mins = editData.minutes || "";
                
                if (!hrs && !mins && editData.duration_minutes) {
                    hrs = Math.floor(editData.duration_minutes / 60);
                    mins = editData.duration_minutes % 60;
                }

                dataToSet = {
                    ...initialData,
                    id: editData.id,
                    entryName: editData.name || "",
                    date: editData.entry_date ? editData.entry_date.split('T')[0] : (editData.date || ""),
                    useStartEndTime: !!(editData.start && editData.end) || !!editData.use_start_end,
                    hours: hrs,
                    minutes: mins,
                    startDate: editData.start ? editData.start.split('T')[0] : "",
                    startTime: editData.start ? editData.start.split('T')[1]?.substring(0, 5) : "",
                    endDate: editData.end ? editData.end.split('T')[0] : "",
                    endTime: editData.end ? editData.end.split('T')[1]?.substring(0, 5) : "",
                    ratePerHour: editData.rate_per_hour || "",
                    notes: editData.note || editData.notes || "",
                    status: (editData.status || "DRAFT").toUpperCase(),
                    attachment: editData.attachment || null
                };
            }

            setFormData(dataToSet);
            setInitialSnapshot(JSON.stringify(dataToSet));
        }
    }, [isOpen, editData]);

    const hasChanges = useMemo(() => {
        if (!initialSnapshot) return false;
        return JSON.stringify(formData) !== initialSnapshot;
    }, [formData, initialSnapshot]);

    const totalAmount = useMemo(() => {
        let hrs = 0;
        let mins = 0;
        if (formData.useStartEndTime) {
            if (formData.startDate && formData.startTime && formData.endDate && formData.endTime) {
                const start = new Date(`${formData.startDate}T${formData.startTime}`);
                const end = new Date(`${formData.endDate}T${formData.endTime}`);
                if (end > start) {
                    const diffMs = end - start;
                    hrs = Math.floor(diffMs / 3600000);
                    mins = Math.floor((diffMs % 3600000) / 60000);
                }
            }
        } else {
            hrs = parseInt(formData.hours) || 0;
            mins = parseInt(formData.minutes) || 0;
        }
        const totalHrs = hrs + (mins / 60);
        return ((parseFloat(formData.ratePerHour) || 0) * totalHrs).toFixed(2);
    }, [formData]);

    const preparePayload = (status) => {
        const payload = {
            name: formData.entryName || "",
            description: "",
            rate_per_hour: parseFloat(formData.ratePerHour) || 0,
            hours: parseInt(formData.hours) || 0,
            minutes: formData.minutes || "00",
            entry_date: formData.date || "",
            start: (formData.useStartEndTime && formData.startDate && formData.startTime) ? `${formData.startDate}T${formData.startTime.length === 5 ? formData.startTime + ':00' : formData.startTime}.000Z` : "",
            end: (formData.useStartEndTime && formData.endDate && formData.endTime) ? `${formData.endDate}T${formData.endTime.length === 5 ? formData.endTime + ':00' : formData.endTime}.000Z` : "",
            note: formData.notes || "",
            use_start_end: !!formData.useStartEndTime,
            status: status || "DRAFT",
            total_amount: totalAmount,
            attachmentkey: formData.attachment || null
        };
        if (editData && editData.id) {
            payload.id = editData.id;
        }
        return {
            payload
        };
    };

    const validateForm = () => {
        if (!formData.entryName?.trim()) return "Entry Name is required";
        if (formData.useStartEndTime) {
            if (!formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) return "Start and End times are required";
            const start = new Date(`${formData.startDate}T${formData.startTime}`);
            const end = new Date(`${formData.endDate}T${formData.endTime}`);
            if (end <= start) return "End time must be after start time";
        } else {
            if (!formData.hours && !formData.minutes) return "Duration (Hours or Minutes) is required";
            if (parseInt(formData.hours || 0) === 0 && parseInt(formData.minutes || 0) === 0) return "Duration must be greater than zero";
        }
        return null;
    };

    const handleSave = () => {
        const error = validateForm();
        if (error) {
            dispatch(showToast({ message: error, type: "error" }));
            return;
        }
        onSave(preparePayload("DRAFT"));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-h-[95dvh] overflow-y-auto max-w-4xl">
                <div className="p-4 md:p-8">
                    <div className="flex flex-wrap justify-between items-start border-b border-gray-200 pb-4 mb-6 gap-2">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                                {editData ? (viewOnly ? "View Time Entry" : "Edit Time Entry") : "Add Time Entry"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Log billable hours and auto-calculate amount</p>
                        </div>
                        <div className="flex items-center gap-4 ml-auto sm:ml-0">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shrink-0 ${(!editData || hasChanges) ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-gray-100 text-gray-500"}`}>
                                {(!editData || hasChanges) ? "Not Saved" : (formData.status || "DRAFT")}
                            </span>
                            <button
                                onClick={onClose}
                                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
                                title="Close"
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-[14px] font-bold text-gray-900 mb-4 uppercase tracking-wider">Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Entry Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.entryName}
                                    onChange={(e) => setFormData({ ...formData, entryName: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] disabled:opacity-60 disabled:cursor-not-allowed"
                                    placeholder="Enter Entry Name"
                                    disabled={viewOnly}
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${formData.date ? 'text-gray-900' : 'text-gray-400'}`}
                                    style={{ colorScheme: formData.date ? 'normal' : 'light' }}
                                    disabled={viewOnly}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-8 pt-6 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wider">Duration & Time <span className="text-red-500">*</span></h3>
                            <div className="flex items-center gap-3">
                                <span className="text-[12px] font-bold text-gray-500">Use Start/End Time</span>
                                <button
                                    type="button"
                                    className={`w-10 h-[22px] rounded-full transition-colors relative flex items-center ${formData.useStartEndTime ? 'bg-[#FFCA00]' : 'bg-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    onClick={() => setFormData({ ...formData, useStartEndTime: !formData.useStartEndTime })}
                                    disabled={viewOnly}
                                >
                                    <span className={`absolute bg-white rounded-full w-[16px] h-[16px] transition-transform ${formData.useStartEndTime ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="border border-gray-100 bg-gray-50/50 rounded-lg p-5">
                            {!formData.useStartEndTime ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[12px] font-bold text-gray-600 mb-1.5 block">Hours</label>
                                        <input
                                            type="number"
                                            value={formData.hours}
                                            onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder="0"
                                            disabled={viewOnly}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[12px] font-bold text-gray-600 mb-1.5 block">Minutes</label>
                                        <input
                                            type="number"
                                            value={formData.minutes}
                                            onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder="0"
                                            disabled={viewOnly}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:gap-8 gap-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[12px] font-bold text-gray-600 mb-1.5 block">Start Date</label>
                                            <input
                                                type="date"
                                                value={formData.startDate}
                                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] disabled:opacity-60 disabled:cursor-not-allowed ${formData.startDate ? 'text-gray-900' : 'text-gray-400'}`}
                                                disabled={viewOnly}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[12px] font-bold text-gray-600 mb-1.5 block">Start Time</label>
                                            <input
                                                type="time"
                                                value={formData.startTime}
                                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                                className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] disabled:opacity-60 disabled:cursor-not-allowed ${formData.startTime ? 'text-gray-900' : 'text-gray-400'}`}
                                                disabled={viewOnly}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[12px] font-bold text-gray-600 mb-1.5 block">End Date</label>
                                            <input
                                                type="date"
                                                value={formData.endDate}
                                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] disabled:opacity-60 disabled:cursor-not-allowed ${formData.endDate ? 'text-gray-900' : 'text-gray-400'}`}
                                                disabled={viewOnly}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[12px] font-bold text-gray-600 mb-1.5 block">End Time</label>
                                            <input
                                                type="time"
                                                value={formData.endTime}
                                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                                className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] disabled:opacity-60 disabled:cursor-not-allowed ${formData.endTime ? 'text-gray-900' : 'text-gray-400'}`}
                                                disabled={viewOnly}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mb-8 pt-6 border-t border-gray-100">
                        <h3 className="text-[14px] font-bold text-gray-900 mb-4 uppercase tracking-wider">Rate</h3>
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 w-full max-w-2xl">
                                <div>
                                    <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Rate per Hour</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-medium text-[13px]">₹</span>
                                        <input
                                            type="number"
                                            value={formData.ratePerHour}
                                            onChange={(e) => setFormData({ ...formData, ratePerHour: e.target.value })}
                                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-[#FFCA00] disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder="0.00"
                                            disabled={viewOnly}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 md:mt-2 self-end shrink-0">
                                <div className="flex items-center gap-4">
                                    <span className="text-[14px] font-bold text-gray-900">Total (INR):</span>
                                    <span className="text-xl font-bold text-teal-600 whitespace-nowrap">₹ {totalAmount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8 pt-6 border-t border-gray-100">
                        <h3 className="text-[14px] font-bold text-gray-900 mb-4 uppercase tracking-wider">References</h3>
                        <div>
                            <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-[13px] h-24 resize-none focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] transition-colors text-gray-900 placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="Add invoice terms or notes"
                                disabled={viewOnly}
                            ></textarea>
                        </div>
                        <div className="mt-4">
                            <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Attachment</label>
                            <AttachmentUploader
                                context="time-entry"
                                existingUrl={formData.attachment}
                                onUploaded={(url) => setFormData(prev => ({ ...prev, attachment: url }))}
                                disabled={viewOnly}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 mt-8 pt-6 border-t font-poppins">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-[14px] font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
                            disabled={isSaving}
                        >
                            {viewOnly ? "Close" : "Cancel"}
                        </button>
                        {!viewOnly && (
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving || (!hasChanges && editData)}
                                className="px-6 py-2.5 bg-[#FFCA00] text-white hover:bg-[#d9ac00] text-[14px] font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                                {isSaving ? (
                                    <span className="flex items-center gap-2">
                                        <FiLoader className="animate-spin" size={16} /> {editData ? "Updating..." : "Saving..."}
                                    </span>
                                ) : (
                                    "Save"
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesTimeForm;
