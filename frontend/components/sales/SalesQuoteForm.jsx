"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
    FiX, FiUser, FiTrash2, FiUpload, FiPrinter, FiMapPin, FiNavigation, FiArrowRight, FiRefreshCw,
    FiDownload, FiMail, FiPaperclip,
    FiCreditCard, FiArrowLeft, FiSend, FiLoader, FiFileText, FiEye,
    FiPlus, FiChevronDown, FiBox, FiSettings, FiTool, FiClock, FiBriefcase,
    FiUsers, FiDollarSign, FiGitMerge, FiActivity, FiSmile, FiVolume2, FiGlobe, FiTarget, FiShield
} from "react-icons/fi";
import { useRouter, useSearchParams } from "next/navigation";
import { partyService } from "@/services/partyService";
import { itemService } from "@/services/itemService";
import { inventoryService } from "@/services/inventoryService";
import { salesQuoteService } from "@/services/salesQuoteService";
import AsyncSelect from "react-select/async";
import dynamic from 'next/dynamic';
const MileageRouteMap = dynamic(() => import("./MileageRouteMap"), { ssr: false });
import { salesTimeService } from "@/services/salesTimeService";
import { salesMileageService } from "@/services/salesMileageService";
import { estimationService } from "@/services/estimationService";
import { taxService } from "@/services/taxService";
import { showToast } from "@/lib/features/toast/toastSlice";
import { useDispatch } from "react-redux";
import CustomSelect from "@/components/common/CustomSelect";
import { generateUniqueId } from "@/utils/idGenerator";
import AttachmentUploader from "@/components/common/AttachmentUploader";
import CustomerFormModal from "./CustomerFormModal";
import DocumentPreview from "@/components/common/DocumentPreview";
import SalesProductForm from "./SalesProductForm";
import SalesSpecialItemForm from "./SalesSpecialItemForm";
import RestockModal from "./RestockModal";
import { processRestock } from "@/utils/restockHelper";
import { calculateTotals, parseItemsFromDb as importedParseItemsFromDb, mapItemsForSave as importedMapItemsForSave } from "@/utils/salesItemUtils";

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

const initialFormData = {
    quoteNumber: "",
    quoteName: "",
    status: "DRAFT",
    customer: "",
    quoteDate: new Date().toISOString().split('T')[0],
    expiryDate: "",
    items: [],
    notes: "",
    attachment: null,
    emailConfig: {
        to: "",
        cc: "",
        bcc: "",
        message: ""
    }
};

const isValidTaxId = (id) => {
    if (!id) return false;
    const s = String(id).trim().toLowerCase();
    if (s === "" || s === "null" || s === "undefined" || s === "0") return false;
    const num = Number(s);
    return !isNaN(num) && Number.isInteger(num);
};

// Generate unique quote number
const generateQuoteNumber = () => generateUniqueId("Q");

const SalesQuoteForm = ({ isOpen, onClose, onSave, editData = null, viewOnly = false }) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const dispatch = useDispatch();
    const [step, setStep] = useState(1);
    const [customers, setCustomers] = useState([]);
    const [productsList, setProductsList] = useState([]);
    const [customizedProductsList, setCustomizedProductsList] = useState([]);
    const [timeList, setTimeList] = useState([]);
    const [mileageList, setMileageList] = useState([]);
    const [estimationList, setEstimationList] = useState([]);
    const [mileageCoordsMap, setMileageCoordsMap] = useState({});
    const [mileageRoutesMap, setMileageRoutesMap] = useState({});
    const [mileageSelectedRouteMap, setMileageSelectedRouteMap] = useState({});
    const [mileageCalculatingMap, setMileageCalculatingMap] = useState({});
    const mileageRouteCache = useRef({});
    const [mileageInputMap, setMileageInputMap] = useState({});
    const isInitialHydrationRef = useRef(new Set());
    const [lockedCountry, setLockedCountry] = useState(null);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveType, setSaveType] = useState(null); // 'save' | 'send'
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isProductFormOpen, setIsProductFormOpen] = useState(false);
    const [isSpecialItemFormOpen, setIsSpecialItemFormOpen] = useState(false);
    const [activeRowIdx, setActiveRowIdx] = useState(null);
    const [isSavingPopup, setIsSavingPopup] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [taxes, setTaxes] = useState([]);
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
    const [restockItem, setRestockItem] = useState(null);
    const [restockSuccessCount, setRestockSuccessCount] = useState(0);
    const [formData, setFormData] = useState(initialFormData);
    const [initialSnapshot, setInitialSnapshot] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [activeEmailTab, setActiveEmailTab] = useState("Email");
    const [isAttachmentLoading, setIsAttachmentLoading] = useState(false);
    const docPreviewRef = useRef(null);

    const hasChanges = useMemo(() => {
        if (!initialSnapshot) return false;
        return JSON.stringify(formData) !== initialSnapshot;
    }, [formData, initialSnapshot]);

    const handleClose = () => {
        setFormData(initialFormData);
        setStep(1);
        setLockedCountry(null);
        onClose();
    };

    const totals = calculateTotals(formData.items);

    const mileageSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            backgroundColor: 'white',
            borderColor: state.isFocused ? '#FFCA00' : '#e5e7eb',
            borderRadius: '8px',
            padding: '2px',
            boxShadow: 'none',
            '&:hover': { borderColor: '#FFCA00' },
            color: '#4b5563',
            minHeight: '42px',
            fontSize: '14px'
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? '#FFCA00' : state.isFocused ? '#fff7ed' : 'white',
            color: state.isSelected ? 'white' : '#4b5563',
            cursor: 'pointer',
            fontSize: '13px',
            borderRadius: '4px',
            margin: '2px 0',
        }),
        menuPortal: (base) => ({ ...base, zIndex: 99999 }),
    };

    // Fetch customers
    const fetchCustomers = async () => {
        try {
            setIsLoadingCustomers(true);
            const data = await partyService.queryParties("CUSTOMER");
            setCustomers(data);
        } catch (error) {
            console.error("Error fetching customers:", error);
        } finally {
            setIsLoadingCustomers(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const data = await partyService.queryParties("SUPPLIER");
            setSuppliers(data || []);
        } catch (error) {
            console.error("Error fetching suppliers:", error);
        }
    };

    const fetchTaxes = async () => {
        try {
            const response = await taxService.getTaxCodes();
            setTaxes(response.data || response || []);
        } catch (error) {
            console.error("Error fetching taxes:", error);
        }
    };

    // Fetch items
    const fetchItems = async (countryFilter = null) => {
        try {
            setIsLoadingItems(true);
            const [productsRes, customizedRes, timeRes, mileageRes, estimationRes] = await Promise.all([
                inventoryService.getProducts({ country: countryFilter }),
                inventoryService.getCustomizedProducts({ country: countryFilter }),
                salesTimeService.getTimeEntries({ status: "POSTED" }),
                salesMileageService.getMileageEntries({ status: "POSTED" }),
                estimationService.getEstimations({ status: "POSTED" })
            ]);
            const pList = productsRes.data || [];
            const cList = customizedRes.data || [];
            setProductsList(pList);
            setCustomizedProductsList(cList);
            setTimeList(timeRes.data || []);
            setMileageList(mileageRes.data || []);
            setEstimationList(estimationRes.data || []);
            return { productsList: pList, customizedProductsList: cList };
        } catch (error) {
            console.error("Error fetching items:", error);
            return null;
        } finally {
            setIsLoadingItems(false);
        }
    };

    const parseItemsFromDb = (dbItems) => {
        return importedParseItemsFromDb(dbItems, customizedProductsList);
        const itemsArray = Array.isArray(dbItems) ? dbItems : (dbItems ? [dbItems] : []);
        return itemsArray.flatMap(item => {
            const sourceType = item.source_type || "item";
            if (sourceType === "estimation") {
                const parentId = item.source_id || item.item_id || "";
                const parentNumber = item.metadata?.estimation_number || "";
                const parentName = item.metadata?.estimation_name || "";
                const parentSubtotal = item.metadata?.subtotal || "0";
                const parentTax = item.metadata?.tax || "0";
                const parentTotal = item.metadata?.total_amount || "0";

                const lines = Array.isArray(item.metadata?.lines) ? item.metadata.lines : [];
                if (lines.length > 0) {
                    return lines.map(line => {
                        const lineCat = line.category || "materials";
                        const meta = line.metadata || {};
                        let lineTaxPercent = parseFloat(line.tax_percent) || parseFloat(meta.tax) || 0;
                        let lineTaxId = line.tax_id || "";
                        let mappedItemId = line.item_id || "";

                        if (lineCat === "materials") {
                            const isCustomObj = meta.type === "customized product";
                            const targetList = isCustomObj ? customizedProductsList : productsList;
                            const match = targetList.find(p => p.name?.toLowerCase() === (meta.name || line.description)?.toLowerCase() || p.id == line.item_id);
                            if (match) {
                                mappedItemId = match.id;
                                lineTaxId = match.tax_id || "";
                                lineTaxPercent = parseFloat(match.tax_percent || 0);
                            }
                        }

                        return {
                            id: line.id,
                            parent_proforma_item_id: item.id,
                            item_id: parentId.toString(),
                            type: "Estimation",
                            source_type: "estimation",
                            tax_id: lineTaxId,
                            tax_percent: lineTaxPercent,
                            quantity: parseFloat(line.quantity) || 1,
                            rate: parseFloat(line.rate) || parseFloat(line.amount) || 0,
                            amount: parseFloat(line.amount) || 0,
                            tax_details: {},
                            metadata: {
                                ...meta,
                                line_id: line.id,
                                line_category: lineCat,
                                category: lineCat,
                                line_name: line.description,
                                description: line.description,
                                qty: meta.qty || line.quantity || 1,
                                rate: meta.rate || line.rate || parseFloat(line.amount) || 0,
                                cost: meta.cost || line.rate || 0,
                                hours: meta.hours || line.quantity || 0,
                                minutes: meta.minutes || line.quantity || 0,
                                distance: meta.distance || line.quantity || 0,
                                unit: line.unit || meta.unit || "",
                                source: meta.source || "internal",
                                role: meta.role || "",
                                estimation_id: parentId.toString(),
                                estimation_number: parentNumber,
                                estimation_name: parentName,
                                parent_subtotal: parentSubtotal,
                                parent_tax: parentTax,
                                parent_total_amount: parentTotal
                            }
                        };
                    });
                } else {
                    return [{
                        id: item.id,
                        item_id: parentId.toString(),
                        type: "Estimation",
                        source_type: "estimation",
                        tax_id: (typeof item.tax_id === "object" ? item.tax_id?.id : item.tax_id) || "",
                        tax_percent: parseFloat(item.tax_percent) || parseFloat(item.metadata?.tax) || 0,
                        quantity: 1,
                        rate: parseFloat(item.rate) || 0,
                        amount: parseFloat(item.amount) || 0,
                        tax_details: {},
                        metadata: {
                            estimation_id: parentId.toString(),
                            estimation_number: parentNumber,
                            estimation_name: parentName,
                            parent_subtotal: parentSubtotal,
                            parent_tax: parentTax,
                            parent_total_amount: parentTotal
                        }
                    }];
                }
            }

            let mappedItemId = item.source_id || item.item_id || "";
            let itemType = "Product";
            if (sourceType === "time") itemType = "Time";
            else if (sourceType === "mileage") itemType = "Mileage";
            else if (sourceType === "service") itemType = "Service";
            else if (customizedProductsList.some(cp => cp.id == mappedItemId)) itemType = "Customized Product";

            const metadata = { ...(item.metadata || {}) };
            if (sourceType === "time") {
                const totalMins = parseInt(metadata.duration_minutes) || 0;
                metadata.hours = Math.floor(totalMins / 60);
                metadata.minutes = totalMins % 60;
                if (metadata.start_time && metadata.start_time.includes('T')) {
                    metadata.start_date = metadata.start_time.split('T')[0];
                    metadata.start_time = metadata.start_time.split('T')[1]?.substring(0, 5) || "";
                }
                if (metadata.end_time && metadata.end_time.includes('T')) {
                    metadata.end_date = metadata.end_time.split('T')[0];
                    metadata.end_time = metadata.end_time.split('T')[1]?.substring(0, 5) || "";
                }
                metadata.use_start_end = !!(metadata.start_date && metadata.start_time);
            }

            return [{
                id: item.id,
                item_id: mappedItemId,
                type: itemType,
                source_type: sourceType,
                tax_id: (typeof item.tax_id === "object" ? item.tax_id?.id : item.tax_id) || "",
                tax_percent: parseFloat(item.tax_percent) || parseFloat(metadata?.tax) || 0,
                quantity: parseFloat(item.quantity) || 1,
                rate: parseFloat(item.rate) || 0,
                amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0),
                tax_details: {},
                metadata: metadata,
                production_cost: parseFloat(item.production_cost) || 0
            }];
        });
    };

    const mapItemsForSave = (items) => {
        return importedMapItemsForSave(items);
        const nonEstimationItems = [];
        const estimationGroups = {};

        items.forEach(item => {
            const sourceType = item.source_type || "item";
            if (sourceType === "estimation") {
                const estId = item.metadata?.estimation_id || item.item_id || "unknown";
                if (!estimationGroups[estId]) {
                    estimationGroups[estId] = [];
                }
                estimationGroups[estId].push(item);
            } else {
                nonEstimationItems.push(item);
            }
        });

        const mappedEstimations = Object.entries(estimationGroups).map(([estId, groupItems]) => {
            const firstItem = groupItems[0];
            const parentId = Number(estId) || Number(firstItem.item_id) || null;
            const estimationNumber = firstItem.metadata?.estimation_number || firstItem.description || "";
            const estimationName = firstItem.metadata?.estimation_name || firstItem.metadata?.name || "";

            let groupSubtotal = 0;
            let groupTax = 0;
            let groupTotal = 0;

            const lines = groupItems.map(row => {
                const qty = Number(row.quantity) || 0;
                const rate = parseFloat(row.rate) || 0;
                const taxPercent = parseFloat(row.tax_percent) || 0;
                const rowSubtotal = qty * rate;
                const rowTax = rowSubtotal * (taxPercent / 100);
                const rowTotal = rowSubtotal + rowTax;

                groupSubtotal += rowSubtotal;
                groupTax += rowTax;
                groupTotal += rowTotal;

                const cat = row.metadata?.category || row.metadata?.line_category || "materials";
                const meta = row.metadata || {};

                return {
                    id: row.metadata?.line_id || (typeof row.id === "number" ? row.id : null),
                    category: cat,
                    description: row.description || row.metadata?.description || row.metadata?.line_description || "",
                    unit: row.metadata?.unit || null,
                    quantity: String(qty),
                    rate: String(rate),
                    amount: String(rowTotal.toFixed(2)),
                    metadata: {
                        ...meta,
                        qty: meta.qty ?? qty,
                        rate: meta.rate ?? rate,
                        cost: meta.cost ?? rate,
                        hours: meta.hours ?? qty,
                        minutes: meta.minutes ?? qty,
                        distance: meta.distance ?? qty,
                        unit: meta.unit || "",
                        source: meta.source || "internal",
                        role: meta.role || ""
                    }
                };
            });

            const baseItem = {
                source_type: "estimation",
                quantity: 1,
                rate: Number(groupTotal.toFixed(2)),
                tax_percent: 0,
                amount: Number(groupTotal.toFixed(2)),
                source_id: parentId,
                item_id: null,
                description: estimationNumber,
                metadata: {
                    estimation_number: estimationNumber,
                    estimation_name: estimationName,
                    subtotal: String(groupSubtotal.toFixed(2)),
                    tax: String(groupTax.toFixed(2)),
                    total_amount: String(groupTotal.toFixed(2)),
                    lines: lines
                }
            };
            if (firstItem.parent_proforma_item_id || firstItem.id) {
                baseItem.id = firstItem.parent_proforma_item_id || firstItem.id;
            }
            return baseItem;
        });

        const mappedNonEstimations = nonEstimationItems.map(item => {
            const qty = Number(item.quantity) || 0;
            const rate = parseFloat(item.rate) || 0;
            const taxPercent = parseFloat(item.tax_percent) || 0;
            const subtotal_calc = qty * rate;
            const rowTax = subtotal_calc * (taxPercent / 100);
            const totalWithTax = subtotal_calc + rowTax;
            const taxId = item.tax_id ? Number(item.tax_id) : null;
            const sourceType = item.source_type || "item";

            const baseItem = {
                source_type: sourceType,
                quantity: qty,
                rate: rate,
                tax_percent: taxPercent,
                amount: Number(totalWithTax.toFixed(2))
            };

            if (taxId) {
                baseItem.tax_id = taxId;
            }
            if (item.id) {
                baseItem.id = item.id;
            }

            if (sourceType === "time" || sourceType === "mileage" || sourceType === "service") {
                baseItem.source_id = Number(item.item_id) || null;
                baseItem.item_id = null;
                
                if (sourceType === "time") {
                    baseItem.description = item.description || item.metadata?.name || "Time Entry";
                    baseItem.metadata = {
                        entry_date: item.metadata?.entry_date || new Date().toISOString(),
                        duration_minutes: Number(item.metadata?.duration_minutes) || (Number(item.metadata?.hours || 0) * 60 + Number(item.metadata?.minutes || 0)),
                        rate_per_hour: String(item.rate || 0)
                    };
                } else if (sourceType === "mileage") {
                    baseItem.description = item.description || item.metadata?.name || "Mileage Entry";
                    baseItem.metadata = {
                        trip_type: item.metadata?.trip_type || "one_way",
                        start_address: item.metadata?.start_address || "",
                        end_address: item.metadata?.end_address || "",
                        distance_km: String(item.metadata?.distance_km || "0"),
                        rate_per_km: String(item.rate || 0)
                    };
                } else if (sourceType === "service") {
                    baseItem.description = item.description || item.metadata?.description || "Service";
                    baseItem.metadata = {
                        service_name: item.metadata?.service_name || item.description || "Consultation",
                        hours: Number(qty) || 0
                    };
                }
            } else {
                baseItem.item_id = Number(item.item_id);
                baseItem.source_id = Number(item.item_id);
                baseItem.description = item.description || "N/A";
            }

            return baseItem;
        });

        return [...mappedNonEstimations, ...mappedEstimations];
    };

    useEffect(() => {
        if (isOpen) {
            fetchCustomers();
            fetchSuppliers();
            fetchTaxes();

            const checkEditTaxAndFetch = async () => {
                let countryToFilter = null;
                if (editData && Array.isArray(editData.items) && editData.items.length > 0) {
                    const firstItem = editData.items[0];
                    const taxVal = firstItem.tax_id;
                    const taxId = (typeof taxVal === 'object' ? taxVal?.id : taxVal);
                    if (isValidTaxId(taxId)) {
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
                fetchItems(countryToFilter);
            };
            checkEditTaxAndFetch();

            let dataToSet;
            if (editData) {
                // Populate form with editData
                // customer_id may be a plain number or an object { id: ... }
                const customerId = (editData.customer_id && typeof editData.customer_id === "object")
                    ? editData.customer_id.id
                    : editData.customer_id;

                // items may be under editData.items or editData.quote_item depending on endpoint
                const rawItems = editData.items || editData.quote_item || [];

                dataToSet = {
                    quoteNumber: editData.quote_number || "",
                    quoteName: editData.quote_name || "",
                    status: editData.status || "DRAFT",
                    customer: customerId || "",
                    quoteDate: editData.quote_date ? new Date(editData.quote_date).toISOString().split('T')[0] : "",
                    expiryDate: editData.expiry_date ? new Date(editData.expiry_date).toISOString().split('T')[0] : "",
                    items: parseItemsFromDb(rawItems),
                    notes: editData.notes || "",
                    attachment: editData.attachmentkey || editData.attachment || null,
                    emailConfig: {
                        ...initialFormData.emailConfig,
                        to: editData.customer_email || ""
                    }
                };
            } else {
                // Reset form completely and generate new quote number for NEW quote
                dataToSet = {
                    ...initialFormData,
                    quoteNumber: generateQuoteNumber(),
                    quoteDate: new Date().toISOString().split('T')[0],
                    items: []
                };
            }

            // Restore state if resuming
            if (searchParams.get("action") === "resume") {
                const savedData = localStorage.getItem("pending_quote_data");
                if (savedData) {
                    const parsedData = JSON.parse(savedData);
                    const newCustomerId = searchParams.get("newCustomerId");
                    if (newCustomerId) {
                        parsedData.customer = newCustomerId;
                    }

                    dataToSet = parsedData;
                    localStorage.removeItem("pending_quote_data");

                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("action");
                    params.delete("newCustomerId");
                    router.replace(`/sales/quotes?${params.toString()}`);
                }
            }

            setFormData(dataToSet);
            // If viewOnly, jump straight to Preview (Step 2)
            if (viewOnly) {
                setStep(2);
            }
            // Initially set snapshot. It might be updated again by email prefill effect.
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

    // Handle initial email prefill when customers are loaded for EDIT mode
    useEffect(() => {
        if (editData && customers.length > 0 && !formData.emailConfig.to) {
            const selectedCustomer = customers.find(c => c.id == editData.customer_id);
            if (selectedCustomer?.email) {
                setFormData(prev => {
                    const updated = {
                        ...prev,
                        emailConfig: {
                            ...prev.emailConfig,
                            to: selectedCustomer.email
                        }
                    };
                    // Update snapshot here to match the prefilled state
                    setInitialSnapshot(JSON.stringify(updated));
                    return updated;
                });
            }
        }
    }, [customers, editData, isOpen, formData.emailConfig.to]);



    const handleAddCustomerClick = () => {
        setIsCustomerModalOpen(true);
    };

    const handleCustomerSave = async (response) => {
        // Wait for 2 seconds before refreshing, as requested by the user
        setTimeout(async () => {
            try {
                // Refresh customers list
                const data = await partyService.queryParties("CUSTOMER");
                setCustomers(data);

                // Try to extract the new customer ID from response
                const newCustomerId = response?.data?.[0]?.id || response?.id;

                if (newCustomerId) {
                    setFormData(prev => ({
                        ...prev,
                        customer: newCustomerId.toString()
                    }));
                }
            } catch (error) {
                console.error("Error refreshing customers:", error);
            }
        }, 2000);
    };

    
    const loadMileageAddressOptions = async (inputValue) => {
        if (!inputValue || inputValue.length < 2) return [];
        await new Promise(resolve => setTimeout(resolve, 300));
        try {
            const response = await axios.get('https://photon.komoot.io/api/', {
                params: { q: inputValue, limit: 10 }
            });
            return response.data.features.map(feature => {
                const props = feature.properties;
                const label = [props.name, props.street, props.district, props.city, props.state, props.country].filter(Boolean).join(', ');
                return { label, value: label, lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0] };
            });
        } catch (e) {
            console.error('Geocoding error:', e);
            return [];
        }
    };

    const fetchMileageRoutes = useCallback(async (itemId, start, end, tripType) => {
        if (!start || !end) return;

        // Check cache first
        const cacheKey = `${start.lat},${start.lon}_${end.lat},${end.lon}_${tripType}`;
        if (mileageRouteCache.current[cacheKey]) {
            const cachedRoutes = mileageRouteCache.current[cacheKey];
            setMileageRoutesMap(prev => ({ ...prev, [itemId]: cachedRoutes }));

            if (cachedRoutes.length > 0) {
                let matchIndex = 0;
                const item = formData.items.find(it => it.item_id == itemId);
                if (item?.metadata?.distance_km) {
                    const target = parseFloat(item.metadata.distance_km);
                    let minDiff = Infinity;
                    cachedRoutes.forEach((r, i) => {
                        const diff = Math.abs(r.distance - target);
                        if (diff < minDiff) {
                            minDiff = diff;
                            matchIndex = i;
                        }
                    });
                }

                setMileageSelectedRouteMap(prev => ({ ...prev, [itemId]: matchIndex }));

                if (!isInitialHydrationRef.current.has(itemId)) {
                    const dist = cachedRoutes[matchIndex].distance.toFixed(2);
                    setFormData(prev => {
                        const newItems = prev.items.map(it => {
                            if (it.item_id === itemId) {
                                const newMeta = { ...it.metadata, distance_km: dist };
                                const newQty = parseFloat(dist);
                                const newAmt = newQty * (parseFloat(it.rate) || 0);
                                return { ...it, metadata: newMeta, quantity: newQty, amount: newAmt };
                            }
                            return it;
                        });
                        return { ...prev, items: newItems };
                    });
                }

                isInitialHydrationRef.current.delete(itemId);
            }
            return;
        }

        setMileageCalculatingMap(prev => ({ ...prev, [itemId]: true }));
        try {
            // Forward Trip
            const res = await axios.get(
                `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}`,
                { params: { overview: 'full', geometries: 'geojson', alternatives: 'true', steps: 'true' } }
            );

            if (res.data.code === 'Ok') {
                // Fetch return trip geometry ONCE if it's a round trip
                let returnRoute = null;
                if (tripType === 'round_trip') {
                    try {
                        const retRes = await axios.get(
                            `https://router.project-osrm.org/route/v1/driving/${end.lon},${end.lat};${start.lon},${start.lat}`,
                            { params: { overview: 'full', geometries: 'geojson' } }
                        );
                        if (retRes.data.code === 'Ok') {
                            returnRoute = retRes.data.routes[0];
                        }
                    } catch (e) {
                        console.error('Return trip fetch failed:', e);
                    }
                }

                const fetchedRoutes = res.data.routes.map((route, idx) => {
                    let totalDist = route.distance / 1000;
                    let duration = route.duration / 60;
                    let routeGeometry = route.geometry.coordinates;

                    if (tripType === 'round_trip') {
                        if (returnRoute) {
                            totalDist += returnRoute.distance / 1000;
                            duration += returnRoute.duration / 60;
                            routeGeometry = [...routeGeometry, ...returnRoute.geometry.coordinates];
                        } else {
                            totalDist *= 2;
                            duration *= 2;
                        }
                    }

                    return {
                        distance: totalDist,
                        duration,
                        name: route.legs[0].summary || `Route ${idx + 1}`,
                        geometry: routeGeometry
                    };
                });

                // Store in cache
                mileageRouteCache.current[cacheKey] = fetchedRoutes;

                setMileageRoutesMap(prev => ({ ...prev, [itemId]: fetchedRoutes }));

                if (fetchedRoutes.length > 0) {
                    let matchIndex = 0;
                    const item = formData.items.find(it => it.item_id == itemId);
                    if (item?.metadata?.distance_km) {
                        const target = parseFloat(item.metadata.distance_km);
                        let minDiff = Infinity;
                        fetchedRoutes.forEach((r, i) => {
                            const diff = Math.abs(r.distance - target);
                            if (diff < minDiff) {
                                minDiff = diff;
                                matchIndex = i;
                            }
                        });
                    }

                    setMileageSelectedRouteMap(prev => ({ ...prev, [itemId]: matchIndex }));

                    if (!isInitialHydrationRef.current.has(itemId)) {
                        const dist = fetchedRoutes[matchIndex].distance.toFixed(2);
                        setFormData(prev => {
                            const newItems = prev.items.map(it => {
                                if (it.item_id === itemId) {
                                    const newMeta = { ...it.metadata, distance_km: dist };
                                    const newQty = parseFloat(dist);
                                    const newAmt = newQty * (parseFloat(it.rate) || 0);
                                    return { ...it, metadata: newMeta, quantity: newQty, amount: newAmt };
                                }
                                return it;
                            });
                            return { ...prev, items: newItems };
                        });
                    }

                    isInitialHydrationRef.current.delete(itemId);
                }
            }
        } catch (e) {
            console.error('Routing error:', e);
            isInitialHydrationRef.current.delete(itemId);
            dispatch(showToast({ message: 'Could not calculate route. Enter distance manually.', type: 'warning' }));
        } finally {
            setMileageCalculatingMap(prev => ({ ...prev, [itemId]: false }));
        }
    }, [dispatch, formData.items]);

    // Trigger route fetch when mileage coords change
    useEffect(() => {
        Object.entries(mileageCoordsMap).forEach(([itemId, coords]) => {
            if (coords.start && coords.end) {
                const item = formData.items.find(it => it.item_id === itemId);
                const tripType = item?.metadata?.trip_type || 'one_way';
                fetchMileageRoutes(itemId, coords.start, coords.end, tripType);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mileageCoordsMap]);

    // Auto-geocode saved/selected mileage addresses so map + routes appear immediately
    useEffect(() => {
        if (!isOpen) return;
        const mileageItems = (formData.items || []).filter(
            it => it.source_type === 'mileage' && it.metadata?.start_address && it.metadata?.end_address
        );
        if (mileageItems.length === 0) return;

        const geocodeAddress = async (addressText) => {
            try {
                const res = await axios.get('https://photon.komoot.io/api/', {
                    params: { q: addressText, limit: 1 }
                });
                if (res.data.features.length > 0) {
                    const f = res.data.features[0];
                    return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
                }
            } catch (e) { /* silent */ }
            return null;
        };

        (async () => {
            for (const item of mileageItems) {
                const itemId = item.item_id;
                // Skip if already geocoded
                if (mileageCoordsMap[itemId]?.start && mileageCoordsMap[itemId]?.end) continue;
                const [startCoord, endCoord] = await Promise.all([
                    geocodeAddress(item.metadata.start_address),
                    geocodeAddress(item.metadata.end_address)
                ]);
                if (startCoord && endCoord) {
                    isInitialHydrationRef.current.add(itemId);
                    setMileageCoordsMap(prev => ({ ...prev, [itemId]: { start: startCoord, end: endCoord } }));
                    setMileageInputMap(prev => ({
                        ...prev,
                        [`${itemId}_start`]: item.metadata.start_address,
                        [`${itemId}_end`]: item.metadata.end_address
                    }));
                }
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, formData.items, mileageCoordsMap]);

    // Reset state after cancel or send

    const addItemMenuRef = useRef(null);
    const [isAddItemMenuOpen, setIsAddItemMenuOpen] = useState(false);

    const itemCategoryIcons = {
        "Manpower": FiUsers,
        "Materials": FiBox,
        "Machinery": FiSettings,
        "Money": FiDollarSign,
        "Method": FiGitMerge,
        "Management": FiBriefcase,
        "Minutes": FiClock,
        "Mileage": FiMapPin,
        "Measurement": FiActivity,
        "Morale": FiSmile,
        "Marketing": FiVolume2,
        "Milieu": FiGlobe,
        "Maintenance": FiTool,
        "Mission": FiTarget,
        "Mitigation": FiShield,
        "Middlemen": FiUsers,
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (addItemMenuRef.current && !addItemMenuRef.current.contains(event.target)) {
                setIsAddItemMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAddNewItemOfType = (type) => {
        setIsAddItemMenuOpen(false);
        setFormData(prev => {
            const maxSortKey = prev.items.reduce((max, item) => Math.max(max, item.sort_key || 0), 0);
            
            let newItem = {
                type: type,
                source_type: type === "Product" ? "product" :
                             type === "Customized Product" ? "customized" :
                             type === "Service" ? "service" :
                             type === "Time" ? "time" :
                             type === "Mileage" ? "mileage" :
                             type === "Estimation" ? "estimation" : "product",
                item_id: "",
                tax_id: "",
                quantity: 1,
                rate: 0,
                amount: 0,
                description: "",
                sort_key: maxSortKey + 1,
                metadata: {}
            };

            if (type === "Time") {
                newItem.metadata = {
                    use_start_end: false,
                    hours: "",
                    minutes: "",
                    start_date: "",
                    start_time: "",
                    end_date: "",
                    end_time: "",
                    notes: ""
                };
            } else if (type === "Mileage") {
                newItem.metadata = {
                    trip_type: "one_way",
                    start_address: "",
                    end_address: "",
                    distance_km: ""
                };
            } else if (type === "Estimation") {
                newItem.metadata = {
                    category: "Materials",
                    line_category: "materials",
                    type: "product"
                };
            } else if (type === "Service") {
                newItem.metadata = {
                    service_name: "",
                    description: ""
                };
            }

            return {
                ...prev,
                items: [newItem, ...prev.items]
            };
        });
    };

    const handleMetadataChange = (index, field, value) => {
        setFormData(prev => {
            const newItems = [...prev.items];
            const item = newItems[index];
            const updatedMetadata = {
                ...item.metadata,
                [field]: value
            };

            let updatedQuantity = item.quantity;
            let updatedRate = item.rate;

            if (item.source_type === "time") {
                if (field === "duration_minutes") {
                    updatedQuantity = parseFloat(value || 0) / 60;
                } else if (field === "hours" || field === "minutes") {
                    const h = parseFloat(updatedMetadata.hours) || 0;
                    const m = parseFloat(updatedMetadata.minutes) || 0;
                    const totalMins = (h * 60) + m;
                    updatedMetadata.duration_minutes = totalMins;
                    updatedQuantity = totalMins / 60;
                } else if (["start_date", "start_time", "end_date", "end_time", "use_start_end"].includes(field)) {
                    if (updatedMetadata.use_start_end && updatedMetadata.start_date && updatedMetadata.start_time && updatedMetadata.end_date && updatedMetadata.end_time) {
                        const start = new Date(`${updatedMetadata.start_date}T${updatedMetadata.start_time}`);
                        const end = new Date(`${updatedMetadata.end_date}T${updatedMetadata.end_time}`);
                        const diffMs = end - start;
                        if (diffMs >= 0) {
                            const diffMins = Math.floor(diffMs / (1000 * 60));
                            updatedMetadata.duration_minutes = diffMins;
                            updatedMetadata.hours = Math.floor(diffMins / 60);
                            updatedMetadata.minutes = diffMins % 60;
                            updatedQuantity = diffMins / 60;
                        }
                    }
                }
            } else if (item.source_type === "mileage") {
                if (field === "distance_km") {
                    updatedQuantity = parseFloat(value || 0);
                }
            } else if (item.source_type === "estimation") {
                if (field === "rate" || field === "amount") {
                    updatedRate = parseFloat(value) || 0;
                }
            }

            const subtotal = (parseFloat(updatedQuantity) || 0) * (parseFloat(updatedRate) || 0);

            newItems[index] = {
                ...item,
                quantity: updatedQuantity,
                rate: updatedRate,
                amount: Number(subtotal.toFixed(2)),
                metadata: updatedMetadata
            };
            return { ...prev, items: newItems };
        });
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

        if (field === "type") {
            newItems[index].item_id = "";
            newItems[index].rate = 0;
            newItems[index].quantity = 1;
            newItems[index].amount = 0;
            newItems[index].tax_percent = 0;
            newItems[index].tax_id = "";
            newItems[index].tax_details = {};
            newItems[index].metadata = {};
            if (value === "Time") newItems[index].source_type = "time";
            else if (value === "Mileage") newItems[index].source_type = "mileage";
            else if (value === "Estimation") newItems[index].source_type = "estimation";
            else if (value === "Service") newItems[index].source_type = "service";
            else newItems[index].source_type = "item";
        }

        if (field === "item_id") {
            if (newItems[index].type === "Product" || newItems[index].type === "Customized Product") {
                const listToSearch = overrideList || (newItems[index].type === "Product" ? productsList : customizedProductsList);
                const selectedItem = listToSearch.find(i => i.id == value);
                if (selectedItem) {
                    newItems[index].rate = parseFloat(selectedItem.rate || 0);
                    newItems[index].production_cost = parseFloat(selectedItem.Production_cost || selectedItem.cost_price || 0);
                    newItems[index].description = selectedItem.name || selectedItem.description || "N/A";
                    if (!newItems[index].quantity || parseFloat(newItems[index].quantity) <= 0) {
                        newItems[index].quantity = 1;
                    }
                    newItems[index].amount = newItems[index].rate * newItems[index].quantity;

                    const taxVal = selectedItem.tax;
                    const taxId = (typeof taxVal === 'object' ? taxVal?.id : taxVal);
                    if (isValidTaxId(taxId)) {
                        try {
                            const taxResponse = await taxService.getTaxCodeById(taxId);
                            const taxData = taxResponse.data;
                            const taxRates = taxData?.tax_rates || {};
                            const totalTaxPercent = Object.values(taxRates).reduce((sum, r) => sum + (parseFloat(r) || 0), 0);

                            newItems[index].tax_percent = totalTaxPercent;
                            newItems[index].tax_details = taxRates;
                            newItems[index].tax_id = taxId;

                            if (!lockedCountry && taxData?.country) {
                                setLockedCountry(taxData.country);
                                fetchItems(taxData.country);
                            }
                        } catch (error) {
                            console.error("Error fetching tax template:", error);
                        }
                    } else {
                        newItems[index].tax_percent = 0;
                        newItems[index].tax_details = {};
                        newItems[index].tax_id = "";
                    }
                }
            } else if (newItems[index].type === "Time") {
                const selectedItem = timeList.find(i => i.id == value);
                if (selectedItem) {
                    newItems[index].source_type = "time";
                    newItems[index].rate = parseFloat(selectedItem.rate_per_hour || 0);
                    newItems[index].quantity = (parseFloat(selectedItem.duration_minutes) || 0) / 60;
                    newItems[index].amount = parseFloat(selectedItem.amount || 0);
                    newItems[index].metadata = {
                        hours: Math.floor(selectedItem.duration_minutes / 60),
                        minutes: selectedItem.duration_minutes % 60,
                        duration_minutes: selectedItem.duration_minutes,
                        use_start_end: !!(selectedItem.start && selectedItem.end),
                        start_date: selectedItem.start ? selectedItem.start.split('T')[0] : "",
                        start_time: selectedItem.start ? selectedItem.start.split('T')[1]?.slice(0, 5) : "",
                        end_date: selectedItem.end ? selectedItem.end.split('T')[0] : "",
                        end_time: selectedItem.end ? selectedItem.end.split('T')[1]?.slice(0, 5) : "",
                        notes: selectedItem.note || "",
                        name: selectedItem.name || ""
                    };
                }
            } else if (newItems[index].type === "Mileage") {
                const selectedItem = mileageList.find(i => i.id == value);
                if (selectedItem) {
                    newItems[index].source_type = "mileage";
                    newItems[index].rate = parseFloat(selectedItem.rate_per_km || 0);
                    newItems[index].quantity = parseFloat(selectedItem.distance_km || 0);
                    newItems[index].amount = parseFloat(selectedItem.amount || 0);
                    newItems[index].metadata = {
                        start_address: selectedItem.start_address || "",
                        end_address: selectedItem.end_address || "",
                        trip_type: selectedItem.trip_type || "one_way",
                        distance_km: selectedItem.distance_km || "0",
                        rate_per_km: selectedItem.rate_per_km || "0",
                        notes: selectedItem.note || "",
                        name: selectedItem.name || ""
                    };
                }
            } else if (newItems[index].type === "Estimation") {
                const selectedItem = estimationList.find(i => i.id == value);
                if (selectedItem) {
                    newItems[index].source_type = "estimation";
                    newItems[index].rate = parseFloat(selectedItem.total_amount || 0);
                    newItems[index].quantity = 1;
                    newItems[index].amount = parseFloat(selectedItem.total_amount || 0);
                    newItems[index].metadata = {
                        estimation_id: value.toString(),
                        estimation_number: selectedItem.estimation_number || "",
                        name: selectedItem.name || "",
                        estimation_name: selectedItem.name || "",
                        parent_subtotal: selectedItem.subtotal || "0",
                        parent_tax: selectedItem.tax || "0",
                        parent_total_amount: selectedItem.total_amount || "0",
                        lines: selectedItem.lines || []
                    };
                }
            }
        }

        if (field === "quantity" || field === "rate") {
            newItems[index][field] = value;
            const qty = field === "quantity" ? (value === "" ? "" : (parseFloat(value) || 0)) : newItems[index].quantity;
            const rate = field === "rate" ? (value === "" ? "" : (parseFloat(value) || 0)) : newItems[index].rate;
            newItems[index].amount = Number(((parseFloat(qty) || 0) * (parseFloat(rate) || 0)).toFixed(2));
        }

        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleSavePopupProduct = async (apiPayload) => {
        try {
            setIsSavingPopup(true);
            const { composition, ...productData } = apiPayload;
            const payload = {
                ...productData,
                selling_price: parseFloat(productData.rate || productData.selling_price || 0),
                cost_price: parseFloat(productData.Production_cost || productData.cost_price || 0),
                quantity: parseFloat(productData.current_quantity || productData.quantity || 0),
                tax: parseInt(productData.tax) || null,
                composition: composition?.map(c => ({
                    raw_material_id: parseInt(c.raw_material_id?.id || c.raw_material_id),
                    quantity_used: parseFloat(c.quantity || c.quantity_used),
                    tax_percent: 0,
                    tax_percentage: 0
                })) || []
            };

            const response = await inventoryService.saveProduct(payload);
            dispatch(showToast({ message: "Product created successfully", type: "success" }));

            const createdId = findIdInObject(response);
            if (apiPayload.enableRestock && createdId) {
                const costPrice = parseFloat(payload.cost_price || 0);
                const restockQty = parseFloat(apiPayload.restock_quantity) || 0;
                const restockData = {
                    amount: restockQty,
                    supplier_id: null,
                    payment_method: null,
                    payment_status: "FULLY_PAID",
                    paid_amount: costPrice * restockQty,
                    email_to: null
                };

                (async () => {
                    try {
                        const allMaterialsRes = await inventoryService.getRawMaterials();
                        const allMaterials = allMaterialsRes.data || [];

                        const dbProductRes = await inventoryService.getProducts({ id: createdId });
                        const dbProduct = dbProductRes.data?.[0];

                        const mappedComposition = dbProduct?.composition?.map(c => {
                            const rawMatObj = Array.isArray(c.raw_material_id) ? c.raw_material_id[0] : c.raw_material_id;
                            const rawMatId = parseInt(rawMatObj?.id || rawMatObj);
                            const fullMat = allMaterials.find(rm => rm.id === rawMatId);
                            const formattedMat = fullMat ? {
                                ...fullMat,
                                quantity: typeof fullMat.quantity === 'number' ? fullMat.quantity.toFixed(2) : parseFloat(fullMat.quantity).toFixed(2),
                                unit_price: typeof fullMat.unit_price === 'number' ? fullMat.unit_price.toFixed(2) : parseFloat(fullMat.unit_price).toFixed(2),
                                tax_percent: typeof fullMat.tax_percent === 'number' ? fullMat.tax_percent.toString() : fullMat.tax_percent,
                                tax_id: fullMat.tax_id?.id || fullMat.tax_id || null
                            } : null;

                            return {
                                id: c.id,
                                item_id: createdId,
                                raw_material_id: formattedMat ? [formattedMat] : [],
                                quantity_used: parseFloat(c.quantity_used || 0).toFixed(2)
                            };
                        }) || [];

                        const createdProduct = {
                            id: createdId,
                            name: payload.name,
                            item_type: "PRODUCTS",
                            category: "SALES",
                            item_code: payload.item_code,
                            hsn_sac_code: payload.hsn_sac_code || null,
                            unit: payload.unit || null,
                            description: payload.description || null,
                            rate: typeof payload.selling_price === 'number' ? payload.selling_price.toFixed(2) : parseFloat(payload.selling_price || 0).toFixed(2),
                            tax: payload.tax ? parseInt(payload.tax) : null,
                            Production_cost: typeof payload.cost_price === 'number' ? payload.cost_price.toFixed(2) : parseFloat(payload.cost_price || 0).toFixed(2),
                            opening_quantity: "0",
                            current_quantity: "0",
                            composition: mappedComposition,
                            selling_price: parseFloat(payload.selling_price || 0),
                            cost_price: parseFloat(payload.cost_price || 0),
                            restock: restockQty,
                            supplier_id: null,
                            payment_mode: null,
                            payment_status: "FULLY_PAID",
                            payment_amount: costPrice * restockQty,
                            email_to: null
                        };

                        await inventoryService.restockProduct(createdProduct, restockData);
                        dispatch(showToast({ message: "Initial stock added successfully", type: "success" }));
                        fetchItems(lockedCountry);
                    } catch (err) {
                        console.error("Restock error:", err);
                        dispatch(showToast({ message: "Failed to add initial stock.", type: "error" }));
                        fetchItems(lockedCountry);
                    }
                })();
            }

            const fetched = await fetchItems(lockedCountry);
            const finalId = createdId ? Number(createdId) : null;

            if (finalId && activeRowIdx !== null) {
                const list = fetched ? fetched.productsList : null;
                handleItemChange(activeRowIdx, "item_id", finalId, list);
            }

            setIsProductFormOpen(false);
        } catch (error) {
            console.error("Error creating product from sales form:", error);
            dispatch(showToast({ message: "Failed to create product", type: "error" }));
        } finally {
            setIsSavingPopup(false);
        }
    };

    const handleSavePopupSpecialItem = async (apiPayload) => {
        try {
            setIsSavingPopup(true);
            const payload = {
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

            const response = await inventoryService.saveCustomizedProduct(payload);
            dispatch(showToast({ message: "Customized product created successfully", type: "success" }));

            const createdId = findIdInObject(response);
            if (apiPayload.enableRestock && createdId) {
                const createdProduct = {
                    ...payload,
                    id: createdId
                };
                const restockData = {
                    amount: parseFloat(apiPayload.restock_quantity) || 0,
                    supplier_id: apiPayload.restock_supplier_id ? (apiPayload.restock_supplier_id.id || apiPayload.restock_supplier_id) : null,
                    payment_method: apiPayload.restock_payment_method || null,
                    payment_status: apiPayload.restock_payment_status || "FULLY_PAID",
                    paid_amount: parseFloat(apiPayload.restock_payment_amount) || 0
                };

                try {
                    await processRestock(createdProduct, restockData, "Customized Products");
                    dispatch(showToast({ message: "Stock restocked and purchase invoice & payment recorded successfully", type: "success" }));
                } catch (err) {
                    console.error("Restock error:", err);
                    dispatch(showToast({ message: "Failed to add initial stock.", type: "error" }));
                }
            }

            const fetched = await fetchItems(lockedCountry);
            const finalId = createdId ? Number(createdId) : null;

            if (finalId && activeRowIdx !== null) {
                const list = fetched ? fetched.customizedProductsList : null;
                handleItemChange(activeRowIdx, "item_id", finalId, list);
            }

            setIsSpecialItemFormOpen(false);
        } catch (error) {
            console.error("Error creating customized product from sales form:", error);
            dispatch(showToast({ message: "Failed to create customized product", type: "error" }));
        } finally {
            setIsSavingPopup(false);
        }
    };

    const handleRestockRawMaterialFromProductForm = (material, deficit) => {
        setRestockItem({
            ...material,
            prefilledAmount: deficit
        });
        setIsRestockModalOpen(true);
    };

    const handleRestockConfirm = async (data) => {
        try {
            setIsSavingPopup(true);
            await processRestock(restockItem, data, "Raw Materials");
            dispatch(showToast({ message: "Raw material restocked successfully", type: "success" }));
            setIsRestockModalOpen(false);
            setRestockItem(null);
            setRestockSuccessCount(prev => prev + 1);
        } catch (error) {
            console.error("Restock error:", error);
            dispatch(showToast({ message: "Failed to restock raw material", type: "error" }));
        } finally {
            setIsSavingPopup(false);
        }
    };

    const handleEstimationItemSelect = async (index, itemId) => {};

    const renderCardBody = (item, idx) => {
        const type = item.type || item.source_type;
        const commonLabelClass = "text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1";
        const commonInputClass = "w-full px-3 py-1.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFCA00] focus:bg-white transition-all h-[38px]";

        if (type === "Product" || type === "product") {
            const selectedProduct = productsList.find(i => i.id == item.item_id);
            const dbItems = Array.isArray(editData?.items) ? editData.items : [];
            const originalDbItem = dbItems.find(dbItem => dbItem.source_id == item.item_id || dbItem.item_id == item.item_id);
            const originalQty = originalDbItem ? (parseFloat(originalDbItem.quantity) || 0) : 0;
            const currentStock = (selectedProduct ? (parseFloat(selectedProduct.current_quantity) || 0) : 0) + originalQty;
            const prodCost = selectedProduct ? (parseFloat(selectedProduct.Production_cost) || 0) : 0;
            const hasQtyError = item.item_id && item.quantity > currentStock;
            const hasRateWarning = item.item_id && item.rate < prodCost;

            return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-4">
                        <label className={commonLabelClass}>Item Name</label>
                        <CustomSelect
                            value={item.item_id}
                            onChange={(val) => {
                                if (val === "new_product") {
                                    setActiveRowIdx(idx);
                                    setIsProductFormOpen(true);
                                } else {
                                    handleItemChange(idx, "item_id", val);
                                }
                            }}
                            options={[
                                { value: "new_product", label: "+ Add New Product" },
                                ...productsList
                                    .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.type === item.type && it.item_id == i.id))
                                    .map(i => ({ value: i.id, label: i.name }))
                            ]}
                            placeholder="Select Product"
                            className="rounded-xl h-[38px] shadow-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className={commonLabelClass}>Tax</label>
                        <input
                            type="text"
                            readOnly
                            disabled
                            value={item.tax_percent !== undefined ? `${item.tax_percent}%` : "0%"}
                            className={`${commonInputClass} bg-gray-50/50 cursor-not-allowed`}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className={commonLabelClass}>Quantity</label>
                        <input
                            type="number"
                            value={item.quantity ?? ""}
                            onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                            className={`${commonInputClass} ${hasQtyError ? "border-red-500 bg-red-50/10 focus:border-red-500 focus:bg-white" : ""}`}
                            placeholder="0"
                        />
                        {item.item_id && (
                            hasQtyError ? (
                                <span className="text-[11px] text-red-500 font-medium mt-1 block">Exceeds stock ({currentStock})</span>
                            ) : (
                                <span className="text-[11px] text-gray-500 mt-1 block">Current Stock: {currentStock}</span>
                            )
                        )}
                    </div>
                    <div className="md:col-span-4 grid grid-cols-2 gap-4">
                        <div>
                            <label className={commonLabelClass}>Rate</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₹</span>
                                <input
                                    type="number"
                                    value={item.rate}
                                    onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                                    className={`${commonInputClass} pl-7 ${hasRateWarning ? "border-amber-500 bg-amber-50/10 focus:border-amber-500 focus:bg-white" : ""}`}
                                    placeholder="0.00"
                                />
                            </div>
                            {item.item_id && (
                                hasRateWarning ? (
                                    <span className="text-[11px] text-amber-600 font-medium mt-1 block">Below cost (₹{prodCost.toFixed(2)})</span>
                                ) : (
                                    <span className="text-[11px] text-gray-500 mt-1 block">Product Cost: ₹{prodCost.toFixed(2)}</span>
                                )
                            )}
                        </div>
                        <div>
                            <label className={commonLabelClass}>Amount</label>
                            <div className="h-[38px] flex items-center justify-end px-3 bg-gray-50 border border-gray-100 rounded-xl text-[13px] font-bold text-gray-900">
                                ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (type === "Customized Product" || type === "customized") {
            const selectedProduct = customizedProductsList.find(i => i.id == item.item_id);
            const dbItems = Array.isArray(editData?.items) ? editData.items : [];
            const originalDbItem = dbItems.find(dbItem => dbItem.source_id == item.item_id || dbItem.item_id == item.item_id);
            const originalQty = originalDbItem ? (parseFloat(originalDbItem.quantity) || 0) : 0;
            const currentStock = (selectedProduct ? (parseFloat(selectedProduct.current_quantity) || 0) : 0) + originalQty;
            const prodCost = selectedProduct ? (parseFloat(selectedProduct.Production_cost) || 0) : 0;
            const hasQtyError = item.item_id && item.quantity > currentStock;
            const hasRateWarning = item.item_id && item.rate < prodCost;

            return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-4">
                        <label className={commonLabelClass}>Item Name</label>
                        <CustomSelect
                            value={item.item_id}
                            onChange={(val) => {
                                if (val === "new_customized_product") {
                                    setActiveRowIdx(idx);
                                    setIsSpecialItemFormOpen(true);
                                } else {
                                    handleItemChange(idx, "item_id", val);
                                }
                            }}
                            options={[
                                { value: "new_customized_product", label: "+ Add New Customized Product" },
                                ...customizedProductsList
                                    .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.type === item.type && it.item_id == i.id))
                                    .map(i => ({ value: i.id, label: i.name }))
                            ]}
                            placeholder="Select Customized Product"
                            className="rounded-xl h-[38px] shadow-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className={commonLabelClass}>Tax</label>
                        <input
                            type="text"
                            readOnly
                            disabled
                            value={item.tax_percent !== undefined ? `${item.tax_percent}%` : "0%"}
                            className={`${commonInputClass} bg-gray-50/50 cursor-not-allowed`}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className={commonLabelClass}>Quantity</label>
                        <input
                            type="number"
                            value={item.quantity ?? ""}
                            onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                            className={`${commonInputClass} ${hasQtyError ? "border-red-500 bg-red-50/10 focus:border-red-500 focus:bg-white" : ""}`}
                            placeholder="0"
                        />
                        {item.item_id && (
                            hasQtyError ? (
                                <span className="text-[11px] text-red-500 font-medium mt-1 block">Exceeds stock ({currentStock})</span>
                            ) : (
                                <span className="text-[11px] text-gray-500 mt-1 block">Current Stock: {currentStock}</span>
                            )
                        )}
                    </div>
                    <div className="md:col-span-4 grid grid-cols-2 gap-4">
                        <div>
                            <label className={commonLabelClass}>Rate</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₹</span>
                                <input
                                    type="number"
                                    value={item.rate}
                                    onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                                    className={`${commonInputClass} pl-7 ${hasRateWarning ? "border-amber-500 bg-amber-50/10 focus:border-amber-500 focus:bg-white" : ""}`}
                                    placeholder="0.00"
                                />
                            </div>
                            {item.item_id && (
                                hasRateWarning ? (
                                    <span className="text-[11px] text-amber-600 font-medium mt-1 block">Below cost (₹{prodCost.toFixed(2)})</span>
                                ) : (
                                    <span className="text-[11px] text-gray-500 mt-1 block">Product Cost: ₹{prodCost.toFixed(2)}</span>
                                )
                            )}
                        </div>
                        <div>
                            <label className={commonLabelClass}>Amount</label>
                            <div className="h-[38px] flex items-center justify-end px-3 bg-gray-50 border border-gray-100 rounded-xl text-[13px] font-bold text-gray-900">
                                ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (type === "Service" || type === "service") {
            return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-8">
                        <label className={commonLabelClass}>Service Description</label>
                        <textarea
                            value={item.metadata?.description || ""}
                            onChange={(e) => {
                                setFormData(prev => {
                                    const newItems = [...prev.items];
                                    newItems[idx].description = e.target.value;
                                    newItems[idx].metadata = {
                                        ...newItems[idx].metadata,
                                        description: e.target.value,
                                        service_name: e.target.value || "Service"
                                    };
                                    return { ...prev, items: newItems };
                                });
                            }}
                            className="w-full px-4 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFCA00] focus:bg-white transition-all h-[60px] resize-none"
                            placeholder="Describe the service provided..."
                        />
                    </div>
                    <div className="md:col-span-4">
                        <label className={commonLabelClass}>Total Service Amount</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₹</span>
                            <input
                                type="number"
                                value={item.rate === 0 ? "" : item.rate}
                                onChange={(e) => {
                                    const rateVal = parseFloat(e.target.value) || 0;
                                    setFormData(prev => {
                                        const newItems = [...prev.items];
                                        newItems[idx].rate = rateVal;
                                        newItems[idx].quantity = 1;
                                        newItems[idx].amount = rateVal;
                                        return { ...prev, items: newItems };
                                    });
                                }}
                                className={`${commonInputClass} pl-7`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>
            );
        }

        if (type === "Time" || type === "time") {
            if (!item.item_id) {
                return (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-12">
                            <label className={commonLabelClass}>Select Time</label>
                            <CustomSelect
                                value={item.item_id}
                                onChange={(val) => handleItemChange(idx, "item_id", val)}
                                options={timeList
                                    .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.type === item.type && it.item_id == i.id))
                                    .map(i => ({ value: i.id, label: i.name }))}
                                placeholder="Select Time"
                                className="rounded-xl h-[38px] shadow-none"
                            />
                        </div>
                    </div>
                );
            }

            return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3">
                        <label className={commonLabelClass}>Select Time</label>
                        <CustomSelect
                            value={item.item_id}
                            onChange={(val) => handleItemChange(idx, "item_id", val)}
                            options={timeList
                                .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.type === item.type && it.item_id == i.id))
                                .map(i => ({ value: i.id, label: i.name }))}
                            placeholder="Select Time"
                            className="rounded-xl h-[38px] shadow-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className={commonLabelClass}>Hours</label>
                        <input
                            type="number"
                            readOnly
                            disabled
                            placeholder="Hours"
                            value={item.metadata?.hours !== undefined ? item.metadata.hours : ""}
                            className={`${commonInputClass} bg-gray-50/50 cursor-not-allowed`}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className={commonLabelClass}>Minutes</label>
                        <input
                            type="number"
                            readOnly
                            disabled
                            placeholder="Mins"
                            value={item.metadata?.minutes !== undefined ? item.metadata.minutes : ""}
                            className={`${commonInputClass} bg-gray-50/50 cursor-not-allowed`}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className={commonLabelClass}>Rate / Hour</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₹</span>
                            <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                                className={`${commonInputClass} pl-7`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-3">
                        <label className={commonLabelClass}>Total Amount</label>
                        <div className="h-[38px] flex items-center justify-end px-3 bg-gray-50 border border-gray-100 rounded-xl text-[13px] font-bold text-gray-900">
                            ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            );
        }

        if (type === "Mileage" || type === "mileage") {
            if (!item.item_id) {
                return (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-12">
                            <label className={commonLabelClass}>Select Mileage</label>
                            <CustomSelect
                                value={item.item_id}
                                onChange={(val) => handleItemChange(idx, "item_id", val)}
                                options={mileageList
                                    .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.type === item.type && it.item_id == i.id))
                                    .map(i => ({ value: i.id, label: i.name }))}
                                placeholder="Select Mileage"
                                className="rounded-xl h-[38px] shadow-none"
                            />
                        </div>
                    </div>
                );
            }

            return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                        <label className={commonLabelClass}>Vehicle Profile</label>
                        <CustomSelect
                            value={item.item_id}
                            onChange={(val) => handleItemChange(idx, "item_id", val)}
                            options={mileageList
                                .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.type === item.type && it.item_id == i.id))
                                .map(i => ({ value: i.id, label: i.name }))}
                            placeholder="Select Profile"
                            className="rounded-xl h-[38px] shadow-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className={commonLabelClass}>Distance (KM)</label>
                        <input
                            type="number"
                            readOnly
                            disabled
                            value={item.quantity || 0}
                            className={`${commonInputClass} bg-gray-50/50 cursor-not-allowed`}
                            placeholder="0.0"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className={commonLabelClass}>Rate per KM</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₹</span>
                            <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => {
                                    handleItemChange(idx, "rate", e.target.value);
                                    handleMetadataChange(idx, "rate_per_km", e.target.value);
                                }}
                                className={`${commonInputClass} pl-7`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-3">
                        <label className={commonLabelClass}>Total Amount</label>
                        <div className="h-[38px] flex items-center justify-end px-3 bg-gray-50 border border-gray-100 rounded-xl text-[13px] font-bold text-gray-900">
                            ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            );
        }

        if (type === "Estimation" || type === "estimation") {
            if (!item.item_id) {
                return (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-12">
                            <label className={commonLabelClass}>Select Estimation</label>
                            <CustomSelect
                                value={item.item_id}
                                onChange={(val) => handleItemChange(idx, "item_id", val)}
                                options={estimationList
                                    .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.type === item.type && it.item_id == i.id))
                                    .map(i => ({
                                        value: i.id,
                                        label: i.name ? `${i.name} (${i.estimation_number || 'EST'})` : `${i.estimation_number || 'EST'}`
                                    }))}
                                placeholder="Select Estimation"
                                className="rounded-xl h-[38px] shadow-none bg-white border border-gray-200"
                            />
                        </div>
                    </div>
                );
            }

            return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-6">
                        <label className={commonLabelClass}>Estimation Link</label>
                        <CustomSelect
                            value={item.item_id}
                            onChange={(val) => handleItemChange(idx, "item_id", val)}
                            options={estimationList
                                .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.type === item.type && it.item_id == i.id))
                                .map(i => ({
                                    value: i.id,
                                    label: i.name ? `${i.name} (${i.estimation_number || 'EST'})` : `${i.estimation_number || 'EST'}`
                                }))}
                            placeholder="Select Estimation"
                            className="rounded-xl h-[38px] shadow-none bg-white border border-gray-200"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className={commonLabelClass}>Total Tax</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₹</span>
                            <input
                                type="text"
                                readOnly
                                disabled
                                value={(() => {
                                    const totalAmount = parseFloat(item.rate) || 0;
                                    const originalTotal = parseFloat(item.metadata?.parent_total_amount) || totalAmount || 1;
                                    const originalTax = parseFloat(item.metadata?.parent_tax) || 0;
                                    const taxAmount = originalTotal > 0 ? (totalAmount * originalTax) / originalTotal : 0;
                                    return taxAmount.toFixed(2);
                                })()}
                                className={`${commonInputClass} pl-7 bg-gray-50/50 cursor-not-allowed`}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-3">
                        <label className={commonLabelClass}>Total Amount</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₹</span>
                            <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => {
                                    handleItemChange(idx, "rate", e.target.value);
                                    handleItemChange(idx, "amount", e.target.value);
                                }}
                                className={`${commonInputClass} pl-7`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    const renderItemsList = () => {
        if (formData.items.length === 0) {
            return (
                <div className="border border-dashed border-gray-300 rounded-2xl p-10 text-center bg-[#FDFDFD] flex flex-col items-center justify-center">
                    <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 mb-4 text-[#FFCA00]">
                        <FiPlus size={24} />
                    </div>
                    <h4 className="text-[16px] font-bold text-gray-900 mb-1">No items added yet</h4>
                    <p className="text-[13px] text-gray-500 max-w-md mb-8">
                        Click below to quickly select and add the type of item you want to include in this quote.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 w-full max-w-4xl">
                        {[
                            { id: "Product", label: "Product", icon: FiBox, color: "hover:border-[#FFCA00] hover:text-[#FFCA00] hover:bg-amber-50/10" },
                            { id: "Customized Product", label: "Customized", icon: FiSettings, color: "hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50/10" },
                            { id: "Service", label: "Service", icon: FiTool, color: "hover:border-green-500 hover:text-green-600 hover:bg-green-50/10" },
                            { id: "Time", label: "Time", icon: FiClock, color: "hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/10" },
                            { id: "Mileage", label: "Mileage", icon: FiMapPin, color: "hover:border-rose-500 hover:text-rose-600 hover:bg-rose-50/10" },
                            { id: "Estimation", label: "Estimation", icon: FiBriefcase, color: "hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50/10" }
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleAddNewItemOfType(opt.id)}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold transition-all text-xs gap-2 shadow-sm ${opt.color}`}
                            >
                                <opt.icon size={20} className="opacity-80" />
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {formData.items.map((item, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 font-bold text-[11px] flex items-center justify-center">
                                    {idx + 1}
                                </span>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                                    {item.type || item.source_type}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                                <FiTrash2 size={16} />
                            </button>
                        </div>
                        {renderCardBody(item, idx)}
                    </div>
                ))}
            </div>
        );
    };

    const legacy_handleMetadataChange = (index, field, value) => {
        setFormData(prev => {
            const newItems = [...prev.items];
            const item = newItems[index];
            const updatedMetadata = {
                ...item.metadata,
                [field]: value
            };

            let updatedQuantity = item.quantity;
            let updatedRate = item.rate;

            if (item.source_type === "time") {
                if (field === "duration_minutes") {
                    updatedQuantity = parseFloat(value || 0) / 60;
                } else if (field === "hours" || field === "minutes") {
                    const h = parseFloat(updatedMetadata.hours) || 0;
                    const m = parseFloat(updatedMetadata.minutes) || 0;
                    const totalMins = (h * 60) + m;
                    updatedMetadata.duration_minutes = totalMins;
                    updatedQuantity = totalMins / 60;
                } else if (["start_date", "start_time", "end_date", "end_time", "use_start_end"].includes(field)) {
                    if (updatedMetadata.use_start_end && updatedMetadata.start_date && updatedMetadata.start_time && updatedMetadata.end_date && updatedMetadata.end_time) {
                        const start = new Date(`${updatedMetadata.start_date}T${updatedMetadata.start_time}`);
                        const end = new Date(`${updatedMetadata.end_date}T${updatedMetadata.end_time}`);
                        const diffMs = end - start;
                        if (diffMs >= 0) {
                            const diffMins = Math.floor(diffMs / (1000 * 60));
                            updatedMetadata.duration_minutes = diffMins;
                            updatedMetadata.hours = Math.floor(diffMins / 60);
                            updatedMetadata.minutes = diffMins % 60;
                            updatedQuantity = diffMins / 60;
                        }
                    }
                }
            } else if (item.source_type === "mileage") {
                if (field === "distance_km") {
                    updatedQuantity = parseFloat(value || 0);
                }
            } else if (item.source_type === "estimation") {
                const cat = (item.metadata?.line_category || item.metadata?.category || "").toLowerCase();
                if (cat === "manpower") {
                    const hours = (field === "hours" || field === "duration_minutes") ? parseFloat(value || 0) : (updatedMetadata.hours || updatedMetadata.duration_minutes || 0);
                    const rate = field === "rate" ? parseFloat(value || 0) : (item.rate || 0);
                    updatedQuantity = parseFloat(hours) || 0;
                    updatedRate = parseFloat(rate) || 0;
                    if (field === "role") {
                        updatedMetadata.line_description = value;
                        updatedMetadata.line_name = value;
                    }
                } else if (cat === "materials") {
                    let qty = field === "qty" ? parseFloat(value || 0) : (updatedMetadata.qty || 0);

                    if (field === "qty" && item.item_id && (updatedMetadata.type === "product" || updatedMetadata.type === "customized product")) {
                        const list = updatedMetadata.type === "customized product" ? customizedProductsList : productsList;
                        const product = list.find(p => p.id == item.item_id);
                        const stock = product?.current_quantity || 0;
                        if (qty > stock) {
                            dispatch(showToast({ message: `Cannot exceed available stock of ${stock}`, type: "error" }));
                            qty = stock;
                            updatedMetadata.qty = stock;
                        }
                    }

                    const cost = field === "rate" ? parseFloat(value || 0) : (item.rate || 0);
                    updatedQuantity = parseFloat(qty) || 0;
                    updatedRate = parseFloat(cost) || 0;
                    if (field === "name") {
                        updatedMetadata.line_description = value;
                        updatedMetadata.line_name = value;
                    }
                } else if (cat === "machinery" || cat === "minutes" || cat === "measurement" || cat === "middlemen" || cat === "money" || cat === "method" || cat === "management" || cat === "morale" || cat === "marketing" || cat === "milieu" || cat === "maintenance" || cat === "mission" || cat === "mitigation") {
                    const qField = (cat === "minutes" ? "minutes" : (cat === "mileage" ? "distance" : "qty"));
                    const q = field === qField ? parseFloat(value || 0) : (updatedMetadata[qField] || 0);
                    const r = (field === "rate" || field === "cost") ? parseFloat(value || 0) : (item.rate || 0);
                    updatedQuantity = parseFloat(q) || 0;
                    updatedRate = parseFloat(r) || 0;
                    if (field === "description") {
                        updatedMetadata.line_description = value;
                        updatedMetadata.line_name = value;
                    }
                } else if (cat === "mileage") {
                    const d = field === "distance" ? parseFloat(value || 0) : (updatedMetadata.distance || 0);
                    const r = field === "rate" ? parseFloat(value || 0) : (item.rate || 0);
                    updatedQuantity = parseFloat(d) || 0;
                    updatedRate = parseFloat(r) || 0;
                }
            }

            const subtotal = (parseFloat(updatedQuantity) || 0) * (parseFloat(updatedRate) || 0);

            newItems[index] = {
                ...item,
                quantity: updatedQuantity,
                rate: updatedRate,
                amount: Number(subtotal.toFixed(2)),
                metadata: updatedMetadata
            };
            return { ...prev, items: newItems };
        });
    };

    const legacy_handleRemoveItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const legacy_handleItemChange = async (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        if (field === "type") {
            newItems[index].item_id = "";
            newItems[index].rate = 0;
            newItems[index].quantity = 1;
            newItems[index].amount = 0;
            newItems[index].tax_percent = 0;
            newItems[index].tax_id = "";
            newItems[index].tax_details = {};
            newItems[index].metadata = {};
            if (value === "Time") newItems[index].source_type = "time";
            else if (value === "Mileage") newItems[index].source_type = "mileage";
            else if (value === "Estimation") newItems[index].source_type = "estimation";
            else if (value === "Service") newItems[index].source_type = "service";
            else newItems[index].source_type = "item";
        }

        if (field === "item_id") {
            if (newItems[index].type === "Product" || newItems[index].type === "Customized Product") {
                const listToSearch = newItems[index].type === "Product" ? productsList : customizedProductsList;
                const selectedItem = listToSearch.find(i => i.id == value);
                if (selectedItem) {
                    newItems[index].rate = parseFloat(selectedItem.rate || 0);
                    if (!newItems[index].quantity || parseFloat(newItems[index].quantity) <= 0) {
                        newItems[index].quantity = 1;
                    }
                    newItems[index].amount = newItems[index].rate * newItems[index].quantity;

                    // Fetch tax details if template ID (field 'tax') exists
                    const taxVal = selectedItem.tax;
                    const taxId = (typeof taxVal === 'object' ? taxVal?.id : taxVal);
                    if (isValidTaxId(taxId)) {
                        try {
                            const taxResponse = await taxService.getTaxCodeById(taxId);
                            const taxData = taxResponse.data;
                            const taxRates = taxData?.tax_rates || {};
                            const totalTaxPercent = Object.values(taxRates).reduce((sum, r) => sum + (parseFloat(r) || 0), 0);

                            newItems[index].tax_percent = totalTaxPercent;
                            newItems[index].tax_details = taxRates;
                            newItems[index].tax_id = taxId;

                            // Lock country and refetch if not locked
                            if (!lockedCountry && taxData?.country) {
                                setLockedCountry(taxData.country);
                                fetchItems(taxData.country);
                            }
                        } catch (error) {
                            console.error("Error fetching tax template:", error);
                        }
                    } else {
                        newItems[index].tax_percent = 0;
                        newItems[index].tax_details = {};
                        newItems[index].tax_id = "";
                    }
                }
            } else if (newItems[index].type === "Time") {
                const selectedItem = timeList.find(i => i.id == value);
                if (selectedItem) {
                    newItems[index].source_type = "time";
                    newItems[index].rate = parseFloat(selectedItem.rate_per_hour || 0);
                    newItems[index].quantity = (parseFloat(selectedItem.duration_minutes) || 0) / 60;
                    newItems[index].amount = parseFloat(selectedItem.amount || 0);
                    newItems[index].metadata = {
                        hours: Math.floor(selectedItem.duration_minutes / 60),
                        minutes: selectedItem.duration_minutes % 60,
                        duration_minutes: selectedItem.duration_minutes,
                        use_start_end: !!(selectedItem.start && selectedItem.end),
                        start_date: selectedItem.start ? selectedItem.start.split('T')[0] : "",
                        start_time: selectedItem.start ? selectedItem.start.split('T')[1]?.slice(0, 5) : "",
                        end_date: selectedItem.end ? selectedItem.end.split('T')[0] : "",
                        end_time: selectedItem.end ? selectedItem.end.split('T')[1]?.slice(0, 5) : "",
                        notes: selectedItem.note || "",
                        name: selectedItem.name || ""
                    };
                }
            } else if (newItems[index].type === "Mileage") {
                const selectedItem = mileageList.find(i => i.id == value);
                if (selectedItem) {
                    newItems[index].source_type = "mileage";
                    newItems[index].rate = parseFloat(selectedItem.rate_per_km || 0);
                    newItems[index].quantity = parseFloat(selectedItem.distance_km || 0);
                    newItems[index].amount = parseFloat(selectedItem.amount || 0);
                    newItems[index].metadata = {
                        start_address: selectedItem.start_address || "",
                        end_address: selectedItem.end_address || "",
                        trip_type: selectedItem.trip_type || "one_way",
                        distance_km: selectedItem.distance_km || "0",
                        rate_per_km: selectedItem.rate_per_km || "0",
                        notes: selectedItem.note || "",
                        name: selectedItem.name || ""
                    };
                }
            } else if (newItems[index].type === "Estimation") {
                const selectedItem = estimationList.find(i => i.id == value);
                if (selectedItem) {
                    if (Array.isArray(selectedItem.lines) && selectedItem.lines.length > 0) {
                        const mappedItems = selectedItem.lines.map(line => {
                            const lineCat = line.category || "materials";
                            const meta = line.metadata || {};
                            let lineTaxPercent = parseFloat(line.tax_percent) || parseFloat(meta.tax) || 0;
                            let lineTaxId = line.tax_id || "";
                            let mappedItemId = line.item_id || "";

                            if (lineCat === "materials") {
                                const isCustomObj = meta.type === "customized product";
                                const targetList = isCustomObj ? customizedProductsList : productsList;
                                const match = targetList.find(p => p.name?.toLowerCase() === (meta.name || line.description)?.toLowerCase() || p.id == line.item_id);
                                if (match) {
                                    mappedItemId = match.id;
                                    lineTaxId = match.tax_id || "";
                                    lineTaxPercent = parseFloat(match.tax_percent || 0);
                                }
                            }

                            return {
                                item_id: value.toString(),
                                type: "Estimation",
                                source_type: "estimation",
                                tax_id: lineTaxId,
                                tax_percent: lineTaxPercent,
                                quantity: parseFloat(line.quantity) || 1,
                                rate: parseFloat(line.rate) || parseFloat(line.amount) || 0,
                                amount: parseFloat(line.amount) || 0,
                                tax_details: {},
                                metadata: {
                                    ...meta,
                                    line_id: line.id,
                                    line_category: lineCat,
                                    category: lineCat,
                                    line_name: line.description,
                                    description: line.description,
                                    qty: meta.qty || line.quantity || 1,
                                    rate: meta.rate || line.rate || parseFloat(line.amount) || 0,
                                    cost: meta.cost || line.rate || 0,
                                    hours: meta.hours || line.quantity || 0,
                                    minutes: meta.minutes || line.quantity || 0,
                                    distance: meta.distance || line.quantity || 0,
                                    unit: line.unit || meta.unit || "",
                                    source: meta.source || "internal",
                                    role: meta.role || "",
                                    estimation_id: value.toString(),
                                    estimation_number: selectedItem.estimation_number || "",
                                    estimation_name: selectedItem.name || "",
                                    parent_subtotal: selectedItem.subtotal || "0",
                                    parent_tax: selectedItem.tax || "0",
                                    parent_total_amount: selectedItem.total_amount || "0"
                                }
                            };
                        });

                        const updatedItems = [
                            ...newItems.slice(0, index),
                            ...mappedItems,
                            ...newItems.slice(index + 1)
                        ];
                        setFormData(prev => ({ ...prev, items: updatedItems }));
                        return;
                    } else {
                        newItems[index].source_type = "estimation";
                        newItems[index].rate = parseFloat(selectedItem.total_amount || 0);
                        newItems[index].quantity = 1;
                        newItems[index].amount = parseFloat(selectedItem.total_amount || 0);
                        newItems[index].metadata = {
                            estimation_id: value.toString(),
                            estimation_number: selectedItem.estimation_number || "",
                            name: selectedItem.name || "",
                            estimation_name: selectedItem.name || "",
                            parent_subtotal: selectedItem.subtotal || "0",
                            parent_tax: selectedItem.tax || "0",
                            parent_total_amount: selectedItem.total_amount || "0"
                        };
                    }
                }
            }
        }

        if (field === "quantity" || field === "rate") {
            let qty = field === "quantity" ? parseFloat(value) || 0 : newItems[index].quantity;
            const rate = field === "rate" ? parseFloat(value) || 0 : newItems[index].rate;
            if (field === "quantity" && qty < 1 && (newItems[index].type === "Product" || newItems[index].type === "Customized Product")) {
                qty = 1;
            }
            newItems[index].amount = qty * rate;
        }

        setFormData(prev => ({ ...prev, items: newItems }));
    };

    // Handler for estimation item selection (Product/Customized Product)
    const legacy_handleEstimationItemSelect = async (index, itemId) => {
        const itemType = formData.items[index].metadata?.type || "product";
        const list = itemType === "customized product" ? customizedProductsList : productsList;
        const selected = list.find(i => i.id == itemId);

        if (selected) {
            const newItems = [...formData.items];
            const meta = {
                ...newItems[index].metadata,
                name: selected.name,
                line_description: selected.name
            };

            const rate = parseFloat(selected.rate) || 0;
            const qty = parseFloat(meta.qty) || 1;

            const updatedItem = {
                ...newItems[index],
                item_id: selected.id,
                rate: rate,
                amount: rate * qty,
                metadata: meta
            };

            const taxVal = selected.tax;
            const taxId = (typeof taxVal === 'object' ? taxVal?.id : taxVal);
            if (isValidTaxId(taxId)) {
                try {
                    const taxResponse = await taxService.getTaxCodeById(taxId);
                    const taxData = taxResponse.data;
                    const taxRates = taxData?.tax_rates || {};
                    const totalTaxPercent = Object.values(taxRates).reduce((sum, r) => sum + (parseFloat(r) || 0), 0);

                    updatedItem.tax_percent = totalTaxPercent;
                    updatedItem.tax_details = taxRates;
                    updatedItem.tax_id = taxId;
                    updatedItem.metadata.tax = totalTaxPercent;

                    // Lock country and refetch if not locked
                    if (!lockedCountry && taxData?.country) {
                        setLockedCountry(taxData.country);
                        fetchItems(taxData.country);
                    }
                } catch (error) {
                    console.error("Error fetching tax template:", error);
                }
            } else {
                updatedItem.tax_percent = 0;
                updatedItem.tax_details = {};
                updatedItem.tax_id = "";
                updatedItem.metadata.tax = 0;
            }

            newItems[index] = updatedItem;
            setFormData(prev => ({ ...prev, items: newItems }));
        }
    };

    const handleSave = async (forcedStatus = null, isSendToClient = false) => {
        const actualStatus = typeof forcedStatus === 'string' ? forcedStatus : null;

        try {
            // --- DATE VALIDATION ---
            if (!formData.quoteDate) {
                dispatch(showToast({ message: "Quote date is required.", type: "error" }));
                return;
            }
            if (!formData.expiryDate) {
                dispatch(showToast({ message: "Expiry date is required.", type: "error" }));
                return;
            }
            const qDate = new Date(formData.quoteDate);
            const eDate = new Date(formData.expiryDate);
            // Set times to midnight to compare dates only
            qDate.setHours(0, 0, 0, 0);
            eDate.setHours(0, 0, 0, 0);
            if (eDate < qDate) {
                dispatch(showToast({ message: "Expiry date cannot be before quote date.", type: "error" }));
                return;
            }

            if (!formData.items || formData.items.length === 0) {
                dispatch(showToast({ message: "Please add at least one item.", type: "error" }));
                return;
            }

            // --- STOCK VALIDATION ---
            const overstockItem = formData.items.find(item => {
                const isItemType = (item.type === "Product" || item.type === "Customized Product") ||
                    (item.source_type === "product" || item.source_type === "customized");
                const isEstimationMaterial = item.source_type === "estimation" &&
                    (item.metadata?.type === "product" || item.metadata?.type === "customized product") &&
                    item.item_id;

                if (!isItemType && !isEstimationMaterial) return false;

                const qty = isEstimationMaterial ? (parseFloat(item.metadata?.qty) || 0) : (parseFloat(item.quantity) || 0);
                const list = (item.type === "Customized Product" || item.metadata?.type === "customized product" || item.source_type === "customized")
                    ? customizedProductsList
                    : productsList;
                const dbProduct = list.find(i => i.id == item.item_id);
                const dbStock = dbProduct ? (parseFloat(dbProduct.current_quantity) || 0) : 0;

                const dbItems = Array.isArray(editData?.items) ? editData.items : [];
                const originalDbItem = dbItems.find(dbItem => dbItem.source_id == item.item_id || dbItem.item_id == item.item_id);
                const originalQty = originalDbItem ? (parseFloat(originalDbItem.quantity) || 0) : 0;

                const stock = dbStock + originalQty;

                return qty > stock;
            });

            if (overstockItem) {
                dispatch(showToast({ message: "One or more items exceed available stock quantity.", type: "error" }));
                return;
            }

            setIsSaving(true);
            setSaveType(isSendToClient ? "send" : "save");
            const finalStatus = actualStatus || formData.status || "DRAFT";

            let newId = null;
            if (editData) {
                // --- UPDATE FLOW ---
                const payload = {
                    quote_number: formData.quoteNumber,
                    quote_name: formData.quoteName,
                    customer_id: Number(formData.customer),
                    quote_date: formData.quoteDate,
                    expiry_date: formData.expiryDate,
                    status: finalStatus,
                    total_amount: totals.total.toFixed(2),
                    notes: formData.notes || "",
                    items: mapItemsForSave(formData.items)
                };

                // Attachment is already a CDN URL (uploaded by AttachmentUploader on file-select)
                payload.attachmentkey = formData.attachment || null;

                // Update via renamed service method with JSON payload
                await salesQuoteService.updateQuote(editData.id, payload);

                setInitialSnapshot(JSON.stringify(formData));
                dispatch(showToast({ message: "Sales Quote updated successfully!", type: "success" }));
                newId = editData.id;
            } else {
                // --- CREATE FLOW (Single API Call) ---
                const emailConfig = {
                    to: formData.emailConfig.to || "",
                    cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                    bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                    message: formData.emailConfig.message || ""
                };

                const payload = {
                    quote_number: formData.quoteNumber,
                    quote_name: formData.quoteName,
                    customer_id: Number(formData.customer),
                    quote_date: formData.quoteDate,
                    expiry_date: formData.expiryDate,
                    status: finalStatus,
                    total_amount: totals.total.toFixed(2),
                    notes: formData.notes || "",
                    items: mapItemsForSave(formData.items)
                };

                // Attachment is already a CDN URL (uploaded by AttachmentUploader on file-select)
                payload.attachmentkey = formData.attachment || null;

                const response = await salesQuoteService.saveQuote(payload);
                console.log("Create Quote Response:", response);

                if (response.success === false) {
                    const errorMsg = response.error?.[0]?.message || response.message || "Validation error";
                    throw new Error(errorMsg);
                }

                dispatch(showToast({ message: `Sales Quote created successfully!`, type: "success" }));
                newId = response?.data?.data?.id || response?.data?.id || response?.data?.[0]?.id || response?.id;
            }

            if (isSendToClient && newId) {
                try {
                    const emailData = {
                        documentType: "QUOTE",
                        documentId: newId,
                        email: {
                            to: formData.emailConfig.to || "",
                            cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                            bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                            message: formData.emailConfig.message || ""
                        }
                    };
                    await salesQuoteService.sendQuoteEmail(emailData);
                    dispatch(showToast({ message: "Email sent to client successfully!", type: "success" }));
                    onSave(newId, "EMAIL_SENT");
                } catch (emailError) {
                    console.error("Error sending email:", emailError);
                    dispatch(showToast({ message: emailError?.message || "Quote created, but failed to send email to client", type: "error" }));
                    onSave(newId);
                }
            } else {
                onSave(newId);
            }
            handleClose();
        } catch (error) {
            console.error("Error saving quote:", error);
            const errorMessage = error.message || "Error saving sales quote.";
            dispatch(showToast({ message: errorMessage, type: "error" }));
        } finally {
            setIsSaving(false);
            setSaveType(null);
        }
    };

    const handleSendEmail = async () => {
        if (!editData) return;
        setIsSaving(true);
        setSaveType("send");
        try {
            const emailData = {
                documentType: "QUOTE",
                documentId: editData.id,
                email: {
                    to: formData.emailConfig.to || "",
                    cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                    bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                    message: formData.emailConfig.message || ""
                }
            };
            await salesQuoteService.sendQuoteEmail(emailData);
            dispatch(showToast({ message: "Email sent to client successfully!", type: "success" }));
            onSave(editData.id, "EMAIL_SENT");
            handleClose();
        } catch (error) {
            console.error("Error sending email:", error);
            dispatch(showToast({ message: "Failed to send email. Please try again.", type: "error" }));
        } finally {
            setIsSaving(false);
            setSaveType(null);
        }
    };

    const handlePrint = () => docPreviewRef.current?.print();

    const handleDownloadPDF = async () => {
        try {
            setIsExporting(true);
            await docPreviewRef.current?.downloadPDF();
            dispatch(showToast({ message: "PDF downloaded successfully", type: "success" }));
        } catch (e) {
            dispatch(showToast({ message: "PDF generation failed", type: "error" }));
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
                            <div className="flex flex-wrap justify-between items-start mb-6 gap-2">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Configure Quote</h2>
                                    <p className="text-sm text-gray-500 mt-1">Setup quote and line items</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 no-print ${(!editData || hasChanges) ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-gray-100 text-gray-500"}`}>
                                    {(!editData || hasChanges) ? "Not Saved" : (formData.status || "DRAFT")}
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                {/* Details Section */}
                                <div className="mb-8">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Details</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2      gap-4 mb-4">
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Quote Number</label>
                                            <input
                                                type="text"
                                                value={formData.quoteNumber}
                                                readOnly
                                                className="w-full px-3 py-2 border border-gray-100 rounded text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                                                placeholder="e.g. Q-001"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Quote Name</label>
                                            <input
                                                type="text"
                                                value={formData.quoteName}
                                                onChange={(e) => setFormData({ ...formData, quoteName: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                placeholder="Enter Quote Name"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                                        <div className="lg:col-span-2">
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Customer</label>
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center">
                                                <div className="flex-1">
                                                    <CustomSelect
                                                        value={formData.customer}
                                                        onChange={(val) => {
                                                            const selectedCustomer = customers.find(c => c.id == val);
                                                            setFormData({
                                                                ...formData,
                                                                customer: val,
                                                                emailConfig: {
                                                                    ...formData.emailConfig,
                                                                    to: selectedCustomer?.email || ""
                                                                }
                                                            });
                                                        }}
                                                        options={customers.map(c => ({ value: c.id, label: c.name }))}
                                                        placeholder="Select Customer"
                                                        className="border border-gray-300 rounded-l-lg"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleAddCustomerClick}
                                                    className="px-4 py-2 bg-yellow-400 text-white text-sm font-medium rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none whitespace-nowrap flex items-center justify-center gap-1.5 h-[42px]"
                                                >
                                                    Add New Customer <FiUser />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Quote Date</label>
                                            <input
                                                type="date"
                                                value={formData.quoteDate}
                                                onChange={(e) => setFormData({ ...formData, quoteDate: e.target.value })}
                                                className={`w-full px-3 py-2 border border-gray-300 rounded text-sm hover:border-[#FFCA00] transition-colors ${!formData.quoteDate ? "text-gray-400" : "text-gray-900"}`}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Expiry Date</label>
                                            <input
                                                type="date"
                                                value={formData.expiryDate}
                                                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                                className={`w-full px-3 py-2 border border-gray-300 rounded text-sm hover:border-[#FFCA00] transition-colors ${!formData.expiryDate ? "text-gray-400" : "text-gray-900"}`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="mb-8">
                                    <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-50">
                                        <h3 className="text-[14px] font-bold text-gray-900 font-poppins uppercase tracking-wide">
                                            Sales Items
                                        </h3>
                                        {!viewOnly && (
                                            <div className="relative" ref={addItemMenuRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAddItemMenuOpen(!isAddItemMenuOpen)}
                                                    className="px-4 py-2 bg-[#FFCA00] text-white rounded-lg text-[13px] font-bold flex items-center gap-2 hover:bg-[#E6B600] transition-all shadow-sm animate-all duration-200"
                                                >
                                                    <FiPlus size={16} /> Add Item <FiChevronDown size={14} />
                                                </button>
                                                {isAddItemMenuOpen && (
                                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-2 max-h-72 overflow-y-auto ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                                                        {[
                                                            { id: "Product", label: "Product", icon: FiBox },
                                                            { id: "Customized Product", label: "Customized Product", icon: FiSettings },
                                                            { id: "Service", label: "Service", icon: FiTool },
                                                            { id: "Time", label: "Time", icon: FiClock },
                                                            { id: "Mileage", label: "Mileage", icon: FiMapPin },
                                                            { id: "Estimation", label: "Estimation", icon: FiBriefcase }
                                                        ].map((opt) => (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    handleAddNewItemOfType(opt.id);
                                                                    setIsAddItemMenuOpen(false);
                                                                }}
                                                                className="w-full text-left px-5 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-[13px] text-gray-700 font-medium transition-colors"
                                                            >
                                                                <opt.icon size={16} className="text-gray-400" />
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {renderItemsList()}
                                    <div className="hidden border border-gray-300 rounded overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm min-w-[900px] md:min-w-full">
                                                <thead className="bg-gray-50 border-b border-gray-300">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">#</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Type</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Item</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Tax</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Quantity</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Rate</th>
                                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Amount</th>
                                                        <th className="px-3 py-2"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {formData.items.map((item, idx) => (
                                                        <React.Fragment key={idx}>
                                                            <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/30 transition-colors">
                                                                <td className="px-4 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-gray-400 font-medium w-4">{idx + 1}</span>
                                                                        <div className="w-32">
                                                                            <CustomSelect
                                                                                value={item.type}
                                                                                onChange={(val) => handleItemChange(idx, "type", val)}
                                                                                options={[
                                                                                    { value: "Product", label: "Product" },
                                                                                    { value: "Customized Product", label: "Customized Product" },
                                                                                    { value: "Service", label: "Service" },
                                                                                    { value: "Time", label: "Time" },
                                                                                    { value: "Mileage", label: "Mileage" },
                                                                                    { value: "Estimation", label: "Estimation" },
                                                                                ]}
                                                                                className="rounded-lg h-[40px]"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <div className="w-48">
                                                                        <CustomSelect
                                                                            value={item.item_id}
                                                                            onChange={(val) => {
                                                                                if (val === "new_product") {
                                                                                    setActiveRowIdx(idx);
                                                                                    setIsProductFormOpen(true);
                                                                                } else if (val === "new_customized_product") {
                                                                                    setActiveRowIdx(idx);
                                                                                    setIsSpecialItemFormOpen(true);
                                                                                } else {
                                                                                    handleItemChange(idx, "item_id", val);
                                                                                }
                                                                            }}
                                                                            options={(() => {
                                                                                const list = (
                                                                                    item.type === "Product" ? productsList : 
                                                                                    item.type === "Customized Product" ? customizedProductsList : 
                                                                                    item.type === "Time" ? timeList :
                                                                                    item.type === "Mileage" ? mileageList :
                                                                                    item.type === "Estimation" ? estimationList :
                                                                                    []
                                                                                )
                                                                                    .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.type === item.type && it.item_id == i.id))
                                                                                    .map(i => ({
                                                                                        value: i.id,
                                                                                        label: 
                                                                                            item.type === "Estimation" 
                                                                                                ? (i.name ? `${i.name} (${i.estimation_number || 'EST'})` : `${i.estimation_number || 'EST'}`)
                                                                                                : item.type === "Time"
                                                                                                ? `${i.name || 'Time Entry'} (${i.duration_minutes ? Math.floor(i.duration_minutes / 60) + 'h ' + (i.duration_minutes % 60) + 'm' : '0m'})`
                                                                                                : item.type === "Mileage"
                                                                                                ? `${i.name || 'Trip'} (${i.distance_km || '0'} km)`
                                                                                                : i.name || "Item",
                                                                                        isDisabled: (item.type === "Product" || item.type === "Customized Product") ? parseFloat(i.current_quantity || 0) <= 0 : false
                                                                                    }));
                                                                                if (item.type === "Product") {
                                                                                    return [{ value: "new_product", label: "+ Add New Product" }, ...list];
                                                                                }
                                                                                if (item.type === "Customized Product") {
                                                                                    return [{ value: "new_customized_product", label: "+ Add New Customized Product" }, ...list];
                                                                                }
                                                                                return list;
                                                                            })()}
                                                                            placeholder={item.type === "Service" ? "Enter Details Below..." : "Select Item"}
                                                                            isDisabled={item.type === "Service"}
                                                                            className="rounded-lg h-[40px]"
                                                                        />
                                                                    </div>
                                                                </td>
                                                                    <td className="px-4 py-4 text-gray-900 font-medium whitespace-nowrap">
                                                                        {item.tax_percent}%
                                                                    </td>
                                                                    <td className="px-4 py-4">
                                                                        <div className="flex flex-col gap-1">
                                                                            <input
                                                                                type="number"
                                                                                value={item.quantity}
                                                                                onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value))}
                                                                                className={`w-20 px-3 py-2 bg-gray-50 border-0 rounded-full text-center font-medium focus:ring-0 ${(item.type === "Product" || item.type === "Customized Product") && item.quantity > ((item.type === "Customized Product" ? customizedProductsList : productsList).find(i => i.id == item.item_id)?.current_quantity || 0) ? "border-red-500 text-red-600 animate-pulse bg-red-50" : ""}`}
                                                                            />
                                                                            {(item.type === "Product" || item.type === "Customized Product") && item.item_id && (
                                                                                <p className={`text-[9px] font-bold ${item.quantity > ((item.type === "Customized Product" ? customizedProductsList : productsList).find(i => i.id == item.item_id)?.current_quantity || 0) ? "text-red-500" : "text-gray-400"}`}>
                                                                                    Stock: {(item.type === "Customized Product" ? customizedProductsList : productsList).find(i => i.id == item.item_id)?.current_quantity || 0}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-4 text-gray-900 font-medium whitespace-nowrap">
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-gray-400">₹</span>
                                                                            <input
                                                                                type="number"
                                                                                value={item.rate}
                                                                                onChange={(e) => handleItemChange(idx, "rate", parseFloat(e.target.value))}
                                                                                className="w-24 px-3 py-2 bg-transparent border-0 font-bold focus:ring-0"
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-4 text-right font-medium text-gray-900 whitespace-nowrap">
                                                                        ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </td>
                                                                    <td className="px-4 py-4 text-center">
                                                                        <button
                                                                            onClick={() => handleRemoveItem(idx)}
                                                                            className="text-red-400 hover:text-red-600 transition-colors"
                                                                        >
                                                                            <FiTrash2 size={18} />
                                                                        </button>
                                                                    </td>
                                                                </tr>

                                                            {/* Expanded Panel for specialized items */}
                                                            {(item.source_type === "time" || item.source_type === "mileage" || item.source_type === "estimation" || item.source_type === "service") && (
                                                                <tr className="bg-gray-50/30">
                                                                    <td colSpan="7" className={(item.source_type === "mileage" || item.source_type === "time") ? "px-8 py-6" : "px-10 py-3"}>
                                                                        <div className="space-y-6">
                                                                            {item.source_type === "time" && (
                                                                                <div className="bg-white p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0,0.02)] transition-all">
                                                                                    <div className="flex justify-between items-center mb-6">
                                                                                        <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-wider">DURATION & TIME <span className="text-red-500">*</span></h3>
                                                                                        <div className="flex items-center gap-3">
                                                                                            <span className="text-[12px] font-bold text-gray-500">Use Start/End Time</span>
                                                                                            <button
                                                                                                type="button"
                                                                                                className={`w-10 h-[22px] rounded-full transition-colors relative flex items-center ${item.metadata?.use_start_end ? 'bg-[#FFCA00]' : 'bg-gray-200'}`}
                                                                                                onClick={() => handleMetadataChange(idx, "use_start_end", !item.metadata?.use_start_end)}
                                                                                            >
                                                                                                <span className={`absolute bg-white rounded-full w-[16px] h-[16px] transition-transform ${item.metadata?.use_start_end ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="border border-gray-100 bg-white rounded-xl p-6 mb-8 shadow-[0_2px_8px_rgba(0,0,0,0,0.02)]">
                                                                                        {!item.metadata?.use_start_end ? (
                                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                                                <div>
                                                                                                    <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Hours</label>
                                                                                                    <input
                                                                                                        type="number"
                                                                                                        value={item.metadata?.hours || ""}
                                                                                                        onChange={(e) => handleMetadataChange(idx, "hours", e.target.value)}
                                                                                                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] h-[44px] focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                                                                                                        placeholder="0"
                                                                                                    />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Minutes</label>
                                                                                                    <input
                                                                                                        type="number"
                                                                                                        value={item.metadata?.minutes || ""}
                                                                                                        onChange={(e) => handleMetadataChange(idx, "minutes", e.target.value)}
                                                                                                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] h-[44px] focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                                                                                                        placeholder="0"
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:gap-8 gap-6">
                                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                                    <div>
                                                                                                        <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Start Date</label>
                                                                                                        <input
                                                                                                            type="date"
                                                                                                            value={item.metadata?.start_date || ""}
                                                                                                            onChange={(e) => handleMetadataChange(idx, "start_date", e.target.value)}
                                                                                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] h-[44px] focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Start Time</label>
                                                                                                        <input
                                                                                                            type="time"
                                                                                                            value={item.metadata?.start_time || ""}
                                                                                                            onChange={(e) => handleMetadataChange(idx, "start_time", e.target.value)}
                                                                                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] h-[44px] focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                                                                                                        />
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                                    <div>
                                                                                                        <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">End Date</label>
                                                                                                        <input
                                                                                                            type="date"
                                                                                                            value={item.metadata?.end_date || ""}
                                                                                                            onChange={(e) => handleMetadataChange(idx, "end_date", e.target.value)}
                                                                                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] h-[44px] focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">End Time</label>
                                                                                                        <input
                                                                                                            type="time"
                                                                                                            value={item.metadata?.end_time || ""}
                                                                                                            onChange={(e) => handleMetadataChange(idx, "end_time", e.target.value)}
                                                                                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] h-[44px] focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                                                                                                        />
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="pt-6 border-t border-gray-100">
                                                                                        <h3 className="text-[14px] font-bold text-gray-900 mb-6 uppercase tracking-[0.1em]">RATE</h3>
                                                                                        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                                                                                            <div className="w-full max-w-[280px]">
                                                                                                <label className="text-[12px] font-bold text-gray-900 mb-2 block">Rate per Hour</label>
                                                                                                <div className="relative">
                                                                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-[13px]">₹</span>
                                                                                                    <input
                                                                                                        type="number"
                                                                                                        value={item.rate || ""}
                                                                                                        onChange={(e) => handleItemChange(idx, "rate", parseFloat(e.target.value) || 0)}
                                                                                                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                                                                                                        placeholder="0.00"
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="self-center md:mb-1">
                                                                                                <div className="flex items-center gap-4">
                                                                                                    <span className="text-[14px] font-bold text-gray-900">Total (INR):</span>
                                                                                                    <span className="text-xl font-bold text-[#00A496] whitespace-nowrap">₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {item.source_type === "mileage" && (() => {
                                                                                const itemId = item.item_id;
                                                                                const mCoords = mileageCoordsMap[itemId] || { start: null, end: null };
                                                                                const mRoutes = mileageRoutesMap[itemId] || [];
                                                                                const mSelIdx = mileageSelectedRouteMap[itemId] ?? 0;
                                                                                const mCalc = mileageCalculatingMap[itemId] || false;
                                                                                const tripType = item.metadata?.trip_type || 'one_way';
                                                                                return (
                                                                                    <div className="space-y-6">
                                                                                        {/* Address Inputs */}
                                                                                        <div className="space-y-4">
                                                                                            <div>
                                                                                                <label className="text-[13px] font-bold text-gray-900 mb-2 block">Start Address</label>
                                                                                                <div className="relative group">
                                                                                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none group-focus-within:text-[#FFCA00] transition-colors">
                                                                                                        <FiMapPin size={16} />
                                                                                                    </div>
                                                                                                    <AsyncSelect
                                                                                                        cacheOptions
                                                                                                        loadOptions={loadMileageAddressOptions}
                                                                                                        defaultOptions
                                                                                                        isClearable
                                                                                                        value={item.metadata?.start_address ? { label: item.metadata.start_address, value: item.metadata.start_address } : null}
                                                                                                        inputValue={mileageInputMap[`${itemId}_start`] ?? ''}
                                                                                                        onInputChange={(val, { action }) => {
                                                                                                            if (action === 'input-change') setMileageInputMap(prev => ({ ...prev, [`${itemId}_start`]: val }));
                                                                                                        }}
                                                                                                        onMenuOpen={() => {
                                                                                                            const key = `${itemId}_start`;
                                                                                                            if (item.metadata?.start_address && !mileageInputMap[key]) {
                                                                                                                setMileageInputMap(prev => ({ ...prev, [key]: item.metadata.start_address }));
                                                                                                            }
                                                                                                        }}
                                                                                                        onChange={(option) => {
                                                                                                            handleMetadataChange(idx, 'start_address', option?.value || '');
                                                                                                            setMileageCoordsMap(prev => ({ ...prev, [itemId]: { ...prev[itemId], start: option ? { lat: option.lat, lon: option.lon } : null } }));
                                                                                                            setMileageInputMap(prev => ({ ...prev, [`${itemId}_start`]: '' }));
                                                                                                        }}
                                                                                                        placeholder="Search Start Address..."
                                                                                                        styles={{ ...mileageSelectStyles, control: (p, s) => ({ ...mileageSelectStyles.control(p, s), paddingLeft: '30px' }) }}
                                                                                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div>
                                                                                                <label className="text-[13px] font-bold text-gray-900 mb-2 block">End Address</label>
                                                                                                <div className="relative group">
                                                                                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none group-focus-within:text-[#FFCA00] transition-colors">
                                                                                                        <FiMapPin size={16} />
                                                                                                    </div>
                                                                                                    <AsyncSelect
                                                                                                        cacheOptions
                                                                                                        loadOptions={loadMileageAddressOptions}
                                                                                                        defaultOptions
                                                                                                        isClearable
                                                                                                        value={item.metadata?.end_address ? { label: item.metadata.end_address, value: item.metadata.end_address } : null}
                                                                                                        inputValue={mileageInputMap[`${itemId}_end`] ?? ''}
                                                                                                        onInputChange={(val, { action }) => {
                                                                                                            if (action === 'input-change') setMileageInputMap(prev => ({ ...prev, [`${itemId}_end`]: val }));
                                                                                                        }}
                                                                                                        onMenuOpen={() => {
                                                                                                            const key = `${itemId}_end`;
                                                                                                            if (item.metadata?.end_address && !mileageInputMap[key]) {
                                                                                                                setMileageInputMap(prev => ({ ...prev, [key]: item.metadata.end_address }));
                                                                                                            }
                                                                                                        }}
                                                                                                        onChange={(option) => {
                                                                                                            handleMetadataChange(idx, 'end_address', option?.value || '');
                                                                                                            setMileageCoordsMap(prev => ({ ...prev, [itemId]: { ...prev[itemId], end: option ? { lat: option.lat, lon: option.lon } : null } }));
                                                                                                            setMileageInputMap(prev => ({ ...prev, [`${itemId}_end`]: '' }));
                                                                                                        }}
                                                                                                        placeholder="Search End Address..."
                                                                                                        styles={{ ...mileageSelectStyles, control: (p, s) => ({ ...mileageSelectStyles.control(p, s), paddingLeft: '30px' }) }}
                                                                                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Trip Type + Distance */}
                                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                                            <div className="flex flex-col">
                                                                                                <label className="text-[13px] font-bold text-gray-900 mb-2 block">Trip Type</label>
                                                                                                <div className="flex bg-white rounded-xl p-1.5 border border-gray-200 h-[42px] items-center">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            if (tripType !== 'one_way') {
                                                                                                                setFormData(prev => {
                                                                                                                    const newItems = [...prev.items];
                                                                                                                    const newMeta = { ...newItems[idx].metadata, trip_type: 'one_way' };
                                                                                                                    if (newMeta.distance_km) {
                                                                                                                        const d = parseFloat(newMeta.distance_km) / 2;
                                                                                                                        newMeta.distance_km = String(d);
                                                                                                                        newItems[idx].quantity = d;
                                                                                                                        newItems[idx].amount = d * (parseFloat(newItems[idx].rate) || 0);
                                                                                                                    }
                                                                                                                    newItems[idx] = { ...newItems[idx], metadata: newMeta };
                                                                                                                    return { ...prev, items: newItems };
                                                                                                                });
                                                                                                                if (mCoords.start && mCoords.end) fetchMileageRoutes(itemId, mCoords.start, mCoords.end, 'one_way');
                                                                                                            }
                                                                                                        }}
                                                                                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[12px] font-bold rounded-lg transition-all ${tripType === 'one_way' ? 'bg-[#FFCA00] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                                                                    >
                                                                                                        <FiArrowRight size={13} /> One-way
                                                                                                    </button>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            if (tripType !== 'round_trip') {
                                                                                                                setFormData(prev => {
                                                                                                                    const newItems = [...prev.items];
                                                                                                                    const newMeta = { ...newItems[idx].metadata, trip_type: 'round_trip' };
                                                                                                                    if (newMeta.distance_km) {
                                                                                                                        const d = parseFloat(newMeta.distance_km) * 2;
                                                                                                                        newMeta.distance_km = String(d);
                                                                                                                        newItems[idx].quantity = d;
                                                                                                                        newItems[idx].amount = d * (parseFloat(newItems[idx].rate) || 0);
                                                                                                                    }
                                                                                                                    newItems[idx] = { ...newItems[idx], metadata: newMeta };
                                                                                                                    return { ...prev, items: newItems };
                                                                                                                });
                                                                                                                if (mCoords.start && mCoords.end) fetchMileageRoutes(itemId, mCoords.start, mCoords.end, 'round_trip');
                                                                                                            }
                                                                                                        }}
                                                                                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[12px] font-bold rounded-lg transition-all ${tripType === 'round_trip' ? 'bg-[#FFCA00] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                                                                    >
                                                                                                        <FiRefreshCw size={13} /> Round-trip
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div>
                                                                                                <label className="text-[13px] font-bold text-gray-900 mb-2 block">Distance (km)</label>
                                                                                                <input
                                                                                                    type="number"
                                                                                                    value={item.metadata?.distance_km || ''}
                                                                                                    onChange={(e) => handleMetadataChange(idx, 'distance_km', e.target.value)}
                                                                                                    className="w-full px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#FFCA00]/20 focus:border-[#FFCA00] transition-all"
                                                                                                    placeholder="0.00"
                                                                                                />
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Map + Routes */}
                                                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                                                                                            {/* Map */}
                                                                                            <div className="bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-sm h-[260px]">
                                                                                                <div className="relative flex-1 bg-[#F8FAFF] flex items-center justify-center overflow-hidden">
                                                                                                    <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#4F46E5 1px, transparent 1px)', backgroundSize: '18px 18px' }}></div>
                                                                                                    {item.metadata?.distance_km && (
                                                                                                        <div className="absolute top-3 left-3 bg-white px-3 py-1.5 rounded-xl shadow-lg border border-gray-100 flex items-center gap-2 z-20 border-l-4 border-l-[#279C6F]">
                                                                                                            <FiNavigation className="text-[#279C6F] -rotate-45" size={13} />
                                                                                                            <span className="text-[13px] font-extrabold text-gray-900">{parseFloat(item.metadata.distance_km).toFixed(1)} km</span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                    {item.metadata?.start_address && item.metadata?.end_address ? (
                                                                                                        <MileageRouteMap
                                                                                                            start={mCoords.start}
                                                                                                            end={mCoords.end}
                                                                                                            routeGeometry={mRoutes[mSelIdx]?.geometry}
                                                                                                        />
                                                                                                    ) : (
                                                                                                        <div className="flex flex-col items-center gap-3 text-gray-300">
                                                                                                            <FiMapPin size={36} className="opacity-20" />
                                                                                                            <span className="text-[10px] font-bold uppercase tracking-widest">Route Preview</span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Suggested Routes */}
                                                                                            <div className="bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-sm h-[260px]">
                                                                                                <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                                                                                                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                                                                        <FiNavigation className="text-[#FFCA00]" size={13} /> Suggested Paths
                                                                                                    </h4>
                                                                                                    {mRoutes.length > 0 && (
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => fetchMileageRoutes(itemId, mCoords.start, mCoords.end, tripType)}
                                                                                                            className="text-[10px] font-bold text-[#FFCA00] flex items-center gap-1"
                                                                                                        >
                                                                                                            <FiRefreshCw size={11} /> Refresh
                                                                                                        </button>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                                                                                    {mCalc ? (
                                                                                                        <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                                                                                            <FiLoader className="animate-spin mb-2" size={22} />
                                                                                                            <span className="text-[10px] font-bold uppercase tracking-widest">Searching...</span>
                                                                                                        </div>
                                                                                                    ) : mRoutes.length > 0 ? (
                                                                                                        mRoutes.map((r, rIdx) => (
                                                                                                            <button
                                                                                                                key={rIdx}
                                                                                                                type="button"
                                                                                                                onClick={() => {
                                                                                                                    setMileageSelectedRouteMap(prev => ({ ...prev, [itemId]: rIdx }));
                                                                                                                    handleMetadataChange(idx, 'distance_km', r.distance.toFixed(2));
                                                                                                                }}
                                                                                                                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${mSelIdx === rIdx ? 'border-[#FFCA00] bg-yellow-400/5 shadow-sm' : 'border-gray-50 hover:border-gray-100 bg-white'}`}
                                                                                                            >
                                                                                                                <div className="flex justify-between items-center">
                                                                                                                    <div>
                                                                                                                        <p className="text-[12px] font-medium text-gray-900">{r.name}</p>
                                                                                                                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{Math.round(r.duration)} mins</p>
                                                                                                                    </div>
                                                                                                                    <p className={`text-[14px] font-extrabold ${mSelIdx === rIdx ? 'text-teal-600' : 'text-gray-900'}`}>{r.distance.toFixed(1)} km</p>
                                                                                                                </div>
                                                                                                            </button>
                                                                                                        ))
                                                                                                    ) : (
                                                                                                        <div className="flex flex-col items-center justify-center h-full text-center opacity-30 px-6">
                                                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select journey details to see routes</p>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Rate & Pricing */}
                                                                                        <div className="pt-6 border-t border-gray-100">
                                                                                            <h4 className="text-[14px] font-bold text-gray-900 mb-4">Rate & Pricing</h4>
                                                                                            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                                                                                                <div className="w-full max-w-[280px]">
                                                                                                    <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Rate per KM</label>
                                                                                                    <div className="relative">
                                                                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-medium text-[13px]">₹</span>
                                                                                                        <input
                                                                                                            type="number"
                                                                                                            value={item.rate || ''}
                                                                                                            onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                                                                                                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-[#FFCA00]"
                                                                                                            placeholder="0.00"
                                                                                                        />
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="self-center shrink-0">
                                                                                                    <div className="flex items-center gap-4">
                                                                                                        <span className="text-[14px] font-bold text-gray-900">Total (INR):</span>
                                                                                                        <span className="text-xl font-bold text-teal-600 whitespace-nowrap">₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })()}

                                                                            {item.source_type === "estimation" && (
                                                                                <div className="space-y-6">
                                                                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0,0.06)] transition-all relative">
                                                                                        <div className="flex items-center justify-between mb-6">
                                                                                            <div className="flex items-center gap-2 text-gray-900">
                                                                                                {(() => {
                                                                                                    const catVal = item.metadata?.line_category || item.metadata?.category || item.metadata?.type || item.type || "Estimation";
                                                                                                    const DisplayIcon = itemCategoryIcons[catVal.charAt(0).toUpperCase() + catVal.slice(1).toLowerCase()] || FiBox;
                                                                                                    return <DisplayIcon size={16} className="text-gray-400" />;
                                                                                                })()}
                                                                                                <span className="text-[14px] font-bold tracking-tight">{(() => {
                                                                                                    const catVal = item.metadata?.line_category || item.metadata?.category || item.metadata?.type || item.type || "Estimation";
                                                                                                    return catVal.charAt(0).toUpperCase() + catVal.slice(1).toLowerCase();
                                                                                                })()}</span>
                                                                                            </div>
                                                                                            <button onClick={() => handleRemoveItem(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                                                                <FiTrash2 size={16} />
                                                                                            </button>
                                                                                        </div>

                                                                                        <div className="overflow-x-auto pb-4">
                                                                                            <div className="flex items-start gap-8 min-w-[1050px] md:min-w-full">
                                                                                                <div className="flex-1">
                                                                                                {(() => {
                                                                                                    const category = (item.metadata?.line_category || item.metadata?.category || item.metadata?.type || item.type || "Estimation").toLowerCase();
                                                                                                    const commonInputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 font-medium placeholder:text-gray-300 transition-all shadow-none h-[40px]";
                                                                                                    const commonLabelClass = "text-[11px] font-bold text-gray-600 mb-1.5 block tracking-tight";

                                                                                                    if (category === "manpower") {
                                                                                                        return (
                                                                                                            <div className="grid grid-cols-10 gap-4 min-w-[900px] md:min-w-full">
                                                                                                                <div className="col-span-3">
                                                                                                                    <label className={commonLabelClass}>Source</label>
                                                                                                                    <CustomSelect
                                                                                                                        value={item.metadata?.source || "internal"}
                                                                                                                        onChange={(val) => handleMetadataChange(idx, "source", val)}
                                                                                                                        options={[
                                                                                                                            { value: "internal", label: "Internal" },
                                                                                                                            { value: "external", label: "External" },
                                                                                                                        ]}
                                                                                                                        placeholder="Select Source"
                                                                                                                        className="rounded-lg h-[40px] shadow-none"
                                                                                                                    />
                                                                                                                </div>
                                                                                                                <div className="col-span-3">
                                                                                                                    <label className={commonLabelClass}>Role</label>
                                                                                                                    <input type="text" placeholder="e.g. Engineer" value={item.metadata?.role ?? ""} onChange={(e) => handleMetadataChange(idx, "role", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                                <div className="col-span-2">
                                                                                                                    <label className={commonLabelClass}>Hours</label>
                                                                                                                    <input type="text" placeholder="0" value={item.metadata?.hours ?? ""} onChange={(e) => handleMetadataChange(idx, "hours", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                                <div className="col-span-2">
                                                                                                                    <label className={commonLabelClass}>Rate</label>
                                                                                                                    <input type="text" placeholder="0.00" value={item.rate ?? ""} onChange={(e) => handleItemChange(idx, "rate", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    } else if (category === "materials") {
                                                                                                        return (
                                                                                                            <div className="grid grid-cols-12 gap-4 min-w-[900px] md:min-w-full">
                                                                                                                <div className="col-span-3">
                                                                                                                    <label className={commonLabelClass}>Type</label>
                                                                                                                    <CustomSelect
                                                                                                                        value={item.metadata?.type || item.metadata?.materialType || "product"}
                                                                                                                        onChange={(val) => handleMetadataChange(idx, "type", val)}
                                                                                                                        options={[
                                                                                                                            { value: "product", label: "Product" },
                                                                                                                            { value: "customized product", label: "Customized Product" },
                                                                                                                        ]}
                                                                                                                        placeholder="Select Type"
                                                                                                                        className="rounded-lg h-[40px] shadow-none"
                                                                                                                    />
                                                                                                                </div>
                                                                                                                <div className="col-span-3">
                                                                                                                    <label className={commonLabelClass}>Item Name</label>
                                                                                                                    {item.metadata?.type === "product" || item.metadata?.type === "customized product" ? (
                                                                                                                        <CustomSelect
                                                                                                                            value={item.item_id || ""}
                                                                                                                            onChange={(val) => handleEstimationItemSelect(idx, val)}
                                                                                                                            options={(item.metadata?.type === "customized product" ? customizedProductsList : productsList)
                                                                                                                                .filter(p => !formData.items.some((it, fIdx) => fIdx !== idx && it.item_id == p.id))
                                                                                                                                .map(p => ({
                                                                                                                                    value: p.id,
                                                                                                                                    label: p.name
                                                                                                                                }))}
                                                                                                                            placeholder="Select Item"
                                                                                                                            className="rounded-lg h-[40px] shadow-none"
                                                                                                                        />
                                                                                                                    ) : (
                                                                                                                        <input type="text" placeholder="Item name" value={item.metadata?.name ?? ""} onChange={(e) => handleMetadataChange(idx, "name", e.target.value)} className={commonInputClass} />
                                                                                                                    )}
                                                                                                                </div>
                                                                                                                <div className="col-span-2">
                                                                                                                    <label className={commonLabelClass}>Qty</label>
                                                                                                                    <input
                                                                                                                        type="text"
                                                                                                                        placeholder="0"
                                                                                                                        value={item.metadata?.qty ?? ""}
                                                                                                                        onChange={(e) => handleMetadataChange(idx, "qty", e.target.value)}
                                                                                                                        className={`${commonInputClass} ${item.item_id && (item.metadata?.type === "product" || item.metadata?.type === "customized product") && (parseFloat(item.metadata?.qty) || 0) >= ((item.metadata?.type === "customized product" ? customizedProductsList : productsList).find(p => p.id == item.item_id)?.current_quantity || 0) ? "border-red-500 text-red-600 animate-pulse bg-red-50" : ""}`}
                                                                                                                    />
                                                                                                                    {item.item_id && (item.metadata?.type === "product" || item.metadata?.type === "customized product") && (
                                                                                                                        <p className={`text-[9px] font-bold mt-1 ${(parseFloat(item.metadata?.qty) || 0) >= ((item.metadata?.type === "customized product" ? customizedProductsList : productsList).find(p => p.id == item.item_id)?.current_quantity || 0) ? "text-red-500 font-extrabold" : "text-gray-400"}`}>
                                                                                                                            Stock: {(item.metadata?.type === "customized product" ? customizedProductsList : productsList).find(p => p.id == item.item_id)?.current_quantity || 0}
                                                                                                                        </p>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                                <div className="col-span-2">
                                                                                                                    <label className={commonLabelClass}>Rate</label>
                                                                                                                    <input type="text" placeholder="0.00" value={item.rate ?? ""} onChange={(e) => handleItemChange(idx, "rate", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                                <div className="col-span-2">
                                                                                                                    <label className={commonLabelClass}>Tax (%)</label>
                                                                                                                    <input type="number" readOnly placeholder="0" value={item.tax_percent ?? ""} className={`${commonInputClass} bg-gray-50/50 cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none`} />
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    } else if (category === "machinery") {
                                                                                                        return (
                                                                                                            <div className="grid grid-cols-10 gap-4 min-w-[900px] md:min-w-full">
                                                                                                                <div className="col-span-6">
                                                                                                                    <label className={commonLabelClass}>Description</label>
                                                                                                                    <input type="text" placeholder="Details" value={item.metadata?.description ?? ""} onChange={(e) => handleMetadataChange(idx, "description", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                                <div className="col-span-2">
                                                                                                                    <label className={commonLabelClass}>Qty</label>
                                                                                                                    <input type="text" placeholder="0" value={item.metadata?.qty ?? ""} onChange={(e) => handleMetadataChange(idx, "qty", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                                <div className="col-span-2">
                                                                                                                    <label className={commonLabelClass}>Rate</label>
                                                                                                                    <input type="text" placeholder="0.00" value={item.rate ?? ""} onChange={(e) => handleItemChange(idx, "rate", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    } else if (category === "minutes") {
                                                                                                        return (
                                                                                                            <div className="grid grid-cols-10 gap-4 min-w-[900px] md:min-w-full">
                                                                                                                <div className="col-span-6">
                                                                                                                    <label className={commonLabelClass}>Description</label>
                                                                                                                    <input type="text" placeholder="Details" value={item.metadata?.description ?? ""} onChange={(e) => handleMetadataChange(idx, "description", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                                <div className="col-span-2">
                                                                                                                    <label className={commonLabelClass}>Minutes</label>
                                                                                                                    <input type="text" placeholder="0" value={item.metadata?.minutes ?? ""} onChange={(e) => handleMetadataChange(idx, "minutes", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                                <div className="col-span-2">
                                                                                                                    <label className={commonLabelClass}>Rate</label>
                                                                                                                    <input type="text" placeholder="0.00" value={item.rate ?? ""} onChange={(e) => handleItemChange(idx, "rate", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    } else if (category === "mileage") {
                                                                                                        return (
                                                                                                            <div className="grid grid-cols-10 gap-4 min-w-[900px] md:min-w-full">
                                                                                                                <div className="col-span-6">
                                                                                                                    <label className={commonLabelClass}>Description</label>
                                                                                                                    <input type="text" placeholder="Details" value={item.metadata?.description ?? ""} onChange={(e) => handleMetadataChange(idx, "description", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                                <div className="col-span-2">
                                                                                                                    <label className={commonLabelClass}>Distance</label>
                                                                                                                    <input type="text" placeholder="0" value={item.metadata?.distance ?? ""} onChange={(e) => handleMetadataChange(idx, "distance", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                                <div className="col-span-2">
                                                                                                                    <label className={commonLabelClass}>Rate</label>
                                                                                                                    <input type="text" placeholder="0.00" value={item.rate ?? ""} onChange={(e) => handleItemChange(idx, "rate", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    } else if (category === "measurement") {
                                                                                                        return (
                                                                                                            <div className="grid grid-cols-10 gap-4 min-w-[900px] md:min-w-full">
                                                                                                                <div className="col-span-3">
                                                                                                                    <label className={commonLabelClass}>Type</label>
                                                                                                                    <CustomSelect
                                                                                                                        value={item.metadata?.materialType || item.metadata?.type || "energy"}
                                                                                                                        onChange={(val) => handleMetadataChange(idx, "type", val)}
                                                                                                                        options={[
                                                                                                                            { value: "energy", label: "Energy" },
                                                                                                                            { value: "fuel", label: "Fuel" },
                                                                                                                            { value: "consumables", label: "Consumables" },
                                                                                                                        ]}
                                                                                                                        placeholder="Select Type"
                                                                                                                        className="rounded-lg h-[40px] shadow-none"
                                                                                                                    />
                                                                                                                </div>
                                                                                                                <div className="col-span-3">
                                                                                                                    <label className={commonLabelClass}>Unit</label>
                                                                                                                    <input type="text" placeholder="e.g. kWh/Liters" value={item.metadata?.unit ?? ""} onChange={(e) => handleMetadataChange(idx, "unit", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                                <div className="col-span-2">
                                                                                                                    <label className={commonLabelClass}>Qty</label>
                                                                                                                    <input type="text" placeholder="0" value={item.metadata?.qty ?? ""} onChange={(e) => handleMetadataChange(idx, "qty", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                                <div className="col-span-2">
                                                                                                                    <label className={commonLabelClass}>Rate</label>
                                                                                                                    <input type="text" placeholder="0.00" value={item.rate ?? ""} onChange={(e) => handleItemChange(idx, "rate", e.target.value)} className={commonInputClass} />
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    }
                                                                                                    return (
                                                                                                        <div className="grid grid-cols-12 gap-4 min-w-[900px] md:min-w-full">
                                                                                                            <div className="col-span-6">
                                                                                                                <label className={commonLabelClass}>Description</label>
                                                                                                                <input type="text" placeholder="Details" value={item.metadata?.description || item.metadata?.line_description || ""} onChange={(e) => handleMetadataChange(idx, "description", e.target.value)} className={commonInputClass} />
                                                                                                            </div>
                                                                                                            <div className="col-span-2">
                                                                                                                <label className={commonLabelClass}>Qty</label>
                                                                                                                <input type="text" placeholder="0" value={item.metadata?.qty ?? ""} onChange={(e) => handleMetadataChange(idx, "qty", e.target.value)} className={commonInputClass} />
                                                                                                            </div>
                                                                                                            <div className="col-span-2">
                                                                                                                <label className={commonLabelClass}>Rate</label>
                                                                                                                <input type="text" placeholder="0.00" value={item.rate ?? ""} onChange={(e) => handleItemChange(idx, "rate", e.target.value)} className={commonInputClass} />
                                                                                                            </div>
                                                                                                            <div className="col-span-2">
                                                                                                                <label className={commonLabelClass}>Amount</label>
                                                                                                                <input type="text" readOnly placeholder="0.00" value={item.amount ?? ""} className={`${commonInputClass} bg-gray-50/50 cursor-not-allowed`} />
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    );
                                                                                                })()}
                                                                                                </div>
                                                                                                <div className="min-w-[120px] text-right pt-6 shrink-0">
                                                                                                    <span className="text-[16px] font-bold text-gray-900">₹ {(parseFloat(item.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {item.source_type === "service" && (
                                                                                <div className="space-y-6">
                                                                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                                                                        <h3 className="text-[14px] font-bold text-gray-900 mb-6 uppercase tracking-wider">Service Details</h3>
                                                                                        <div className="grid grid-cols-1 gap-6">
                                                                                            <div>
                                                                                                <label className="text-[12px] font-bold text-gray-900 mb-2 block">Service Description</label>
                                                                                                <textarea
                                                                                                    value={item.metadata?.description || item.description || ""}
                                                                                                    onChange={(e) => handleMetadataChange(idx, "description", e.target.value)}
                                                                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-1 focus:ring-[#FFCA00] h-[80px]"
                                                                                                    placeholder="Describe the service provided..."
                                                                                                ></textarea>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="px-4 py-3 bg-white">
                                            {!viewOnly && (
                                                <button
                                                    onClick={() => handleAddNewItemOfType("Product")}
                                                    className="text-sm text-gray-600 hover:text-yellow-600 font-medium"
                                                >
                                                    + Add New Item
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-col items-end gap-2 text-sm">
                                        <div className="flex justify-between w-full md:w-80">
                                            <span className="text-gray-600">Subtotal:</span>
                                            <span className="font-semibold text-gray-900 whitespace-nowrap">₹ {totals.subtotal.toLocaleString()}.00</span>
                                        </div>
                                        <div className="flex justify-between w-full md:w-80">
                                            <span className="text-gray-600">Tax:</span>
                                            <span className="font-semibold text-gray-900 whitespace-nowrap">₹ {totals.totalTax.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between w-full md:w-80 pt-2 border-t-2 border-gray-200 text-base">
                                            <span className="font-semibold text-gray-900">Total (INR):</span>
                                            <span className="font-bold text-teal-600 whitespace-nowrap">₹ {totals.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* References Section */}
                                <div className="mt-12 md:mt-0">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4">References</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Notes</label>
                                            <textarea
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm h-24"
                                                placeholder="Add invoice terms or notes"
                                            ></textarea>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Attachment</label>
                                            <AttachmentUploader
                                                context="sales-quote"
                                                existingUrl={formData.attachment}
                                                onUploaded={(url) => setFormData(prev => ({ ...prev, attachment: url }))}
                                                disabled={viewOnly}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-row flex-wrap items-center justify-end gap-2.5 sm:gap-4 mt-8 pt-6 border-t font-poppins">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-4 sm:px-6 py-2 sm:py-2.5 text-[14px] font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSave()}
                                    disabled={isSaving || !hasChanges}
                                    className="px-4 sm:px-6 py-2 sm:py-2.5 border border-[#FFCA00] text-[#FFCA00] hover:bg-[#FFCA00] hover:text-white text-[14px] font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                                >
                                    {isSaving && saveType === "save" ? (
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
                                        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[#FFCA00] text-white text-[14px] font-bold rounded-lg hover:bg-[#d9ac00] disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                        {isSaving && saveType === "send" ? (
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
                                        onClick={() => setStep(2)}
                                        disabled={isSaving}
                                        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[#FFCA00] text-white text-[14px] font-bold rounded-lg hover:bg-[#d9ac00] disabled:opacity-50 transition-all cursor-pointer"
                                    >
                                        Submit
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4 no-print">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                                        {viewOnly ? "View Sales Quote" : "Preview & Send"}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">{isExporting ? "Generating PDF..." : viewOnly ? "View details of your quote" : "Review and send your quote"}</p>
                                </div>
                                <div className="flex gap-3 text-gray-600 self-end sm:self-auto">
                                    <button
                                        disabled={isExporting}
                                        onClick={handlePrint}
                                        className="p-2 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                                        title="Print Quote"
                                    >
                                        <FiPrinter size={18} />
                                    </button>
                                    <button
                                        disabled={isExporting}
                                        onClick={handleDownloadPDF}
                                        className="p-2 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                                        title="Download PDF"
                                    >
                                        <FiDownload size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* ── Document Preview ─────────────────────────────────────── */}
                            <div className="bg-gray-50 -mx-8 px-4 md:px-8 py-8 mb-6 overflow-y-auto md:overflow-y-visible overflow-x-hidden max-h-[80vh] md:max-h-none">
                                <div className="bg-white rounded-lg shadow-sm overflow-x-auto md:overflow-x-visible max-w-full md:max-w-4xl mx-auto">
                                    <div className="min-w-[800px] md:min-w-full">
                                        <DocumentPreview
                                            ref={docPreviewRef}
                                            type="QUOTE"
                                            filename={`Quote-${formData.quoteNumber}`}
                                            payload={{
                                                company: {
                                                    name: "BrandMagics Software Labs",
                                                    address: "193, Software Park Road",
                                                    city: "Kochi, Kerala, IN 682001",
                                                },
                                                party: (() => {
                                                    const c = customers.find(c => c.id == formData.customer);
                                                    return { name: c?.name, address: c?.address, email: c?.email, phone: c?.phone };
                                                })(),
                                                document: {
                                                    number: formData.quoteNumber,
                                                    date: formData.quoteDate,
                                                    expiry_date: formData.expiryDate,
                                                    status: formData.status,
                                                    reference: formData.quoteName,
                                                },
                                                items: formData.items.map(item => {
                                                    let name = "-";
                                                    if (item.source_type === "time") name = item.metadata?.entry_name || item.description || "Time Entry";
                                                    else if (item.source_type === "mileage") name = item.metadata?.line_name || item.description || "Mileage";
                                                    else if (item.source_type === "estimation") name = item.metadata?.line_name || item.description || "Estimation";
                                                    else if (item.source_type === "service" || item.type === "Service") name = item.description || item.metadata?.service_name || "Service";
                                                    else name = (item.type === "Product" ? productsList : customizedProductsList).find(i => i.id == item.item_id)?.name || item.description || "-";

                                                    return {
                                                        source_type: item.source_type || "item",
                                                        name: name,
                                                        item_type: item.type,
                                                        quantity: item.quantity,
                                                        rate: item.rate,
                                                        tax_percent: item.tax_percent,
                                                        amount: item.amount,
                                                        duration_minutes: item.metadata?.duration_minutes,
                                                        distance_km: item.metadata?.distance_km,
                                                        metadata: item.metadata,
                                                    };
                                                }),
                                                totals: [
                                                    { label: "Subtotal", value: totals.subtotal },
                                                    { label: "Tax", value: totals.totalTax },
                                                    { label: "Total (INR)", value: totals.total, isGrand: true },
                                                ],
                                            }}
                                        />
                                    </div></div>
                            </div>

                            {/* Configuration Section  */}
                            {!viewOnly && (
                                <div className="mt-10 w-full max-w-6xl mx-auto no-print px-4 md:px-0">
                                    <div className="flex flex-col lg:flex-row gap-0 bg-[#F9FAFB] border border-gray-200 rounded-xl overflow-hidden shadow-sm min-h-[400px]">
                                        {/* Tabs Sidebar */}
                                        <div className="w-full lg:w-64 bg-white border-r border-gray-200 p-6 space-y-4">
                                            <button
                                                onClick={() => setActiveEmailTab('Email')}
                                                className={`w-full px-5 py-3 rounded-lg text-sm font-bold text-left flex items-center gap-3 transition-all ${activeEmailTab === 'Email' ? 'bg-white border-2 border-[#FFCA00] text-[#FFCA00]' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <FiMail size={18} /> Email
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setActiveEmailTab('Attachments');
                                                    setIsAttachmentLoading(true);
                                                    setTimeout(() => setIsAttachmentLoading(false), 800);
                                                }}
                                                className={`w-full px-5 py-3 rounded-lg text-sm font-bold text-left flex items-center gap-3 transition-all ${activeEmailTab === 'Attachments' ? 'bg-white border-2 border-[#FFCA00] text-[#FFCA00]' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <FiPaperclip size={18} /> Attachments
                                            </button>
                                            <button
                                                onClick={() => setActiveEmailTab('Payment')}
                                                className={`w-full px-5 py-3 rounded-lg text-sm font-bold text-left flex items-center gap-3 transition-all ${activeEmailTab === 'Payment' ? 'bg-white border-2 border-[#FFCA00] text-[#FFCA00]' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <FiCreditCard size={18} /> Payment Methods
                                            </button>
                                        </div>

                                        {/* Tab Content */}
                                        <div className="flex-1 p-8 md:p-10">
                                            {activeEmailTab === 'Email' ? (
                                                <div className="space-y-6">
                                                    <h4 className="text-[20px] font-bold text-gray-900 mb-8 tracking-tight">Email Configuration</h4>

                                                    <div>
                                                        <label className="text-[14px] font-bold text-gray-900 mb-3 block">To</label>
                                                        <input
                                                            type="email"
                                                            value={formData.emailConfig.to}
                                                            readOnly
                                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-500 focus:outline-none cursor-not-allowed"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div>
                                                            <label className="text-[14px] font-bold text-gray-900 mb-3 block">CC</label>
                                                            <input
                                                                type="text"
                                                                value={formData.emailConfig.cc}
                                                                onChange={e => setFormData({ ...formData, emailConfig: { ...formData.emailConfig, cc: e.target.value } })}
                                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
                                                                placeholder="Add CC Recipients"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[14px] font-bold text-gray-900 mb-3 block">BCC</label>
                                                            <input
                                                                type="text"
                                                                value={formData.emailConfig.bcc}
                                                                onChange={e => setFormData({ ...formData, emailConfig: { ...formData.emailConfig, bcc: e.target.value } })}
                                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
                                                                placeholder="Add BCC Recipients"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[14px] font-bold text-gray-900 mb-3 block">Message</label>
                                                        <textarea
                                                            value={formData.emailConfig.message}
                                                            onChange={e => setFormData({ ...formData, emailConfig: { ...formData.emailConfig, message: e.target.value } })}
                                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm h-40 resize-none focus:outline-none focus:ring-1 focus:ring-yellow-400 text-gray-900 mt-1 placeholder-gray-400"
                                                            placeholder="Compose your message here..."
                                                        ></textarea>
                                                    </div>
                                                </div>
                                            ) : activeEmailTab === 'Attachments' ? (
                                                <div className="space-y-6">
                                                    <h4 className="text-[20px] font-bold text-gray-900 mb-8 tracking-tight">Attachments</h4>
                                                    <div className="min-h-[100px]">
                                                        <AttachmentUploader
                                                            context="sales-quote"
                                                            existingUrl={formData.attachment}
                                                            onUploaded={(url) => setFormData(prev => ({ ...prev, attachment: url }))}
                                                            disabled={viewOnly}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    <h4 className="text-[20px] font-bold text-gray-900 mb-8 tracking-tight">Payment Methods</h4>
                                                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border-2 border-dashed border-gray-100">
                                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                            <FiCreditCard className="text-gray-200" size={32} />
                                                        </div>
                                                        <p className="text-[13px] font-bold text-gray-400">Payment details will be shared in the email message</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preview Actions */}
                            <div className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row justify-end items-center gap-4 mt-12 pt-8 border-t border-gray-300 no-print">
                                {viewOnly ? (
                                    <button
                                        onClick={handleClose}
                                        className="px-6 py-2.5 bg-[#FFCA00] text-white text-[14px] font-bold rounded-lg hover:bg-[#d9ac00]"
                                    >
                                        Close
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setStep(1)}
                                            className="w-full sm:w-auto px-6 py-2.5 text-gray-500 hover:bg-gray-100 rounded-lg text-[14px] font-semibold transition-all flex items-center justify-center gap-2 order-2 sm:order-1"
                                        >
                                            <FiArrowLeft size={18} /> Back to Edit
                                        </button>
                                        <button
                                            onClick={handleSendEmail}
                                            disabled={isSaving}
                                            className="w-full sm:w-auto px-6 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-bold hover:bg-[#d9ac00] flex items-center justify-center gap-2 order-1 sm:order-2"
                                        >
                                            {isSaving && saveType === "send" ? <FiLoader size={18} className="animate-spin" /> : <FiSend size={18} />}
                                            {isSaving && saveType === "send" ? "Submitting..." : "Submit"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <CustomerFormModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSave={handleCustomerSave}
            />

            <SalesProductForm
                isOpen={isProductFormOpen}
                onClose={() => setIsProductFormOpen(false)}
                onSave={handleSavePopupProduct}
                isSaving={isSavingPopup}
                rawMaterials={[]} // we fetch raw materials internally inside the SalesProductForm on mount!
                taxes={taxes}
                forceRestock={true}
                onRestockRawMaterial={handleRestockRawMaterialFromProductForm}
                restockSuccessCount={restockSuccessCount}
            />

            <SalesSpecialItemForm
                isOpen={isSpecialItemFormOpen}
                onClose={() => setIsSpecialItemFormOpen(false)}
                onSave={handleSavePopupSpecialItem}
                isSaving={isSavingPopup}
                taxes={taxes}
                suppliers={suppliers}
                forceRestock={true}
            />

            <RestockModal
                isOpen={isRestockModalOpen}
                onClose={() => {
                    setIsRestockModalOpen(false);
                    setRestockItem(null);
                }}
                onConfirm={handleRestockConfirm}
                item={restockItem}
                isSaving={isSavingPopup}
                suppliers={suppliers}
                type="Raw Materials"
            />
        </div>
    );
};

export default SalesQuoteForm;