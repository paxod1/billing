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
import DocumentPreview from "@/components/common/DocumentPreview";
import { partyService } from "@/services/partyService";
import { itemService } from "@/services/itemService";
import { inventoryService } from "@/services/inventoryService";
import { taxService } from "@/services/taxService";
import { salesPaymentService } from "@/services/salesPaymentService";
import { salesInvoiceService } from "@/services/salesInvoiceService";

import CustomSelect from "@/components/common/CustomSelect";
import { showToast } from "@/lib/features/toast/toastSlice";
import { useDispatch } from "react-redux";
import { generateUniqueId } from "@/utils/idGenerator";
import AttachmentUploader from "@/components/common/AttachmentUploader";
import CustomerFormModal from "./CustomerFormModal";
import { calculateTotals, parseItemsFromDb, mapItemsForSave } from "@/utils/salesItemUtils";

const initialFormData = {
    paymentNumber: "",
    paymentName: "",
    status: "DRAFT",
    customer: "",
    invoice_id: "",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: "CASH",
    items: [],
    notes: "",
    attachment: null,
    amountPaid: 0,
    originalInvoiceAmount: 0,
    totalPaid: 0,
    invoiceRemainingDue: 0,
    payingAmount: "",
    emailConfig: {
        to: "",
        cc: "",
        bcc: "",
        message: ""
    }
};

const SalesPaymentForm = ({ isOpen, onClose, onSave, editData = null, mode = "edit" }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();

    const [step, setStep] = useState(1);
    const [customers, setCustomers] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [productsList, setProductsList] = useState([]);
    const [customizedProductsList, setCustomizedProductsList] = useState([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveType, setSaveType] = useState(null);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [initialSnapshot, setInitialSnapshot] = useState(null);
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

    // Controlled input values for mileage address fields: keyed by `${itemId}_start` / `${itemId}_end`
    const [mileageInputMap, setMileageInputMap] = useState({});
    const isHydratedRef = useRef(false);
    const printRef = useRef(null);
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
    const estimationMenuRef = useRef(null);
    const bottomMenuRef = useRef(null);

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

    const handleAddNewItemOfType = (type) => {
        setIsAddItemMenuOpen(false);

        if (type === "Product") {
            handleAddItem();
        } else if (type === "stocks") {
            handleAddItem();
        } else if (type === "Time") {
            handleAddTimeItem();
        } else if (type === "Mileage") {
            handleAddMileageItem();
        } else if (type === "Estimation") {
            handleAddEstimationItem("Materials");
        }
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
            const res = await axios.get(
                `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}`,
                { params: { overview: 'full', geometries: 'geojson', alternatives: 'true', steps: 'true' } }
            );

            if (res.data.code === 'Ok') {
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

    useEffect(() => {
        Object.entries(mileageCoordsMap).forEach(([itemId, coords]) => {
            if (coords.start && coords.end) {
                const item = formData.items.find(it => it.item_id === itemId);
                const tripType = item?.metadata?.trip_type || 'one_way';
                fetchMileageRoutes(itemId, coords.start, coords.end, tripType);
            }
        });
    }, [mileageCoordsMap]);

    useEffect(() => {
        if (!isOpen || (!editData && !formData.invoice_id)) return;
        const mileageItems = (formData.items || []).filter(
            it => it.source_type === 'mileage' && it.metadata?.start_address && it.metadata?.end_address
        );
        if (mileageItems.length === 0) return;

        setMileageInputMap(prev => {
            const updates = { ...prev };
            let hasNew = false;
            mileageItems.forEach(item => {
                const sKey = `${item.item_id}_start`;
                const eKey = `${item.item_id}_end`;
                if (item.metadata.start_address && !updates[sKey]) {
                    updates[sKey] = item.metadata.start_address;
                    hasNew = true;
                }
                if (item.metadata.end_address && !updates[eKey]) {
                    updates[eKey] = item.metadata.end_address;
                    hasNew = true;
                }
            });
            return hasNew ? updates : prev;
        });

        const geocodeAddress = async (addressText) => {
            try {
                const res = await axios.get('https://photon.komoot.io/api/', {
                    params: { q: addressText, limit: 1 }
                });
                if (res.data.features.length > 0) {
                    const f = res.data.features[0];
                    return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
                }
            } catch (e) { }
            return null;
        };

        (async () => {
            for (const item of mileageItems) {
                const itemId = item.item_id;
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
    }, [isOpen, editData, formData.items, mileageCoordsMap]);

    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            isHydratedRef.current = false;
            setMileageCoordsMap({});
            setMileageRoutesMap({});
            setMileageSelectedRouteMap({});
            setMileageInputMap({});
            isInitialHydrationRef.current = new Set();
        }
    }, [isOpen]);

    const generatePaymentNumber = () => generateUniqueId("PAY");

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

    const fetchInvoices = async () => {
        try {
            setIsLoadingInvoices(true);
            const response = await salesInvoiceService.getSalesInvoicesCustom();
            setInvoices(response.data || []);
        } catch (error) {
            console.error("Error fetching invoices:", error);
        } finally {
            setIsLoadingInvoices(false);
        }
    };

    const mapSalesItemToFormItem = (item) => {
        const sourceType = item.source_type || "item";
        let mappedItemId = item.source_id || item.item_id || "";

        let itemType = "Product";
        const backendItemType = item.items?.item_type || "";
        if (sourceType === "time" || sourceType === "mileage" || sourceType === "estimation") {
            itemType = "stocks";
        } else if (backendItemType === "CUSTOMISED PRODUCTS" || customizedProductsList.some(cp => cp.id == mappedItemId)) {
            itemType = "stocks";
        }

        let metadata = item.metadata;
        if (typeof metadata === 'string') {
            try {
                metadata = JSON.parse(metadata);
            } catch (e) {
                metadata = {};
            }
        }
        metadata = { ...(metadata || {}) };

        if (sourceType === "mileage" || (sourceType === "estimation" && (metadata.line_category || "").toLowerCase() === "mileage")) {
            if (metadata.start_location && !metadata.start_address) metadata.start_address = metadata.start_location;
            if (metadata.end_location && !metadata.end_address) metadata.end_address = metadata.end_location;
            if (metadata.distance && !metadata.distance_km) metadata.distance_km = metadata.distance;
        }

        if (!metadata.line_category) {
            metadata.line_category = (metadata.category || metadata.type || item.type || "Estimation").toLowerCase();
        } else {
            metadata.line_category = metadata.line_category.toLowerCase();
        }

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

        if (sourceType === "estimation") {
            const cat = (metadata.line_category || metadata.category || "").toLowerCase();
            const qtyVal = parseFloat(item.quantity) || 1;
            const amtVal = parseFloat(item.amount) || 0;
            const finalRateVal = parseFloat(item.rate) || parseFloat(metadata.rate) || parseFloat(metadata.cost) || (qtyVal !== 0 ? (amtVal / qtyVal) : 0);

            item.rate = finalRateVal;

            if (cat === "manpower") {
                metadata.hours = qtyVal;
                metadata.role = metadata.role || metadata.line_name || metadata.line_description || item.description || "";
                metadata.description = metadata.role;
            } else if (cat === "materials") {
                metadata.qty = qtyVal;
                metadata.name = metadata.name || metadata.line_name || metadata.line_description || item.description || "";
                metadata.description = metadata.name;

                const currentType = (metadata.type || metadata.materialType || "product").toLowerCase();
                const isCustomObj = currentType === "stocks";

                metadata.type = isCustomObj ? "stocks" : "product";
                itemType = isCustomObj ? "stocks" : "Product";

                const targetList = isCustomObj ? customizedProductsList : productsList;
                const match = targetList.find(p => p.name?.toLowerCase() === metadata.name?.toLowerCase() || p.id == mappedItemId);
                if (match) mappedItemId = match.id;
            } else if (cat === "machinery") {
                metadata.qty = qtyVal;
                metadata.description = metadata.line_name || metadata.line_description || item.description || "";
            } else if (cat === "minutes") {
                metadata.minutes = qtyVal;
                metadata.description = metadata.line_name || metadata.line_description || item.description || "";
            } else if (cat === "mileage") {
                metadata.distance = qtyVal;
                metadata.description = metadata.line_name || metadata.line_description || item.description || "";
            } else if (cat === "measurement") {
                metadata.qty = qtyVal;
                metadata.unit = metadata.line_unit || "";
                metadata.description = metadata.line_name || metadata.line_description || item.description || "";
            } else if (["middlemen", "money", "method", "management", "morale", "marketing", "milieu", "maintenance", "mission", "mitigation"].includes(cat)) {
                metadata.qty = qtyVal;
                metadata.description = metadata.line_name || metadata.line_description || item.description || "";
            } else {
                metadata.description = metadata.line_name || metadata.line_description || item.description || "";
                if (!["manpower", "materials", "machinery", "minutes", "mileage", "measurement"].includes(cat)) {
                    metadata.qty = 1;
                }
            }

            if (!metadata.description) {
                metadata.description = metadata.line_name || metadata.line_description || item.description || "";
            }
        }

        const qty = parseFloat(item.quantity) || 1;
        const rate = parseFloat(item.rate) || 0;
        const itemAmount = qty * rate;

        return {
            id: item.id,
            item_id: mappedItemId,
            type: itemType,
            source_type: sourceType,
            tax_id: item.tax_id ? (item.tax_id.id || item.tax_id) : "",
            tax_percent: parseFloat(item.tax_percent) || parseFloat(metadata.tax) || parseFloat(metadata.tax_percent) || 0,
            quantity: qty,
            rate: rate,
            amount: Number(itemAmount.toFixed(2)),
            tax_details: item.tax_details || {},
            metadata: metadata,
            description: item.description || item.items?.description || "",
            name: item.name || item.items?.name || "",
            items: item.items || null
        };
    };

    const mapFormItemsToPreviewItems = (formItems) => {
        return (formItems || []).map(item => {
            let resolvedName = "N/A";
            let typeLabel = "Product";

            const sourceType = (item.source_type || "item").toLowerCase();

            if (sourceType === "time") {
                const metadata = item.metadata || {};
                resolvedName = metadata.entry_name || item.description || item.name || "Time Entry";
                typeLabel = "Time Entry";
            } else if (sourceType === "mileage") {
                const metadata = item.metadata || {};
                resolvedName = metadata.mileage_name || metadata.line_name || item.description || item.name || "Mileage";
                typeLabel = "Mileage";
            } else if (sourceType === "estimation") {
                const metadata = item.metadata || {};
                resolvedName = metadata.estimation_name || metadata.line_name || item.description || item.name || "Estimation";
                typeLabel = "Estimation";
            } else if (sourceType === "service" || item.type === "Service") {
                const metadata = item.metadata || {};
                resolvedName = item.description || metadata.service_name || item.name || "Service";
                typeLabel = "Service";
            } else {
                const isCustom = item.type === "stocks" || sourceType === "customized_product";
                const list = isCustom ? customizedProductsList : productsList;
                resolvedName = list.find(i => String(i.id) === String(item.item_id))?.name || item.description || item.name || "N/A";
                typeLabel = item.type || (isCustom ? "stocks" : "Product");
            }

            const metadata = item.metadata || {};
            const duration_minutes = Number(metadata.duration_minutes || item.duration_minutes || 0);
            const distance_km = Number(metadata.distance_km || item.distance_km || 0);

            return {
                ...item,
                name: resolvedName,
                item_type: typeLabel,
                duration_minutes,
                distance_km
            };
        });
    };

    const handleInvoiceSelect = (invoiceId) => {
        if (!invoiceId) {
            setFormData(prev => ({
                ...prev,
                invoice_id: "",
                customer: "",
                paymentName: "",
                notes: "",
                originalInvoiceAmount: 0,
                totalPaid: 0,
                invoiceRemainingDue: 0,
                payingAmount: "",
                items: []
            }));
            return;
        }

        const selectedInvoice = invoices.find(inv => inv.id == invoiceId);
        if (selectedInvoice) {
            const mappedItems = parseItemsFromDb(selectedInvoice.sales_item, customizedProductsList);

            setFormData(prev => ({
                ...prev,
                invoice_id: invoiceId,
                customer: (selectedInvoice.customer_id?.id || selectedInvoice.customer_id) || "",
                paymentName: `Payment for ${selectedInvoice.invoice_number}`,
                notes: selectedInvoice.notes || prev.notes,
                paymentDate: new Date().toISOString().split('T')[0],
                originalInvoiceAmount: parseFloat(selectedInvoice.total_amount) || 0,
                totalPaid: parseFloat(selectedInvoice.total_paid) || 0,
                invoiceRemainingDue: parseFloat(selectedInvoice.remaining_due) || 0,
                payingAmount: "",
                items: mappedItems
            }));

            dispatch(showToast({ message: `Invoice data pre-filled: ${selectedInvoice.invoice_number}`, type: "success" }));
        }
    };

    const fetchItems = async () => {
        try {
            setIsLoadingItems(true);
            const [productsRes, customizedRes] = await Promise.all([
                inventoryService.getProducts(),
                inventoryService.getCustomizedProducts()
            ]);
            setProductsList(productsRes.data || []);
            setCustomizedProductsList(customizedRes.data || []);
        } catch (error) {
            console.error("Error fetching items:", error);
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

    useEffect(() => {
        if (isOpen) {
            fetchCustomers();
            fetchItems();
            fetchInvoices();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        if (mode === "payment") {
            setStep(3);
        } else if (mode === "view") {
            setStep(2);
        } else {
            if (!isHydratedRef.current) setStep(1);
        }

        const isDataLoading = isLoadingCustomers || isLoadingItems || isLoadingInvoices;

        if (editData && isDataLoading) return;

        if (!isHydratedRef.current) {
            const hydrateData = async () => {
                if (editData) {
                    const invoiceObj = editData.invoice_id && typeof editData.invoice_id === 'object'
                        ? editData.invoice_id
                        : null;
                    const invoiceIdVal = invoiceObj ? invoiceObj.id : (editData.invoice_id || "");

                    const customerId = Array.isArray(editData.customer_id)
                        ? editData.customer_id[0]?.id
                        : (editData.customer_id?.id || editData.customer_id);

                    const currentPayingAmt = parseFloat(editData.amount) || 0;
                    const dueAmtAfter = parseFloat(editData.due_amount) || 0;

                    let originalInvoiceAmount = invoiceObj
                        ? parseFloat(invoiceObj.total_amount) || 0
                        : 0;

                    let matchedInvoice = invoices.find(inv => String(inv.id) === String(invoiceIdVal));
                    if (invoiceIdVal) {
                        try {
                            const invResponse = await salesInvoiceService.getInvoiceByIdDeep(invoiceIdVal);
                            if (invResponse?.success && invResponse.data) {
                                matchedInvoice = invResponse.data;
                                originalInvoiceAmount = parseFloat(invResponse.data.total_amount) || 0;
                            }
                        } catch (error) {
                            console.error("Error fetching linked invoice:", error);
                        }
                    }

                    const invoiceSalesItems = (matchedInvoice && Array.isArray(matchedInvoice.sales_item))
                        ? matchedInvoice.sales_item
                        : [];

                    const mergedItemsList = (editData.sales_item && Array.isArray(editData.sales_item)
                        ? editData.sales_item
                        : (editData.sales_item ? [editData.sales_item] : [])
                    ).map((item, idx) => {
                        let matchingInvoiceItem = invoiceSalesItems[idx];
                        if (!matchingInvoiceItem && invoiceSalesItems.length > 0) {
                            matchingInvoiceItem = invoiceSalesItems.find(invItem =>
                                String(invItem.source_id || invItem.item_id || "") === String(item.source_id || item.item_id || "")
                            );
                        }

                        return {
                            ...item,
                            source_type: (item.source_type && item.source_type !== "item")
                                ? item.source_type
                                : (matchingInvoiceItem?.source_type || item.source_type || "item"),
                            metadata: item.metadata || matchingInvoiceItem?.metadata || null,
                            description: item.description || matchingInvoiceItem?.description || null,
                            items: item.items || matchingInvoiceItem?.items || null
                        };
                    });

                    const mappedItems = parseItemsFromDb(mergedItemsList, customizedProductsList);

                    const invoiceRemainingDue = dueAmtAfter + currentPayingAmt;
                    const totalPaid = originalInvoiceAmount - dueAmtAfter - currentPayingAmt;

                    const dataToSet = {
                        paymentNumber: editData.payment_number || "",
                        paymentName: editData.payment_name || "",
                        status: editData.status || "DRAFT",
                        customer: customerId || "",
                        invoice_id: invoiceIdVal || "",
                        paymentDate: editData.payment_date ? new Date(editData.payment_date).toISOString().split('T')[0] : "",
                        paymentMode: editData.payment_mode ? editData.payment_mode.toUpperCase() : "CASH",
                        items: mappedItems,
                        notes: editData.notes || "",
                        attachment: editData.attachmentkey || editData.attachment || null,
                        amountPaid: currentPayingAmt,
                        originalInvoiceAmount,
                        totalPaid: Math.max(0, totalPaid),
                        invoiceRemainingDue,
                        payingAmount: editData.amount ? String(currentPayingAmt) : "",
                        emailConfig: {
                            ...initialFormData.emailConfig,
                            to: customers.find(c => String(c.id) === String(customerId))?.email || ""
                        }
                    };
                    setFormData(dataToSet);
                    setInitialSnapshot(JSON.stringify(dataToSet));
                    isHydratedRef.current = true;
                } else {
                    const dataToSet = {
                        ...initialFormData,
                        paymentNumber: generatePaymentNumber(),
                        paymentDate: new Date().toISOString().split('T')[0],
                        items: []
                    };
                    setFormData(dataToSet);
                    setInitialSnapshot(JSON.stringify(dataToSet));
                    isHydratedRef.current = true;
                }
            };
            hydrateData();
        }

        if (searchParams.get("action") === "resume") {
            const savedData = localStorage.getItem("pending_sales_payment_data");
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                const newCustomerId = searchParams.get("newCustomerId");
                if (newCustomerId) {
                    parsedData.customer = newCustomerId;
                }
                setFormData(parsedData);
                localStorage.removeItem("pending_sales_payment_data");
                const params = new URLSearchParams(searchParams.toString());
                params.delete("action");
                params.delete("newCustomerId");
                router.replace(`/sales/payment?${params.toString()}`);
            }
        }
    }, [isOpen, editData, mode, customers, productsList, customizedProductsList, isLoadingCustomers, isLoadingItems, searchParams, router]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { item_id: "", type: "Product", source_type: "item", tax_id: "", tax_percent: 0, quantity: 1, rate: 0, amount: 0, tax_details: {} }]
        }));
    };

    const handleAddCustomerClick = () => {
        setIsCustomerModalOpen(true);
    };

    const handleCustomerSave = async (response) => {
        setTimeout(async () => {
            try {
                const data = await partyService.queryParties("CUSTOMER");
                setCustomers(data);

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

    const handleItemChange = async (index, field, value) => {
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
            } else {
                newItems[index].source_type = "item";
                newItems[index].metadata = {};
            }
        }

        if (field === "item_id") {
            const listToSearch = newItems[index].type === "Product" ? productsList : customizedProductsList;
            const selectedItem = listToSearch.find(i => i.id == value);
            if (selectedItem) {
                newItems[index].rate = parseFloat(selectedItem.rate || 0);
                newItems[index].production_cost = parseFloat(selectedItem.Production_cost || selectedItem.cost_price || 0);
                newItems[index].description = selectedItem.name || selectedItem.description || "N/A";
                if (!newItems[index].quantity || parseFloat(newItems[index].quantity) <= 0) {
                    newItems[index].quantity = 1;
                }

                if (selectedItem.tax) {
                    try {
                        const taxResponse = await taxService.getTaxCodeById(selectedItem.tax);
                        const taxData = taxResponse.data;
                        const taxRates = taxData?.tax_rates || {};
                        const totalTaxPercent = Object.values(taxRates).reduce((sum, r) => sum + (parseFloat(r) || 0), 0);

                        newItems[index].tax_percent = totalTaxPercent;
                        newItems[index].tax_details = taxRates;
                        newItems[index].tax_id = selectedItem.tax;
                    } catch (error) {
                        console.error("Error fetching tax template:", error);
                        const qty = newItems[index].quantity || 1;
                        const rate = newItems[index].rate || 0;
                        newItems[index].amount = Number((qty * rate).toFixed(2));
                    }
                } else {
                    newItems[index].tax_percent = 0;
                    newItems[index].tax_details = {};
                    newItems[index].tax_id = "";
                }

                const qty = newItems[index].quantity || 1;
                const rate = newItems[index].rate || 0;
                newItems[index].amount = Number((qty * rate).toFixed(2));
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

    // New card-based item render function similar to Sales Invoice
    const renderItemCard = (item, idx) => {
        const type = item.type || item.source_type;
        const isReadOnly = !!formData.invoice_id; // When linked to invoice, items are read-only
        const commonLabelClass = "text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1";
        const commonInputClass = `w-full px-3 py-1.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFCA00] focus:bg-white transition-all h-[38px] ${isReadOnly ? 'bg-gray-50/50 cursor-not-allowed' : ''}`;

        // Product / stocks
        if (type === "Product" || type === "product" || type === "stocks" || type === "customized") {
            const productList = (type === "Product" || type === "product") ? productsList : customizedProductsList;
            const selectedProduct = productList.find(i => i.id == item.item_id);

            return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-5">
                        <label className={commonLabelClass}>Item Name</label>
                        {isReadOnly ? (
                            <div className={`${commonInputClass} flex items-center`}>
                                {selectedProduct?.name || item.name || "N/A"}
                            </div>
                        ) : (
                            <CustomSelect
                                value={item.item_id}
                                onChange={(val) => handleItemChange(idx, "item_id", val)}
                                options={productList
                                    .filter(i => !formData.items.some((it, fIdx) => fIdx !== idx && it.type === item.type && it.item_id == i.id))
                                    .map(i => ({ value: i.id, label: i.name }))}
                                placeholder="Select Item"
                                className="rounded-xl h-[38px] shadow-none"
                            />
                        )}
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
                            readOnly={isReadOnly}
                            className={commonInputClass}
                            placeholder="0"
                        />
                    </div>
                    <div className="md:col-span-3 grid grid-cols-2 gap-4">
                        <div>
                            <label className={commonLabelClass}>Rate</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₹</span>
                                <input
                                    type="number"
                                    value={item.rate}
                                    onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                                    readOnly={isReadOnly}
                                    className={`${commonInputClass} pl-7`}
                                    placeholder="0.00"
                                />
                            </div>
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

        // Time Entry
        if (type === "Time" || type === "time") {
            return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-6">
                        <label className={commonLabelClass}>Time Entry Name</label>
                        <div className={`${commonInputClass} flex items-center`}>
                            {item.metadata?.entry_name || item.name || "Time Entry"}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className={commonLabelClass}>Hours</label>
                        <input
                            type="number"
                            readOnly
                            disabled
                            value={item.metadata?.hours !== undefined ? item.metadata.hours : ""}
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
                                readOnly={isReadOnly}
                                className={`${commonInputClass} pl-7`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className={commonLabelClass}>Amount</label>
                        <div className="h-[38px] flex items-center justify-end px-3 bg-gray-50 border border-gray-100 rounded-xl text-[13px] font-bold text-gray-900">
                            ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            );
        }

        // Mileage Entry
        if (type === "Mileage" || type === "mileage") {
            return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-5">
                        <label className={commonLabelClass}>Mileage Name</label>
                        <div className={`${commonInputClass} flex items-center`}>
                            {item.metadata?.mileage_name || item.name || "Mileage Entry"}
                        </div>
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
                    <div className="md:col-span-2">
                        <label className={commonLabelClass}>Rate per KM</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₹</span>
                            <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                                readOnly={isReadOnly}
                                className={`${commonInputClass} pl-7`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-3">
                        <label className={commonLabelClass}>Amount</label>
                        <div className="h-[38px] flex items-center justify-end px-3 bg-gray-50 border border-gray-100 rounded-xl text-[13px] font-bold text-gray-900">
                            ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            );
        }

        // Estimation
        if (type === "Estimation" || type === "estimation") {
            return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-6">
                        <label className={commonLabelClass}>Estimation Name</label>
                        <div className={`${commonInputClass} flex items-center`}>
                            {item.metadata?.estimation_name || item.name || "Estimation"}
                        </div>
                    </div>
                    <div className="md:col-span-3">
                        <label className={commonLabelClass}>Tax</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₹</span>
                            <input
                                type="text"
                                readOnly
                                disabled
                                value={(() => {
                                    const taxAmount = item.amount * (item.tax_percent / 100);
                                    return taxAmount.toFixed(2);
                                })()}
                                className={`${commonInputClass} pl-7 bg-gray-50/50 cursor-not-allowed`}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-3">
                        <label className={commonLabelClass}>Amount</label>
                        <div className="h-[38px] flex items-center justify-end px-3 bg-gray-50 border border-gray-100 rounded-xl text-[13px] font-bold text-gray-900">
                            ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            );
        }

        // Service (fallback)
        return (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-8">
                    <label className={commonLabelClass}>Description</label>
                    <input
                        type="text"
                        value={item.description || item.metadata?.service_name || item.name || ""}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        readOnly={isReadOnly}
                        className={commonInputClass}
                        placeholder="Service description"
                    />
                </div>
                <div className="md:col-span-4">
                    <label className={commonLabelClass}>Amount</label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₹</span>
                        <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                            readOnly={isReadOnly}
                            className={`${commonInputClass} pl-7`}
                            placeholder="0.00"
                        />
                    </div>
                </div>
            </div>
        );
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
                        Click below to quickly select and add the type of item you want to include in this payment.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 w-full max-w-4xl">
                        {[
                            { id: "Product", label: "Product", icon: FiBox, color: "hover:border-[#FFCA00] hover:text-[#FFCA00] hover:bg-amber-50/10" },
                            { id: "stocks", label: "Customized", icon: FiSettings, color: "hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50/10" },
                            { id: "Time", label: "Time Entry", icon: FiClock, color: "hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/10" },
                            { id: "Mileage", label: "Mileage Entry", icon: FiNavigation, color: "hover:border-rose-500 hover:text-rose-600 hover:bg-rose-50/10" },
                            { id: "Estimation", label: "Estimate", icon: FiFileText, color: "hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50/10" }
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleAddNewItemOfType(opt.id)}
                                disabled={!!formData.invoice_id}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold transition-all text-xs gap-2 shadow-sm ${opt.color} ${formData.invoice_id ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                            {!formData.invoice_id && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveItem(idx)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <FiTrash2 size={16} />
                                </button>
                            )}
                        </div>
                        {renderItemCard(item, idx)}
                    </div>
                ))}
            </div>
        );
    };

    const handleSendEmail = async () => {
        if (!editData?.id) {
            dispatch(showToast({ message: "Payment must be saved before sending.", type: "error" }));
            return;
        }

        try {
            setIsSaving(true);
            setSaveType("send");
            const emailData = {
                documentType: "SALES_PAYMENT",
                documentId: editData.id,
                email: {
                    to: formData.emailConfig.to || "",
                    cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                    bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                    message: formData.emailConfig.message || ""
                }
            };

            const response = await salesPaymentService.sendPaymentEmail(emailData);
            if (response?.success === false) {
                throw new Error(response.message || "Failed to send email");
            }

            dispatch(showToast({ message: "Payment receipt sent successfully!", type: "success" }));
            if (onSave) onSave(editData.id, "EMAIL_SENT");
            handleClose();
        } catch (error) {
            console.error("Error sending email:", error);
            dispatch(showToast({ message: error.message || "Error sending email.", type: "error" }));
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

            setIsSaving(true);
            setSaveType(isSendToClient ? "send" : "save");

            // Attachment is already a CDN URL (uploaded by AttachmentUploader on file-select)
            const attachmentUrl = formData.attachment || null;

            const itemsToSave = mapItemsForSave(formData.items);

            if (itemsToSave.length === 0) {
                dispatch(showToast({ message: "Please select at least one valid item.", type: "error" }));
                setIsSaving(false);
                setSaveType(null);
                return;
            }

            const calculatedTotalAmount = itemsToSave.reduce((sum, item) => sum + item.amount, 0);

            const payingAmt = parseFloat(formData.payingAmount);
            if (formData.invoice_id && formData.payingAmount !== "" && !isNaN(payingAmt)) {
                if (payingAmt <= 0) {
                    dispatch(showToast({ message: "Paying amount must be greater than 0", type: "warning" }));
                    setIsSaving(false);
                    return;
                }
                if (Number(payingAmt.toFixed(2)) > Number(formData.invoiceRemainingDue.toFixed(2))) {
                    dispatch(showToast({ message: `Paying amount cannot exceed balance due (₹${formData.invoiceRemainingDue.toLocaleString()})`, type: "warning" }));
                    setIsSaving(false);
                    return;
                }
            }

            const finalAmount = (formData.invoice_id && formData.payingAmount !== "" && !isNaN(payingAmt))
                ? payingAmt.toFixed(2).toString()
                : calculatedTotalAmount.toFixed(2).toString();

            const payload = {
                payment_number: formData.paymentNumber,
                payment_name: formData.paymentName,
                customer_id: parseInt(formData.customer),
                invoice_id: formData.invoice_id ? parseInt(formData.invoice_id) : null,
                payment_date: formData.paymentDate,
                payment_mode: formData.paymentMode,
                amount: finalAmount,
                due_amount: formData.invoice_id ? (formData.invoiceRemainingDue - (parseFloat(formData.payingAmount) || 0)).toFixed(2).toString() : undefined,
                notes: formData.notes || "",
                attachmentkey: attachmentUrl || null,
                status: formData.status,
                items: itemsToSave
            };

            if (forcedStatus) {
                payload.status = forcedStatus;
            } else if (step === 3) {
                payload.status = "PAID";
            } else if (!editData) {
                payload.status = "DRAFT";
            }

            let response;
            if (editData?.id) {
                if (forcedStatus) {
                    payload.status = forcedStatus;
                }
                response = await salesPaymentService.updatePayment(editData.id, payload);
            } else {
                response = await salesPaymentService.createPayment(payload);
            }

            if (response?.success === false || response?.data?.success === false) {
                const errorMsg = response?.data?.error?.[0]?.message || response?.message || "Validation error";
                throw new Error(errorMsg);
            }

            dispatch(showToast({ message: `Sales Payment ${editData ? "updated" : "created"} successfully!`, type: "success" }));

            const newId = response?.data?.data?.id || response?.data?.id || response?.data?.[0]?.id || response?.id || editData?.id;

            if (isSendToClient && newId) {
                try {
                    const emailData = {
                        documentType: "SALES_PAYMENT",
                        documentId: newId,
                        email: {
                            to: formData.emailConfig.to || "",
                            cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                            bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                            message: formData.emailConfig.message || ""
                        }
                    };
                    await salesPaymentService.sendPaymentEmail(emailData);
                    dispatch(showToast({ message: "Payment receipt sent successfully!", type: "success" }));
                    if (onSave) onSave(newId, "EMAIL_SENT");
                } catch (emailError) {
                    console.error("Error sending email:", emailError);
                    dispatch(showToast({ message: emailError?.message || "Payment created, but failed to send email to client", type: "error" }));
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
            dispatch(showToast({ message: error.message || "Error saving sales payment.", type: "error" }));
        } finally {
            setIsSaving(false);
            setSaveType(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={handleClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95dvh] overflow-y-auto">
                <div className="p-4 md:p-8">
                    {step === 1 ? (
                        <div>
                            <div className="flex flex-wrap justify-between items-start mb-6 gap-2">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight font-poppins">
                                        {formData.items.some(i => i.source_type === "estimation") ? "Configure Estimate Payment" : "Configure Sales Payment"}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1 font-medium">
                                        {formData.items.some(i => i.source_type === "estimation") ? "Setup estimation payment details and items" : "Setup payment details and items"}
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

                                    {!editData && (
                                        <div className="mb-6">
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block uppercase tracking-widest">Select Sales Invoice to start</label>
                                            <CustomSelect
                                                options={invoices.map(inv => ({
                                                    value: inv.id,
                                                    label: `${inv.invoice_number} - ${inv.invoice_name || inv.customer_id?.name || 'Unknown'} (₹${inv.total_amount?.toLocaleString()})`
                                                }))}
                                                value={formData.invoice_id}
                                                onChange={handleInvoiceSelect}
                                                placeholder="-- Choose a Sales Invoice to start --"
                                                isSearchable={true}
                                                isDisabled={!!editData?.invoice_id}
                                            />
                                        </div>
                                    )}

                                    {(formData.invoice_id || editData) && (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                                <div>
                                                    <label className="text-[13px] font-bold text-gray-900 mb-2 block">Payment Number Series</label>
                                                    <input
                                                        type="text"
                                                        value={formData.paymentNumber}
                                                        readOnly
                                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm bg-white text-gray-400"
                                                        placeholder="PAY"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[13px] font-bold text-gray-900 mb-2 block">Payment Name</label>
                                                    <input
                                                        type="text"
                                                        value={formData.paymentName}
                                                        onChange={(e) => handleInputChange("paymentName", e.target.value)}
                                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm placeholder:text-gray-300"
                                                        placeholder="Enter Payment Name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[13px] font-bold text-gray-900 mb-2 block">Payment Date</label>
                                                    <div className="relative">
                                                        <input
                                                            type="date"
                                                            value={formData.paymentDate}
                                                            onChange={(e) => handleInputChange("paymentDate", e.target.value)}
                                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm transition-all focus:border-[#FFCA00] outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                                                                className={`border border-gray-200 h-[48px] ${formData.invoice_id
                                                                        ? "rounded-lg"
                                                                        : "rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none sm:rounded-r-none sm:border-r-0"
                                                                    }`}
                                                                isDisabled={!!formData.invoice_id}
                                                            />
                                                        </div>
                                                        {!formData.invoice_id && (
                                                            <button
                                                                onClick={handleAddCustomerClick}
                                                                className="px-6 py-2 text-white text-[14px] font-bold rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none whitespace-nowrap flex items-center justify-center gap-2 h-[48px] bg-[#FFCA00] hover:bg-[#d9ac00]"
                                                            >
                                                                Add New Customer <FiUser size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[13px] font-bold text-gray-900 mb-2 block">Payment Mode</label>
                                                    <CustomSelect
                                                        value={formData.paymentMode}
                                                        onChange={(val) => handleInputChange("paymentMode", val)}
                                                        options={[
                                                            { value: "BANK_TRANSFER", label: "Bank Transfer" },
                                                            { value: "UPI", label: "UPI" },
                                                            { value: "NEFT", label: "NEFT" },
                                                            { value: "CHEQUE", label: "Cheque" },
                                                            { value: "CASH", label: "Cash" }
                                                        ]}
                                                        className="rounded-lg h-[48px] border border-gray-200"
                                                    />
                                                </div>
                                            </div>

                                            {/* Payment Amount Details Section */}
                                            <div className="mb-8 font-poppins">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-6 uppercase tracking-wider">Payment Amount Details</h3>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">Net Amount (Total)</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={(formData.originalInvoiceAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                                                        handleInputChange("payingAmount", val);
                                                                    }
                                                                }}
                                                                className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-1 focus:ring-[#FFCA00] outline-none transition-all shadow-sm"
                                                                placeholder="0.00"
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
                                                                value={Math.max(0, (formData.invoiceRemainingDue - (parseFloat(formData.payingAmount) || 0))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-900 font-medium outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {(formData.invoice_id || editData) && (
                                    <>
                                        {/* Items Section */}
                                        <div className="mb-8">
                                            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-50">
                                                <h3 className="text-[14px] font-bold text-gray-900 font-poppins uppercase tracking-wide">
                                                    Items
                                                </h3>
                                                {/* Add Item button - only show when not linked to invoice */}
                                                {!formData.invoice_id && (
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
                                                                    { id: "Time", label: "Time Entry", icon: FiClock },
                                                                    { id: "Mileage", label: "Mileage Entry", icon: FiNavigation },
                                                                    { id: "Estimation", label: "Estimation", icon: FiFileText }
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
                                                    ₹ {totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                                        <div className="mb-8 mt-10 md:mt-0">
                                            <h3 className="text-sm font-bold text-gray-900 mb-4">References</h3>
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="text-[13px] font-bold text-gray-900 mb-2 block">Notes</label>
                                                    <textarea
                                                        value={formData.notes}
                                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm h-28 placeholder:text-gray-300 focus:ring-0 focus:border-gray-200"
                                                        placeholder="Add payment terms or notes"
                                                    ></textarea>
                                                </div>
                                                <div>
                                                    <label className="text-[13px] font-bold text-gray-900 mb-2 block">Attachment</label>
                                                    <AttachmentUploader
                                                        context="sales-payment"
                                                        existingUrl={formData.attachment}
                                                        onUploaded={(url) => handleInputChange("attachment", url)}
                                                        disabled={false}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 mt-8 pt-6 border-t font-poppins">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-4 sm:px-6 py-2 sm:py-2.5 text-[14px] font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                {(formData.invoice_id || editData) && (
                                    <>
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
                                    </>
                                )}
                            </div>
                        </div>
                    ) : step === 2 ? (
                        <div>
                            <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4 no-print">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                                        {mode === "view" ? "View Sales Payment Receipt" : "Preview & Send Receipt"}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {isExporting ? "Processing..." : mode === "view" ? "View details of your payment receipt" : "Review and send your payment receipt"}
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

                            <div className="bg-gray-50 -mx-4 md:-mx-8 px-4 md:px-8 py-8 mb-6 rounded-xl overflow-y-auto md:overflow-y-visible overflow-x-hidden max-h-[80vh] md:max-h-none">
                                <div className="bg-white rounded-lg shadow-sm overflow-x-auto md:overflow-x-visible max-w-full md:max-w-4xl mx-auto">
                                    <div className="min-w-[800px] md:min-w-full">
                                        <DocumentPreview
                                            ref={docPreviewRef}
                                            type="SALES_PAYMENT"
                                            filename={`Receipt-${formData.paymentNumber}`}
                                            payload={{
                                                company: {
                                                    name: "BrandMagics Software Labs",
                                                    address: "123, Software Park Road",
                                                    city: "Kochi, Kerala, IN 682001",
                                                },
                                                party: (() => {
                                                    const c = (customers || []).find(c => String(c.id) === String(formData.customer));
                                                    return { name: c?.name || "N/A", address: c?.address, email: c?.email, phone: c?.phone };
                                                })(),
                                                document: {
                                                    number: formData.paymentNumber,
                                                    date: formData.paymentDate,
                                                    reference: formData.paymentName,
                                                    status: formData.invoice_id ? ((formData.invoiceRemainingDue - (parseFloat(formData.payingAmount) || 0)) <= 0.01 ? "FULLY_PAID" : "PARTIALLY_PAID") : "PAID",
                                                    paymentBreakdown: formData.invoice_id ? {
                                                        originalTotal: formData.originalInvoiceAmount || totals.total,
                                                        alreadyPaid: formData.totalPaid || 0,
                                                        payingNow: parseFloat(formData.payingAmount || formData.amountPaid) || 0,
                                                        balanceDue: Math.max(0, formData.invoiceRemainingDue - (parseFloat(formData.payingAmount || formData.amountPaid) || 0)),
                                                        isReturn: false
                                                    } : undefined
                                                },
                                                items: mapFormItemsToPreviewItems(formData.items),
                                                totals: [
                                                    { label: "Subtotal", value: totals.subtotal },
                                                    { label: "Tax", value: totals.totalTax },
                                                    { label: "Total Received (INR)", value: totals.total, isGrand: true },
                                                ],
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {mode !== "view" && editData?.status?.toUpperCase() !== "PAID" && (
                                <div className="mt-10 w-full max-w-6xl mx-auto no-print px-4 md:px-0">
                                    <div className="flex flex-col lg:flex-row gap-0 bg-[#F9FAFB] border border-gray-200 rounded-xl overflow-hidden shadow-sm min-h-[400px]">
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
                                                            context="sales-payment"
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

                                <div className="bg-gray-50 -mx-8 px-4 md:px-8 py-10 mb-6 border-y border-gray-200">
                                    <div className="bg-white rounded-lg shadow-sm overflow-hidden max-w-3xl mx-auto border border-gray-100">
                                        <DocumentPreview
                                            type="SALES_PAYMENT"
                                            payload={{
                                                company: {
                                                    name: "BrandMagics Software Labs",
                                                    address: "123, Software Park Road",
                                                    city: "Kochi, Kerala, IN 682001",
                                                },
                                                party: (() => {
                                                    const c = (customers || []).find(c => String(c.id) === String(formData.customer));
                                                    return { name: c?.name || "N/A", address: c?.address, email: c?.email, phone: c?.phone };
                                                })(),
                                                document: {
                                                    number: formData.paymentNumber,
                                                    date: formData.paymentDate,
                                                    reference: formData.paymentName,
                                                    status: formData.invoice_id ? ((formData.invoiceRemainingDue - (parseFloat(formData.amountPaid) || 0)) <= 0.01 ? "FULLY_PAID" : "PARTIALLY_PAID") : "PAID",
                                                    paymentBreakdown: formData.invoice_id ? {
                                                        originalTotal: formData.originalInvoiceAmount || totals.total,
                                                        alreadyPaid: formData.totalPaid || 0,
                                                        payingNow: parseFloat(formData.amountPaid || formData.payingAmount) || 0,
                                                        balanceDue: Math.max(0, formData.invoiceRemainingDue - (parseFloat(formData.amountPaid || formData.payingAmount) || 0)),
                                                        isReturn: false
                                                    } : undefined
                                                },
                                                items: mapFormItemsToPreviewItems(formData.items),
                                                totals: [
                                                    { label: "Subtotal", value: totals.subtotal },
                                                    { label: "Tax", value: totals.totalTax },
                                                    { label: "Total Received (INR)", value: totals.total, isGrand: true },
                                                ],
                                            }}
                                        />
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
        </div>
    );
};

export default SalesPaymentForm;