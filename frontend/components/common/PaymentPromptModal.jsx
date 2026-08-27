"use client";

import React, { useState, useEffect } from "react";
import { IoClose } from "react-icons/io5";
import CustomSelect from "@/components/common/CustomSelect";

const PaymentPromptModal = ({ isOpen, onClose, onConfirm, totalAmount, isPurchase = false }) => {
    const [paymentStatus, setPaymentStatus] = useState("UNPAID"); // "UNPAID", "FULLY_PAID", "PARTIALLY_PAID"
    const [amountPaid, setAmountPaid] = useState("");
    const [paymentMode, setPaymentMode] = useState("CASH");

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                setPaymentStatus("UNPAID");
                setAmountPaid("");
                setPaymentMode("CASH");
            }, 0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const numericTotal = parseFloat(totalAmount) || 0;
    const numericPaid = paymentStatus === "FULLY_PAID"
        ? numericTotal
        : (parseFloat(amountPaid) || 0);              
    const balanceAmount = Math.max(0, numericTotal - numericPaid);

    const handleConfirmSubmit = (e) => {
        e.preventDefault();
        
        if (paymentStatus === "PARTIALLY_PAID") {
            const paid = parseFloat(amountPaid) || 0;
            if (paid <= 0) {
                alert("Please enter a valid payment amount greater than 0.");
                return;
            }
            if (paid > numericTotal) {
                alert(`Amount paid cannot exceed total invoice amount (₹${numericTotal.toFixed(2)}).`);
                return;
            }
        }

        onConfirm({
            paymentStatus,
            amountPaid: paymentStatus === "FULLY_PAID" ? numericTotal : parseFloat(amountPaid) || 0,
            paymentMode
        });
    };

    const paymentModeOptions = [
        { value: "BANK_TRANSFER", label: "Bank Transfer" },
        { value: "UPI", label: "UPI" },
        { value: "NEFT", label: "NEFT" },
        { value: "CHEQUE", label: "Cheque" },
        { value: "CASH", label: "Cash" }
    ];

    return (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-gray-500 font-poppins" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 md:p-8 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute cursor-pointer top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <IoClose size={24} />
                </button>

                <h2 className="text-[20px] md:text-[22px] font-bold text-gray-900 mb-2">
                    Record Payment
                </h2>
                <p className="text-[13px] text-gray-500 mb-6">
                    Choose whether this {isPurchase ? "purchase" : "sales"} invoice is fully paid, partly paid, or if you want to skip recording a payment for now.
                </p>

                <form onSubmit={handleConfirmSubmit} className="space-y-6">
                    {/* Invoice Amount Display */}
                    <div className="bg-[#F8FAFF] rounded-lg p-4 border border-gray-100 flex justify-between items-center">
                        <span className="text-[13px] font-medium text-gray-600">Invoice Total Amount</span>
                        <span className="text-[18px] font-bold text-gray-900">₹ {numericTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {/* Radio Options */}
                    <div className="space-y-3">
                        <label className="text-[13px] font-bold text-gray-900 block">Payment Status</label>
                        <div className="space-y-2">
                            {/* Custom Radio: UNPAID */}
                            <label
                                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                                style={{ borderColor: paymentStatus === "UNPAID" ? "#FFCA00" : "#E5E7EB", background: paymentStatus === "UNPAID" ? "#FFFBEB" : "transparent" }}
                                onClick={() => setPaymentStatus("UNPAID")}
                            >
                                <input type="radio" name="paymentStatus" value="UNPAID" checked={paymentStatus === "UNPAID"} onChange={() => setPaymentStatus("UNPAID")} className="sr-only" />
                                <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                    style={{ borderColor: paymentStatus === "UNPAID" ? "#FFCA00" : "#D1D5DB", backgroundColor: paymentStatus === "UNPAID" ? "#FFCA00" : "transparent" }}>
                                    {paymentStatus === "UNPAID" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[14px] font-semibold text-gray-800">Unpaid / Skip Payment</span>
                                    <span className="text-[11px] text-gray-400">Keep the invoice unpaid and skip recording payment now.</span>
                                </div>
                            </label>

                            {/* Custom Radio: FULLY_PAID */}
                            <label
                                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                                style={{ borderColor: paymentStatus === "FULLY_PAID" ? "#FFCA00" : "#E5E7EB", background: paymentStatus === "FULLY_PAID" ? "#FFFBEB" : "transparent" }}
                                onClick={() => setPaymentStatus("FULLY_PAID")}
                            >
                                <input type="radio" name="paymentStatus" value="FULLY_PAID" checked={paymentStatus === "FULLY_PAID"} onChange={() => setPaymentStatus("FULLY_PAID")} className="sr-only" />
                                <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                    style={{ borderColor: paymentStatus === "FULLY_PAID" ? "#FFCA00" : "#D1D5DB", backgroundColor: paymentStatus === "FULLY_PAID" ? "#FFCA00" : "transparent" }}>
                                    {paymentStatus === "FULLY_PAID" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[14px] font-semibold text-gray-800">Fully Paid</span>
                                    <span className="text-[11px] text-gray-400">Record a payment for the full amount (₹ {numericTotal.toFixed(2)}).</span>
                                </div>
                            </label>

                            {/* Custom Radio: PARTIALLY_PAID */}
                            <label
                                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                                style={{ borderColor: paymentStatus === "PARTIALLY_PAID" ? "#FFCA00" : "#E5E7EB", background: paymentStatus === "PARTIALLY_PAID" ? "#FFFBEB" : "transparent" }}
                                onClick={() => setPaymentStatus("PARTIALLY_PAID")}
                            >
                                <input type="radio" name="paymentStatus" value="PARTIALLY_PAID" checked={paymentStatus === "PARTIALLY_PAID"} onChange={() => setPaymentStatus("PARTIALLY_PAID")} className="sr-only" />
                                <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                    style={{ borderColor: paymentStatus === "PARTIALLY_PAID" ? "#FFCA00" : "#D1D5DB", backgroundColor: paymentStatus === "PARTIALLY_PAID" ? "#FFCA00" : "transparent" }}>
                                    {paymentStatus === "PARTIALLY_PAID" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[14px] font-semibold text-gray-800">Partially Paid</span>
                                    <span className="text-[11px] text-gray-400">Record a payment for a specific amount.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Conditional Amount Input & Balance */}
                    {paymentStatus === "PARTIALLY_PAID" && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-gray-700">Amount Paid</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={numericTotal}
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFCA00] text-[14px] text-gray-900"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-gray-700">Remaining Balance</label>
                                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] text-gray-500 flex items-center">
                                    ₹ {balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment Mode Selection */}
                    {paymentStatus !== "UNPAID" && (
                        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="text-[13px] font-bold text-gray-900">Payment Mode</label>
                            <CustomSelect
                                options={paymentModeOptions}
                                value={paymentMode}
                                onChange={(val) => setPaymentMode(val)}
                                className="w-full border border-gray-200 rounded-lg"
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-[14px] font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-bold hover:bg-[#d9ac00] transition-all"
                        >
                            Confirm & Send
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentPromptModal;
