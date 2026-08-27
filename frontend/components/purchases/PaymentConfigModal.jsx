"use client";

import React, { useState, useEffect } from "react";
import { FiX, FiCheck } from "react-icons/fi";

const PaymentConfigModal = ({ isOpen, onClose, onSave, payment }) => {
    const [amountPaid, setAmountPaid] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (payment) {
            const netAmount = parseFloat(payment.amount || 0);
            const dueAmount = parseFloat(payment.due_amount || 0);
            setAmountPaid(netAmount - dueAmount);
        }
    }, [payment]);

    if (!isOpen || !payment) return null;

    const netAmount = parseFloat(payment.amount || 0);
    const calculatedDue = Math.max(0, netAmount - amountPaid);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(payment.id, {
                amount_paid: amountPaid,
                due_amount: calculatedDue
            });
            onClose();
        } catch (error) {
            console.error("Error saving payment config:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const supplier = Array.isArray(payment.supplier_id) ? payment.supplier_id[0] : payment.supplier_id;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight font-poppins text-[22px]">Configure Payment Amount</h2>
                        <p className="text-sm text-gray-500 mt-1">Setup amount details</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <FiX size={24} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {/* Amount Details Row */}
                    <div className="mb-8">
                        <h3 className="text-[15px] font-bold text-gray-900 mb-4 font-poppins tracking-wide">Payment Amount Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2 tracking-widest font-poppins">Net Amount</label>
                                <div className="text-lg font-bold text-gray-900 flex items-center gap-1 h-[42px] px-3 bg-gray-50 rounded-lg border border-gray-100 italic">
                                    ₹ {netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-[#FFCA00] transition-colors group">
                                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2 tracking-widest font-poppins group-hover:text-[#FFCA00]">Amount Paid</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 italic">₹</span>
                                    <input
                                        type="number"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-lg font-bold text-teal-600 focus:outline-none focus:ring-1 focus:ring-[#FFCA00] focus:border-[#FFCA00] italic h-[42px]"
                                    />
                                </div>
                            </div>
                            <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2 tracking-widest font-poppins">Due Amount</label>
                                <div className={`text-lg font-bold flex items-center gap-1 h-[42px] px-3 bg-gray-50 rounded-lg border border-gray-100 italic ${calculatedDue > 0 ? "text-red-500" : "text-gray-400"}`}>
                                    ₹ {calculatedDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-10 mx-auto max-w-[800px] min-h-[600px] flex flex-col font-poppins relative">
                        {/* Watermark/Accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFCA00]/5 rounded-bl-full -z-10 hover:bg-[#d9ac00]"></div>
                        
                        {/* Doc Header */}
                        <div className="flex justify-between items-start mb-12 border-b border-gray-100 pb-8">
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase mb-1">BrandMagics Software Labs</h1>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                    123, Software Park Road<br />
                                    Kochi, Kerala, IN 682001
                                </p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">Purchase Payment</h2>
                                <div className="text-[11px] font-bold text-gray-500 space-y-1 capitalize italic">
                                    <p>Payment #: <span className="text-gray-900">{payment.payment_number}</span></p>
                                    <p>Payment Date: <span className="text-gray-900">{new Date(payment.payment_date).toLocaleDateString()}</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Bill Info */}
                        <div className="grid grid-cols-2 gap-12 mb-12">
                            <div>
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Bill To</h3>
                                <p className="font-bold text-gray-900 text-sm mb-1 uppercase tracking-tight">{supplier?.name || "N/A"}</p>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed italic">
                                    {supplier?.address || "Address not provided"}<br />
                                    {supplier?.email}<br />
                                    {supplier?.phone}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-50 pb-2">Payment Details</h3>
                                <div className="space-y-2 text-xs font-medium">
                                    <div className="flex">
                                        <span className="text-gray-400 w-32">Payment Name:</span>
                                        <span className="text-gray-900 italic">{payment.payment_name}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="text-gray-400 w-32">Mode:</span>
                                        <span className="text-gray-900 font-bold uppercase tracking-wider">{payment.payment_mode}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left border-collapse mb-8 min-w-[700px]">
                                <thead className="bg-gray-50/80 border-y border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-12 text-center">#</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Quantity</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Rate</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Tax</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(payment.payment_item || []).map((item, idx) => (
                                        <tr key={item.id} className="group">
                                            <td className="px-4 py-4 text-[12px] font-bold text-gray-400 text-center">{idx + 1}</td>
                                            <td className="px-4 py-4">
                                                <p className="text-[13px] font-bold text-gray-900 tracking-tight uppercase group-hover:text-[#FFCA00] transition-colors">{item.items?.name || item.description}</p>
                                            </td>
                                            <td className="px-4 py-4 text-[12px] text-gray-500 font-medium italic">Product</td>
                                            <td className="px-4 py-4 text-[12px] font-bold text-gray-900 text-right">{item.quantity}</td>
                                            <td className="px-4 py-4 text-[12px] font-medium text-gray-600 text-right italic">₹ {parseFloat(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-4 text-[12px] font-medium text-gray-600 text-right italic">{item.tax_percent}%</td>
                                            <td className="px-4 py-4 text-[13px] font-bold text-gray-900 text-right">₹ {parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                    {(!payment.payment_item || payment.payment_item.length === 0) && (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-12 text-center text-gray-400 italic text-sm">No items found for this payment</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="border-t-2 border-gray-100 pt-8 mt-auto flex justify-end">
                            <div className="w-64 space-y-3">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-gray-400">Subtotal:</span>
                                    <span className="text-gray-900 font-bold italic">₹ {(netAmount / 1.18).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-gray-400">Tax:</span>
                                    <span className="text-gray-900 font-bold italic">₹ {(netAmount - (netAmount / 1.18)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between pt-3 border-t border-gray-50">
                                    <span className="text-sm font-black text-gray-900 uppercase">Total (INR):</span>
                                    <span className="text-base font-black text-teal-600">₹ {netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Doc Footer */}
                        <div className="mt-16 text-center">
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Thank you for your business!</p>
                            <p className="text-[10px] text-gray-400 font-medium tracking-tight">Please make payment using the methods shared in the invoice email.</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t flex flex-wrap justify-end gap-3 bg-white rounded-b-xl no-print">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2.5 text-gray-500 rounded-lg text-sm font-bold hover:bg-gray-100 transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full sm:w-auto px-8 py-2.5 bg-[#FFCA00] text-white rounded-lg text-sm font-bold /20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:bg-[#d9ac00]"
                    >
                        {isSaving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</> : <><FiCheck size={18} /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentConfigModal;
