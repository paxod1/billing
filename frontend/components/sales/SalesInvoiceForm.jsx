"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import AsyncSelect from "react-select/async";
import dynamic from 'next/dynamic';

// Dynamically import map to avoid SSR issues
const MileageRouteMap = dynamic(() => import("./MileageRouteMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-[#F8FAFF] flex flex-col items-center justify-center gap-4 text-gray-300">
            <FiLoader className="animate-spin" size={28} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Map Loading...</span>
        </div>
    )
});
import {
    FiX, FiUser, FiPlus, FiTrash2, FiPrinter,
    FiDownload, FiMail, FiPaperclip, FiUpload,
    FiCreditCard, FiArrowLeft, FiSend, FiLoader, FiEye, FiExternalLink, FiEdit,
    FiMapPin, FiArrowRight, FiRefreshCw, FiChevronDown,
    FiUsers, FiBox, FiSettings, FiDollarSign, FiGitMerge, FiBriefcase,
    FiClock, FiActivity, FiSmile, FiVolume2, FiGlobe, FiTool,
    FiTarget, FiShield, FiFileText, FiNavigation
} from "react-icons/fi";
import { useRouter, useSearchParams } from "next/navigation";
import { partyService } from "@/services/partyService";
import { itemService } from "@/services/itemService";
import { inventoryService } from "@/services/inventoryService";
import { processRestock } from "@/utils/restockHelper";
import { taxService } from "@/services/taxService";
import { salesInvoiceService } from "@/services/salesInvoiceService";
import { salesTimeService } from "@/services/salesTimeService";
import { salesMileageService } from "@/services/salesMileageService";
import { estimationService } from "@/services/estimationService";
import { salesPaymentService } from "@/services/salesPaymentService";
import PaymentPromptModal from "@/components/common/PaymentPromptModal";

import CustomSelect from "@/components/common/CustomSelect";
import { showToast } from "@/lib/features/toast/toastSlice";
import { useDispatch } from "react-redux";
import { generateUniqueId } from "@/utils/idGenerator";
import AttachmentUploader from "@/components/common/AttachmentUploader";
import CustomerFormModal from "./CustomerFormModal";
import DocumentPreview from "@/components/common/DocumentPreview";
import SalesProductForm from "./SalesProductForm";
import SalesSpecialItemForm from "./SalesSpecialItemForm";
import RestockModal from "./RestockModal";

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
import { calculateTotals, parseItemsFromDb, mapItemsForSave } from "@/utils/salesItemUtils";

const initialFormData = {
    invoiceNumber: "",
    invoiceName: "",
    status: "DRAFT",
    customer: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    items: [],
    notes: "",
    attachment: null,
    is_auto_created: false,
    amountPaid: 0,
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

const SalesInvoiceForm = ({ isOpen, onClose, onSave, editData = null, mode = "edit" }) => {
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
    const [lockedCountry, setLockedCountry] = useState(null);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveType, setSaveType] = useState(null); // 'save' | 'send'
    const [isExporting, setIsExporting] = useState(false);
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
    const [isPaymentPromptOpen, setIsPaymentPromptOpen] = useState(false);
    const pendingPaymentDetails = useRef(null);
    const [activeEmailTab, setActiveEmailTab] = useState("Email");
    const [isAttachmentLoading, setIsAttachmentLoading] = useState(false);
    const [isEstimationMenuOpen, setIsEstimationMenuOpen] = useState(false);
    const [isBottomMenuOpen, setIsBottomMenuOpen] = useState(false);
    const [isAddItemMenuOpen, setIsAddItemMenuOpen] = useState(false);
    const addItemMenuRef = useRef(null);

    // Per-item mileage state: keyed by item_id
    const [mileageCoordsMap, setMileageCoordsMap] = useState({});
    const [mileageRoutesMap, setMileageRoutesMap] = useState({});
    const [mileageSelectedRouteMap, setMileageSelectedRouteMap] = useState({});
    const [mileageCalculatingMap, setMileageCalculatingMap] = useState({});

    // Cache for mileage routes to prevent redundant API calls
    const mileageRouteCache = useRef({});

    // Keep track of which items have already been auto-fetched during initial load
    // Controlled input values for mileage address fields: keyed by `${itemId}_start` / `${itemId}_end`
    const [mileageInputMap, setMileageInputMap] = useState({});
    const isHydratedRef = useRef(false);
    const estimationMenuRef = useRef(null);
    const bottomMenuRef = useRef(null);
    const docPreviewRef = useRef(null);

    const estimationItemTypes = [
        { id: "Manpower", icon: FiUsers, label: "Manpower" },
        { id: "Materials", icon: FiBox, label: "Materials" },
        { id: "Machinery", icon: FiSettings, label: "Machinery" },
        { id: "Money", icon: FiDollarSign, label: "Money" },
        { id: "Method", icon: FiGitMerge, label: "Method" },
        { id: "Management", icon: FiBriefcase, label: "Management" },
        { id: "Minutes", icon: FiClock, label: "Minutes" },
        { id: "Mileage", icon: FiMapPin, label: "Mileage" },
        { id: "Measurement", icon: FiActivity, label: "Measurement" },
        { id: "Morale", icon: FiSmile, label: "Morale" },
        { id: "Marketing", icon: FiVolume2, label: "Marketing" },
        { id: "Milieu", icon: FiGlobe, label: "Milieu" },
        { id: "Maintenance", icon: FiTool, label: "Maintenance" },
        { id: "Mission", icon: FiTarget, label: "Mission" },
        { id: "Mitigation", icon: FiShield, label: "Mitigation" },
        { id: "Middlemen", icon: FiUsers, label: "Middlemen" },
    ];

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
            if (estimationMenuRef.current && !estimationMenuRef.current.contains(event.target)) {
                setIsEstimationMenuOpen(false);
            }
            if (bottomMenuRef.current && !bottomMenuRef.current.contains(event.target)) {
                setIsBottomMenuOpen(false);
            }
            if (addItemMenuRef.current && !addItemMenuRef.current.contains(event.target)) {
                setIsAddItemMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAddEstimationItem = (type) => {
        const newItem = {
            item_id: `est_${Date.now()}`,
            type: "stocks",
            source_type: "estimation",
            tax_id: "",
            tax_percent: 0,
            quantity: 1,
            rate: 0,
            amount: 0,
            tax_details: {},
            metadata: {
                category: type,
                line_category: type.toLowerCase(),
                line_description: "",
                source: "internal",
                role: "",
                hours: 1,
                qty: 1,
                cost: 0,
                name: "",
                description: "",
                type: type === "Materials" ? "product" : "",
                unit: type === "Measurement" ? "Units" : "Unit"
            }
        };
        setFormData(prev => ({ ...prev, items: [newItem, ...prev.items] }));
        setIsEstimationMenuOpen(false);
    };

    const handleAddTimeItem = () => {
        const today = new Date().toISOString().split('T')[0];
        const newItem = {
            item_id: `time_${Date.now()}`,
            type: "stocks",
            source_type: "time",
            tax_id: "",
            tax_percent: 0,
            quantity: 1,
            rate: 0,
            amount: 0,
            tax_details: {},
            metadata: {
                use_start_end: false,
                hours: 1,
                minutes: 0,
                start_date: today,
                start_time: "09:00",
                end_date: today,
                end_time: "10:00",
                income_account: "",
                entry_type: "time"
            }
        };
        setFormData(prev => ({ ...prev, items: [newItem, ...prev.items] }));
    };

    const handleAddMileageItem = () => {
        const today = new Date().toISOString().split('T')[0];
        const newItem = {
            item_id: `mileage_${Date.now()}`,
            type: "stocks",
            source_type: "mileage",
            tax_id: "",
            tax_percent: 0,
            quantity: 1,
            rate: 0,
            amount: 0,
            tax_details: {},
            metadata: {
                start_address: "",
                end_address: "",
                trip_type: "one_way",
                distance_km: 1,
                mileage_date: today,
                mileage_name: "",
                note: ""
            }
        };
        setFormData(prev => ({ ...prev, items: [newItem, ...prev.items] }));
    };

    // ── Mileage geocoding & routing helpers ─────────────────────────────────
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
        placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '14px' }),
        input: (base) => ({ ...base, color: '#111827' }),
        singleValue: (base) => ({ ...base, color: '#111827' }),
    };

    const isInitialHydrationRef = useRef(new Set());

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

    // Auto-geocode saved mileage addresses when editing, so map + routes appear immediately
    useEffect(() => {
        if (!isOpen || !editData) return;
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
    }, [isOpen, editData, formData.items, mileageCoordsMap]);

    // Reset state after cancel or send
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            isHydratedRef.current = false;
            setLockedCountry(null);
            setMileageCoordsMap({});
            setMileageRoutesMap({});
            setMileageSelectedRouteMap({});
            setMileageInputMap({});
            isInitialHydrationRef.current = new Set();
            setIsLoadingCustomers(true);
            setIsLoadingItems(true);
        }
    }, [isOpen]);

    // Automatically reset/refetch products if all items are cleared
    useEffect(() => {
        if (!isOpen) return;
        if (!isHydratedRef.current) return;

        const hasActiveItems = formData.items && formData.items.some(
            item => item.item_id && item.tax_id
        );

        if (lockedCountry && !hasActiveItems) {
            setLockedCountry(null);
            fetchItems(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.items, lockedCountry, isOpen, isHydratedRef.current]);
    // ────────────────────────────────────────────────────────────────────────

    const generateInvoiceNumber = () => generateUniqueId("INV");


    const hasChanges = useMemo(() => {
        if (!initialSnapshot) return false;
        const currentData = { ...formData, attachment: null };
        const snapshotData = { ...JSON.parse(initialSnapshot), attachment: null };
        return JSON.stringify(currentData) !== JSON.stringify(snapshotData);
    }, [formData, initialSnapshot]);

    const handleClose = () => {
        setFormData(initialFormData);
        setInitialSnapshot(null);
        setStep(1);
        isHydratedRef.current = false;
        setLockedCountry(null);
        // Reset mileage specific states
        setMileageCoordsMap({});
        setMileageRoutesMap({});
        setMileageSelectedRouteMap({});
        setMileageInputMap({});
        isInitialHydrationRef.current = new Set();
        onClose();
    };

    const totals = calculateTotals(formData.items);

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



    useEffect(() => {
        if (formData.customer && customers.length > 0) {
            const selectedCustomer = customers.find(c => String(c.id) === String(formData.customer));
            if (selectedCustomer?.email && !formData.emailConfig.to) {
                setFormData(prev => {
                    const updated = {
                        ...prev,
                        emailConfig: {
                            ...prev.emailConfig,
                            to: selectedCustomer.email
                        }
                    };
                    if (!initialSnapshot || initialSnapshot === JSON.stringify(prev)) {
                        setInitialSnapshot(JSON.stringify(updated));
                    }
                    return updated;
                });
            }
        }
    }, [formData.customer, customers, formData.emailConfig.to, initialSnapshot]);

    // 1. Fetch data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchCustomers();
            fetchSuppliers();
            fetchTaxes();

            const checkEditTaxAndFetch = async () => {
                let countryToFilter = null;
                if (editData) {
                    const firstItem = Array.isArray(editData.sales_item)
                        ? editData.sales_item[0]
                        : editData.sales_item;
                    const taxVal = firstItem?.tax_id;
                    const taxId = (typeof taxVal === 'object' ? taxVal?.id : taxVal) || "";
                    if (isValidTaxId(taxId)) {
                        try {
                            const taxResponse = await taxService.getTaxCodeById(taxId);
                            const countryVal = taxResponse?.data?.country;
                            if (countryVal) {
                                countryToFilter = countryVal;
                                setLockedCountry(countryVal);
                            }
                        } catch (error) {
                            console.error("Error pre-fetching edit country:", error);
                        }
                    }
                }
                fetchItems(countryToFilter);
            };
            checkEditTaxAndFetch();
        }
    }, [isOpen, editData]);

    // 2. Handle mode, initialization and hydration
    useEffect(() => {
        if (!isOpen) return;

        // Set step based on mode
        if (mode === "payment") {
            setStep(3);
        } else if (mode === "view") {
            setStep(2);
        } else if (step === 3 && mode !== "payment") {
            // Keep step if already at 3, but if we just opened in normal mode, reset to 1
        } else {
            // Default to step 1 for edit/create
            if (!isHydratedRef.current) setStep(1);
        }

        // Wait for data if we are in edit mode to ensure mappings work correctly
        const isDataLoading = isLoadingCustomers || isLoadingItems;

        if (editData && isDataLoading) return;

        if (!isHydratedRef.current) {
            if (editData) {
                const dataToSet = {
                    invoiceNumber: editData.invoice_number || "",
                    invoiceName: editData.invoice_name || "",
                    status: editData.status || "DRAFT",
                    customer: editData.customer_id?.id || editData.customer_id || "",
                    invoiceDate: editData.invoice_date ? new Date(editData.invoice_date).toISOString().split('T')[0] : "",
                    is_auto_created: editData.is_auto_created || false,
                    items: parseItemsFromDb(editData.sales_item, customizedProductsList),
                    notes: editData.notes || "",
                    attachment: editData.attachmentkey || editData.attachment || null,
                    amountPaid: parseFloat(editData.amount_paid) || 0,
                    emailConfig: {
                        ...initialFormData.emailConfig,
                        to: customers.find(c => String(c.id) === String(editData.customer_id?.id || editData.customer_id))?.email || ""
                    }
                };
                setFormData(dataToSet);
                setInitialSnapshot(JSON.stringify(dataToSet));
                isHydratedRef.current = true;
            } else {
                // New invoice
                const dataToSet = {
                    ...initialFormData,
                    invoiceNumber: generateInvoiceNumber(),
                    invoiceDate: new Date().toISOString().split('T')[0],
                    items: []
                };
                setFormData(dataToSet);
                setInitialSnapshot(JSON.stringify(dataToSet));
                isHydratedRef.current = true;
            }
        }

        // Handle resume logic separately as it might happen after hydration
        if (searchParams.get("action") === "resume") {
            const savedData = localStorage.getItem("pending_sales_invoice_data");
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                const newCustomerId = searchParams.get("newCustomerId");
                if (newCustomerId) {
                    parsedData.customer = newCustomerId;
                }
                setFormData(parsedData);
                localStorage.removeItem("pending_sales_invoice_data");
                const params = new URLSearchParams(searchParams.toString());
                params.delete("action");
                params.delete("newCustomerId");
                router.replace(`/sales/invoice?${params.toString()}`);
            }
        }
    }, [isOpen, editData, mode, customers, productsList, customizedProductsList, isLoadingCustomers, isLoadingItems, searchParams, router]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { item_id: "", type: "Product", tax_id: "", tax_percent: 0, quantity: 1, rate: 0, amount: 0, tax_details: {} }]
        }));
    };

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
            newItems[index].tax_id = "";
            newItems[index].tax_percent = 0;
            newItems[index].tax_details = {};

            if (value === "Time") {
                newItems[index].source_type = "time";
                newItems[index].metadata = { use_start_end: false, hours: 0, minutes: 0 };
            } else if (value === "Mileage") {
                newItems[index].source_type = "mileage";
                newItems[index].metadata = { trip_type: 'one_way', distance_km: 0 };
            } else if (value === "Estimation") {
                newItems[index].source_type = "estimation";
                newItems[index].metadata = { category: 'manpower', qty: 1 };
            } else if (value === "Service") {
                newItems[index].source_type = "service";
                newItems[index].metadata = { description: "" };
            } else {
                newItems[index].source_type = "item";
                newItems[index].metadata = {};
            }
        }

        if (field === "item_id") {
            const itemType = newItems[index].type;
            let listToSearch = [];
            if (overrideList) {
                listToSearch = overrideList;
            } else {
                if (itemType === "Product") listToSearch = productsList;
                else if (itemType === "stocks") listToSearch = customizedProductsList;
                else if (itemType === "Time") listToSearch = timeList;
                else if (itemType === "Mileage") listToSearch = mileageList;
                else if (itemType === "Estimation") listToSearch = estimationList;
            }

            const selectedItem = listToSearch.find(i => i.id == value);
            if (selectedItem) {
                newItems[index].rate = parseFloat(selectedItem.rate || 0);
                if (itemType === "Product" || itemType === "stocks") {
                    newItems[index].production_cost = parseFloat(selectedItem.Production_cost || selectedItem.cost_price || 0);
                    newItems[index].description = selectedItem.name || selectedItem.description || "N/A";
                }
                if (!newItems[index].quantity || parseFloat(newItems[index].quantity) <= 0) {
                    newItems[index].quantity = 1;
                }

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

                // Prefill specific data
                if (itemType === "Time") {
                    const durationMins = parseInt(selectedItem.duration_minutes) || 0;
                    const hours = Math.floor(durationMins / 60);
                    const minutes = durationMins % 60;
                    const ratePerHour = parseFloat(selectedItem.rate_per_hour || selectedItem.rate || 0);
                    newItems[index].rate = ratePerHour;
                    newItems[index].quantity = durationMins / 60;
                    newItems[index].amount = (durationMins / 60) * ratePerHour;
                    newItems[index].metadata = {
                        ...newItems[index].metadata,
                        entry_name: selectedItem.name || "",
                        hours: hours,
                        minutes: minutes,
                        duration_minutes: durationMins,
                        rate_per_hour: String(ratePerHour),
                        entry_date: selectedItem.start || new Date().toISOString(),
                        notes: selectedItem.note || "",
                        use_start_end: !!(selectedItem.start && selectedItem.end),
                        start_date: selectedItem.start ? selectedItem.start.split('T')[0] : "",
                        start_time: selectedItem.start ? selectedItem.start.split('T')[1]?.slice(0, 5) : "",
                        end_date: selectedItem.end ? selectedItem.end.split('T')[0] : "",
                        end_time: selectedItem.end ? selectedItem.end.split('T')[1]?.slice(0, 5) : "",
                    };
                } else if (itemType === "Mileage") {
                    const distance = parseFloat(selectedItem.distance_km || selectedItem.distance || 0);
                    const ratePerKm = parseFloat(selectedItem.rate_per_km || selectedItem.rate || 0);
                    newItems[index].rate = ratePerKm;
                    newItems[index].quantity = distance;
                    newItems[index].amount = distance * ratePerKm;
                    newItems[index].metadata = {
                        ...newItems[index].metadata,
                        mileage_name: selectedItem.name || "",
                        trip_type: selectedItem.trip_type || "one_way",
                        start_address: selectedItem.start_address || "",
                        end_address: selectedItem.end_address || "",
                        distance_km: String(distance),
                        rate_per_km: String(ratePerKm)
                    };
                } else if (itemType === "Estimation") {
                    const totalEstAmount = parseFloat(selectedItem.total_amount || selectedItem.total || 0);
                    const taxEstAmount = parseFloat(selectedItem.tax || 0);
                    const subtotalEstAmount = parseFloat(selectedItem.subtotal || 0);
                    newItems[index].rate = totalEstAmount;
                    newItems[index].quantity = 1;
                    newItems[index].amount = totalEstAmount;
                    newItems[index].metadata = {
                        ...newItems[index].metadata,
                        estimation_id: String(selectedItem.id),
                        estimation_name: selectedItem.estimation_name || selectedItem.name || "",
                        estimation_number: selectedItem.estimation_number || "",
                        parent_total_amount: String(totalEstAmount),
                        parent_tax: String(taxEstAmount),
                        parent_subtotal: String(subtotalEstAmount),
                        lines: selectedItem.lines || []
                    };
                }

                const qty = newItems[index].quantity || 0;
                const rate = newItems[index].rate || 0;
                newItems[index].amount = qty * rate;
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
            dispatch(showToast({ message: "stocks created successfully", type: "success" }));

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
                    await processRestock(createdProduct, restockData, "Stocks");
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
            console.error("Error creating stocks from sales form:", error);
            dispatch(showToast({ message: "Failed to create stocks", type: "error" }));
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

    const handleEstimationItemSelect = async (index, itemId) => {
        const itemType = formData.items[index].metadata?.type || "product";
        const list = itemType === "stocks" ? customizedProductsList : productsList;
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
                metadata: meta
            };

            let taxPercentVal = 0;
            let taxRates = {};
            let taxId = "";

            const taxVal = selected.tax;
            const targetTaxId = (typeof taxVal === 'object' ? taxVal?.id : taxVal);
            if (isValidTaxId(targetTaxId)) {
                try {
                    const taxResponse = await taxService.getTaxCodeById(targetTaxId);
                    const taxData = taxResponse.data;
                    taxRates = taxData?.tax_rates || {};
                    taxPercentVal = Object.values(taxRates).reduce((sum, r) => sum + (parseFloat(r) || 0), 0);
                    taxId = targetTaxId;

                    // Lock country and refetch if not locked
                    if (!lockedCountry && taxData?.country) {
                        setLockedCountry(taxData.country);
                        fetchItems(taxData.country);
                    }
                } catch (error) {
                    console.error("Error fetching tax template:", error);
                }
            }

            updatedItem.tax_percent = taxPercentVal;
            updatedItem.tax_details = taxRates;
            updatedItem.tax_id = taxId;
            updatedItem.metadata.tax = taxPercentVal;

            const subtotal = rate * qty;
            updatedItem.amount = Number(subtotal.toFixed(2));

            newItems[index] = updatedItem;
            setFormData(prev => ({ ...prev, items: newItems }));
        }
    };

    const handleAddNewItemOfType = (type) => {
        setIsAddItemMenuOpen(false);
        setFormData(prev => {
            const maxSortKey = prev.items.reduce((max, item) => Math.max(max, item.sort_key || 0), 0);

            let newItem = {
                type: type,
                source_type: type === "Product" ? "product" :
                    type === "stocks" ? "customized" :
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

                    if (field === "qty" && item.item_id && (updatedMetadata.type === "product" || updatedMetadata.type === "stocks")) {
                        const list = updatedMetadata.type === "stocks" ? customizedProductsList : productsList;
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
                } else if (cat === "machinery" || cat === "minutes" || cat === "measurement") {
                    const qField = (cat === "minutes" ? "minutes" : "qty");
                    const q = field === qField ? parseFloat(value || 0) : (updatedMetadata[qField] || 0);
                    const r = (field === "rate" || field === "cost") ? parseFloat(value || 0) : (item.rate || 0);
                    updatedQuantity = parseFloat(q) || 0;
                    updatedRate = parseFloat(r) || 0;
                    if (field === "description") {
                        updatedMetadata.line_description = value;
                        updatedMetadata.line_name = value;
                    }
                } else if (cat === "middlemen" || cat === "money" || cat === "method" || cat === "management" || cat === "morale" || cat === "marketing" || cat === "milieu" || cat === "maintenance" || cat === "mission" || cat === "mitigation") {
                    const r = (field === "rate" || field === "cost") ? parseFloat(value || 0) : (item.rate || 0);
                    updatedQuantity = 1;
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

    const renderCardBody = (item, idx) => {
        const type = item.type || item.source_type;
        const commonLabelClass = "text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1";
        const commonInputClass = "w-full px-3 py-1.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFCA00] focus:bg-white transition-all h-[38px]";

        if (type === "Product" || type === "product") {
            const selectedProduct = productsList.find(i => i.id == item.item_id);
            const dbItems = Array.isArray(editData?.sales_item) ? editData.sales_item : [];
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
                                    .map(i => {
                                        const stockVal = parseFloat(i.current_quantity) || 0;
                                        return {
                                            value: i.id,
                                            label: i.name,
                                            isDisabled: stockVal <= 0
                                        };
                                    })
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

        if (type === "stocks" || type === "customized") {
            const selectedProduct = customizedProductsList.find(i => i.id == item.item_id);
            const dbItems = Array.isArray(editData?.sales_item) ? editData.sales_item : [];
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
                                { value: "new_customized_product", label: "+ Add New stocks" },
                                ...customizedProductsList
                                    .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.type === item.type && it.item_id == i.id))
                                    .map(i => {
                                        const stockVal = parseFloat(i.current_quantity) || 0;
                                        return {
                                            value: i.id,
                                            label: i.name,
                                            isDisabled: stockVal <= 0
                                        };
                                    })
                            ]}
                            placeholder="Select stocks"
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
                        Click below to quickly select and add the type of item you want to include in this invoice.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 w-full max-w-4xl">
                        {[
                            { id: "Product", label: "Product", icon: FiBox, color: "hover:border-[#FFCA00] hover:text-[#FFCA00] hover:bg-amber-50/10" },
                            { id: "stocks", label: "Customized", icon: FiSettings, color: "hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50/10" },
                            { id: "Service", label: "Service", icon: FiTool, color: "hover:border-green-500 hover:text-green-600 hover:bg-green-50/10" },
                            { id: "Time", label: "Time Entry", icon: FiClock, color: "hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/10" },
                            { id: "Mileage", label: "Mileage Entry", icon: FiNavigation, color: "hover:border-rose-500 hover:text-rose-600 hover:bg-rose-50/10" },
                            { id: "Estimation", label: "Estimate", icon: FiFileText, color: "hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50/10" }
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

    const handleSendEmail = async () => {
        if (!editData?.id) {
            dispatch(showToast({ message: "Invoice must be saved before sending.", type: "error" }));
            return;
        }

        try {
            setIsSaving(true);
            setSaveType("send");
            const emailData = {
                documentType: "SALES_INVOICE",
                documentId: editData.id,
                email: {
                    to: formData.emailConfig.to || "",
                    cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                    bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                    message: formData.emailConfig.message || ""
                }
            };

            const response = await salesInvoiceService.sendInvoiceEmail(emailData);
            if (response?.success === false) {
                throw new Error(response.message || "Failed to send email");
            }



            dispatch(showToast({ message: "Invoice sent successfully!", type: "success" }));
            onSave(editData.id, "EMAIL_SENT");
            handleClose();
        } catch (error) {
            console.error("Error sending email:", error);
            if (!error.isHandled) {
                dispatch(showToast({ message: error.message || "Error sending email.", type: "error" }));
            }
        } finally {
            setIsSaving(false);
            setSaveType(null);
        }
    };

    const handleSave = async (forcedStatus = null, isSendToClient = false, isSendOnly = false) => {
        try {
            if (!formData.customer) {
                dispatch(showToast({ message: "Please select a customer.", type: "error" }));
                return;
            }
            if (!formData.items || formData.items.length === 0) {
                dispatch(showToast({ message: "Please add at least one item.", type: "error" }));
                return;
            }

            // Check inventory limits only for regular product items and estimation materials
            let estimationStockError = null;

            const overstockItem = formData.items.find(item => {
                const qty = parseFloat(item.quantity) || 0;

                // Check Estimation Materials (which are stored inside the estimation link's metadata lines)
                if (item.source_type === "estimation") {
                    const lines = Array.isArray(item.metadata?.lines) ? item.metadata.lines : [];
                    for (const line of lines) {
                        const lineCat = (line.category || line.metadata?.category || line.metadata?.line_category || "").toLowerCase();
                        if (lineCat === "materials") {
                            const lineStock = line.metadata?.stock !== undefined ? parseFloat(line.metadata.stock) : undefined;
                            const lineQty = parseFloat(line.quantity || line.metadata?.qty || 0);

                            if (lineStock !== undefined && lineQty > lineStock) {
                                estimationStockError = {
                                    name: line.metadata?.name || line.description || "dependent product",
                                    qty: lineQty,
                                    stock: lineStock,
                                    estName: item.metadata?.estimation_name || item.metadata?.estimation_number || "the estimation"
                                };
                                return true;
                            }
                        }
                    }
                }

                if ((item.source_type && item.source_type !== "item") || (item.type !== "Product" && item.type !== "stocks")) return false;
                const list = item.type === "stocks" ? customizedProductsList : productsList;
                const dbProduct = list.find(i => i.id == item.item_id);
                const dbStock = dbProduct ? (parseFloat(dbProduct.current_quantity) || 0) : 0;

                const dbItems = Array.isArray(editData?.sales_item) ? editData.sales_item : [];
                const originalDbItem = dbItems.find(dbItem => dbItem.source_id == item.item_id || dbItem.item_id == item.item_id);
                const originalQty = originalDbItem ? (parseFloat(originalDbItem.quantity) || 0) : 0;

                const stock = dbStock + originalQty;
                return qty > stock;
            });

            if (estimationStockError) {
                dispatch(showToast({ message: `The ${estimationStockError.name} from ${estimationStockError.estName} is out of stock. We want ${estimationStockError.qty} quantity but stock is ${estimationStockError.stock}. Update stock.`, type: "error" }));
                return;
            }

            if (overstockItem) {
                dispatch(showToast({ message: "One or more items exceed available stock quantity.", type: "error" }));
                return;
            }

            setIsSaving(true);
            setSaveType(isSendToClient ? "send" : "save");

            // Attachment is already a CDN URL (uploaded by AttachmentUploader on file-select)
            const attachmentUrl = formData.attachment || null;

            const itemsToSave = mapItemsForSave(formData.items);

            const payload = {
                invoice_number: formData.invoiceNumber,
                invoice_name: formData.invoiceName,
                customer_id: parseInt(formData.customer),
                invoice_date: formData.invoiceDate,
                total_amount: parseFloat(totals.total.toFixed(2)),
                amount_paid: parseFloat((parseFloat(formData.amountPaid) || 0).toFixed(2)),
                notes: formData.notes || "",
                attachmentkey: attachmentUrl || null,
                status: formData.status,
                items: itemsToSave
            };

            if (step === 3) {
                const total = parseFloat(totals.total.toFixed(2));
                const paid = parseFloat(formData.amountPaid) || 0;
                if (paid >= total) {
                    payload.status = "PAID";
                } else if (paid > 0) {
                    payload.status = "PARTIALLY PAID";
                } else {
                    payload.status = "SENT";
                }
            } else if (!editData) {
                payload.status = "DRAFT";
            }

            let response;
            if (editData?.id) {
                response = await salesInvoiceService.updateInvoice(editData.id, payload);
            } else {
                response = await salesInvoiceService.saveInvoice(payload);
            }

            if (response?.success === false) {
                throw new Error(response.errors?.[0]?.message || response.message || "Validation error");
            }

            dispatch(showToast({ message: `Sales Invoice ${editData ? "updated" : "created"} successfully!`, type: "success" }));

            const newId = response?.data?.data?.id || response?.data?.id || response?.data?.[0]?.id || response?.id || editData?.id;

            if (isSendToClient && newId) {
                try {
                    const emailData = {
                        documentType: "SALES_INVOICE",
                        documentId: newId,
                        email: {
                            to: formData.emailConfig.to || "",
                            cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                            bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                            message: formData.emailConfig.message || ""
                        }
                    };
                    await salesInvoiceService.sendInvoiceEmail(emailData);
                    dispatch(showToast({ message: "Invoice sent successfully!", type: "success" }));

                    // Trigger silent payment recording after successful email transmission (transitions invoice state)
                    if (pendingPaymentDetails.current) {
                        const { amountPaid, paymentMode } = pendingPaymentDetails.current;
                        pendingPaymentDetails.current = null; // Clear to prevent double trigger

                        const paymentPayload = {
                            payment_number: generateUniqueId("PAY"),
                            payment_name: `Payment for ${payload.invoice_number}`,
                            customer_id: payload.customer_id,
                            invoice_id: newId,
                            payment_date: new Date().toISOString().split('T')[0],
                            payment_mode: paymentMode,
                            amount: amountPaid.toFixed(2),
                            due_amount: (payload.total_amount - amountPaid).toFixed(2),
                            notes: "Auto-recorded payment on invoice send.",
                            attachmentkey: null,
                            status: "DRAFT",
                            items: itemsToSave.map(item => ({
                                source_type: item.source_type || "item",
                                quantity: parseFloat(item.quantity) || 0,
                                rate: parseFloat(item.rate) || 0,
                                tax_percent: parseFloat(item.tax_percent) || 0,
                                amount: parseFloat(item.amount) || 0,
                                tax_id: item.tax_id ? Number(item.tax_id) : null,
                                item_id: Number(item.item_id || item.source_id),
                                source_id: Number(item.source_id || item.item_id),
                                description: item.description || "",
                                production_cost: 0
                            }))
                        };

                        // Silently call payment API
                        salesPaymentService.createPayment(paymentPayload).then((res) => {
                            console.log("Silent payment recorded successfully.");
                            const paymentId = res?.data?.data?.id || res?.data?.id || res?.data?.[0]?.id || res?.id;
                            if (paymentId) {
                                const emailPayload = {
                                    documentType: "SALES_PAYMENT",
                                    documentId: paymentId,
                                    email: {
                                        to: formData.emailConfig.to || "",
                                        cc: [],
                                        bcc: [],
                                        message: ""
                                    }
                                };
                                salesPaymentService.sendPaymentEmail(emailPayload).then(() => {
                                    console.log("Silent payment email sent successfully.");
                                }).catch(e => {
                                    console.error("Silent payment email sending failed:", e);
                                });
                            }
                        }).catch(err => {
                            console.error("Silent payment recording failed:", err);
                        });
                    }

                    onSave(newId, "EMAIL_SENT");
                } catch (emailError) {
                    console.error("Error sending email:", emailError);
                    dispatch(showToast({ message: emailError?.message || "Invoice created, but failed to send email to client", type: "error" }));
                    onSave(newId);
                }
                handleClose();
            } else {
                if (!isSendOnly) {
                    onSave(newId);
                    handleClose();
                }
            }
            return newId;
        } catch (error) {
            console.error("Error saving invoice:", error);
            if (!error.isHandled) {
                dispatch(showToast({ message: error.message || "Error saving sales invoice.", type: "error" }));
            }
        } finally {
            setIsSaving(false);
            setSaveType(null);
        }
    };

    const handleSaveAndSendClick = () => {
        setIsPaymentPromptOpen(true);
    };

    const handlePaymentPromptConfirm = ({ paymentStatus, amountPaid, paymentMode }) => {
        setIsPaymentPromptOpen(false);
        if (paymentStatus !== "UNPAID") {
            pendingPaymentDetails.current = { amountPaid, paymentMode };
        } else {
            pendingPaymentDetails.current = null;
        }
        handleSave(null, true);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95dvh] overflow-y-auto">
                <div className="p-4 md:p-8">
                    {step === 1 ? (
                        <div>
                            <div className="flex flex-wrap justify-between items-start mb-6 gap-2">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight font-poppins">
                                        {formData.items.some(i => i.source_type === "estimation") ? "Configure Estimate" : "Configure Sales Invoice"}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1 font-medium">
                                        {formData.items.some(i => i.source_type === "estimation") ? "Setup estimation details and items" : "Setup invoice details and items"}
                                    </p>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${(!editData || hasChanges) ? "bg-gray-100 text-gray-500" : "bg-gray-100 text-gray-500"}`}>
                                    {(!editData || hasChanges) ? "Not Saved" : (formData.status || "Draft")}
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                {/* Details Section */}
                                <div className="mb-8">
                                    <h3 className="text-sm font-bold text-gray-900 mb-4">Details</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block">Invoice Number Series</label>
                                            <input
                                                type="text"
                                                value={formData.invoiceNumber}
                                                readOnly
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm bg-white text-gray-400"
                                                placeholder="INV"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block">Invoice Name</label>
                                            <input
                                                type="text"
                                                value={formData.invoiceName}
                                                onChange={(e) => handleInputChange("invoiceName", e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm placeholder:text-gray-300"
                                                placeholder="Enter Invoice Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block">Invoice Date</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    value={formData.invoiceDate}
                                                    onChange={(e) => handleInputChange("invoiceDate", e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm pr-10 text-gray-400 h-[48px]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block">Customer</label>
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center">
                                                <div className="flex-1">
                                                    <CustomSelect
                                                        value={formData.customer}
                                                        onChange={(val) => {
                                                            const customer = customers.find(c => c.id === val);
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                customer: val,
                                                                emailConfig: {
                                                                    ...prev.emailConfig,
                                                                    to: customer?.email || prev.emailConfig.to
                                                                }
                                                            }));
                                                        }}
                                                        options={customers.map(c => ({ value: c.id, label: c.name }))}
                                                        placeholder="Enter Customer Name"
                                                        className="rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none sm:rounded-r-none h-[48px] border border-gray-200 sm:border-r-0"
                                                        isDisabled={formData.is_auto_created}
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleAddCustomerClick}
                                                    disabled={formData.is_auto_created}
                                                    className={`px-6 py-2 text-white text-[14px] font-bold rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none whitespace-nowrap flex items-center justify-center gap-2 h-[48px] transition-all ${formData.is_auto_created ? "bg-gray-300 cursor-not-allowed" : "bg-[#FFCA00] hover:bg-[#E6B600]"}`}
                                                >
                                                    Add New Customer <FiUser size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="mb-8">
                                    <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-50">
                                        <h3 className="text-[14px] font-bold text-gray-900 font-poppins uppercase tracking-wide">
                                            {formData.items.some(i => i.source_type === "mileage")
                                                ? "Distance & Trip Type"
                                                : formData.items.some(i => i.source_type === "time")
                                                    ? "Duration & Time"
                                                    : formData.items.some(i => i.source_type === "estimation")
                                                        ? "Estimation Parameters"
                                                        : "Items"}
                                        </h3>
                                        {/* Add Item button — visible always */}
                                        {true && (
                                            <div className="relative" ref={addItemMenuRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAddItemMenuOpen(!isAddItemMenuOpen)}
                                                    className="px-4 py-2 bg-[#F0F0FF] text-[#6E6BFF] rounded-lg text-[13px] font-bold flex items-center gap-2 hover:bg-[#E5E5FF] transition-all border border-indigo-100/50"
                                                >
                                                    <FiPlus size={16} className="text-[#6E6BFF]" /> Add Item <FiChevronDown size={14} className={`transition-transform duration-300 ${isAddItemMenuOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isAddItemMenuOpen && (
                                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-2 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                                                        {[
                                                            { id: "Product", label: "Product", icon: FiBox },
                                                            { id: "stocks", label: "stocks", icon: FiSettings },
                                                            { id: "Service", label: "Service", icon: FiTool },
                                                            { id: "Time", label: "Time Entry", icon: FiClock },
                                                            { id: "Mileage", label: "Mileage Entry", icon: FiNavigation },
                                                            { id: "Estimation", label: "Estimation Link", icon: FiFileText }
                                                        ].map((opt) => (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    handleAddNewItemOfType(opt.id);
                                                                    setIsAddItemMenuOpen(false);
                                                                }}
                                                                className="w-full text-left px-5 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-[13px] text-gray-700 font-bold transition-colors"
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
                                </div>

                                <div className="mt-4 flex flex-col items-end gap-2 text-sm">
                                    <div className="flex justify-between w-full md:w-80">
                                        <span className="text-gray-600">Subtotal:</span>
                                        <span className="font-semibold text-gray-900 whitespace-nowrap">
                                            ₹ {totals.subtotal.toLocaleString()}.00
                                        </span>
                                    </div>
                                    <div className="flex justify-between w-full md:w-80">
                                        <span className="text-gray-600">Tax:</span>
                                        <span className="font-semibold text-gray-900 whitespace-nowrap">
                                            ₹ {totals.totalTax.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between w-full md:w-80 pt-2 border-t-2 border-gray-200 text-base">
                                        <span className="font-semibold text-gray-900">Total (INR):</span>
                                        <span className="font-bold text-teal-600 whitespace-nowrap">
                                            ₹ {totals.total.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* References Section */}
                                <div className="mb-8 mt-12 md:mt-0">
                                    <h3 className="text-sm font-bold text-gray-900 mb-4">References</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block">Notes</label>
                                            <textarea
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm h-28 placeholder:text-gray-300 focus:ring-0 focus:border-gray-200"
                                                placeholder="Add invoice terms or notes"
                                            ></textarea>
                                        </div>
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block">Attachment</label>
                                            <AttachmentUploader
                                                context="sales-invoice"
                                                existingUrl={formData.attachment}
                                                onUploaded={(url) => handleInputChange("attachment", url)}
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
                                    disabled={isSaving || !hasChanges}
                                    className="px-6 py-2.5 border border-[#FFCA00] text-[#FFCA00] hover:bg-[#FFCA00] hover:text-white text-[14px] font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
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
                                        onClick={handleSaveAndSendClick}
                                        disabled={isSaving}
                                        className="px-6 py-2.5 bg-[#FFCA00] text-white text-[14px] font-bold rounded-lg hover:bg-[#d9ac00] disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
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
                                        className="px-6 py-2.5 bg-[#FFCA00] text-white text-[14px] font-bold rounded-lg hover:bg-[#d9ac00] disabled:opacity-50 transition-all cursor-pointer"
                                    >
                                        Submit
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : step === 2 ? (
                        <div>
                            <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4 no-print">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                                        {mode === "view" ? "View Sales Invoice" : "Preview & Send"}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {isExporting ? "Generating PDF..." : mode === "view" ? "View details of your invoice" : "Review and send your invoice"}
                                    </p>
                                </div>
                                <div className="flex gap-4 text-gray-400 self-end sm:self-auto">
                                    <button
                                        onClick={handlePrint}
                                        disabled={isExporting}
                                        className="p-1 hover:text-gray-900 transition-colors disabled:opacity-50"
                                    >
                                        <FiPrinter size={22} />
                                    </button>
                                    <button
                                        onClick={handleDownloadPDF}
                                        disabled={isExporting}
                                        className="p-1 hover:text-gray-900 transition-colors disabled:opacity-50"
                                    >
                                        {isExporting ? <FiLoader className="animate-spin" size={22} /> : <FiDownload size={22} />}
                                    </button>
                                </div>
                            </div>

                            {/* ── Document Preview ─────────────────────────────────────── */}
                            <div className="bg-gray-50 -mx-8 px-4 md:px-8 py-8 mb-6 overflow-y-auto md:overflow-y-visible overflow-x-hidden max-h-[80vh] md:max-h-none">
                                <div className="bg-white rounded-lg shadow-sm overflow-x-auto md:overflow-x-visible max-w-full md:max-w-4xl mx-auto">
                                    <div className="min-w-[800px] md:min-w-full">
                                        <DocumentPreview
                                            ref={docPreviewRef}
                                            type="SALES_INVOICE"
                                            filename={`Invoice-${formData.invoiceNumber}`}
                                            payload={{
                                                company: {
                                                    name: "BrandMagics Software Labs",
                                                    address: "123, Software Park Road",
                                                    city: "Kochi, Kerala, IN 682001",
                                                },
                                                party: (() => {
                                                    const c = (customers || []).find(c => c.id == formData.customer);
                                                    return { name: c?.name, address: c?.address, email: c?.email, phone: c?.phone };
                                                })(),
                                                document: {
                                                    number: formData.invoiceNumber,
                                                    date: formData.invoiceDate,
                                                    status: formData.status,
                                                    reference: formData.invoiceName,
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
                                    </div>
                                </div></div>

                            {/* Configuration Section */}
                            {mode !== "view" && editData?.status?.toUpperCase() !== "PAID" && (
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
                                                            context="sales-invoice"
                                                            existingUrl={formData.attachment}
                                                            onUploaded={(url) => handleInputChange("attachment", url)}
                                                            disabled={false}
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
                                {mode === "view" ? (
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
                                            className="w-full sm:w-auto px-6 py-2.5 bg-[#FFCA00] text-white rounded-lg text-[14px] font-bold flex items-center justify-center gap-2 order-1 sm:order-2 hover:bg-[#d9ac00]"
                                        >
                                            {isSaving && saveType === "send" ? <FiLoader size={18} className="animate-spin" /> : <FiSend size={18} />}
                                            {isSaving && saveType === "send" ? "Submitting..." : "Submit"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">Configure Payment Amount</h2>
                                    <p className="text-sm text-gray-500 mt-1">Setup amount details</p>
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                <div className="mb-8">
                                    <h3 className="text-sm font-bold text-gray-900 mb-4">Payment Amount Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block">Net Amount</label>
                                            <input
                                                type="text"
                                                value={`₹ ${totals.total.toFixed(2)}`}
                                                readOnly
                                                className="w-full px-4 py-3 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block">Amount Paid</label>
                                            <input
                                                type="number"
                                                value={formData.amountPaid}
                                                onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm"
                                                placeholder="Enter amount"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block">Due Amount</label>
                                            <input
                                                type="text"
                                                value={`₹ ${(totals.total - (parseFloat(formData.amountPaid) || 0)).toFixed(2)}`}
                                                readOnly
                                                className="w-full px-4 py-3 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Invoice Preview in Step 3 */}
                                <div className="bg-gray-50 -mx-8 px-8 py-10 mb-6 border-y border-gray-200">
                                    <div className="bg-white rounded-lg shadow-sm p-10 max-w-3xl mx-auto border border-gray-100">
                                        <div className="flex flex-col md:flex-row justify-between mb-10 gap-4">
                                            <div>
                                                <h3 className="text-[17px] font-bold text-gray-900 mb-2">BrandMagics Software Labs</h3>
                                                <p className="text-[13px] text-gray-500 leading-relaxed font-medium">
                                                    123, Software Park Road<br />
                                                    Kochi, Kerala, IN 682001
                                                </p>
                                            </div>
                                            <div className="text-left md:text-right">
                                                <h2 className="text-2xl font-bold text-gray-900 mb-2 uppercase tracking-tight">SALES INVOICE</h2>
                                                <div className="space-y-1 text-[13px] font-medium text-gray-500">
                                                    <p><span className="text-gray-900">Invoice #:</span> {formData.invoiceNumber}</p>
                                                    <p><span className="text-gray-900">Date:</span> {formData.invoiceDate}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded p-6 mb-10">
                                            <p className="text-[12px] font-bold text-gray-400 mb-3 uppercase tracking-wider">Bill To</p>
                                            <h4 className="text-[14px] font-bold text-gray-900 mb-1">
                                                {customers.find(c => c.id == formData.customer)?.name || "N/A"}
                                            </h4>
                                            <p className="text-[13px] text-gray-500 leading-relaxed font-medium">
                                                {customers.find(c => c.id == formData.customer)?.email || ""}<br />
                                                {customers.find(c => c.id == formData.customer)?.phone || ""}
                                            </p>
                                        </div>

                                        <div className="space-y-4 mb-10">
                                            {formData.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-100 pb-3">
                                                    <div className="flex-1">
                                                        <span className="text-gray-900 font-medium">{idx + 1}. {
                                                            item.source_type === "time" ? (item.metadata?.entry_name || item.description || "Time Entry") :
                                                                item.source_type === "mileage" ? (item.metadata?.line_name || item.description || "Mileage") :
                                                                    item.source_type === "estimation" ? (item.metadata?.line_name || item.description || "Estimation") :
                                                                        (item.source_type === "service" || item.type === "Service") ? (item.description || item.metadata?.service_name || "Service") :
                                                                            ((item.type === "Product" ? productsList : customizedProductsList).find(i => i.id == item.item_id)?.name || item.description || "N/A")
                                                        }</span>
                                                        <p className="text-xs text-gray-400">{item.type} x {item.quantity}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-gray-900 font-semibold">₹ {item.amount.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="border-t pt-4 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Subtotal:</span>
                                                <span className="font-medium text-gray-900">₹ {totals.subtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Tax:</span>
                                                <span className="font-medium text-gray-900">₹ {totals.totalTax.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-base border-t pt-2 mt-2">
                                                <span className="font-bold text-gray-900">Total:</span>
                                                <span className="font-bold text-teal-600">₹ {totals.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-8 pt-6 border-t font-poppins">
                                <button
                                    onClick={handleClose}
                                    disabled={isSaving}
                                    className="px-6 py-2.5 text-[14px] font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleSave()}
                                    disabled={isSaving}
                                    className="px-6 py-2.5 bg-[#FFCA00] text-white text-[14px] font-bold rounded-lg disabled:opacity-50 hover:bg-[#d9ac00]"
                                >
                                    {isSaving && saveType === "save" ? "Saving..." : "Save"}
                                </button>
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
                rawMaterials={[]}
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

            <PaymentPromptModal
                isOpen={isPaymentPromptOpen}
                onClose={() => setIsPaymentPromptOpen(false)}
                onConfirm={handlePaymentPromptConfirm}
                totalAmount={totals.total}
                isPurchase={false}
            />
        </div>
    );
};

export default SalesInvoiceForm;