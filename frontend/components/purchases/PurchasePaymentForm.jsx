"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    FiX, FiUser, FiTrash2, FiUpload, FiPrinter,
    FiDownload, FiMail, FiPaperclip,
    FiCreditCard, FiArrowLeft, FiSend, FiLoader, FiFileText, FiEye, FiPlus, FiChevronDown
} from "react-icons/fi";
import { useRouter, useSearchParams } from "next/navigation";
import { partyService } from "@/services/partyService";
import { itemService } from "@/services/itemService";
import { inventoryService } from "@/services/inventoryService";
import { purchasePaymentService } from "@/services/purchasePaymentService";
import { purchaseInvoiceService } from "@/services/purchaseInvoiceService";
import { accountService } from "@/services/accountService";
import { taxService } from "@/services/taxService";
import { showToast } from "@/lib/features/toast/toastSlice";
import { useDispatch } from "react-redux";
import CustomSelect from "@/components/common/CustomSelect";
import { generateUniqueId } from "@/utils/idGenerator";
import AttachmentUploader from "@/components/common/AttachmentUploader";
import SupplierModal from "./SupplierModal";
import DocumentPreview from "@/components/common/DocumentPreview";

const getInitialFormData = () => ({
    paymentNo: "",
    paymentName: "",
    status: "DRAFT",
    supplier: "",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: "CASH",
    items: [],
    notes: "",
    attachment: null,
    returnAgainst: "",
    payingAmount: "",
    isReturn: false,
    invoiceRemainingDue: 0,
    originalInvoiceAmount: 0,
    totalPaid: 0,
    emailConfig: {
        to: "",
        cc: "",
        bcc: "",
        message: ""
    }
});

const PurchasePaymentForm = ({ isOpen, onClose, onSave, editData = null, viewOnly = false }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();

    const [step, setStep] = useState(1);
    const [suppliers, setSuppliers] = useState([]);
    const [productsList, setProductsList] = useState([]);
    const [rawMaterialsList, setRawMaterialsList] = useState([]);
    const [customizedProductsList, setCustomizedProductsList] = useState([]);
    const [allInvoices, setAllInvoices] = useState([]);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [formData, setFormData] = useState(getInitialFormData());
    const [initialSnapshot, setInitialSnapshot] = useState(null);
    const [activeEmailTab, setActiveEmailTab] = useState("Email");
    const [isExporting, setIsExporting] = useState(false);
    const printRef = useRef(null);
    const docPreviewRef = useRef(null);

    const hasChanges = useMemo(() => {
        if (!initialSnapshot) return false;
        return JSON.stringify(formData) !== initialSnapshot;
    }, [formData, initialSnapshot]);

    const handleClose = () => {
        setFormData(getInitialFormData());
        setStep(1);
        onClose();
    };

    const calculateTotals = () => {
        let subtotal = 0;
        let totalTax = 0;

        formData.items.forEach(item => {
            const itemSubtotal = (parseFloat(item.rate) || 0) * (item.quantity || 0);
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

    const fetchSuppliers = async () => {
        try {
            setIsLoadingSuppliers(true);
            const data = await partyService.queryParties("SUPPLIER");
            setSuppliers(data);
        } catch (error) {
            console.error("Error fetching suppliers:", error);
        } finally {
            setIsLoadingSuppliers(false);
        }
    };

    const fetchItems = async () => {
        try {
            setIsLoadingItems(true);
            const [pRes, rmRes, cpRes] = await Promise.all([
                inventoryService.getProducts(),
                inventoryService.getRawMaterials(),
                inventoryService.getCustomizedProducts()
            ]);
            setProductsList(pRes.data || []);
            setRawMaterialsList(rmRes.data || []);
            setCustomizedProductsList(cpRes.data || []);
        } catch (error) {
            console.error("Error fetching items:", error);
        } finally {
            setIsLoadingItems(false);
        }
    };

    const fetchAllInvoices = async () => {
        try {
            const response = await purchasePaymentService.getPurchaseInvoicesForDropdown();
            // Handle the nested structure shown in the JSON: response.data.data
            const invoicesArray = response?.data?.data || response?.data || (Array.isArray(response) ? response : []);
            setAllInvoices(invoicesArray);
        } catch (error) {
            console.error("Error fetching all invoices:", error);
            setAllInvoices([]);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchSuppliers();
            fetchItems();
            fetchAllInvoices();

            let dataToSet;
            if (editData) {
                const supplier = Array.isArray(editData.supplier_id) ? editData.supplier_id[0] : editData.supplier_id;

                // Extract linked invoice data from deep-fetched invoice_id
                const linkedInvoice = Array.isArray(editData.invoice_id) ? editData.invoice_id[0] : (editData.invoice_id && typeof editData.invoice_id === 'object' ? editData.invoice_id : null);
                const invoiceId = linkedInvoice?.id || (typeof editData.invoice_id === 'number' ? editData.invoice_id : null);

                dataToSet = {
                    paymentNo: editData.payment_number || editData.payment_no || "",
                    paymentName: editData.payment_name || "",
                    status: editData.status || "DRAFT",
                    supplier: supplier?.id || (typeof editData.supplier_id !== 'object' ? editData.supplier_id : ""),
                    paymentDate: editData.payment_date ? new Date(editData.payment_date).toISOString().split('T')[0] : "",
                    paymentMode: editData.payment_mode?.toUpperCase() || "CASH",
                    items: Array.isArray(editData.payment_item) ? editData.payment_item.map(item => {
                        const rawMat = item.raw_material;
                        const itemsObj = item.items;
                        const sourceType = rawMat ? "raw_material" : (itemsObj?.item_type === "CUSTOMISED PRODUCTS" ? "customized_product" : (item.source_type || "item"));
                        
                        return {
                            id: item.id,
                            item_id: (item.source_id || rawMat?.id || itemsObj?.id || "").toString(),
                            source_id: (item.source_id || rawMat?.id || itemsObj?.id || "").toString(),
                            source_type: sourceType,
                            description: item.description || rawMat?.name || itemsObj?.name || "",
                            tax_id: item.tax_id || itemsObj?.tax || "",
                            tax_percent: parseFloat(item.tax_percent) || 0,
                            quantity: parseFloat(item.quantity) || 1,
                            rate: parseFloat(item.rate) || 0,
                            amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0),
                            min_order_quantity: itemsObj?.min_order_quantity || 1
                        };
                    }) : [],
                    notes: editData.notes || "",
                    attachment: editData.attachment || editData.attachmentkey || null,
                    returnAgainst: invoiceId || "",
                    payingAmount: parseFloat(editData.amount) || 0,
                    isReturn: !!linkedInvoice?.is_return,
                    // Financial card calculations from API response:
                    // Net Amount (Total) = invoice_id[0].total_amount
                    originalInvoiceAmount: editData.invoice_summary?.invoice_total !== undefined 
                        ? parseFloat(editData.invoice_summary.invoice_total)
                        : parseFloat(linkedInvoice?.total_amount || 0),
                        
                    totalPaid: (() => {
                        const isDraft = !editData.status || editData.status === "DRAFT" || editData.status === "PENDING";
                        const curAmt = parseFloat(editData.amount || 0);
                        if (editData.invoice_summary?.total_paid !== undefined) {
                            return isDraft ? parseFloat(editData.invoice_summary.total_paid) : Math.max(0, parseFloat(editData.invoice_summary.total_paid) - curAmt);
                        }
                        return linkedInvoice?.return_against ? 0 : (parseFloat(linkedInvoice?.total_amount || 0) - parseFloat(editData.due_amount || 0) - curAmt);
                    })(),
                        
                    invoiceRemainingDue: (() => {
                        const isDraft = !editData.status || editData.status === "DRAFT" || editData.status === "PENDING";
                        const curAmt = parseFloat(editData.amount || 0);
                        if (editData.invoice_summary?.net_payable !== undefined) {
                            return isDraft ? parseFloat(editData.invoice_summary.net_payable) : (parseFloat(editData.invoice_summary.net_payable) + curAmt);
                        }
                        return parseFloat(editData.due_amount || 0) + curAmt;
                    })(),
                    emailConfig: {
                        to: supplier?.email || (Array.isArray(editData.supplier_id) ? editData.supplier_id[0]?.email : editData.supplier_id?.email) || "",
                        cc: "",
                        bcc: "",
                        message: `Dear ${supplier?.name || "Supplier"},\n\nPlease find attached the payment details for our recent purchase. Thank you.`
                    }
                };
            } else {
                dataToSet = {
                    ...getInitialFormData(),
                    paymentNo: generateUniqueId("PAY"),
                    paymentDate: new Date().toISOString().split('T')[0],
                };
            }

            setFormData(dataToSet);
            if (viewOnly) setStep(2);
            setInitialSnapshot(JSON.stringify(dataToSet));
        }
    }, [isOpen, editData]);
    
    // Secondary Effect: Sync invoice-based financial cards once allInvoices list is loaded
    // Only used for create-mode (no editData) when user picks an invoice from dropdown
    useEffect(() => {
        if (!editData && formData.returnAgainst && allInvoices.length > 0) {
            const linkedInv = allInvoices.find(inv => inv.id == formData.returnAgainst);
            if (linkedInv) {
                setFormData(prev => ({
                    ...prev,
                    originalInvoiceAmount: parseFloat(linkedInv.total_amount) || 0,
                    totalPaid: linkedInv.return_against ? 0 : (parseFloat(linkedInv.total_paid) || 0),
                    invoiceRemainingDue: parseFloat(linkedInv.remaining_due) || 0,
                    isReturn: !!linkedInv.is_return,
                    payingAmount: linkedInv.is_return ? (parseFloat(linkedInv.remaining_due) || 0).toString() : prev.payingAmount,
                    items: Array.isArray(linkedInv.purchase_item) ? linkedInv.purchase_item.map(item => ({
                        id: item.id,
                        item_id: (item.source_id || (item.items?.id || item.items) || "").toString(),
                        source_id: (item.source_id || (item.items?.id || item.items) || "").toString(),
                        source_type: item.source_type === "item" ? (
                            item.items?.item_type === "RAW MATERIALS" ? "raw_material" :
                            item.items?.item_type === "CUSTOMISED PRODUCTS" ? "customized_product" : "item"
                        ) : (item.source_type || (item.raw_material ? "raw_material" : "item")),
                        description: item.description || item.items?.name || item.raw_material?.name || "",
                        tax_id: item.tax_id || item.items?.tax || "",
                        tax_percent: parseFloat(item.tax_percent) || 0,
                        quantity: parseFloat(item.quantity) || 1,
                        rate: parseFloat(item.rate) || 0,
                        amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0),
                        min_order_quantity: item.items?.min_order_quantity || 1
                    })) : []
                }));
            }
        }
    }, [allInvoices.length, editData?.id, formData.returnAgainst]);


    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { item_id: "", source_type: "item", tax_id: "", tax_percent: 0, quantity: 1, rate: 0, amount: 0, description: "" }]
        }));
    };

    const handleAddSupplierClick = () => {
        setIsSupplierModalOpen(true);
    };

    const handleSupplierSave = async (response) => {
        // Wait for 2 seconds before refreshing, as requested by the user
        setTimeout(async () => {
            try {
                // Refresh suppliers list
                const data = await partyService.queryParties("SUPPLIER");
                setSuppliers(data);

                // Try to extract the new supplier ID from response
                // response usually looks like { data: [ { id: ... } ] } for save-single-or-multiple
                const newSupplierId = response?.data?.[0]?.id || response?.id;

                if (newSupplierId) {
                    setFormData(prev => ({
                        ...prev,
                        supplier: newSupplierId.toString()
                    }));
                }
            } catch (error) {
                console.error("Error refreshing suppliers:", error);
            }
        }, 2000);
    };

    const handleRemoveItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = async (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        if (field === "item_id") {
            let selectedItem;
            if (newItems[index].source_type === "raw_material") {
                selectedItem = rawMaterialsList.find(i => i.id.toString() == value.toString());
            } else if (newItems[index].source_type === "customized_product") {
                selectedItem = customizedProductsList.find(i => i.id.toString() == value.toString());
            } else {
                selectedItem = productsList.find(i => i.id.toString() == value.toString());
            }

            if (selectedItem) {
                newItems[index].rate = parseFloat(selectedItem.rate || 0);
                newItems[index].description = selectedItem.name || "";
                newItems[index].source_id = selectedItem.id;
                newItems[index].quantity = 1;
                newItems[index].amount = newItems[index].rate * 1;

                if (selectedItem.tax) {
                    try {
                        const taxResponse = await taxService.getTaxCodeById(selectedItem.tax);
                        const taxData = taxResponse.data;
                        const taxRates = taxData?.tax_rates || {};
                        const totalTaxPercent = Object.values(taxRates).reduce((sum, r) => sum + (parseFloat(r) || 0), 0);
                        newItems[index].tax_percent = totalTaxPercent;
                        newItems[index].tax_id = selectedItem.tax;
                    } catch (error) {
                        console.error("Error fetching tax:", error);
                    }
                }
            }
        }

        // Return Mode constraints
        if (formData.returnAgainst && maxQty !== undefined && qty > maxQty) {
            dispatch(showToast({
                message: `Quantity cannot exceed original invoice quantity (${maxQty})`,
                type: "warning"
            }));
            newItems[index].quantity = maxQty;
        }

        if (field === "quantity" || field === "rate") {
            const qty = field === "quantity" ? (parseFloat(value) || 0) : (parseFloat(newItems[index].quantity) || 0);
            const rate = field === "rate" ? (parseFloat(value) || 0) : (parseFloat(newItems[index].rate) || 0);
            newItems[index].amount = qty * rate;
        }

        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const validateForm = () => {
        if (!formData.paymentName?.trim()) {
            dispatch(showToast({ message: "Payment Name is required", type: "warning" }));
            return false;
        }
        if (!formData.supplier) {
            dispatch(showToast({ message: "Supplier is required", type: "warning" }));
            return false;
        }
        if (!formData.paymentDate) {
            dispatch(showToast({ message: "Payment Date is required", type: "warning" }));
            return false;
        }
        if (formData.returnAgainst) {
            if (!formData.payingAmount || parseFloat(formData.payingAmount) <= 0) {
                dispatch(showToast({ message: "Amount Paid is required and must be greater than 0", type: "warning" }));
                return false;
            }
            if (parseFloat(formData.payingAmount) > formData.invoiceRemainingDue) {
                dispatch(showToast({ message: `Paying Amount cannot exceed balance due (₹${formData.invoiceRemainingDue.toLocaleString()})`, type: "warning" }));
                return false;
            }
        } else {
            if (formData.items.length === 0 || formData.items.some(i => !i.item_id)) {
                dispatch(showToast({ message: "At least one item with a valid selection is required", type: "warning" }));
                return false;
            }
        }

        return true;
    };

    const handleSave = async (forcedStatus = null, isSendToClient = false, isSendOnly = false) => {
        if (!validateForm()) return;
        setIsSaving(true);
        try {
            const payload = {
                payment_number: formData.paymentNo,
                payment_name: formData.paymentName,
                payment_date: formData.paymentDate,
                payment_mode: formData.paymentMode?.toUpperCase(),
                amount: Number(formData.payingAmount) || 0,
                due_amount: Number(formData.invoiceRemainingDue) - (Number(formData.payingAmount) || 0),
                invoice_id: Number(formData.returnAgainst),
                notes: formData.notes || "",
                status: forcedStatus || formData.status || "DRAFT",
            };

            // Only include supplier_id and items on create, not on edit
            if (!editData) {
                payload.supplier_id = Number(formData.supplier);
                payload.items = formData.items.map(item => ({
                    source_id: Number(item.item_id),
                    source_type: item.source_type,
                    quantity: Number(item.quantity) || 0,
                    rate: parseFloat(item.rate) || 0,
                    tax_percent: parseFloat(item.tax_percent) || 0,
                    tax_id: item.tax_id ? Number(item.tax_id) : null,
                    amount: Number(item.amount.toFixed(2))
                }));
            }

            // Attachment is already a CDN URL (uploaded by AttachmentUploader on file-select)
            payload.attachmentkey = formData.attachment || null;

            let response;
            if (editData) {
                response = await purchasePaymentService.updatePayment(editData.id, payload);
                dispatch(showToast({ message: "Payment updated successfully!", type: "success" }));
            } else {
                response = await purchasePaymentService.createPayment(payload);
                dispatch(showToast({ message: "Payment recorded successfully!", type: "success" }));
            }

            setInitialSnapshot(JSON.stringify(formData));
            
            const newId = response?.data?.data?.id || response?.data?.id || response?.data?.[0]?.id || response?.id || editData?.id;

            if (isSendToClient && newId) {
                try {
                    const emailData = {
                        documentType: "PURCHASE_PAYMENT",
                        documentId: newId.toString(),
                        email: {
                            to: formData.emailConfig.to || "",
                            cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                            bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                            message: formData.emailConfig.message || ""
                        }
                    };
                    await purchasePaymentService.sendPaymentEmail(emailData);
                    dispatch(showToast({ message: "Email sent successfully!", type: "success" }));
                    if (onSave) onSave(newId, "EMAIL_SENT");
                } catch (emailError) {
                    console.error("Error sending email:", emailError);
                    dispatch(showToast({ message: emailError?.message || "Payment recorded, but failed to send email", type: "error" }));
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
            console.error("Error saving payment:", error);
            dispatch(showToast({ message: "Error saving purchase payment.", type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendEmail = async () => {
        if (!editData) return;
        setIsSaving(true);
        try {
            const emailData = {
                documentType: "PURCHASE_PAYMENT",
                documentId: editData.id.toString(),
                email: formData.emailConfig
            };
            await purchasePaymentService.sendPaymentEmail(emailData);
            dispatch(showToast({ message: "Email sent successfully!", type: "success" }));
            onSave(editData.id, true);
            handleClose();
        } catch (error) {
            console.error("Error sending email:", error);
            dispatch(showToast({ message: "Failed to send email.", type: "error" }));
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => docPreviewRef.current?.print();
    const handleDownloadPDF = async () => {
        try {
            setIsExporting(true);
            await docPreviewRef.current?.downloadPDF();
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95dvh] overflow-y-auto">
                <div className="p-4 md:p-8 relative">
                    {step === 1 ? (
                        <div>
                            <div className="flex flex-wrap justify-between items-start mb-6 gap-2 font-poppins">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-semibold text-gray-900">{editData ? "Edit Purchase Payment" : "Add New Purchase Payment"}</h2>
                                    <p className="text-sm text-gray-500 mt-1">Setup purchase payment details and items</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${(!editData || hasChanges) ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-gray-100 text-gray-500"}`}>
                                    {(!editData || hasChanges) ? "Not Saved" : (formData.status || "DRAFT")}
                                </div>
                            </div>

                            <div className="border-t pt-6 font-poppins">
                                {/* Details Section */}
                                <div className="mb-8 font-poppins">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-6 uppercase tracking-wider">Details</h3>

                                    {/* Select Purchase Invoice - Only for NEW payments */}
                                    {!editData && (
                                        <div className="mb-8">
                                            <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-widest">Select Purchase Invoice to start</label>
                                            <CustomSelect
                                                value={formData.returnAgainst}
                                                onChange={async (val) => {
                                                    const selectedInv = allInvoices.find(i => i.id == val);
                                                    if (selectedInv) {
                                                        const supplier = selectedInv.supplier_id;

                                                        const updatedItems = Array.isArray(selectedInv.purchase_item) ? selectedInv.purchase_item.map(item => ({
                                                            id: undefined,
                                                            item_id: item.items?.id || item.raw_material?.id || item.items || item.raw_material ? Number(item.items?.id || item.raw_material?.id || item.items || item.raw_material) : "",
                                                            source_id: item.items?.id || item.raw_material?.id || item.items || item.raw_material ? Number(item.items?.id || item.raw_material?.id || item.items || item.raw_material) : "",
                                                            source_type: item.raw_material ? "raw_material" : "item",
                                                            description: item.description || item.items?.name || item.raw_material?.name || "",
                                                            tax_id: item.tax_id || item.items?.tax || "",
                                                            tax_percent: parseFloat(item.tax_percent) || 0,
                                                            quantity: parseFloat(item.quantity) || 1,
                                                            max_quantity: parseFloat(item.quantity) || 1,
                                                            rate: parseFloat(item.rate) || 0,
                                                            amount: (parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 1),
                                                            min_order_quantity: item.items?.min_order_quantity || 1
                                                        })) : [];

                                                        setFormData({
                                                            ...formData,
                                                            returnAgainst: val,
                                                            supplier: supplier?.id || (typeof supplier === 'number' ? supplier : ""),
                                                            paymentName: selectedInv.invoice_name || `Payment for ${selectedInv.invoice_number}`,
                                                            items: updatedItems,
                                                            isReturn: !!selectedInv.is_return,
                                                            payingAmount: selectedInv.is_return ? (parseFloat(selectedInv.remaining_due) || 0).toString() : "",
                                                            invoiceRemainingDue: parseFloat(selectedInv.remaining_due) || 0,
                                                            originalInvoiceAmount: parseFloat(selectedInv.total_amount) || 0,
                                                            totalPaid: selectedInv.return_against ? 0 : (parseFloat(selectedInv.total_paid) || 0),
                                                            emailConfig: { ...formData.emailConfig, to: supplier?.email || "" }
                                                        });
                                                    } else {
                                                        setFormData({ ...formData, returnAgainst: val });
                                                    }
                                                }}
                                                options={(Array.isArray(allInvoices) ? allInvoices : []).map(i => ({
                                                    value: i.id,
                                                    label: `${i.invoice_number} - ${i.invoice_name || ""}`
                                                }))}
                                                placeholder="-- Choose a Purchase Invoice to start --"
                                            />
                                        </div>
                                    )}

                                    {formData.returnAgainst && (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Payment Number Series</label>
                                                    <input
                                                        type="text"
                                                        value={formData.paymentNo}
                                                        onChange={(e) => setFormData({ ...formData, paymentNo: e.target.value })}
                                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:outline-none"
                                                        placeholder="PPN"
                                                        readOnly
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Payment Name</label>
                                                    <input type="text" value={formData.paymentName} onChange={(e) => setFormData({ ...formData, paymentName: e.target.value })} placeholder="Enter Payment Name" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#FFCA00] outline-none" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Quote Date</label>
                                                    <input type="date" value={formData.paymentDate} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#FFCA00] outline-none" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Supplier</label>
                                                    <input
                                                        type="text"
                                                        value={suppliers.find(s => s.id == formData.supplier)?.name || "Selected Supplier"}
                                                        readOnly
                                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed h-[42px]"
                                                        placeholder="Enter Supplier Name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Payment Mode</label>
                                                    <CustomSelect
                                                        value={formData.paymentMode}
                                                        onChange={(val) => setFormData({ ...formData, paymentMode: val })}
                                                        options={[
                                                            { value: "BANK_TRANSFER", label: "Bank Transfer" },
                                                            { value: "UPI", label: "UPI" },
                                                            { value: "NEFT", label: "NEFT" },
                                                            { value: "CHEQUE", label: "Cheque" },
                                                            { value: "CASH", label: "Cash" }
                                                        ]}
                                                        placeholder="Select"
                                                        className="border border-gray-300 rounded-lg"
                                                    />
                                                </div>
                                            </div>

                                            {/* Payment Amount Details Section */}
                                            <div className="mb-10 font-poppins">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-6 uppercase tracking-wider">Payment Amount Details</h3>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">Net Amount (Total)</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={(totals.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">Total Paid Amount</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={(formData.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">Balance Due</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={(formData.invoiceRemainingDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-900 font-medium outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-700 mb-1.5 block uppercase tracking-tight">Current Paying Amount</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                                            <input
                                                                type="text"
                                                                value={formData.payingAmount}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/,/g, '');
                                                                    if (!isNaN(val) || val === "" || val === ".") {
                                                                        setFormData({ ...formData, payingAmount: val });
                                                                    }
                                                                }}
                                                                className={`w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all shadow-sm outline-none ${formData.isReturn ? "bg-gray-50 text-gray-500 cursor-not-allowed font-medium" : "text-gray-900 focus:ring-1 focus:ring-[#FFCA00]"}`}
                                                                placeholder="0.00"
                                                                readOnly={formData.isReturn}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-700 mb-1.5 block uppercase tracking-tight">Balance After Payment</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={(formData.invoiceRemainingDue - (parseFloat(formData.payingAmount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-900 font-medium outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {formData.returnAgainst && (
                                    <div className="mb-8 font-poppins">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Items</h3>
                                        <div className="border border-gray-300 rounded overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm min-w-[700px]">
                                                    <thead className="bg-gray-50 border-b border-gray-300">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">#</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Item</th>
                                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">Tax</th>
                                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">Quantity</th>
                                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">Rate</th>
                                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Amount</th>
                                                            <th className="px-3 py-2"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {formData.items.map((item, idx) => (
                                                            <tr key={idx} className="border-b border-gray-200">
                                                                <td className="px-3 py-3 text-gray-700">{idx + 1}</td>
                                                                {item.source_type === "service" ? (
                                                                    <td colSpan={4} className="px-3 py-3">
                                                                        <input
                                                                            type="text"
                                                                            value={item.description}
                                                                            readOnly
                                                                            className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded text-sm outline-none h-[38px] cursor-default"
                                                                        />
                                                                    </td>
                                                                ) : (
                                                                    <>
                                                                        <td className="px-3 py-3">
                                                                            <input
                                                                                type="text"
                                                                                value={(() => {
                                                                                    const list = item.source_type === "raw_material" ? rawMaterialsList :
                                                                                                 item.source_type === "customized_product" ? customizedProductsList : productsList;
                                                                                    const found = list.find(i => i.id.toString() === (item.item_id || "").toString());
                                                                                    return found?.name || item.description || "N/A";
                                                                                })()}
                                                                                readOnly
                                                                                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded text-sm outline-none h-[38px] cursor-default font-medium text-gray-700"
                                                                            />
                                                                        </td>
                                                                        <td className="px-3 py-3 text-gray-700 text-center">{item.tax_percent}%</td>
                                                                        <td className="px-3 py-3 text-center">
                                                                            <input
                                                                                type="number"
                                                                                value={item.quantity}
                                                                                readOnly
                                                                                className="w-full max-w-16 px-2 py-1.5 border border-gray-200 bg-gray-50 rounded text-xs text-center h-[32px] cursor-default"
                                                                            />
                                                                        </td>
                                                                        <td className="px-3 py-3 text-gray-900 whitespace-nowrap text-center">₹ {(parseFloat(item.rate) || 0).toLocaleString()}</td>
                                                                    </>
                                                                )}
                                                                <td className="px-3 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                                                                    {item.source_type === "service" ? (
                                                                        <div className="flex items-center justify-end gap-1 border border-gray-200 bg-gray-50 rounded px-2 py-1.5 min-w-[120px]">
                                                                            <span className="text-gray-400 text-xs font-semibold">₹</span>
                                                                            <span className="text-xs font-bold text-gray-900 text-right">{parseFloat(item.rate || 0).toLocaleString()}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <>₹ {(item.amount || 0).toLocaleString()}</>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-3 text-center">
                                                                    {/* Actions removed for view-only payment form */}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {/* Add New Item removed for view-only payment form */}
                                        </div>
                                        <div className="mt-4 flex flex-col items-end gap-2 text-sm">
                                            <div className="flex justify-between w-full md:w-80">
                                                <span className="text-gray-600">Subtotal:</span>
                                                <span className="font-semibold text-gray-900">₹ {totals.subtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between w-full md:w-80">
                                                <span className="text-gray-600">Tax:</span>
                                                <span className="font-semibold text-gray-900">₹ {totals.totalTax.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between w-full md:w-80 pt-2 border-t-2 border-gray-200 text-base">
                                                <span className="font-semibold text-gray-900">Total (INR):</span>
                                                <span className="font-bold text-teal-600">₹ {totals.total.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* References Sections */}
                                {formData.returnAgainst && (
                                    <div className="font-poppins">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-4">References</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Notes</label>
                                                <textarea
                                                    value={formData.notes}
                                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm h-24"
                                                    placeholder="Add payment terms or notes"
                                                ></textarea>
                                            </div>
                                            <div className="max-w-xs">
                                                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Attachment</label>
                                                <AttachmentUploader
                                                    context="purchase-payment"
                                                    existingUrl={formData.attachment}
                                                    onUploaded={(url) => setFormData({ ...formData, attachment: url })}
                                                    disabled={false}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                                <div className="flex flex-row flex-wrap items-center justify-end gap-2 sm:gap-3 mt-8 pt-6 border-t font-poppins px-1 sm:px-0">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-[14px] font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </button>
                                    {formData.returnAgainst && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleSave()}
                                                disabled={isSaving || !hasChanges}
                                                className="px-3 sm:px-6 py-2 sm:py-2.5 border border-[#FFCA00] text-[#FFCA00] hover:bg-[#FFCA00] hover:text-white text-xs sm:text-[14px] font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                                            >
                                                {isSaving ? (
                                                    <span className="flex items-center gap-2">
                                                        <FiLoader className="animate-spin" size={16} /> {editData ? "Updating..." : "Saving..."}
                                                    </span>
                                                ) : (
                                                    "Save"
                                                )}
                                            </button>
                                            {hasChanges ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSave(null, true)}
                                                    disabled={isSaving}
                                                    className="px-3 sm:px-6 py-2 sm:py-2.5 bg-[#FFCA00] text-white text-xs sm:text-[14px] font-bold rounded-lg hover:bg-[#d9ac00] disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                                                >
                                                    {isSaving ? (
                                                        <>
                                                            <FiLoader className="animate-spin" size={16} /> Saving & Sending...
                                                        </>
                                                    ) : (
                                                        <>
                                                            Save & Send
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (validateForm()) setStep(2);
                                                    }}
                                                    disabled={isSaving}
                                                    className="px-3 sm:px-6 py-2 sm:py-2.5 bg-[#FFCA00] text-white text-xs sm:text-[14px] font-bold rounded-lg hover:bg-[#d9ac00] disabled:opacity-50 transition-all cursor-pointer"
                                                >
                                                    Submit
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 w-full max-w-4xl mx-auto">
                             <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4 no-print">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                                        {viewOnly ? "View Purchase Payment" : "Preview & Send"}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {isExporting ? "Processing..." : viewOnly ? "View details of your purchase payment" : "Review and send your purchase payment"}
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

                            {/* ── Document Preview ─────────────────────────────────────── */}
                            <div className="bg-gray-50 -mx-4 md:-mx-8 px-4 md:px-8 py-8 mb-6 rounded-xl overflow-y-auto md:overflow-y-visible overflow-x-hidden max-h-[80vh] md:max-h-none">
                                <div className="bg-white rounded-lg shadow-sm overflow-x-auto md:overflow-x-visible max-w-full md:max-w-4xl mx-auto">
                                    <div className="min-w-[800px] md:min-w-full">
                                    <DocumentPreview
                                        ref={docPreviewRef}
                                        type="PURCHASE_PAYMENT"
                                        filename={`PurchasePayment-${formData.paymentNo}`}
                                            payload={{
                                                company: {
                                                    name: "BrandMagics Software Labs",
                                                    address: "123, Software Park Road",
                                                    city: "Kochi, Kerala, IN 682001",
                                                },
                                                party: (() => {
                                                    const s = suppliers.find(s => String(s.id) === String(formData.supplier));
                                                    return { name: s?.name || "N/A", address: s?.address, email: s?.email, phone: s?.phone };
                                                })(),
                                                document: {
                                                    number:     formData.paymentNo,
                                                    date:       formData.paymentDate,
                                                    reference:  formData.paymentName,
                                                    status: formData.returnAgainst ? ((formData.invoiceRemainingDue - (parseFloat(formData.payingAmount) || 0)) <= 0.01 ? "FULLY_PAID" : "PARTIALLY_PAID") : "PAID",
                                                    paymentBreakdown: {
                                                        originalTotal: totals.total,
                                                        alreadyPaid: formData.totalPaid,
                                                        payingNow: parseFloat(formData.payingAmount) || 0,
                                                        balanceDue: formData.invoiceRemainingDue - (parseFloat(formData.payingAmount) || 0),
                                                        isReturn: formData.isReturn
                                                    }
                                                },
                                                items: formData.items.map(item => {
                                                    const list = item.source_type === "raw_material" ? rawMaterialsList :
                                                                 item.source_type === "customized_product" ? customizedProductsList : productsList;
                                                    const found = list.find(i => String(i.id) === String(item.item_id));
                                                    return {
                                                        ...item,
                                                        name: found?.name || item.description || "N/A"
                                                    };
                                                }),
                                                totals: [
                                                    { label: "Subtotal", value: totals.subtotal },
                                                    { label: "Tax", value: totals.totalTax },
                                                    { label: "Total Amount", value: totals.total, isGrand: true },
                                                ],
                                            }}
                                    />
                                </div>
                            </div></div>


                            {!viewOnly && (
                                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex flex-col lg:flex-row font-poppins">
                                    <div className="w-full lg:w-48 bg-white border-r border-gray-200 p-4 space-y-2">
                                        <button onClick={() => setActiveEmailTab('Email')} className={`w-full px-4 py-2 text-left rounded text-sm font-bold flex items-center gap-2 ${activeEmailTab === 'Email' ? 'bg-[#FFCA00] text-white' : 'text-gray-500'}`}><FiMail /> Email</button>
                                        <button onClick={() => setActiveEmailTab('Attachments')} className={`w-full px-4 py-2 text-left rounded text-sm font-bold flex items-center gap-2 ${activeEmailTab === 'Attachments' ? 'bg-[#FFCA00] text-white' : 'text-gray-500'}`}><FiPaperclip /> Attachments</button>
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
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-100 rounded text-gray-300">
                                                <FiPaperclip size={32} className="mb-2" />
                                                {formData.attachment ? <p className="text-xs font-bold text-gray-900">{formData.attachment instanceof File ? formData.attachment.name : "Stored File"}</p> : <p className="text-xs font-bold uppercase">No attachments</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-row flex-wrap justify-end items-center gap-2 sm:gap-3 mt-8 pt-6 border-t font-poppins no-print px-1 sm:px-0">
                                {viewOnly ? (
                                    <button onClick={handleClose} className="px-3 sm:px-6 py-2 sm:py-2.5 bg-[#FFCA00] text-white text-xs sm:text-[14px] font-bold rounded-lg hover:bg-[#d9ac00]">Close Form</button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setStep(1)}
                                            className="px-3 sm:px-6 py-2 sm:py-2.5 text-gray-500 hover:bg-gray-100 rounded-lg text-xs sm:text-[14px] font-semibold transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <FiArrowLeft size={18} /> Back to Edit
                                        </button>
                                        <button
                                            onClick={handleSendEmail}
                                            disabled={isSaving}
                                            className="px-3 sm:px-6 py-2 sm:py-2.5 bg-[#FFCA00] text-white rounded-lg text-xs sm:text-[14px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 hover:bg-[#d9ac00] whitespace-nowrap"
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

            <SupplierModal
                isOpen={isSupplierModalOpen}
                onClose={() => setIsSupplierModalOpen(false)}
                onSave={handleSupplierSave}
            />
        </div>
    );
};

export default PurchasePaymentForm;