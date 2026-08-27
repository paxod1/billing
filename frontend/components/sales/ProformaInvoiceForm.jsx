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
    FiX, FiUser, FiPlus, FiTrash2, FiUpload, FiPrinter,
    FiDownload, FiMail, FiPaperclip,
    FiCreditCard, FiArrowLeft, FiSend, FiLoader, FiEye, FiExternalLink,
    FiMapPin, FiArrowRight, FiRefreshCw, FiChevronDown,
    FiUsers, FiBox, FiSettings, FiDollarSign, FiGitMerge, FiBriefcase,
    FiClock, FiActivity, FiSmile, FiVolume2, FiGlobe, FiTool,
    FiTarget, FiShield, FiFileText, FiNavigation, FiCalendar
} from "react-icons/fi";
import { useRouter, useSearchParams } from "next/navigation";
import { partyService } from "@/services/partyService";
import { itemService } from "@/services/itemService";
import { inventoryService } from "@/services/inventoryService";
import { processRestock } from "@/utils/restockHelper";
import { taxService } from "@/services/taxService";
import { proformaInvoiceService } from "@/services/proformaInvoiceService";
import { salesQuoteService } from "@/services/salesQuoteService";
import { salesTimeService } from "@/services/salesTimeService";
import { salesMileageService } from "@/services/salesMileageService";
import { estimationService } from "@/services/estimationService";
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
    proformaNumber: "",
    proformaName: "",
    status: "DRAFT",
    customer: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    items: [],
    notes: "",
    attachment: null,
    is_auto_created: false,
    emailConfig: {
        to: "",
        cc: "",
        bcc: "",
        message: ""
    }
};

const TEST_ATTACHMENT_URL = "https://billing-s3bucket.s3.ap-south-1.amazonaws.com/proforma_invoices/101/Billing.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIA3C6FL5S2BZKGRA4Q%2F20260306%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20260306T052933Z&X-Amz-Expires=3600&X-Amz-Signature=37949f7c6d58103fa4673847ca126bdd98bf0d0430fb23f89794f57bf5f47357&X-Amz-SignedHeaders=host&response-content-disposition=inline&x-id=GetObject";


// Generate unique proforma number
const generateProformaNumber = () => generateUniqueId("PFN");

const ProformaInvoiceForm = ({ isOpen, onClose, onSave, editData, isViewOnly }) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const dispatch = useDispatch();
    const [step, setStep] = useState(1);
    const [customers, setCustomers] = useState([]);
    const [productsList, setProductsList] = useState([]);
    const [customizedProductsList, setCustomizedProductsList] = useState([]);
    const [lockedCountry, setLockedCountry] = useState(null);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveType, setSaveType] = useState(null); // 'save' | 'send'
    const [isExporting, setIsExporting] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [initialSnapshot, setInitialSnapshot] = useState(null);
    const [activeEmailTab, setActiveEmailTab] = useState("Email");
    const [isAttachmentLoading, setIsAttachmentLoading] = useState(false);
    const [salesQuotes, setSalesQuotes] = useState([]);
    const [timeList, setTimeList] = useState([]);
    const [mileageList, setMileageList] = useState([]);
    const [estimationList, setEstimationList] = useState([]);
    const [taxCodesList, setTaxCodesList] = useState([]);
    const [isEstimationMode, setIsEstimationMode] = useState(false);
    const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
    const [isEstimationMenuOpen, setIsEstimationMenuOpen] = useState(false);
    const [isBottomMenuOpen, setIsBottomMenuOpen] = useState(false);
    const [selectedQuoteId, setSelectedQuoteId] = useState("");
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isProductFormOpen, setIsProductFormOpen] = useState(false);
    const [isSpecialItemFormOpen, setIsSpecialItemFormOpen] = useState(false);
    const [activeRowIdx, setActiveRowIdx] = useState(null);
    const [isSavingPopup, setIsSavingPopup] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
    const [restockItem, setRestockItem] = useState(null);
    const [restockSuccessCount, setRestockSuccessCount] = useState(0);

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
    const isInitialHydrationRef = useRef(new Set());
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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (estimationMenuRef.current && !estimationMenuRef.current.contains(event.target)) {
                setIsEstimationMenuOpen(false);
            }
            if (bottomMenuRef.current && !bottomMenuRef.current.contains(event.target)) {
                setIsBottomMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAddEstimationItem = (type) => {
        const newItem = {
            item_id: `est_${Date.now()}`,
            type: "Customized Product",
            source_type: "estimation",
            tax_id: "",
            tax_percent: 0,
            quantity: 1,
            rate: "",
            amount: 0,
            metadata: {
                category: type,
                line_category: type.toLowerCase(),
                line_description: "",
                source: "internal",
                role: "",
                hours: "",
                qty: "",
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
            type: "Customized Product",
            source_type: "time",
            tax_id: "",
            tax_percent: 0,
            quantity: 0,
            rate: 0,
            amount: 0,
            tax_details: {},
            metadata: {
                use_start_end: false,
                hours: "",
                minutes: "",
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
            type: "Customized Product",
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
    // ────────────────────────────────────────────────────────────────────────




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

    const hasChanges = useMemo(() => {
        if (!initialSnapshot) return false;
        return JSON.stringify(formData) !== initialSnapshot;
    }, [formData, initialSnapshot]);

    const handleClose = () => {
        setFormData(initialFormData);
        setSelectedQuoteId("");
        setStep(1);
        isHydratedRef.current = false;
        setLockedCountry(null);
        // Reset mileage specific states
        setMileageCoordsMap({});
        setMileageRoutesMap({});
        setMileageSelectedRouteMap({});
        setMileageInputMap({});
        isInitialHydrationRef.current = new Set();
        setIsCustomerModalOpen(false);
        onClose();
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
                setIsCustomerModalOpen(false);
            } catch (error) {
                console.error("Error refreshing customers:", error);
            }
        }, 2000);
    };

    const calculateTotals = () => {
        let subtotal = 0;
        let totalTax = 0;

        formData.items.forEach(item => {
            const isEst = item.type === "Estimation" || item.source_type === "estimation";
            if (isEst) {
                const totalAmount = parseFloat(item.rate) || 0;
                const originalTotal = parseFloat(item.metadata?.parent_total_amount) || totalAmount || 1;
                const originalTax = parseFloat(item.metadata?.parent_tax) || 0;
                
                const taxAmount = originalTotal > 0 ? (totalAmount * originalTax) / originalTotal : 0;
                const itemSub = totalAmount - taxAmount;

                subtotal += itemSub;
                totalTax += taxAmount;
            } else {
                const itemSubtotal = (parseFloat(item.rate) || 0) * (item.quantity || 0);
                const itemTax = itemSubtotal * ((parseFloat(item.tax_percent) || 0) / 100);
                subtotal += itemSubtotal;
                totalTax += itemTax;
            }
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

    // Fetch items
    const fetchItems = async (countryFilter = null) => {
        try {
            setIsLoadingItems(true);
            const [productsRes, customizedRes, timeRes, mileageRes, estimationRes, taxRes] = await Promise.all([
                inventoryService.getProducts({ country: countryFilter }),
                inventoryService.getCustomizedProducts({ country: countryFilter }),
                salesTimeService.getTimeEntries({ status: "POSTED" }),
                salesMileageService.getMileageEntries({ status: "POSTED" }),
                estimationService.getEstimations({ status: "POSTED" }),
                taxService.getTaxCodes()
            ]);
            const pList = productsRes.data || [];
            const cList = customizedRes.data || [];
            setProductsList(pList);
            setCustomizedProductsList(cList);
            setTimeList(timeRes.data || []);
            setMileageList(mileageRes.data || []);
            setEstimationList(estimationRes.data || []);
            setTaxCodesList(taxRes || []);
            return { productsList: pList, customizedProductsList: cList };
        } catch (error) {
            console.error("Error fetching items:", error);
            return null;
        } finally {
            setIsLoadingItems(false);
        }
    };

    const fetchQuotes = async () => {
        try {
            setIsLoadingQuotes(true);
            const response = await salesQuoteService.getSalesQuotes({ status: "SENT" });
            setSalesQuotes(response.data || []);
        } catch (error) {
            console.error("Error fetching sales quotes:", error);
        } finally {
            setIsLoadingQuotes(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setStep(isViewOnly ? 2 : 1);
            fetchCustomers();
            fetchSuppliers();
            fetchQuotes();

            const checkEditTaxAndFetch = async () => {
                let countryToFilter = null;
                if (editData) {
                    const firstItem = Array.isArray(editData.proforma_item)
                        ? editData.proforma_item[0]
                        : editData.proforma_item;
                    const taxVal = firstItem?.tax_id;
                    const taxId = (typeof taxVal === 'object' ? taxVal?.id : taxVal) || "";
                    if (taxId) {
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
    }, [isOpen, isViewOnly, editData]);

    const parseItemsFromDb = (dbItems) => {
        const itemsArray = Array.isArray(dbItems) ? dbItems : (dbItems ? [dbItems] : []);
        return itemsArray.flatMap(item => {
            const sourceType = item.source_type || "item";
            if (sourceType === "estimation") {
                const parentId = item.source_id || item.item_id || "";
                const parentNumber = item.metadata?.estimation_number || "";
                const parentName = item.metadata?.estimation_name || item.metadata?.name || "";
                const parentSubtotal = item.metadata?.subtotal || "0";
                const parentTax = item.metadata?.tax || "0";
                const parentTotal = item.metadata?.total_amount || "0";

                return [{
                    id: item.id,
                    item_id: Number(parentId) || parentId,
                    type: "Estimation",
                    source_type: "estimation",
                    tax_id: (typeof item.tax_id === "object" ? item.tax_id?.id : item.tax_id) || "",
                    tax_percent: parseFloat(item.tax_percent) || parseFloat(item.metadata?.tax) || 0,
                    quantity: 1,
                    rate: parseFloat(item.rate) || parseFloat(item.amount) || parseFloat(parentTotal) || 0,
                    amount: parseFloat(item.amount) || parseFloat(parentTotal) || 0,
                    tax_details: {},
                    metadata: {
                        estimation_id: parentId.toString(),
                        estimation_number: parentNumber,
                        estimation_name: parentName,
                        name: parentName,
                        parent_subtotal: parentSubtotal,
                        parent_tax: parentTax,
                        parent_total_amount: parentTotal,
                        lines: item.metadata?.lines || []
                    }
                }];
            }

            let mappedItemId = item.source_id || item.item_id || "";
            const isSourceObject = mappedItemId && typeof mappedItemId === 'object';
            const primitiveItemId = isSourceObject ? (mappedItemId.id || "") : mappedItemId;

            let itemType = "Product";
            if (sourceType === "time") itemType = "Time";
            else if (sourceType === "mileage") itemType = "Mileage";
            else if (sourceType === "service") itemType = "Service";
            else if (sourceType === "customized" || sourceType === "customized product") itemType = "Customized Product";
            else if (isSourceObject && mappedItemId.item_type === "CUSTOMISED PRODUCTS") itemType = "Customized Product";
            else if (customizedProductsList.some(cp => cp.id == primitiveItemId)) itemType = "Customized Product";

            const metadata = { ...(item.metadata || {}) };
            if (sourceType === "service" && !metadata.description) {
                metadata.description = item.description || "";
            }
            if (sourceType === "time") {
                let hoursVal = parseInt(metadata.hours);
                let minsVal = parseInt(metadata.minutes);
                if (isNaN(hoursVal) || isNaN(minsVal)) {
                    const totalMins = parseInt(metadata.duration_minutes) || Math.round((parseFloat(item.quantity) || 0) * 60);
                    metadata.hours = Math.floor(totalMins / 60);
                    metadata.minutes = totalMins % 60;
                    metadata.duration_minutes = totalMins;
                } else {
                    metadata.hours = hoursVal;
                    metadata.minutes = minsVal;
                    metadata.duration_minutes = parseInt(metadata.duration_minutes) || (hoursVal * 60 + minsVal);
                }
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

            if (sourceType === "mileage") {
                if (!metadata.distance_km) {
                    metadata.distance_km = String(item.quantity || 0);
                }
                if (!metadata.rate_per_km) {
                    metadata.rate_per_km = String(item.rate || 0);
                }
            }

            return [{
                id: item.id,
                item_id: primitiveItemId,
                type: itemType,
                source_type: sourceType,
                tax_id: (typeof item.tax_id === "object" ? item.tax_id?.id : item.tax_id) || "",
                tax_percent: parseFloat(item.tax_percent) || parseFloat(metadata?.tax) || 0,
                quantity: parseFloat(item.quantity) || 1,
                rate: parseFloat(item.rate) || 0,
                amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0),
                tax_details: {},
                metadata: metadata,
                production_cost: parseFloat(item.production_cost) || parseFloat(item.production_cost_snapshot) || parseFloat(item.source_id?.Production_cost) || 0
            }];
        });
    };

    const mapItemsForSave = (items) => {
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

            const qty = Number(firstItem.quantity) || 1;
            const totalAmount = parseFloat(firstItem.rate) || 0;
            const originalTotal = parseFloat(firstItem.metadata?.parent_total_amount) || totalAmount || 1;
            const originalTax = parseFloat(firstItem.metadata?.parent_tax) || 0;
            
            const taxAmount = originalTotal > 0 ? (totalAmount * originalTax) / originalTotal : 0;
            const subtotal = totalAmount - taxAmount;
            const rate = subtotal;
            const taxPercent = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;

            const lines = firstItem.metadata?.lines || [];

            const baseItem = {
                source_type: "estimation",
                quantity: qty,
                rate: rate,
                tax_percent: taxPercent,
                tax_id: null,
                amount: totalAmount,
                source_id: parentId,
                item_id: null,
                description: estimationNumber,
                metadata: {
                    estimation_number: estimationNumber,
                    estimation_name: estimationName,
                    subtotal: String(subtotal.toFixed(2)),
                    tax: String(taxAmount.toFixed(2)),
                    total_amount: String(totalAmount.toFixed(2)),
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
            let sourceType = item.source_type || "item";

            if (item.type === "Product" || item.type === "Customized Product") {
                sourceType = "item";
            }

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

            if (sourceType === "time" || sourceType === "mileage") {
                // time & mileage: item_id is null, source_id points to the entry
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
                }
            } else if (sourceType === "service") {
                // service: both item_id and source_id are the service's id
                const serviceId = Number(item.item_id) || null;
                baseItem.item_id = serviceId;
                baseItem.source_id = serviceId;
                baseItem.description = item.description || item.metadata?.description || "Service";
                baseItem.metadata = {
                    service_name: item.metadata?.service_name || item.description || "Consultation",
                    hours: Number(qty) || 0
                };
            } else {
                baseItem.item_id = Number(item.item_id);
                baseItem.source_id = Number(item.item_id);
                baseItem.description = item.description || "N/A";
                baseItem.production_cost = parseFloat(item.production_cost) || 0;
            }

            return baseItem;
        });

        return [...mappedNonEstimations, ...mappedEstimations];
    };

    useEffect(() => {
        if (isOpen && customers.length > 0 && productsList.length >= 0) {
            if (isHydratedRef.current) return;
            isHydratedRef.current = true;

            setSelectedQuoteId(editData?.quote_id || "");

            let dataToSet;
            if (editData) {
                // Populate form with editData
                const parsedItems = parseItemsFromDb(editData.proforma_item);
                setIsEstimationMode(false);

                dataToSet = {
                    proformaNumber: editData.invoice_number || "",
                    proformaName: editData.invoice_name || "",
                    status: editData.status || "DRAFT",
                    customer: editData.customer_id || "",
                    invoiceDate: editData.invoice_date ? new Date(editData.invoice_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    is_auto_created: editData.is_auto_created || false,
                    items: parsedItems,
                    notes: editData.notes || "",
                    attachment: editData.attachmentkey || editData.attachment || null,
                    emailConfig: {
                        ...initialFormData.emailConfig,
                        to: customers.find(c => c.id == editData.customer_id)?.email || ""
                    }
                };
            } else {
                setIsEstimationMode(false);
                dataToSet = {
                    ...initialFormData,
                    proformaNumber: generateProformaNumber(),
                    invoiceDate: new Date().toISOString().split('T')[0],
                    items: [],
                    status: "DRAFT"
                };
            }

            // Restore state if resuming (LEGACY CLEANUP - Redirection based flow is being phased out)
            // if (searchParams.get("action") === "resume") {
            //     const savedData = localStorage.getItem("pending_proforma_data");
            //     if (savedData) {
            //         const parsedData = JSON.parse(savedData);
            //         const newCustomerId = searchParams.get("newCustomerId");
            //         if (newCustomerId) {
            //             parsedData.customer = newCustomerId;
            //         }
            //         dataToSet = parsedData;
            //         localStorage.removeItem("pending_proforma_data");
            //         const params = new URLSearchParams(searchParams.toString());
            //         params.delete("action");
            //         params.delete("newCustomerId");
            //         router.replace(`/sales/proformaInvoice?${params.toString()}`);
            //     }
            // }

            setFormData(dataToSet);
            setIsSaving(false);

            // If viewOnly, jump straight to Preview (Step 2)
            if (isViewOnly) {
                setStep(2);
            } else {
                setStep(1);
            }
            // Reset snapshot for change detection
            setInitialSnapshot(JSON.stringify(dataToSet));
        }
    }, [isOpen, editData, customers, productsList, customizedProductsList, searchParams, router, isViewOnly]);

    // Handle initial email prefill when customers are loaded
    useEffect(() => {
        if (isOpen && customers.length > 0 && formData.customer && !formData.emailConfig.to) {
            const selectedCustomer = customers.find(c => c.id == formData.customer);
            if (selectedCustomer?.email) {
                setFormData(prev => {
                    const updated = {
                        ...prev,
                        emailConfig: {
                            ...prev.emailConfig,
                            to: selectedCustomer.email
                        }
                    };
                    // Update snapshot if it was just initialized
                    if (prev.customer === updated.customer) {
                        setInitialSnapshot(JSON.stringify(updated));
                    }
                    return updated;
                });
            }
        }
    }, [customers, isOpen, formData.customer, formData.emailConfig.to]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [{ item_id: "", type: "Product", source_type: "item", tax_id: "", tax_percent: 0, quantity: 1, rate: 0, amount: 0, tax_details: {}, metadata: {} }, ...prev.items]
        }));
    };

    const handleAddCustomerClick_OLD = () => {
        localStorage.setItem("pending_proforma_data", JSON.stringify(formData));
        router.push("/sales/customers?action=add&from=proformaInvoice");
    };

    const handleRemoveItem = (index) => {
        setFormData(prev => {
            const nextItems = prev.items.filter((_, i) => i !== index);
            if (nextItems.length === 0) {
                setIsEstimationMode(false);
            }
            return {
                ...prev,
                items: nextItems
            };
        });
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

                    // Fetch tax details if template ID (field 'tax') exists
                    const taxVal = selectedItem.tax;
                    const taxId = (typeof taxVal === 'object' ? taxVal?.id : taxVal);
                    if (taxId) {
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
            newItems[index].amount = (parseFloat(qty) || 0) * (parseFloat(rate) || 0);
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

    // Handler for estimation item selection (Product/Customized Product)
    const handleEstimationItemSelect = async (index, itemId) => {
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
            if (taxId) {
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

    const handleMetadataChange = (index, field, value) => {
        setFormData(prev => {
            const newItems = [...prev.items];
            const item = newItems[index];
            const updatedMetadata = {
                ...item.metadata,
                [field]: value
            };

            // Recalculate quantity/amount based on metadata changes if needed
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
                } else if (field === "trip_type") {
                    // Update distance based on trip type change
                    const oldTripType = item.metadata.trip_type || "one_way";
                    const newTripType = value;
                    if (oldTripType === "one_way" && newTripType === "round_trip") {
                        const d = (parseFloat(item.metadata.distance_km) || 0) * 2;
                        updatedQuantity = d;
                        updatedMetadata.distance_km = String(d);
                    } else if (oldTripType === "round_trip" && newTripType === "one_way") {
                        const d = (parseFloat(item.metadata.distance_km) || 0) / 2;
                        updatedQuantity = d;
                        updatedMetadata.distance_km = String(d);
                    }
                }
            } else if (item.source_type === "estimation") {
                const cat = (item.metadata?.line_category || item.metadata?.category || "").toLowerCase();
                if (cat === "manpower") {
                    const hours = (field === "hours" || field === "duration_minutes") ? parseFloat(value || 0) : (updatedMetadata.hours || updatedMetadata.duration_minutes || 0);
                    const rate = field === "rate" ? parseFloat(value || 0) : (item.rate || 0);
                    updatedQuantity = parseFloat(hours) || 0;
                    updatedRate = parseFloat(rate) || 0;
                } else if (cat === "materials") {
                    const qty = field === "qty" ? parseFloat(value || 0) : (updatedMetadata.qty || 0);
                    const cost = field === "rate" ? parseFloat(value || 0) : (item.rate || 0);
                    updatedQuantity = parseFloat(qty) || 0;
                    updatedRate = parseFloat(cost) || 0;
                } else if (cat === "machinery" || cat === "minutes" || cat === "measurement" || cat === "middlemen" || cat === "money" || cat === "method" || cat === "management" || cat === "morale" || cat === "marketing" || cat === "milieu" || cat === "maintenance" || cat === "mission" || cat === "mitigation") {
                    const qField = (cat === "minutes" ? "minutes" : (cat === "mileage" ? "distance" : "qty"));
                    const q = field === qField ? parseFloat(value || 0) : (updatedMetadata[qField] || 0);
                    const r = (field === "rate" || field === "cost" || field === "amount") ? parseFloat(value || 0) : (item.rate || 0);
                    updatedQuantity = parseFloat(q) || 0;
                    updatedRate = parseFloat(r) || 0;
                } else if (cat === "mileage") {
                    const d = field === "distance" ? parseFloat(value || 0) : (updatedMetadata.distance || 0);
                    const r = field === "rate" ? parseFloat(value || 0) : (item.rate || 0);
                    updatedQuantity = parseFloat(d) || 0;
                    updatedRate = parseFloat(r) || 0;
                }
            }

            newItems[index] = {
                ...item,
                quantity: updatedQuantity,
                rate: updatedRate,
                amount: (parseFloat(updatedQuantity) || 0) * (parseFloat(updatedRate) || 0),
                metadata: updatedMetadata
            };
            return { ...prev, items: newItems };
        });
    };

    const handleQuoteSelect = (quoteId) => {
        if (!quoteId) {
            setSelectedQuoteId("");
            setFormData(prev => ({
                ...prev,
                customer: editData?.customer_id || "",
                proformaName: editData?.invoice_name || "",
                items: initialFormData.items,
                notes: editData?.notes || "",
                emailConfig: {
                    ...prev.emailConfig,
                    to: customers.find(c => c.id == (editData?.customer_id || ""))?.email || ""
                }
            }));
            return;
        }

        setSelectedQuoteId(quoteId);
        const quote = salesQuotes.find(q => q.id == quoteId);
        if (quote) {
            const quoteItems = parseItemsFromDb(quote.items).map(item => {
                const itemCopy = { ...item };
                delete itemCopy.id; // Delete db item ID so they are saved as new items in proforma
                return itemCopy;
            });

            setFormData(prev => ({
                ...prev,
                customer: quote.customer_id,
                proformaName: quote.quote_name || prev.proformaName,
                items: quoteItems.length > 0 ? quoteItems : prev.items,
                notes: quote.notes || "",
                emailConfig: {
                    ...prev.emailConfig,
                    to: customers.find(c => c.id == quote.customer_id)?.email || ""
                }
            }));
            dispatch(showToast({ message: `Linked to Sales Quote ${quote.quote_number}`, type: "success" }));
        } else {
            setSelectedQuoteId("");
        }
    };

    const handleSave = async (forcedStatus = null, isSendToClient = false) => {
        const actualStatus = typeof forcedStatus === 'string' ? forcedStatus : null;

        try {
            if (formData.items.length === 0) {
                dispatch(showToast({ message: "Please add at least one item.", type: "warning" }));
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

                const dbItems = Array.isArray(editData?.proforma_item) ? editData.proforma_item : [];
                const originalDbItem = dbItems.find(dbItem => dbItem.source_id == item.item_id);
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

            // Items with precise calculation and type-specific flat structures
            const itemsToSave = mapItemsForSave(formData.items);

            // Calculate total_amount by summing tax-inclusive item amounts
            const calculatedTotalAmount = itemsToSave.reduce((sum, item) => sum + item.amount, 0);

            // Attachment is already a CDN URL (uploaded by AttachmentUploader on file-select)
            const attachmentUrl = formData.attachment || null;

            const jsonData = {
                invoice_number: formData.proformaNumber,
                invoice_name: formData.proformaName,
                invoice_date: formData.invoiceDate,
                status: finalStatus,
                total_amount: Number(calculatedTotalAmount.toFixed(2)),
                notes: formData.notes || "",
                customer_id: Number(formData.customer),
                quote_id: selectedQuoteId ? Number(selectedQuoteId) : null,
                attachmentkey: attachmentUrl || null,
                items: itemsToSave.map(({ tax_amount, ...item }) => item) // Remove tax_amount before sending to API if not expected
            };

            let newId = null;
            if (editData) {
                await proformaInvoiceService.updateProformaInvoice(editData.id, jsonData);
                dispatch(showToast({ message: "Proforma Invoice updated successfully", type: "success" }));
                newId = editData.id;
            } else {
                const response = await proformaInvoiceService.saveProformaInvoice(jsonData);
                dispatch(showToast({ message: "Proforma Invoice created successfully", type: "success" }));
                newId = response?.data?.data?.id || response?.data?.id || response?.data?.[0]?.id || response?.id;
            }

            if (isSendToClient && newId) {
                try {
                    const emailData = {
                        documentType: "PROFORMA_INVOICE",
                        documentId: newId,
                        email: {
                            to: formData.emailConfig.to || "",
                            cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                            bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                            message: formData.emailConfig.message || ""
                        }
                    };
                    await proformaInvoiceService.sendProformaEmail(emailData);
                    dispatch(showToast({ message: "Email sent to client successfully!", type: "success" }));
                    onSave(newId, "EMAIL_SENT");
                } catch (emailError) {
                    console.error("Error sending email:", emailError);
                    dispatch(showToast({ message: emailError?.message || "Invoice created, but failed to send email to client", type: "error" }));
                    onSave(newId);
                }
            } else {
                onSave(newId);
            }
            handleClose();
        } catch (error) {
            console.error("Error saving proforma invoice:", error);
            if (!error.isHandled) {
                dispatch(showToast({ message: "Error saving proforma invoice", type: "error" }));
            }
        } finally {
            setIsSaving(false);
            setSaveType(null);
        }
    };

    const isImageFile = (filename) => {
        if (!filename) return false;
        const name = typeof filename === 'string' ? filename : (filename instanceof File ? filename.name : '');
        const ext = name.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
    };

    const isPdfFile = (filename) => {
        if (!filename) return false;
        const name = typeof filename === 'string' ? filename : (filename instanceof File ? filename.name : '');
        const ext = name.split('.').pop().toLowerCase();
        return ext === 'pdf';
    };

    const getAttachmentUrl = (attachment) => {
        if (!attachment) return null;
        if (attachment instanceof File) {
            return URL.createObjectURL(attachment);
        }
        if (typeof attachment === 'string') {
            // Check if it's already an absolute URL
            if (attachment.startsWith('http')) return attachment;
            // Otherwise construct the URL based on the backend path (using proxy)
            return `/external-api/external/files/${attachment}`;
        }
        return null;
    };

    const handleSendEmail = async () => {
        if (!editData) return;
        setIsSaving(true);
        setSaveType("send");
        try {
            const emailData = {
                documentType: "PROFORMA_INVOICE",
                documentId: editData.id,
                email: {
                    to: formData.emailConfig.to || "",
                    cc: formData.emailConfig.cc ? formData.emailConfig.cc.split(",").map(e => e.trim()).filter(e => e) : [],
                    bcc: formData.emailConfig.bcc ? formData.emailConfig.bcc.split(",").map(e => e.trim()).filter(e => e) : [],
                    message: formData.emailConfig.message || ""
                }
            };
            await proformaInvoiceService.sendProformaEmail(emailData);
            dispatch(showToast({ message: "Email sent to client successfully!", type: "success" }));
            onSave(editData.id, "EMAIL_SENT");
            handleClose();
        } catch (error) {
            console.error("Error sending email:", error);
            if (!error.isHandled) {
                dispatch(showToast({ message: error.message || "Failed to send email", type: "error" }));
            }
        } finally {
            setIsSaving(false);
            setSaveType(null);
        }
    };
    const addItemMenuRef = useRef(null);
    const [isAddItemMenuOpen, setIsAddItemMenuOpen] = useState(false);

    // Close Add Item menu on click outside
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

    const renderCardBody = (item, idx) => {
        const type = item.type || item.source_type;

        // Common classes to match the theme
        const commonLabelClass = "text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1";
        const commonInputClass = "w-full px-3 py-1.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FFCA00] focus:bg-white transition-all h-[38px]";

        if (type === "Product" || type === "product") {
            const selectedProduct = productsList.find(i => i.id == item.item_id);
            const dbItems = Array.isArray(editData?.proforma_item) ? editData.proforma_item : [];
            const originalDbItem = dbItems.find(dbItem => dbItem.source_id == item.item_id);
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
            const dbItems = Array.isArray(editData?.proforma_item) ? editData.proforma_item : [];
            const originalDbItem = dbItems.find(dbItem => dbItem.source_id == item.item_id);
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
                    <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 mb-4 text-[#6E6BFF]">
                        <FiPlus size={24} />
                    </div>
                    <h4 className="text-[16px] font-bold text-gray-900 mb-1">No items added yet</h4>
                    <p className="text-[13px] text-gray-500 max-w-md mb-8">
                        Select an item type below to quickly add it to your proforma invoice.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
                        <button
                            type="button"
                            onClick={() => handleAddNewItemOfType("Product")}
                            className="flex flex-col items-center justify-center p-5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold transition-all text-xs gap-3 shadow-sm hover:border-[#FFCA00] hover:text-[#FFCA00] hover:bg-amber-50/10"
                        >
                            <FiBox size={22} className="opacity-80 text-yellow-500" />
                            Product
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddNewItemOfType("Customized Product")}
                            className="flex flex-col items-center justify-center p-5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold transition-all text-xs gap-3 shadow-sm hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/10"
                        >
                            <FiSettings size={22} className="opacity-80 text-indigo-500" />
                            Customized
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddNewItemOfType("Service")}
                            className="flex flex-col items-center justify-center p-5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold transition-all text-xs gap-3 shadow-sm hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/10"
                        >
                            <FiTool size={22} className="opacity-80 text-emerald-500" />
                            Service
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddNewItemOfType("Time")}
                            className="flex flex-col items-center justify-center p-5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold transition-all text-xs gap-3 shadow-sm hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/10"
                        >
                            <FiClock size={22} className="opacity-80 text-blue-500" />
                            Time
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddNewItemOfType("Mileage")}
                            className="flex flex-col items-center justify-center p-5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold transition-all text-xs gap-3 shadow-sm hover:border-rose-500 hover:text-rose-600 hover:bg-rose-50/10"
                        >
                            <FiMapPin size={22} className="opacity-80 text-rose-500" />
                            Mileage
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddNewItemOfType("Estimation")}
                            className="flex flex-col items-center justify-center p-5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold transition-all text-xs gap-3 shadow-sm hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50/10"
                        >
                            <FiBriefcase size={22} className="opacity-80 text-purple-500" />
                            Estimation
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {formData.items.map((item, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative">
                        {/* Card Header */}
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
                        {/* Card Body */}
                        {renderCardBody(item, idx)}
                    </div>
                ))}
            </div>
        );
    };

    const handlePrint = () => docPreviewRef.current?.print();
    const handleDownloadPDF = () => docPreviewRef.current?.downloadPDF();

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
                                        {isEstimationMode ? "Configure Estimate" : "Configure Proforma Invoice"}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1 font-medium">
                                        {isEstimationMode ? "Setup estimation details and items" : "Setup invoice details and items"}
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

                                    {/* Quote Select Dropdown — hidden when editing/opening invoices */}
                                    {!editData && (
                                        <div className="mb-6">
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block">Select Sales Quote</label>
                                            <CustomSelect
                                                value={selectedQuoteId}
                                                onChange={handleQuoteSelect}
                                                options={salesQuotes.map(q => ({ value: q.id, label: `${q.quote_number} - ${q.quote_name || 'No Name'}` }))}
                                                placeholder="-- Choose a Sales Quote --"
                                                className="h-[48px] rounded-lg"
                                                isClearable
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block">Proforma Invoice Number Series</label>
                                            <input
                                                type="text"
                                                value={formData.proformaNumber}
                                                readOnly
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm bg-white text-gray-400"
                                                placeholder="PFN"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block">Proforma Invoice Name</label>
                                            <input
                                                type="text"
                                                value={formData.proformaName}
                                                onChange={(e) => handleInputChange("proformaName", e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm placeholder:text-gray-300"
                                                placeholder="Enter Invoice Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[13px] font-bold text-gray-900 mb-2 block">Quote Date</label>
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

                                    <div className="mb-8">
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
                                                    isDisabled={!!selectedQuoteId || formData.is_auto_created}
                                                />
                                            </div>
                                            <button
                                                onClick={handleAddCustomerClick}
                                                disabled={!!selectedQuoteId || formData.is_auto_created}
                                                className={`px-6 py-2 text-white text-[14px] font-bold rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none whitespace-nowrap flex items-center justify-center gap-2 h-[48px] transition-all ${!!selectedQuoteId || formData.is_auto_created ? "bg-gray-300 cursor-not-allowed" : "bg-[#FFCA00] hover:bg-[#E6B600]"}`}
                                            >
                                                Add New Customer <FiUser size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="mb-8">
                                    <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-50">
                                        <h3 className="text-[14px] font-bold text-gray-900 font-poppins uppercase tracking-wide">
                                            {isEstimationMode ? "Estimation Parameters" : "Sales Items"}
                                        </h3>
                                        {isEstimationMode ? (
                                            <div className="relative" ref={estimationMenuRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEstimationMenuOpen(!isEstimationMenuOpen)}
                                                    className="px-4 py-2 bg-[#FFCA00] text-white rounded-lg text-[13px] font-bold flex items-center gap-2 hover:bg-[#E6B600] transition-all shadow-sm"
                                                >
                                                    <FiPlus size={16} /> Add Item <FiChevronDown size={14} />
                                                </button>
                                                {isEstimationMenuOpen && (
                                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 py-2 max-h-72 overflow-y-auto ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                                                        {estimationItemTypes.map((type) => (
                                                            <button
                                                                key={type.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    handleAddEstimationItem(type.id);
                                                                    setIsEstimationMenuOpen(false);
                                                                }}
                                                                className="w-full text-left px-5 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-[13px] text-gray-700 font-medium transition-colors"
                                                            >
                                                                {type.icon && <type.icon size={16} className="text-gray-400" />}
                                                                {type.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative" ref={addItemMenuRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAddItemMenuOpen(!isAddItemMenuOpen)}
                                                    className="px-4 py-2 bg-[#FFCA00] text-white rounded-lg text-[13px] font-bold flex items-center gap-2 hover:bg-[#E6B600] transition-all shadow-sm"
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
                                                    placeholder="Add quote terms or notes"
                                                ></textarea>
                                            </div>
                                            <div>
                                                <label className="text-[13px] font-bold text-gray-900 mb-2 block">Attachment</label>
                                                <AttachmentUploader
                                                    context="proforma-invoice"
                                                    existingUrl={formData.attachment}
                                                    onUploaded={(url) => handleInputChange("attachment", url)}
                                                    disabled={false}
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
                    ) : (
                        <div>
                            <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4 no-print">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                                        {isViewOnly ? "View Proforma Invoice" : "Preview & Send"}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {isExporting ? "Generating PDF..." : isViewOnly ? "View details of your invoice" : "Review and send your invoice"}
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
                                    <div className="min-w-[900px] md:min-w-full md:min-w-full">
                                        <DocumentPreview
                                            ref={docPreviewRef}
                                            type="PROFORMA_INVOICE"
                                            filename={`Proforma-${formData.proformaNumber}`}
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
                                                    number: formData.proformaNumber,
                                                    date: formData.invoiceDate,
                                                    status: formData.status,
                                                    reference: formData.proformaName,
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

                            {/* Configuration Section  */}
                            {!isViewOnly && editData?.status?.toUpperCase() !== "SENT" && (
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
                                                            context="proforma-invoice"
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
                                {isViewOnly ? (
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
                taxes={taxCodesList}
                forceRestock={true}
                onRestockRawMaterial={handleRestockRawMaterialFromProductForm}
                restockSuccessCount={restockSuccessCount}
            />

            <SalesSpecialItemForm
                isOpen={isSpecialItemFormOpen}
                onClose={() => setIsSpecialItemFormOpen(false)}
                onSave={handleSavePopupSpecialItem}
                isSaving={isSavingPopup}
                taxes={taxCodesList}
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

export default ProformaInvoiceForm;
