"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    FiX, FiUser, FiTrash2, FiPrinter,
    FiDownload, FiMail, FiPaperclip,
    FiArrowLeft, FiSend, FiLoader, FiArrowRight
} from "react-icons/fi";
import { useRouter, useSearchParams } from "next/navigation";
import { partyService } from "@/services/partyService";
import { salesReturnService } from "@/services/salesReturnService";
import { inventoryService } from "@/services/inventoryService";
import { showToast } from "@/lib/features/toast/toastSlice";
import { useDispatch } from "react-redux";
import CustomSelect from "@/components/common/CustomSelect";
import { generateUniqueId } from "@/utils/idGenerator";
import AttachmentUploader from "@/components/common/AttachmentUploader";
import DocumentPreview from "@/components/common/DocumentPreview";

const getInitialFormData = () => ({
    invoiceNumber: "",
    invoiceName: "",
    status: "DRAFT",
    customer: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    items: [],
    notes: "",
    attachment: null,
    returnAgainst: "",
    emailConfig: {
        to: "",
        cc: "",
        bcc: "",
        message: ""
    }
});

const SalesReturnForm = ({ isOpen, onClose, onSave, editData = null, viewOnly = false }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();

    const [step, setStep] = useState(1);
    const [customers, setCustomers] = useState([]);
    const [allInvoices, setAllInvoices] = useState([]);
    const [productsList, setProductsList] = useState([]);
    const [rawMaterialsList, setRawMaterialsList] = useState([]);
    const [customizedProductsList, setCustomizedProductsList] = useState([]);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState(getInitialFormData());
    const [initialSnapshot, setInitialSnapshot] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [activeEmailTab, setActiveEmailTab] = useState("Email");
    const [tempInvoiceId, setTempInvoiceId] = useState("");
    const docPreviewRef = useRef(null);

    const handlePrint = () => docPreviewRef.current?.print();
    const handleDownloadPDF = async () => {
        try {
            setIsExporting(true);
            await docPreviewRef.current?.downloadPDF();
        } finally {
            setIsExporting(false);
        }
    };

    const hasChanges = useMemo(() => {
        if (!initialSnapshot) return false;
        return JSON.stringify(formData) !== initialSnapshot;
    }, [formData, initialSnapshot]);

    const handleClose = () => {
        setFormData(getInitialFormData());
        setTempInvoiceId("");
        setStep(1);
        onClose();
    };

    const calculateTotals = () => {
        let subtotal = 0;
        let totalTax = 0;

        formData.items.forEach(item => {
            const itemSubtotal = (parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 0);
            const itemTax = itemSubtotal * ((parseFloat(item.tax_percent) || 0) / 100);
            subtotal += itemSubtotal;
            totalTax += itemTax;
        });

        return {
            subtotal,
            totalTax,
            total: subtotal + totalTax
        };
    };

    const totals = calculateTotals();

    // Fetch customers
    const fetchCustomers = async () => {
        try {
            const data = await partyService.queryParties("CUSTOMER");
            setCustomers(data);
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    };

    // Fetch invoices for dropdown selector
    const fetchAllInvoices = async () => {
        try {
            setIsLoadingInvoices(true);
            const invoices = await salesReturnService.getAllInvoicesForDropdown();
            setAllInvoices(invoices);
        } catch (error) {
            console.error("Error fetching all invoices:", error);
        } finally {
            setIsLoadingInvoices(false);
        }
    };

    // Fetch items across all categories
    const fetchItems = async () => {
        try {
            setIsLoadingItems(true);
            const [prodRes, rawRes, customRes] = await Promise.all([
                inventoryService.getProducts(),
                inventoryService.getRawMaterials(),
                inventoryService.getCustomizedProducts()
            ]);

            setProductsList(prodRes.data || []);
            setRawMaterialsList(rawRes.data || []);
            setCustomizedProductsList(customRes.data || []);
        } catch (error) {
            console.error("Error fetching items:", error);
        } finally {
            setIsLoadingItems(false);
        }
    };

    // Initialize form
    useEffect(() => {
        if (isOpen) {
            fetchCustomers();
            fetchAllInvoices();
            fetchItems();

            if (editData) {
                const customerData = Array.isArray(editData.customer_id) ? editData.customer_id[0] : editData.customer_id;
                const dataToSet = {
                    invoiceNumber: editData.invoice_number || "",
                    invoiceName: editData.invoice_name || "",
                    status: editData.status || "DRAFT",
                    customer: customerData?.id || (typeof editData.customer_id !== 'object' ? editData.customer_id : ""),
                    invoiceDate: editData.invoice_date ? new Date(editData.invoice_date).toISOString().split('T')[0] : "",
                    items: Array.isArray(editData.sales_item) ? editData.sales_item.map(item => {
                        let sourceType = item.source_type || "item";
                        if (sourceType === "item") {
                            sourceType = "customized_product";
                        }
                        const resolvedId = sourceType === "raw_material"
                            ? (item.source_id || "")
                            : sourceType === "service"
                                ? ""
                                : (item.items?.id || item.items || "");
                        return {
                            id: item.id,
                            item_id: resolvedId,
                            source_id: resolvedId,
                            source_type: sourceType,
                            description: item.description || item.items?.name || item.raw_material?.name || "",
                            tax_id: (typeof item.tax_id === 'object' ? item.tax_id?.id : item.tax_id) || "",
                            tax_percent: parseFloat(item.tax_percent) || 0,
                            quantity: parseFloat(item.quantity) || 1,
                            max_quantity: parseFloat(item.max_quantity ?? item.quantity) || 9999,
                            rate: parseFloat(item.rate) || 0,
                            amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0)
                        };
                    }) : [],
                    notes: editData.notes || "",
                    attachment: editData.attachment || editData.attachmentkey || null,
                    returnAgainst: editData.return_against || "",
                    emailConfig: {
                        to: customerData?.email || "",
                        cc: "",
                        bcc: "",
                        message: ""
                    }
                };
                setFormData(dataToSet);
                if (viewOnly) setStep(2);
                else setStep(1);
                setInitialSnapshot(JSON.stringify(dataToSet));
            } else {
                const dataToSet = {
                    ...getInitialFormData(),
                    invoiceNumber: generateUniqueId("SRN"),
                    invoiceDate: new Date().toISOString().split('T')[0]
                };
                setFormData(dataToSet);
                setStep(1);
                setInitialSnapshot(JSON.stringify(dataToSet));
            }
        }
    }, [isOpen, editData, viewOnly]);

    // Update max_quantity on edit load when allInvoices are fetched
    useEffect(() => {
        if (editData && formData.returnAgainst && allInvoices.length > 0) {
            const selectedInv = allInvoices.find(i => i.id == formData.returnAgainst);
            if (selectedInv) {
                const originalItems = selectedInv.sales_item || [];
                let hasUpdates = false;

                const updatedItems = formData.items.map(item => {
                    if (item.max_quantity !== undefined && item.max_quantity !== 9999) return item;

                    const originalItem = originalItems.find(oi => {
                        const oiSourceType = oi.source_type || "item";
                        if (oiSourceType !== item.source_type) return false;
                        if (item.source_type === "service") {
                            return oi.description === item.description;
                        }
                        const oiId = oi.items?.id || oi.items || oi.source_id;
                        return String(oiId) === String(item.item_id);
                    });

                    if (originalItem) {
                        hasUpdates = true;
                        return {
                            ...item,
                            max_quantity: parseFloat(originalItem.quantity) || 0
                        };
                    }
                    return item;
                });

                if (hasUpdates) {
                    const updatedFormData = { ...formData, items: updatedItems };
                    setFormData(updatedFormData);
                    if (initialSnapshot) {
                        setInitialSnapshot(JSON.stringify(updatedFormData));
                    }
                }
            }
        }
    }, [allInvoices, formData.returnAgainst, editData]);

    const hasStockErrors = useMemo(() => {
        return formData.items.some(item => {
            const qty = parseFloat(item.quantity) || 0;
            const maxAllowed = item.source_type === "service" ? 999999 : (parseFloat(item.max_quantity) || 0);
            return qty > maxAllowed || qty <= 0;
        });
    }, [formData.items]);

    const handleSelectInvoiceToReturn = async (invoiceId) => {
        const selectedInv = allInvoices.find(i => i.id == invoiceId);
        if (!selectedInv) return;

        const customer = Array.isArray(selectedInv.customer_id) ? selectedInv.customer_id[0] : selectedInv.customer_id;
        const customerId = customer?.id || (typeof selectedInv.customer_id !== 'object' ? selectedInv.customer_id : "");

        const itemsList = selectedInv.sales_item;
        let mappedItems = [];
        if (Array.isArray(itemsList)) {
            mappedItems = itemsList.map(item => {
                let sourceType = item.source_type || "item";
                if (sourceType === "item") {
                    sourceType = "customized_product";
                }
                const resolvedId = sourceType === "raw_material"
                    ? (item.source_id || "")
                    : sourceType === "service"
                        ? ""
                        : (item.items?.id || item.items || item.source_id || "");

                const remainingQty = parseFloat(item.remaining_quantity ?? item.quantity) || 0;

                return {
                    id: undefined,
                    item_id: resolvedId,
                    source_id: resolvedId,
                    source_type: sourceType,
                    description: item.description || item.items?.name || item.raw_material?.name || "",
                    tax_id: item.tax_id || "",
                    tax_percent: parseFloat(item.tax_percent) || 0,
                    quantity: remainingQty,
                    max_quantity: remainingQty,
                    rate: parseFloat(item.rate) || 0,
                    amount: (parseFloat(item.rate) || 0) * remainingQty
                };
            }).filter(item => item.max_quantity > 0);
        }

        const updatedFormData = {
            ...formData,
            returnAgainst: invoiceId,
            customer: customerId ? String(customerId) : "",
            items: mappedItems,
            invoiceName: `Return for ${selectedInv.invoice_name || selectedInv.invoice_number}`,
            emailConfig: {
                ...formData.emailConfig,
                to: customer?.email || ""
            }
        };

        setFormData(updatedFormData);
        if (mappedItems.length === 0) {
            dispatch(showToast({
                message: "This sales invoice has already been fully returned.",
                type: "warning"
            }));
        }
    };

    const handleRemoveItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];

        if (field === "quantity") {
            if (value === "") {
                newItems[index].quantity = "";
            } else {
                const qty = parseFloat(value);
                if (isNaN(qty)) {
                    newItems[index].quantity = "";
                } else {
                    const maxAllowed = newItems[index].source_type === "service" ? 999999 : (parseFloat(newItems[index].max_quantity) || 0);

                    if (qty < 0) {
                        newItems[index].quantity = 0;
                    } else if (qty > maxAllowed) {
                        dispatch(showToast({
                            message: `Quantity for ${newItems[index].description || 'item'} cannot exceed original invoice quantity (${maxAllowed})`,
                            type: "warning"
                        }));
                        newItems[index].quantity = maxAllowed;
                    } else {
                        newItems[index].quantity = qty;
                    }
                }
            }
        }

        const qty = parseFloat(newItems[index].quantity) || 0;
        const rate = parseFloat(newItems[index].rate) || 0;
        newItems[index].amount = qty * rate;

        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const validateForm = () => {
        if (!formData.returnAgainst) {
            dispatch(showToast({ message: "Please select a sales invoice to return against", type: "warning" }));
            return false;
        }
        if (!formData.invoiceName?.trim()) {
            dispatch(showToast({ message: "Return Reference Name is required", type: "warning" }));
            return false;
        }
        if (!formData.invoiceDate) {
            dispatch(showToast({ message: "Return Date is required", type: "warning" }));
            return false;
        }
        if (!formData.items || formData.items.length === 0) {
            dispatch(showToast({ message: "At least one item is required for return", type: "warning" }));
            return false;
        }
        const zeroQtyItem = formData.items.find(item => (parseFloat(item.quantity) || 0) <= 0);
        if (zeroQtyItem) {
            dispatch(showToast({
                message: `Quantity for ${zeroQtyItem.description || 'item'} must be greater than 0. If you do not want to return this item, please remove it using the delete icon.`,
                type: "warning"
            }));
            return false;
        }

        const overLimitItem = formData.items.find(item => {
            const qty = parseFloat(item.quantity) || 0;
            const maxAllowed = item.source_type === "service" ? 999999 : (parseFloat(item.max_quantity) || 0);
            return item.source_type !== "service" && qty > maxAllowed;
        });

        if (overLimitItem) {
            const maxAllowed = parseFloat(overLimitItem.max_quantity) || 0;
            dispatch(showToast({
                message: `Quantity for ${overLimitItem.description || 'item'} cannot exceed original invoice quantity (${maxAllowed})`,
                type: "warning"
            }));
            return false;
        }

        return true;
    };

    const handleSave = async (forcedStatus = null, isSendToClient = false, isSendOnly = false) => {
        if (!validateForm()) return;

        try {
            setIsSaving(true);
            const payload = {
                invoice_number: formData.invoiceNumber,
                invoice_name: formData.invoiceName,
                customer_id: Number(formData.customer),
                invoice_date: formData.invoiceDate,
                total_amount: Number(totals.total.toFixed(2)),
                notes: formData.notes || "",
                return_against: Number(formData.returnAgainst),
                status: forcedStatus || formData.status || "DRAFT",
                items: formData.items.map(item => ({
                    source_type: item.source_type || "item",
                    item_id: item.source_type === "service" ? null : Number(item.item_id),
                    source_id: item.source_type === "service" ? null : Number(item.item_id),
                    quantity: Number(item.quantity) || 0,
                    max_quantity: Number(item.max_quantity) || 0,
                    rate: parseFloat(item.rate) || 0,
                    tax_percent: parseFloat(item.tax_percent) || 0,
                    amount: Number((Number(item.quantity) * parseFloat(item.rate)).toFixed(2)),
                    tax_id: item.tax_id ? Number(item.tax_id) : null,
                    ...(item.source_type === "service" ? { description: item.description || "" } : {})
                }))
            };

            payload.attachmentkey = formData.attachment || null;

            let response;
            if (editData) {
                response = await salesReturnService.updateReturn(editData.id, payload);
                dispatch(showToast({ message: "Sales Return updated successfully!", type: "success" }));
            } else {
                response = await salesReturnService.saveReturn(payload);
                dispatch(showToast({ message: "Sales Return created successfully!", type: "success" }));
            }

            setInitialSnapshot(JSON.stringify(formData));
            const newId = response?.data?.data?.id || response?.data?.id || response?.data?.[0]?.id || response?.id || editData?.id;

            if (isSendToClient && newId) {
                try {
                    const emailData = {
                        documentType: "SALES_INVOICE",
                        documentId: newId.toString(),
                        email: {
                            to: formData.emailConfig.to || "",
                            cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                            bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                            message: formData.emailConfig.message || ""
                        }
                    };
                    await salesReturnService.sendReturnEmail(emailData);
                    dispatch(showToast({ message: "Email sent to customer successfully!", type: "success" }));
                    if (onSave) onSave(newId, "EMAIL_SENT");
                } catch (emailError) {
                    console.error("Error sending email:", emailError);
                    dispatch(showToast({ message: emailError?.message || "Return created, but failed to send email", type: "error" }));
                    if (onSave) onSave(newId);
                }
                handleClose();
            } else {
                if (!isSendOnly) {
                    if (onSave) onSave(newId);
                    handleClose();
                }
            }
            return newId;
        } catch (error) {
            console.error("Error saving return:", error);
            dispatch(showToast({ message: error.message || "Error saving sales return.", type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendEmail = async () => {
        if (!editData) return;
        setIsSaving(true);
        try {
            const emailData = {
                documentType: "SALES_INVOICE",
                documentId: editData.id.toString(),
                email: {
                    to: formData.emailConfig.to || "",
                    cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                    bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                    message: formData.emailConfig.message || ""
                }
            };
            await salesReturnService.sendReturnEmail(emailData);
            dispatch(showToast({ message: "Email sent to customer successfully!", type: "success" }));

            if (onSave && typeof onSave === 'function') {
                onSave(editData.id, true);
            }
            handleClose();
        } catch (error) {
            console.error("Error sending email:", error);
            dispatch(showToast({ message: error.message || "Failed to send email.", type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95dvh] overflow-y-auto">
                <div className="p-4 md:p-8 relative">
                    {/* Invoice Selector (Creation Mode, first step) */}
                    {!formData.returnAgainst && !editData ? (
                        <div className="py-4 px-2 max-w-4xl mx-auto font-poppins text-left">
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Add New Sales Return</h2>
                            <p className="text-gray-500 mt-1 text-sm">Setup sales return details</p>
                            
                            <hr className="border-t border-gray-200 mt-4 mb-6" />

                            <div className="mb-6">
                                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4">DETAILS</h3>
                                <label className="text-xs font-semibold text-gray-700 mb-2 block">Select Sales Invoice</label>
                                {isLoadingInvoices ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 py-3 border border-gray-100 rounded-lg justify-center bg-gray-50">
                                        <FiLoader className="animate-spin text-[#FFCA00]" size={16} /> Loading invoices...
                                    </div>
                                ) : (
                                    <CustomSelect
                                        value={tempInvoiceId}
                                        onChange={(val) => setTempInvoiceId(val)}
                                        options={(Array.isArray(allInvoices) ? allInvoices : []).map(i => ({
                                            value: i.id,
                                            label: `${i.invoice_number}${i.invoice_name ? ` - ${i.invoice_name}` : ""}`
                                        }))}
                                        placeholder="-- Choose a Sales Invoice of the item you want to return --"
                                    />
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4">
                                <button
                                    onClick={handleClose}
                                    className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={!tempInvoiceId}
                                    onClick={() => {
                                        if (tempInvoiceId) {
                                            handleSelectInvoiceToReturn(tempInvoiceId);
                                        }
                                    }}
                                    className="px-6 py-2 bg-[#FFCA00] hover:bg-[#d9ac00] text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    ) : step === 1 ? (
                        <div>
                            <div className="flex flex-wrap justify-between items-start mb-6 gap-2 font-poppins">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Configure Sales Return</h2>
                                    <p className="text-sm text-gray-500 mt-1">Setup return details and adjust quantities</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${(!editData || hasChanges) ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-gray-100 text-gray-500"}`}>
                                    {(!editData || hasChanges) ? "Not Saved" : (formData.status || "DRAFT")}
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                {/* Details Section */}
                                <div className="mb-8 font-poppins">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Return Number Series</label>
                                            <input
                                                type="text"
                                                value={formData.invoiceNumber}
                                                readOnly
                                                className="w-full px-3 py-2 border border-gray-100 rounded text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Return Reference Name</label>
                                            <input
                                                type="text"
                                                value={formData.invoiceName}
                                                onChange={(e) => setFormData({ ...formData, invoiceName: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                placeholder="Enter Return Reference Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Return Date</label>
                                            <input
                                                type="date"
                                                value={formData.invoiceDate}
                                                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Customer (Read-Only)</label>
                                            <input
                                                type="text"
                                                value={customers.find(c => c.id == formData.customer)?.name || "N/A"}
                                                readOnly
                                                className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-gray-50 text-gray-500 cursor-not-allowed h-[42px]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Returned Against Invoice</label>
                                            <input
                                                type="text"
                                                value={(() => {
                                                    const inv = allInvoices.find(i => i.id == formData.returnAgainst);
                                                    return inv ? `${inv.invoice_number} (${inv.invoice_name || "Invoice"})` : "N/A";
                                                })()}
                                                readOnly
                                                className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-gray-50 text-gray-500 cursor-not-allowed h-[42px]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="mb-8 font-poppins">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-semibold text-gray-900">Items to Return</h3>
                                        <span className="text-xs text-gray-500 font-medium">Rates and tax percentages are locked to original invoice billing.</span>
                                    </div>
                                    <div className="border border-gray-300 rounded overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm min-w-[850px]">
                                                <thead className="bg-gray-50 border-b border-gray-300">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-10 min-w-[40px]">#</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-52 min-w-[200px]">Item</th>
                                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 w-16 min-w-[60px]">Tax</th>
                                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 w-28 min-w-[100px]">Quantity to Return</th>
                                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 w-32 min-w-[120px]">Rate</th>
                                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 w-32 min-w-[120px]">Return Amount</th>
                                                        <th className="px-3 py-2 w-10 min-w-[40px]"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {formData.items.map((item, idx) => (
                                                        <tr key={idx} className="border-b border-gray-200">
                                                            <td className="px-3 py-3 text-gray-700 w-10 min-w-[40px]">{idx + 1}</td>
                                                            {item.source_type === "service" ? (
                                                                <td colSpan={3} className="px-3 py-3 min-w-[480px]">
                                                                    <input
                                                                        type="text"
                                                                        value={item.description}
                                                                        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 cursor-not-allowed text-gray-500 rounded text-sm h-[38px]"
                                                                        readOnly
                                                                    />
                                                                </td>
                                                            ) : (
                                                                <>
                                                                    <td className="px-3 py-3 w-52 min-w-[200px]">
                                                                        <div className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500 cursor-not-allowed font-medium min-h-[38px] flex items-center break-words">
                                                                            {item.description || "N/A"}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-3 text-gray-700 text-center w-16 min-w-[60px]">{item.tax_percent}%</td>
                                                                    <td className="px-3 py-3 text-center w-28 min-w-[100px]">
                                                                        <div className="flex items-center justify-center gap-1">
                                                                            <button
                                                                                onClick={() => handleItemChange(idx, "quantity", Math.max(0, (parseFloat(item.quantity) || 0) - 1))}
                                                                                className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 text-gray-600"
                                                                            >
                                                                                -
                                                                            </button>
                                                                            <input
                                                                                type="number"
                                                                                value={item.quantity ?? ""}
                                                                                onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                                                                                className={`w-full max-w-12 px-1 py-1.5 border rounded text-xs text-center h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                                                                    item.source_type !== "service" && (parseFloat(item.quantity) > (parseFloat(item.max_quantity) || 0) || parseFloat(item.quantity) <= 0)
                                                                                        ? "border-red-500 bg-red-50 text-red-900 focus:ring-red-500 focus:border-red-500"
                                                                                        : "border-gray-300 focus:ring-yellow-400"
                                                                                }`}
                                                                                placeholder="0"
                                                                            />
                                                                            <button
                                                                                onClick={() => {
                                                                                    const allowedMax = item.source_type === "service" ? 999999 : (parseFloat(item.max_quantity) || 0);
                                                                                    handleItemChange(idx, "quantity", Math.min(allowedMax, (parseFloat(item.quantity) || 0) + 1));
                                                                                }}
                                                                                className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 text-gray-600"
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </div>
                                                                        {item.source_type !== "service" ? (
                                                                            <span className="text-[9px] text-gray-400 block mt-1 leading-tight">
                                                                                Invoice Qty: {item.max_quantity}
                                                                            </span>
                                                                        ) : null}
                                                                    </td>
                                                                </>
                                                            )}
                                                            <td className="px-3 py-3 text-center w-32 min-w-[120px]">
                                                                <div className="flex items-center justify-end gap-1 border border-gray-200 bg-gray-50 rounded px-2 py-1 min-w-[100px] shadow-sm">
                                                                    <span className="text-gray-400 text-xs font-semibold">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        value={item.rate}
                                                                        className="w-full text-xs outline-none bg-transparent text-right font-bold text-gray-500 cursor-not-allowed"
                                                                        readOnly
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-3 text-right font-semibold text-gray-900 whitespace-nowrap w-32 min-w-[120px]">
                                                                ₹ {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="px-3 py-3 text-center w-10 min-w-[40px]">
                                                                <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                                                                    <FiTrash2 />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-col items-end gap-2 text-sm">
                                        <div className="flex justify-between w-full md:w-80">
                                            <span className="text-gray-600">Subtotal:</span>
                                            <span className="font-semibold text-gray-900">₹ {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between w-full md:w-80">
                                            <span className="text-gray-600">Tax:</span>
                                            <span className="font-semibold text-gray-900">₹ {totals.totalTax.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between w-full md:w-80 pt-2 border-t-2 border-gray-200 text-base">
                                            <span className="font-semibold text-gray-900">Total (INR):</span>
                                            <span className="font-bold text-teal-600">₹ {totals.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* References Section */}
                                <div className="font-poppins mt-10 md:mt-0">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4">References</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Notes</label>
                                            <textarea
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm h-24"
                                                placeholder="Add return terms or notes"
                                            ></textarea>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Attachment</label>
                                            <AttachmentUploader
                                                context="sales-invoice"
                                                existingUrl={formData.attachment}
                                                onUploaded={(url) => setFormData({ ...formData, attachment: url })}
                                                disabled={false}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-3 mt-8 pt-6 border-t font-poppins">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-6 py-2.5 text-[14px] font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSave()}
                                    disabled={isSaving || !hasChanges || hasStockErrors}
                                    className="px-6 py-2.5 border border-[#FFCA00] text-[#FFCA00] hover:bg-[#FFCA00] hover:text-white text-[14px] font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                                >
                                    {isSaving ? (
                                        <span className="flex items-center gap-2">
                                            <FiLoader className="animate-spin" size={16} /> {editData ? "Updating..." : "Saving..."}
                                        </span>
                                    ) : (
                                        editData ? "Update" : "Save"
                                    )}
                                </button>
                                {hasChanges ? (
                                    <button
                                        type="button"
                                        onClick={() => handleSave(null, true)}
                                        disabled={isSaving || hasStockErrors}
                                        className="px-6 py-2.5 bg-[#FFCA00] text-white text-[14px] font-bold rounded-lg hover:bg-[#d9ac00] disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                        {isSaving ? (
                                            <>
                                                <FiLoader className="animate-spin" size={16} /> {editData ? "Updating & Sending..." : "Saving & Sending..."}
                                            </>
                                        ) : (
                                            editData ? "Update & Send" : "Save & Send"
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (validateForm()) setStep(2);
                                        }}
                                        disabled={isSaving || hasStockErrors}
                                        className="px-6 py-2.5 bg-[#FFCA00] text-white text-[14px] font-bold rounded-lg hover:bg-[#d9ac00] disabled:opacity-50 transition-all cursor-pointer"
                                    >
                                        Submit
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 w-full max-w-4xl mx-auto">
                            <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4 no-print">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                                        {viewOnly ? "View Sales Return" : "Preview & Send"}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {isExporting ? "Processing..." : viewOnly ? "View details of your sales return" : "Review and send your sales return"}
                                    </p>
                                </div>
                                <div className="flex gap-4 text-gray-400 self-end sm:self-auto">
                                    <button onClick={handlePrint} className="p-1 hover:text-gray-900 transition-colors">
                                        <FiPrinter size={22} />
                                    </button>
                                    <button onClick={handleDownloadPDF} disabled={isExporting} className="p-1 hover:text-gray-900 transition-colors">
                                        {isExporting ? <FiLoader className="animate-spin" size={22} /> : <FiDownload size={22} />}
                                    </button>
                                </div>
                            </div>

                            {/* Document Preview */}
                            <div className="bg-gray-50 -mx-4 md:-mx-8 px-4 md:px-8 py-8 mb-6 rounded-xl overflow-y-auto md:overflow-y-visible overflow-x-hidden max-h-[80vh] md:max-h-none">
                                <div className="bg-white rounded-lg shadow-sm overflow-x-auto md:overflow-x-visible max-w-full md:max-w-4xl mx-auto">
                                    <div className="min-w-[800px] md:min-w-full">
                                        <DocumentPreview
                                            ref={docPreviewRef}
                                            type="SALES_INVOICE"
                                            filename={`SalesReturn-${formData.invoiceNumber}`}
                                            payload={{
                                                company: {
                                                    name: "BrandMagics Software Labs",
                                                    address: "123, Software Park Road",
                                                    city: "Kochi, Kerala, IN 682001",
                                                },
                                                party: (() => {
                                                    const c = customers.find(c => String(c.id) === String(formData.customer));
                                                    return { name: c?.name || "N/A", address: c?.address, email: c?.email, phone: c?.phone };
                                                })(),
                                                document: {
                                                    number: formData.invoiceNumber,
                                                    originalInvoiceNumber: formData.returnAgainst ? (allInvoices.find(i => i.id == formData.returnAgainst)?.invoice_number || "-") : undefined,
                                                    date: formData.invoiceDate,
                                                    reference: formData.invoiceName,
                                                    returnBreakdown: (() => {
                                                        if (!formData.returnAgainst) return null;

                                                        let originalTotal = 0;
                                                        let amountPaidOnOriginal = 0;
                                                        let originalTaxTotal = 0;
                                                        let totalReturned = totals.total;

                                                        if (editData?.invoice_summary) {
                                                            originalTotal = parseFloat(editData.invoice_summary.original_total) || 0;
                                                            amountPaidOnOriginal = parseFloat(editData.invoice_summary.amount_paid_on_original) || 0;
                                                            originalTaxTotal = parseFloat(editData.invoice_summary.original_tax_total) || 0;
                                                        } else {
                                                            const selectedInv = allInvoices.find(i => String(i.id) === String(formData.returnAgainst));
                                                            if (selectedInv) {
                                                                originalTotal = parseFloat(selectedInv.total_amount) || 0;
                                                                const remainingDue = parseFloat(selectedInv.remaining_due) || 0;
                                                                amountPaidOnOriginal = Math.max(0, originalTotal - remainingDue);
                                                                originalTaxTotal = (selectedInv.sales_item || []).reduce((sum, item) => {
                                                                    return sum + (parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 0) * ((parseFloat(item.tax_percent) || 0) / 100);
                                                                }, 0);
                                                            }
                                                        }

                                                        return {
                                                            originalTotal,
                                                            amountPaidOnOriginal,
                                                            originalTaxTotal,
                                                            totalReturned
                                                        };
                                                    })()
                                                },
                                                items: formData.items.map(item => {
                                                    let typeLabel = "Product";
                                                    let resolvedName = item.description;

                                                    if (item.source_type === "raw_material") {
                                                        typeLabel = "Product";
                                                        if (!resolvedName && item.item_id) resolvedName = rawMaterialsList.find(r => r.id == item.item_id)?.name;
                                                    } else if (item.source_type === "customized_product") {
                                                        typeLabel = "Customized Product";
                                                        if (!resolvedName && item.item_id) resolvedName = customizedProductsList.find(c => c.id == item.item_id)?.name;
                                                    } else if (item.source_type === "service") {
                                                        typeLabel = "Service";
                                                    } else {
                                                        if (!resolvedName && item.item_id) resolvedName = productsList.find(p => p.id == item.item_id)?.name;
                                                    }

                                                    return {
                                                        ...item,
                                                        item_type: typeLabel,
                                                        name: resolvedName || "N/A",
                                                        original_quantity: item.max_quantity ?? item.quantity,
                                                        return_quantity: item.quantity
                                                    };
                                                }),
                                                totals: [
                                                    { label: "Subtotal", value: totals.subtotal },
                                                    { label: "Tax", value: totals.totalTax },
                                                    { label: "Total Returned (INR)", value: totals.total, isGrand: true },
                                                ],
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {!viewOnly && (
                                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex flex-col lg:flex-row font-poppins">
                                    <div className="w-full lg:w-48 bg-white border-r border-gray-200 p-4 space-y-2">
                                        <button onClick={() => setActiveEmailTab('Email')} className={`w-full px-4 py-2 text-left rounded text-sm font-bold flex items-center gap-2 ${activeEmailTab === 'Email' ? 'bg-[#FFCA00] text-white' : 'text-gray-500'}`}><FiMail /> Email</button>
                                    </div>
                                    <div className="flex-1 p-6 bg-white space-y-4">
                                        {activeEmailTab === 'Email' ? (
                                            <>
                                                <div>
                                                    <label className="text-xs font-bold uppercase mb-2 block">To</label>
                                                    <input type="email" value={formData.emailConfig.to} readOnly className="w-full px-3 py-1.5 border border-gray-200 rounded bg-gray-50 text-gray-500 text-sm" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div><label className="text-xs font-bold uppercase mb-2 block">CC</label><input type="text" onChange={(e) => setFormData({ ...formData, emailConfig: { ...formData.emailConfig, cc: e.target.value } })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm" placeholder="Add recipients" /></div>
                                                    <div><label className="text-xs font-bold uppercase mb-2 block">BCC</label><input type="text" onChange={(e) => setFormData({ ...formData, emailConfig: { ...formData.emailConfig, bcc: e.target.value } })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm" placeholder="Add recipients" /></div>
                                                </div>
                                                <div><label className="text-xs font-bold uppercase mb-2 block">Message</label><textarea onChange={(e) => setFormData({ ...formData, emailConfig: { ...formData.emailConfig, message: e.target.value } })} className="w-full px-3 py-2 border border-gray-200 rounded h-32 resize-none text-sm" placeholder="Write message..."></textarea></div>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap justify-end items-center gap-3 mt-8 pt-6 border-t font-poppins no-print">
                                {viewOnly ? (
                                    <button onClick={handleClose} className="px-6 py-2.5 bg-[#FFCA00] text-white text-[14px] font-bold rounded-lg hover:bg-[#d9ac00]">Close</button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setStep(1)}
                                            className="px-6 py-2.5 text-gray-500 hover:bg-gray-100 rounded-lg text-[14px] font-semibold transition-all flex items-center justify-center gap-2"
                                        >
                                            <FiArrowLeft size={18} /> Back to Edit
                                        </button>
                                        <button
                                            onClick={handleSendEmail}
                                            disabled={isSaving || hasStockErrors}
                                            className="px-6 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#d9ac00]"
                                        >
                                            {isSaving ? <FiLoader size={18} className="animate-spin" /> : <FiSend size={18} />}
                                            {isSaving ? "Submitting..." : "Submit"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesReturnForm;
