"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    FiX, FiUser, FiTrash2, FiUpload, FiPrinter,
    FiDownload, FiMail, FiPaperclip,
    FiCreditCard, FiArrowLeft, FiSend, FiLoader, FiFileText, FiEye
} from "react-icons/fi";
import { useRouter, useSearchParams } from "next/navigation";
import { partyService } from "@/services/partyService";
import { itemService } from "@/services/itemService";
import { purchaseOrderService } from "@/services/purchaseOrderService";
import { inventoryService } from "@/services/inventoryService";
import { taxService } from "@/services/taxService";
import { showToast } from "@/lib/features/toast/toastSlice";
import { useDispatch } from "react-redux";
import CustomSelect from "@/components/common/CustomSelect";
import { generateUniqueId } from "@/utils/idGenerator";
import AttachmentUploader from "@/components/common/AttachmentUploader";
import SupplierModal from "./SupplierModal";
import DocumentPreview from "@/components/common/DocumentPreview";
import RawMaterialForm from "@/components/sales/RawMaterialForm";
import SalesSpecialItemForm from "@/components/sales/SalesSpecialItemForm";

const findIdInObject = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.item_id !== undefined && obj.item_id !== null) return obj.item_id;
    if (obj.id !== undefined && obj.id !== null) return obj.id;
    for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
            const found = findIdInObject(obj[key]);
            if (found !== null && found !== undefined) return found;
        }
    }
    return null;
};

const getInitialFormData = () => ({
    orderNo: "",
    orderName: "",
    status: "DRAFT",
    supplier: "",
    orderDate: new Date().toISOString().split('T')[0],
    items: [
        { item_id: "", source_type: "raw_material", tax_id: "", tax_percent: 0, quantity: 1, rate: 0, amount: 0, description: "" }
    ],
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

const PurchaseOrderForm = ({ isOpen, onClose, onSave, editData = null, viewOnly = false }) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const dispatch = useDispatch();
    const [step, setStep] = useState(1);
    const [suppliers, setSuppliers] = useState([]);
    const [productsList, setProductsList] = useState([]);
    const [rawMaterialsList, setRawMaterialsList] = useState([]);
    const [customizedProductsList, setCustomizedProductsList] = useState([]);
    const [lockedCountry, setLockedCountry] = useState(null);
    const [allOrders, setAllOrders] = useState([]);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [formData, setFormData] = useState(getInitialFormData());
    const [initialSnapshot, setInitialSnapshot] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [activeEmailTab, setActiveEmailTab] = useState("Email");
    const [isAttachmentLoading, setIsAttachmentLoading] = useState(false);
    const [taxes, setTaxes] = useState([]);
    const [isMaterialFormOpen, setIsMaterialFormOpen] = useState(false);
    const [isSpecialItemFormOpen, setIsSpecialItemFormOpen] = useState(false);
    const [activeRowIdx, setActiveRowIdx] = useState(null);
    const [isSavingPopup, setIsSavingPopup] = useState(false);
    const printRef = useRef(null);
    const docPreviewRef = useRef(null);

    const hasChanges = useMemo(() => {
        if (!initialSnapshot) return false;
        return JSON.stringify(formData) !== initialSnapshot;
    }, [formData, initialSnapshot]);

    const handleClose = () => {
        setFormData(getInitialFormData());
        setStep(1);
        setLockedCountry(null);
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

    // Fetch suppliers
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

    // Fetch items across all categories
    const fetchItems = async (countryFilter = null) => {
        try {
            setIsLoadingItems(true);
            const [prodRes, rawRes, customRes] = await Promise.all([
                inventoryService.getProducts({ country: countryFilter }),
                inventoryService.getRawMaterials({ country: countryFilter }),
                inventoryService.getCustomizedProducts({ country: countryFilter })
            ]);

            const pList = prodRes.data || [];
            const rList = rawRes.data || [];
            const cList = customRes.data || [];

            setProductsList(pList);
            setRawMaterialsList(rList);
            setCustomizedProductsList(cList);

            return { productsList: pList, rawMaterialsList: rList, customizedProductsList: cList };
        } catch (error) {
            console.error("Error fetching items:", error);
            return null;
        } finally {
            setIsLoadingItems(false);
        }
    };

    // Fetch all orders for "Return Against"
    const fetchAllOrders = async (returnAgainstId = null) => {
        try {
            const orders = await purchaseOrderService.getAllOrdersForDropdown(returnAgainstId);
            setAllOrders(orders);
        } catch (error) {
            console.error("Error fetching all orders:", error);
        }
    };

    const fetchTaxes = async () => {
        try {
            const data = await taxService.getTaxCodes();
            setTaxes(data || []);
        } catch (error) {
            console.error("Error fetching taxes:", error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchSuppliers();
            fetchTaxes();

            const checkEditTaxAndFetch = async () => {
                let countryToFilter = null;
                if (editData && Array.isArray(editData.order_item) && editData.order_item.length > 0) {
                    const firstItem = editData.order_item.find(item => {
                        let sourceType = item.source_type || "item";
                        if (sourceType === "item") sourceType = "customized_product";
                        return sourceType !== "service";
                    });
                    if (firstItem) {
                        const taxVal = firstItem.tax_id;
                        const taxId = (typeof taxVal === 'object' ? taxVal?.id : taxVal);
                        if (taxId) {
                            try {
                                const taxResponse = await taxService.getTaxCodeById(taxId);
                                const countryVal = taxResponse?.data?.country;
                                if (countryVal) {
                                    countryToFilter = countryVal;
                                    setLockedCountry(countryVal);
                                }
                            } catch (error) {
                                console.error("Error pre-fetching tax details for edit:", error);
                            }
                        }
                    }
                }
                fetchItems(countryToFilter);
            };
            checkEditTaxAndFetch();
            fetchAllOrders(editData?.return_against);

            let dataToSet;
            if (editData) {
                // Populate form with editData
                dataToSet = {
                    orderNo: editData.order_no || "",
                    orderName: editData.order_name || "",
                    status: editData.status || "DRAFT",
                    supplier: editData.supplier_id?.id || editData.supplier_id || "",
                    orderDate: editData.order_date ? new Date(editData.order_date).toISOString().split('T')[0] : "",
                    items: Array.isArray(editData.order_item) ? editData.order_item.map(item => {
                        const sourceType = item.source_type || "item";
                        // raw_material items don't have a nested `items` object — use source_id directly
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
                            description: item.description || item.items?.name || "",
                            tax_id: (typeof item.tax_id === 'object' ? item.tax_id?.id : item.tax_id) || "",
                            tax_percent: parseFloat(item.tax_percent) || 0,
                            quantity: parseFloat(item.quantity) || 1,
                            rate: parseFloat(item.rate) || 0,
                            amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0),
                            min_order_quantity: item.items?.min_order_quantity || 1
                        };
                    }) : [],
                    notes: editData.notes || "",
                    attachment: editData.attachment || editData.attachmentkey || null,
                    returnAgainst: editData.return_against || "",
                    emailConfig: {
                        ...getInitialFormData().emailConfig,
                        to: editData.supplier_id?.email || ""
                    }
                };
            } else {
                dataToSet = {
                    ...getInitialFormData(),
                    orderNo: generateUniqueId("PON"),
                    orderDate: new Date().toISOString().split('T')[0],
                    items: [{ item_id: "", source_type: "raw_material", tax_id: "", tax_percent: 0, quantity: 1, rate: 0, amount: 0, description: "" }]
                };
            }

            // Restore state if resuming
            if (searchParams.get("action") === "resume") {
                const savedData = localStorage.getItem("pending_order_data");
                if (savedData) {
                    const parsedData = JSON.parse(savedData);
                    const newSupplierId = searchParams.get("newSupplierId");
                    if (newSupplierId) {
                        parsedData.supplier = newSupplierId;
                    }
                    dataToSet = parsedData;
                    localStorage.removeItem("pending_order_data");

                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("action");
                    params.delete("newSupplierId");
                    router.replace(`/purchases/orders?${params.toString()}`);
                }
            }

            setFormData(dataToSet);
            if (viewOnly) setStep(2);
            setInitialSnapshot(JSON.stringify(dataToSet));
        }
    }, [isOpen, searchParams, router, editData]);

    // Reset state after cancel or close
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setLockedCountry(null);
        }
    }, [isOpen]);

    // Automatically reset/refetch products if all items are cleared
    useEffect(() => {
        if (!isOpen) return;

        const hasActiveItems = formData.items && formData.items.some(
            item => item.item_id && item.tax_id
        );

        if (lockedCountry && !hasActiveItems) {
            setLockedCountry(null);
            fetchItems(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.items, lockedCountry, isOpen]);

    // Populate max_quantity for Return Against items when editing
    useEffect(() => {
        if (editData && formData.returnAgainst && allOrders.length > 0) {
            const selectedOrder = allOrders.find(o => o.id == formData.returnAgainst);
            if (selectedOrder) {
                const originalItems = selectedOrder.purchase_item || selectedOrder.order_item || [];
                let hasUpdates = false;

                const updatedItems = formData.items.map(item => {
                    if (item.max_quantity !== undefined) return item;

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
                    // Update snapshot so enrichment doesn't count as a change
                    if (initialSnapshot) {
                        setInitialSnapshot(JSON.stringify(updatedFormData));
                    }
                }
            }
        }
    }, [allOrders, formData.returnAgainst, editData]);

    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { item_id: "", source_type: "raw_material", tax_id: "", tax_percent: 0, quantity: 1, rate: 0, amount: 0, description: "" }]
        }));
    };

    const handleAddSupplierClick = () => {
        setIsSupplierModalOpen(true);
    };

    const handleSavePopupMaterial = async (apiPayload) => {
        try {
            setIsSavingPopup(true);
            const selectedTax = taxes.find(t => t.id?.toString() === apiPayload.tax?.toString());
            const taxPercent = selectedTax && selectedTax.tax_rates
                ? Object.values(selectedTax.tax_rates).reduce((sum, r) => sum + (parseFloat(r) || 0), 0)
                : 0;

            const mappedPayload = {
                name: apiPayload.name,
                description: apiPayload.description,
                quantity: parseFloat(apiPayload.quantity) || 0,
                unit: apiPayload.unit,
                unit_price: parseFloat(apiPayload.unit_price) || 0,
                last_updated: apiPayload.last_updated || new Date().toISOString(),
                tax_id: apiPayload.tax ? parseInt(apiPayload.tax) : null,
                tax_percent: taxPercent
            };

            const response = await inventoryService.saveRawMaterial(mappedPayload);
            dispatch(showToast({ message: "Raw material created successfully", type: "success" }));

            // Re-fetch items list with the current lockedCountry filter
            const fetched = await fetchItems(lockedCountry);

            // Auto-select the newly created material
            const createdId = findIdInObject(response);
            const finalId = createdId ? Number(createdId) : null;

            if (finalId && activeRowIdx !== null) {
                const list = fetched ? fetched.rawMaterialsList : null;
                handleItemChange(activeRowIdx, "item_id", finalId, list);
            }

            setIsMaterialFormOpen(false);
        } catch (error) {
            console.error("Error creating raw material from purchase form:", error);
            dispatch(showToast({ message: "Failed to create raw material", type: "error" }));
        } finally {
            setIsSavingPopup(false);
        }
    };

    const handleSavePopupSpecialItem = async (apiPayload) => {
        try {
            setIsSavingPopup(true);
            const mappedPayload = {
                name: apiPayload.name,
                item_code: apiPayload.item_code,
                item_type: "CUSTOMISED PRODUCTS",
                category: "SALES",
                hsn_sac_code: apiPayload.hsn_sac_code || null,
                unit: apiPayload.unit || null,
                description: apiPayload.description || null,
                rate: parseFloat(apiPayload.rate) || 0,
                tax: parseInt(apiPayload.tax) || null,
                Production_cost: parseFloat(apiPayload.production_cost) || 0,
                opening_quantity: parseFloat(apiPayload.opening_quantity) || 0,
                current_quantity: parseFloat(apiPayload.current_quantity) || 0
            };

            const response = await inventoryService.saveCustomizedProduct(mappedPayload);
            dispatch(showToast({ message: "stocks created successfully", type: "success" }));

            // Re-fetch items list
            const fetched = await fetchItems(lockedCountry);

            // Auto-select
            const createdId = findIdInObject(response);
            const finalId = createdId ? Number(createdId) : null;

            if (finalId && activeRowIdx !== null) {
                const list = fetched ? fetched.customizedProductsList : null;
                handleItemChange(activeRowIdx, "item_id", finalId, list);
            }

            setIsSpecialItemFormOpen(false);
        } catch (error) {
            console.error("Error creating stocks from purchase form:", error);
            dispatch(showToast({ message: "Failed to create stocks", type: "error" }));
        } finally {
            setIsSavingPopup(false);
        }
    };

    const handleSupplierSave = async (response) => {
        // Wait for 2 seconds before refreshing, as requested by the user
        setTimeout(async () => {
            try {
                // Refresh suppliers list
                const data = await partyService.queryParties("SUPPLIER");
                setSuppliers(data);

                // Try to extract the new supplier ID from response
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

    const handleItemChange = async (index, field, value, overrideList = null) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        // When source_type changes, reset the item selection for this row
        if (field === "source_type") {
            newItems[index].item_id = "";
            newItems[index].source_id = null;
            newItems[index].description = "";
            newItems[index].rate = 0;
            newItems[index].amount = 0;
            newItems[index].tax_id = "";
            newItems[index].tax_percent = 0;
            newItems[index].quantity = 1;
        }

        if (field === "item_id") {
            // Determine which list to look in based on the row's source_type
            let activeList = [];
            if (overrideList) {
                activeList = overrideList;
            } else {
                if (newItems[index].source_type === "raw_material") activeList = rawMaterialsList;
                else if (newItems[index].source_type === "customized_product") activeList = customizedProductsList;
                else activeList = productsList;
            }

            const selectedItem = activeList.find(i => i.id == value);
            if (selectedItem) {
                // Raw materials use `unit_price`; products use `rate`; Stocks use `Production_cost`
                let itemRate = 0;
                if (newItems[index].source_type === "raw_material") {
                    itemRate = parseFloat(selectedItem.unit_price || 0);
                } else if (newItems[index].source_type === "customized_product") {
                    itemRate = parseFloat(selectedItem.Production_cost ?? selectedItem.production_cost ?? selectedItem.rate ?? 0);
                } else {
                    itemRate = parseFloat(selectedItem.rate || 0);
                }

                newItems[index].rate = itemRate;
                newItems[index].description = selectedItem.name || "";
                newItems[index].source_id = selectedItem.id;

                newItems[index].quantity = 1;
                newItems[index].amount = itemRate * 1;

                // Fetch tax details
                const taxVal = selectedItem.tax_id || selectedItem.tax;
                const taxId = (typeof taxVal === 'object' ? taxVal?.id : taxVal);
                if (taxId) {
                    try {
                        const taxResponse = await taxService.getTaxCodeById(taxId);
                        const taxData = taxResponse.data;
                        const taxRates = taxData?.tax_rates || {};
                        const totalTaxPercent = Object.values(taxRates).reduce((sum, r) => sum + (parseFloat(r) || 0), 0) || parseFloat(selectedItem.tax_percent) || 0;

                        newItems[index].tax_percent = totalTaxPercent;
                        newItems[index].tax_id = taxId;

                        // Lock country and refetch if not locked
                        if (!lockedCountry && taxData?.country) {
                            setLockedCountry(taxData.country);
                            fetchItems(taxData.country);
                        }
                    } catch (error) {
                        console.error("Error fetching tax template:", error);
                        newItems[index].tax_percent = parseFloat(selectedItem.tax_percent) || 0;
                        newItems[index].tax_id = taxId;
                    }
                } else {
                    newItems[index].tax_percent = parseFloat(selectedItem.tax_percent) || 0;
                    newItems[index].tax_id = "";
                }
            }
        }

        if (field === "quantity") {
            if (value === "") {
                newItems[index].quantity = "";
            } else {
                const qty = parseFloat(value);
                if (isNaN(qty)) {
                    newItems[index].quantity = "";
                } else {
                    const maxQty = newItems[index].max_quantity;
                    // Return Mode constraints
                    if (formData.returnAgainst && maxQty !== undefined && qty > maxQty) {
                        dispatch(showToast({
                            message: `Quantity for ${newItems[index].description || 'item'} cannot exceed original order quantity (${maxQty})`,
                            type: "warning"
                        }));
                        newItems[index].quantity = maxQty;
                    } else if (qty < 0) {
                        newItems[index].quantity = 0;
                    } else {
                        newItems[index].quantity = qty;
                    }
                }
            }
        }

        if (field === "quantity" || field === "rate") {
            const qty = parseFloat(newItems[index].quantity) || 0;
            const rate = field === "rate" ? parseFloat(value) || 0 : parseFloat(newItems[index].rate) || 0;
            newItems[index].amount = qty * rate;
        }

        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const validateForm = () => {
        if (!formData.orderName?.trim()) {
            dispatch(showToast({ message: "Order Name is required", type: "warning" }));
            return false;
        }
        if (!formData.supplier) {
            dispatch(showToast({ message: "Supplier is required", type: "warning" }));
            return false;
        }
        if (!formData.orderDate) {
            dispatch(showToast({ message: "Order Date is required", type: "warning" }));
            return false;
        }
        if (!formData.items || formData.items.length === 0) {
            dispatch(showToast({ message: "At least one item is required", type: "warning" }));
            return false;
        }
        const hasEmptyItem = formData.items.some(item => {
            if (item.source_type === "service") return !item.description?.trim();
            return !item.item_id;
        });
        if (hasEmptyItem) {
            dispatch(showToast({ message: "Please fill in all item details", type: "warning" }));
            return false;
        }
        if (formData.returnAgainst) {
            const overLimitItem = formData.items.find(item =>
                item.max_quantity !== undefined && (parseFloat(item.quantity) || 0) > item.max_quantity
            );
            if (overLimitItem) {
                dispatch(showToast({
                    message: `Quantity for ${overLimitItem.description || 'item'} cannot exceed original quantity (${overLimitItem.max_quantity})`,
                    type: "warning"
                }));
                return false;
            }
        }

        return true;
    };

    const handleSave = async (forcedStatus = null, isSendToClient = false, isSendOnly = false) => {
        if (!validateForm()) return;

        try {
            setIsSaving(true);
            const payload = {
                order_no: formData.orderNo,
                order_name: formData.orderName,
                supplier_id: Number(formData.supplier),
                order_date: formData.orderDate,
                net_amount: totals.total.toFixed(2),
                notes: formData.notes || "",
                return_against: formData.returnAgainst ? Number(formData.returnAgainst) : null,
                status: forcedStatus || formData.status || "DRAFT",
                items: formData.items.map(item => ({
                    source_type: item.source_type || "item",
                    item_id: item.source_type === "service" ? null : Number(item.item_id),
                    source_id: item.source_type === "service" ? null : Number(item.item_id),
                    quantity: Number(item.quantity) || 0,
                    rate: parseFloat(item.rate) || 0,
                    tax_id: item.tax_id ? Number(item.tax_id) : null,
                    tax_percent: parseFloat(item.tax_percent) || 0,
                    amount: Number((Number(item.quantity) * parseFloat(item.rate)).toFixed(2)),
                    ...(item.source_type === "service" ? { description: item.description || "" } : {})
                }))
            };

            // Attachment is already a CDN URL (uploaded by AttachmentUploader on file-select)
            payload.attachmentkey = formData.attachment || null;

            let response;
            if (editData) {
                response = await purchaseOrderService.updateOrder(editData.id, payload);
                dispatch(showToast({ message: "Purchase Order updated successfully!", type: "success" }));
            } else {
                response = await purchaseOrderService.saveOrder(payload);
                dispatch(showToast({ message: "Purchase Order created successfully!", type: "success" }));
            }

            setInitialSnapshot(JSON.stringify(formData));

            const newId = response?.data?.data?.id || response?.data?.id || response?.data?.[0]?.id || response?.id || editData?.id;

            if (isSendToClient && newId) {
                try {
                    const emailData = {
                        documentType: "PURCHASE_ORDER",
                        documentId: newId.toString(),
                        email: {
                            to: formData.emailConfig.to || "",
                            cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                            bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                            message: formData.emailConfig.message || ""
                        }
                    };
                    await purchaseOrderService.sendOrderEmail(emailData);
                    dispatch(showToast({ message: "Email sent to supplier successfully!", type: "success" }));
                    if (onSave) onSave(newId, "EMAIL_SENT");
                } catch (emailError) {
                    console.error("Error sending email:", emailError);
                    dispatch(showToast({ message: emailError?.message || "Order created, but failed to send email", type: "error" }));
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
            console.error("Error saving order:", error);
            if (!error.isHandled) {
                dispatch(showToast({ message: error.message || "Error saving purchase order.", type: "error" }));
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendEmail = async () => {
        if (!editData) return;
        setIsSaving(true);
        try {
            const emailData = {
                documentType: "PURCHASE_ORDER", // Or whichever type your backend expects
                documentId: editData.id.toString(),
                email: {
                    to: formData.emailConfig.to || "",
                    cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                    bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                    message: formData.emailConfig.message || ""
                }
            };
            await purchaseOrderService.sendOrderEmail(emailData);
            dispatch(showToast({ message: "Email sent to supplier successfully!", type: "success" }));

            // Call the callback for immediate UI feedback in the table
            if (onSave && typeof onSave === 'function') {
                onSave(editData.id, true); // true indicates email was sent
            }

            handleClose();
        } catch (error) {
            console.error("Error sending email:", error);
            if (!error.isHandled) {
                dispatch(showToast({ message: error.message || "Failed to send email.", type: "error" }));
            }
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
                                    <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Configure Purchase Order</h2>
                                    <p className="text-sm text-gray-500 mt-1">Setup order details and items</p>
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
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Order Number Series</label>
                                            <input
                                                type="text"
                                                value={formData.orderNo}
                                                readOnly
                                                className="w-full px-3 py-2 border border-gray-100 rounded text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Order Name</label>
                                            <input
                                                type="text"
                                                value={formData.orderName}
                                                onChange={(e) => setFormData({ ...formData, orderName: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                placeholder="Enter Order Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Order Date</label>
                                            <input
                                                type="date"
                                                value={formData.orderDate}
                                                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                                        <div className="lg:col-span-3">
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Supplier</label>
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center">
                                                <div className="flex-1">
                                                    {formData.returnAgainst ? (
                                                        <input
                                                            type="text"
                                                            value={suppliers.find(s => s.id == formData.supplier)?.name || ""}
                                                            readOnly
                                                            className="w-full px-3 py-2 border border-gray-100 rounded text-sm bg-gray-50 text-gray-700 cursor-not-allowed h-[42px]"
                                                        />
                                                    ) : (
                                                        <CustomSelect
                                                            value={formData.supplier}
                                                            onChange={(val) => {
                                                                const selected = suppliers.find(s => s.id == val);
                                                                setFormData({
                                                                    ...formData,
                                                                    supplier: val,
                                                                    emailConfig: { ...formData.emailConfig, to: selected?.email || "" }
                                                                });
                                                            }}
                                                            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                                            placeholder="Select Supplier"
                                                            className="border border-gray-300 rounded-l-lg"
                                                            disabled={!!formData.returnAgainst}
                                                        />
                                                    )}
                                                </div>
                                                {!formData.returnAgainst && (
                                                    <button
                                                        onClick={handleAddSupplierClick}
                                                        className="px-4 py-2 bg-yellow-400 text-white text-sm font-medium rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none whitespace-nowrap flex items-center justify-center gap-1.5 h-[42px]"
                                                    >
                                                        Add New Supplier <FiUser />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="mb-8 font-poppins">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Items</h3>
                                    <div className="border border-gray-300 rounded overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm min-w-[850px]">
                                                <thead className="bg-gray-50 border-b border-gray-300">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-10 min-w-[40px]">#</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-36 min-w-[140px]">Type</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-52 min-w-[200px]">Item</th>
                                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 w-16 min-w-[60px]">Tax</th>
                                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 w-28 min-w-[100px]">Quantity</th>
                                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 w-32 min-w-[120px]">Rate</th>
                                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 w-32 min-w-[120px]">Amount</th>
                                                        <th className="px-3 py-2 w-10 min-w-[40px]"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {formData.items.map((item, idx) => (
                                                        <tr key={idx} className="border-b border-gray-200">
                                                            <td className="px-3 py-3 text-gray-700 w-10 min-w-[40px]">{idx + 1}</td>
                                                            <td className="px-3 py-3 w-36 min-w-[140px]">
                                                                {(editData?.is_auto_created || formData.returnAgainst) ? (
                                                                    <div className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500 cursor-not-allowed capitalize min-h-[38px] flex items-center break-words">
                                                                        {item.source_type?.replace('_', ' ') || "Item"}
                                                                    </div>
                                                                ) : (
                                                                    <CustomSelect
                                                                        value={item.source_type}
                                                                        onChange={(val) => handleItemChange(idx, "source_type", val)}
                                                                        options={[
                                                                            { value: "raw_material", label: "Raw Material" },
                                                                            { value: "customized_product", label: "stocks" },
                                                                            { value: "service", label: "Service" }
                                                                        ]}
                                                                    />
                                                                )}
                                                            </td>
                                                            {item.source_type === "service" ? (
                                                                <td colSpan={4} className="px-3 py-3 min-w-[480px]">
                                                                    <input
                                                                        type="text"
                                                                        value={item.description}
                                                                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                                                                        className={`w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-yellow-400 outline-none h-[38px] ${(editData?.is_auto_created || formData.returnAgainst) ? 'bg-gray-50 cursor-not-allowed text-gray-500' : ''}`}
                                                                        placeholder="Enter service description"
                                                                        readOnly={editData?.is_auto_created || !!formData.returnAgainst}
                                                                    />
                                                                </td>
                                                            ) : (
                                                                <>
                                                                    <td className="px-3 py-3 w-52 min-w-[200px]">
                                                                        {(editData?.is_auto_created || formData.returnAgainst) ? (
                                                                            <div className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500 cursor-not-allowed font-medium min-h-[38px] flex items-center break-words">
                                                                                {item.description || "Auto Item"}
                                                                            </div>
                                                                        ) : (
                                                                            <CustomSelect
                                                                                value={item.item_id}
                                                                                onChange={(val) => {
                                                                                    if (val === "new_raw_material") {
                                                                                        setActiveRowIdx(idx);
                                                                                        setIsMaterialFormOpen(true);
                                                                                    } else if (val === "new_customized_product") {
                                                                                        setActiveRowIdx(idx);
                                                                                        setIsSpecialItemFormOpen(true);
                                                                                    } else {
                                                                                        handleItemChange(idx, "item_id", val);
                                                                                    }
                                                                                }}
                                                                                options={(() => {
                                                                                    if (item.source_type === "raw_material") {
                                                                                        const listOptions = rawMaterialsList
                                                                                            .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.source_type === "raw_material" && it.item_id == i.id))
                                                                                            .map(i => ({ value: i.id, label: i.name }));
                                                                                        return [
                                                                                            { value: "new_raw_material", label: "+ Add New Raw Material" },
                                                                                            ...listOptions
                                                                                        ];
                                                                                    }
                                                                                    if (item.source_type === "customized_product") {
                                                                                        const listOptions = customizedProductsList
                                                                                            .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.source_type === "customized_product" && it.item_id == i.id))
                                                                                            .map(i => ({ value: i.id, label: i.name }));
                                                                                        return [
                                                                                            { value: "new_customized_product", label: "+ Add New stocks" },
                                                                                            ...listOptions
                                                                                        ];
                                                                                    }
                                                                                    return productsList
                                                                                        .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.source_type !== "raw_material" && it.source_type !== "customized_product" && it.item_id == i.id))
                                                                                        .map(i => ({ value: i.id, label: i.name }));
                                                                                })()}
                                                                                placeholder="Select Item"
                                                                            />
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-3 text-gray-700 text-center w-16 min-w-[60px]">{item.tax_percent}%</td>
                                                                    <td className="px-3 py-3 text-center w-28 min-w-[100px]">
                                                                        <div className="flex items-center justify-center gap-1">
                                                                            <button
                                                                                onClick={() => handleItemChange(idx, "quantity", Math.max(1, (parseFloat(item.quantity) || 0) - 1))}
                                                                                className={`w-6 h-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 text-gray-600 ${editData?.is_auto_created ? 'hidden' : ''}`}
                                                                                disabled={editData?.is_auto_created}
                                                                            >
                                                                                -
                                                                            </button>
                                                                            <input
                                                                                type="number"
                                                                                value={item.quantity ?? ""}
                                                                                onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                                                                                className={`w-full max-w-12 px-1 py-1.5 border border-gray-300 rounded text-xs text-center h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${editData?.is_auto_created ? 'bg-gray-50 cursor-not-allowed text-gray-500' : ''}`}
                                                                                readOnly={editData?.is_auto_created}
                                                                                placeholder="0"
                                                                            />
                                                                            <button
                                                                                onClick={() => handleItemChange(idx, "quantity", (parseFloat(item.quantity) || 0) + 1)}
                                                                                className={`w-6 h-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 text-gray-600 ${editData?.is_auto_created ? 'hidden' : ''}`}
                                                                                disabled={editData?.is_auto_created}
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-3 text-center w-32 min-w-[120px]">
                                                                        <div className="flex items-center justify-end gap-1 border border-gray-300 rounded px-2 py-1 focus-within:ring-1 focus-within:ring-yellow-400 min-w-[100px] bg-white shadow-sm">
                                                                            <span className="text-gray-400 text-xs font-semibold">₹</span>
                                                                            <input
                                                                                type="number"
                                                                                value={item.rate}
                                                                                onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                                                                                className={`w-full text-xs outline-none bg-transparent text-right font-bold text-gray-900 ${editData?.is_auto_created ? 'cursor-not-allowed text-gray-500' : ''}`}
                                                                                placeholder="0.00"
                                                                                readOnly={editData?.is_auto_created}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                </>
                                                            )}
                                                            <td className="px-3 py-3 text-right font-semibold text-gray-900 whitespace-nowrap w-32 min-w-[120px]">
                                                                {item.source_type === "service" ? (
                                                                    <div className="flex items-center justify-end gap-1 border border-gray-300 rounded px-2 py-1.5 focus-within:ring-1 focus-within:ring-yellow-400 min-w-[120px] bg-white shadow-sm">
                                                                        <span className="text-gray-400 text-xs font-semibold">₹</span>
                                                                        <input
                                                                            type="number"
                                                                            value={item.rate}
                                                                            onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                                                                            className={`w-full text-xs outline-none bg-transparent text-right font-bold text-gray-900 ${(editData?.is_auto_created || formData.returnAgainst) ? 'cursor-not-allowed text-gray-500' : ''}`}
                                                                            placeholder="0.00"
                                                                            readOnly={editData?.is_auto_created || !!formData.returnAgainst}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <>₹ {(item.amount || 0).toLocaleString()}</>
                                                                )}
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
                                        {!formData.returnAgainst && (
                                            <div className="px-4 py-3 bg-white border-t border-gray-200">
                                                <button onClick={handleAddItem} className="text-sm text-gray-600 hover:text-yellow-600 font-medium">
                                                    + Add New Item
                                                </button>
                                            </div>
                                        )}
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

                                {/* References Sections */}
                                <div className="font-poppins mt-10 md:mt-0">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4">References</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Notes</label>
                                            <textarea
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm h-24"
                                                placeholder="Add order terms or notes"
                                            ></textarea>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Attachment</label>
                                                <AttachmentUploader
                                                    context="purchase-order"
                                                    existingUrl={formData.attachment}
                                                    onUploaded={(url) => setFormData({ ...formData, attachment: url })}
                                                    disabled={false}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Return Against</label>
                                                <CustomSelect
                                                    value={formData.returnAgainst}
                                                    onChange={(val) => {
                                                        const selectedOrder = allOrders.find(o => o.id == val);
                                                        const updatedFormData = {
                                                            ...formData,
                                                            returnAgainst: val
                                                        };

                                                        if (selectedOrder) {
                                                            // Pre-fill supplier (handle both object and array from custom API)
                                                            const supplier = Array.isArray(selectedOrder.supplier_id) ? selectedOrder.supplier_id[0] : selectedOrder.supplier_id;
                                                            updatedFormData.supplier = supplier?.id || (typeof selectedOrder.supplier_id !== 'object' ? selectedOrder.supplier_id : "");

                                                            // Add items from the selected order/invoice
                                                            const itemsList = selectedOrder.purchase_item || selectedOrder.order_item;
                                                            if (Array.isArray(itemsList)) {
                                                                updatedFormData.items = itemsList.map(item => {
                                                                    const sourceType = item.source_type || "item";
                                                                    const resolvedId = sourceType === "raw_material"
                                                                        ? (item.source_id || "")
                                                                        : sourceType === "service"
                                                                            ? ""
                                                                            : (item.items?.id || item.items || item.source_id || "");

                                                                    return {
                                                                        id: undefined, // Create new items
                                                                        item_id: resolvedId,
                                                                        source_id: resolvedId,
                                                                        source_type: sourceType,
                                                                        description: item.description || item.items?.name || item.raw_material?.name || "",
                                                                        tax_id: item.tax_id || "",
                                                                        tax_percent: parseFloat(item.tax_percent) || 0,
                                                                        quantity: parseFloat(item.remaining_quantity ?? item.quantity) || 1,
                                                                        max_quantity: parseFloat(item.remaining_quantity ?? item.quantity) || 1, // Cap for returns
                                                                        rate: parseFloat(item.rate) || 0,
                                                                        amount: (parseFloat(item.rate) || 0) * (parseFloat(item.remaining_quantity ?? item.quantity) || 1),
                                                                        min_order_quantity: item.items?.min_order_quantity || 1
                                                                    };
                                                                });
                                                            }

                                                            // Standardize order name for returns
                                                            if (!formData.orderName || formData.orderName.startsWith("Return for") || formData.orderName.startsWith("Return Against")) {
                                                                updatedFormData.orderName = `Return for ${selectedOrder.invoice_name || selectedOrder.order_name || selectedOrder.invoice_number || selectedOrder.order_no || selectedOrder.order_number}`;
                                                            }
                                                        }

                                                        setFormData(updatedFormData);
                                                    }}
                                                    options={(allOrders || []).map(o => ({
                                                        value: o.id,
                                                        label: `${o.invoice_number || o.order_no || o.order_number}${o.invoice_name || o.order_name ? ` - ${o.invoice_name || o.order_name}` : ""}`
                                                    }))}
                                                    placeholder="Select Order"
                                                />
                                            </div>
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
                                    disabled={isSaving || !hasChanges}
                                    className="px-6 py-2.5 border border-[#FFCA00] text-[#FFCA00] hover:bg-[#FFCA00] hover:text-white text-[14px] font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
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
                                        className="px-6 py-2.5 bg-[#FFCA00] text-white text-[14px] font-bold rounded-lg hover:bg-[#d9ac00] disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
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
                                        {viewOnly ? "View Purchase Order" : "Preview & Send"}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {isExporting ? "Processing..." : viewOnly ? "View details of your purchase order" : "Review and send your purchase order"}
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
                                            type="PURCHASE_ORDER"
                                            filename={`PurchaseOrder-${formData.orderNo}`}
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
                                                    number: formData.orderNo,
                                                    date: formData.orderDate,
                                                    reference: formData.orderName,
                                                },
                                                items: formData.items.map(item => {
                                                    let typeLabel = "Product";
                                                    if (item.source_type === "raw_material") typeLabel = "Product";
                                                    else if (item.source_type === "customized_product") typeLabel = "stocks";
                                                    else if (item.source_type === "service") typeLabel = "Service";
                                                    return {
                                                        ...item,
                                                        item_type: typeLabel,
                                                        name: item.description || "N/A"
                                                    };
                                                }),
                                                totals: [
                                                    { label: "Subtotal", value: totals.subtotal },
                                                    { label: "Tax", value: totals.totalTax },
                                                    { label: "Total (INR)", value: totals.total, isGrand: true },
                                                ],
                                            }}
                                        /></div></div></div>




                            {/* Email Config UI (Partial version matching user request) */}
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
                                            disabled={isSaving}
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

            <SupplierModal
                isOpen={isSupplierModalOpen}
                onClose={() => setIsSupplierModalOpen(false)}
                onSave={handleSupplierSave}
            />

            <RawMaterialForm
                isOpen={isMaterialFormOpen}
                onClose={() => setIsMaterialFormOpen(false)}
                onSave={handleSavePopupMaterial}
                isSaving={isSavingPopup}
                taxes={taxes}
                hideRestockToggle={true}
            />

            <SalesSpecialItemForm
                isOpen={isSpecialItemFormOpen}
                onClose={() => setIsSpecialItemFormOpen(false)}
                onSave={handleSavePopupSpecialItem}
                isSaving={isSavingPopup}
                taxes={taxes}
                suppliers={suppliers}
                hideRestockToggle={true}
            />
        </div>
    );
};

export default PurchaseOrderForm;