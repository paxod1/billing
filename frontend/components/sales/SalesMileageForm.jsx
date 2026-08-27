"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
    FiX, FiCalendar, FiMapPin, FiLoader, FiArrowRight, FiRefreshCw, FiNavigation
} from "react-icons/fi";
import { showToast } from "@/lib/features/toast/toastSlice";
import { useDispatch } from "react-redux";
import AttachmentUploader from "@/components/common/AttachmentUploader";
import axios from "axios";
import AsyncSelect from "react-select/async";
import dynamic from 'next/dynamic';

// Dynamically import the Map component to work with Next.js SSR
const MileageRouteMap = dynamic(() => import("./MileageRouteMap"), { 
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-[#F8FAFF] flex flex-col items-center justify-center gap-4 text-gray-300">
            <FiLoader className="animate-spin" size={32} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Map Loading...</span>
        </div>
    )
});

const initialData = {
    name: "",
    description: "",
    date: "",
    start_address: "",
    end_address: "",
    trip_type: "one_way",
    distance_km: "",
    rate_per_km: "",
    note: "",
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

const SalesMileageForm = ({ isOpen, onClose, onSave, editData = null, viewOnly = false, isSaving = false }) => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState(initialData);
    const [initialSnapshot, setInitialSnapshot] = useState(null);

    // Geocoding & Routing State
    const [isCalculating, setIsCalculating] = useState(false);
    const [routes, setRoutes] = useState([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
    const [coords, setCoords] = useState({ start: null, end: null });
    
    // Caching for route results to prevent redundant API calls
    const routeCache = useRef({});

    // Controlled input values for address fields
    const [startInputValue, setStartInputValue] = useState('');
    const [endInputValue, setEndInputValue] = useState('');

    const isInitialHydrationRef = useRef(false);

    const loadAddressOptions = async (inputValue) => {
        if (!inputValue || inputValue.length < 2) return [];
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            const response = await axios.get(`https://photon.komoot.io/api/`, {
                params: {
                    q: inputValue,
                    limit: 10
                }
            });

            return response.data.features.map(feature => {
                const props = feature.properties;
                const label = [
                    props.name,
                    props.street,
                    props.district,
                    props.city,
                    props.state,
                    props.country
                ].filter(Boolean).join(", ");

                return {
                    label: label,
                    value: label,
                    lat: feature.geometry.coordinates[1],
                    lon: feature.geometry.coordinates[0]
                };
            });
        } catch (error) {
            console.error("Geocoding error:", error);
            return [];
        }
    };

    const fetchRoutes = useCallback(async (start, end, tripType, forceRefresh = false) => {
        if (!start || !end) return;

        const cacheKey = `${start.lat},${start.lon}_${end.lat},${end.lon}_${tripType}`;
        if (!forceRefresh && routeCache.current[cacheKey]) {
            const cachedRoutes = routeCache.current[cacheKey];
            setRoutes(cachedRoutes);
            if (cachedRoutes.length > 0) {
                let matchIndex = 0;
                if (formData.distance_km) {
                    const target = parseFloat(formData.distance_km);
                    let minDiff = Infinity;
                    cachedRoutes.forEach((r, i) => {
                        const diff = Math.abs(r.distance - target);
                        if (diff < minDiff) {
                            minDiff = diff;
                            matchIndex = i;
                        }
                    });
                }
                setSelectedRouteIndex(matchIndex);
                if (!isInitialHydrationRef.current) {
                    setFormData(prev => ({ ...prev, distance_km: cachedRoutes[matchIndex].distance.toFixed(2) }));
                }
                isInitialHydrationRef.current = false;
            }
            return;
        }

        setIsCalculating(true);
        try {
            const outboundPromise = axios.get(`https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}`, {
                params: {
                    overview: 'full',
                    geometries: 'geojson',
                    alternatives: 'true',
                    steps: 'true'
                }
            });

            let returnPromise = Promise.resolve(null);
            if (tripType === 'round_trip') {
                returnPromise = axios.get(`https://router.project-osrm.org/route/v1/driving/${end.lon},${end.lat};${start.lon},${start.lat}`, {
                    params: { overview: 'full', geometries: 'geojson' }
                }).catch(e => {
                    console.error("Return trip fetch failed:", e);
                    return null;
                });
            }

            const [res, returnRes] = await Promise.all([outboundPromise, returnPromise]);
            
            if (res.data.code === 'Ok') {
                let returnRoute = null;
                if (tripType === 'round_trip' && returnRes && returnRes.data?.code === 'Ok') {
                    returnRoute = returnRes.data.routes[0];
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
                        duration: duration,
                        name: route.legs[0].summary || `Route ${idx + 1}`,
                        geometry: routeGeometry
                    };
                });

                routeCache.current[cacheKey] = fetchedRoutes;
                setRoutes(fetchedRoutes);
                if (fetchedRoutes.length > 0) {
                    let matchIndex = 0;
                    if (formData.distance_km) {
                        const target = parseFloat(formData.distance_km);
                        let minDiff = Infinity;
                        fetchedRoutes.forEach((r, i) => {
                            const diff = Math.abs(r.distance - target);
                            if (diff < minDiff) {
                                minDiff = diff;
                                matchIndex = i;
                            }
                        });
                    }

                    setSelectedRouteIndex(matchIndex);
                    if (!isInitialHydrationRef.current) {
                        setFormData(prev => ({ ...prev, distance_km: fetchedRoutes[matchIndex].distance.toFixed(2) }));
                    }
                    isInitialHydrationRef.current = false;
                }
            }
        } catch (error) {
            console.error("Routing error:", error);
            isInitialHydrationRef.current = false;
            dispatch(showToast({ message: "Could not calculate route. Please enter distance manually.", type: "warning" }));
        } finally {
            setIsCalculating(false);
        }
    }, [dispatch, formData.distance_km]);

    useEffect(() => {
        if (coords.start && coords.end) {
            fetchRoutes(coords.start, coords.end, formData.trip_type);
        }
    }, [coords, formData.trip_type, fetchRoutes]);

    // Auto-geocode saved addresses when editing so the map shows routes immediately
    useEffect(() => {
        if (!isOpen || !editData) return;
        const startAddr = editData.start_address;
        const endAddr = editData.end_address;
        if (!startAddr || !endAddr) return;

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
            const [startCoord, endCoord] = await Promise.all([
                geocodeAddress(startAddr),
                geocodeAddress(endAddr)
            ]);
            if (startCoord && endCoord) {
                isInitialHydrationRef.current = true;
                setCoords({ start: startCoord, end: endCoord });
                setStartInputValue(startAddr);
                setEndInputValue(endAddr);
            }
        })();
    }, [isOpen, editData]);

    const selectStyles = {
        control: (provided, state) => ({
            ...provided,
            backgroundColor: 'white',
            borderColor: state.isFocused ? '#FFCA00' : '#e5e7eb',
            borderRadius: '8px',
            padding: '2px',
            boxShadow: 'none',
            '&:hover': {
                borderColor: '#FFCA00',
            },
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

    useEffect(() => {
        if (isOpen) {
            let dataToSet = {
                ...initialData,
                date: getTodayDateString()
            };
            
            if (editData) {
                dataToSet = {
                    ...initialData,
                    id: editData.id,
                    name: editData.name || "",
                    date: editData.date?.split('T')[0] || editData.entry_date?.split('T')[0] || "",
                    start_address: editData.start_address || "",
                    end_address: editData.end_address || "",
                    trip_type: (editData.trip_type && editData.trip_type.toLowerCase().includes("round")) ? "round_trip" : (editData.trip_type || "one_way"),
                    distance_km: editData.distance_km || editData.distance || "",
                    rate_per_km: editData.rate_per_km || editData.rate_per_hour || "",
                    status: (editData.status || "DRAFT").toUpperCase(),
                    attachment: editData.attachment || null
                };
            }

            setFormData(dataToSet);
            setInitialSnapshot(JSON.stringify(dataToSet));
        }
    }, [isOpen, editData]);

    // Reset state when form is closed
    useEffect(() => {
        if (!isOpen) {
            setCoords({ start: null, end: null });
            setRoutes([]);
            setSelectedRouteIndex(0);
            setStartInputValue("");
            setEndInputValue("");
        }
    }, [isOpen]);

    const hasChanges = useMemo(() => {
        if (!initialSnapshot) return false;
        return JSON.stringify(formData) !== initialSnapshot;
    }, [formData, initialSnapshot]);

    const totalAmount = useMemo(() => {
        const dist = parseFloat(formData.distance_km) || 0;
        const rate = parseFloat(formData.rate_per_km) || 0;
        return (dist * rate).toFixed(2);
    }, [formData.distance_km, formData.rate_per_km]);

    const preparePayload = (status) => {
        const payload = {
            name: formData.name || "",
            description: "",
            rate_per_km: parseFloat(formData.rate_per_km) || 0,
            distance_km: formData.distance_km || "",
            date: formData.date || "",
            start_address: formData.start_address || "",
            end_address: formData.end_address || "",
            trip_type: formData.trip_type || "one_way",
            note: formData.note || "",
            status: status || "DRAFT",
            amount: totalAmount,
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
        if (!formData.name?.trim()) {
            return "Entry Name is required";
        }
        if (!formData.date) {
            return "Date is required";
        }
        if (!formData.distance_km) {
            return "Distance is required";
        }
        if (parseFloat(formData.distance_km || 0) <= 0) {
            return "Distance must be greater than zero";
        }
        if (!formData.rate_per_km) {
            return "Rate per KM is required";
        }
        if (parseFloat(formData.rate_per_km || 0) <= 0) {
            return "Rate per KM must be greater than zero";
        }
        return null;
    };

    const handleSave = () => {
        const error = validateForm();
        if (error) {
            dispatch(showToast({ message: error, type: "warning" }));
            return;
        }
        onSave(preparePayload("DRAFT"));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-xl w-full max-h-[95dvh] overflow-y-auto max-w-4xl">
                <div className="p-4 md:p-8">
                    {/* Header */}
                    <div className="border-b border-gray-200 pb-4 mb-6 relative">
                        <div className="flex flex-wrap items-center gap-3 pr-10">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                                {editData ? (viewOnly ? "View Mileage Entry" : "Edit Mileage Entry") : "Add Mileage Entry"}
                            </h2>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${(!editData || hasChanges) ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-gray-100 text-gray-500"}`}>
                                {(!editData || hasChanges) ? "Not Saved" : (formData.status || "DRAFT")}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1.5 pr-10">
                            Record your trip and auto-calculate distance & amount
                        </p>
                        <button
                            onClick={onClose}
                            className="absolute right-0 top-0 p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
                            title="Close"
                        >
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* Details */}
                    <div className="mb-8">
                        <h3 className="text-[14px] font-bold text-gray-900 mb-4 uppercase tracking-wider">Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Entry Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFCA00] text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                                    placeholder="Enter Entry Name"
                                    disabled={viewOnly}
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Date <span className="text-red-500">*</span></label>
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

                    {/* Distance & Trip Type */}
                    <div className="mb-8 pt-8 border-t border-gray-100">
                        <h3 className="text-[15px] font-extrabold text-gray-900 mb-6 uppercase tracking-wider">Distance & Trip Type</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-1 gap-5 items-start">
                            <div className="lg:col-span-1 space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[13px] font-bold text-gray-900 mb-2 block">Start Address</label>
                                        <div className="relative group">
                                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none group-focus-within:text-[#FFCA00] transition-colors">
                                                <FiMapPin size={18} />
                                            </div>
                                            <AsyncSelect
                                                cacheOptions
                                                loadOptions={loadAddressOptions}
                                                defaultOptions
                                                isClearable
                                                value={formData.start_address ? { label: formData.start_address, value: formData.start_address } : null}
                                                inputValue={startInputValue}
                                                onInputChange={(val, { action }) => {
                                                    if (action === 'input-change') setStartInputValue(val);
                                                }}
                                                onMenuOpen={() => {
                                                    if (formData.start_address && startInputValue === '') {
                                                        setStartInputValue(formData.start_address);
                                                    }
                                                }}
                                                onChange={(option) => {
                                                    setFormData({ ...formData, start_address: option?.value || '' });
                                                    setCoords(prev => ({ ...prev, start: option ? { lat: option.lat, lon: option.lon } : null }));
                                                    setStartInputValue('');
                                                }}
                                                placeholder="Search Start Address..."
                                                styles={{
                                                    ...selectStyles,
                                                    control: (provided, state) => ({
                                                        ...selectStyles.control(provided, state),
                                                        paddingLeft: '36px',
                                                        backgroundColor: 'white',
                                                        border: state.isFocused ? '1px solid #FFCA00' : '1px solid #E5E7EB'
                                                    })
                                                }}
                                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                isDisabled={viewOnly}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[13px] font-bold text-gray-900 mb-2 block">End Address</label>
                                        <div className="relative group">
                                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none group-focus-within:text-[#FFCA00] transition-colors">
                                                <FiMapPin size={18} />
                                            </div>
                                            <AsyncSelect
                                                cacheOptions
                                                loadOptions={loadAddressOptions}
                                                defaultOptions
                                                isClearable
                                                value={formData.end_address ? { label: formData.end_address, value: formData.end_address } : null}
                                                inputValue={endInputValue}
                                                onInputChange={(val, { action }) => {
                                                    if (action === 'input-change') setEndInputValue(val);
                                                }}
                                                onMenuOpen={() => {
                                                    if (formData.end_address && endInputValue === '') {
                                                        setEndInputValue(formData.end_address);
                                                    }
                                                }}
                                                onChange={(option) => {
                                                    setFormData({ ...formData, end_address: option?.value || '' });
                                                    setCoords(prev => ({ ...prev, end: option ? { lat: option.lat, lon: option.lon } : null }));
                                                    setEndInputValue('');
                                                }}
                                                placeholder="Search End Address..."
                                                styles={{
                                                    ...selectStyles,
                                                    control: (provided, state) => ({
                                                        ...selectStyles.control(provided, state),
                                                        paddingLeft: '36px',
                                                        backgroundColor: 'white',
                                                        border: state.isFocused ? '1px solid #FFCA00' : '1px solid #E5E7EB'
                                                    })
                                                }}
                                                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                isDisabled={viewOnly}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col">
                                        <label className="text-[13px] font-bold text-gray-900 mb-2 block">Trip Type</label>
                                        <div className="flex bg-white rounded-xl p-1.5 border border-gray-200 mt-auto h-[42px] items-center">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (formData.trip_type !== "one_way") {
                                                        setFormData(Object.assign({}, formData, {
                                                            trip_type: "one_way",
                                                            distance_km: formData.distance_km ? String(parseFloat(formData.distance_km) / 2) : ""
                                                        }));
                                                    }
                                                }}
                                                className={`flex-1 flex items-center justify-center gap-2.5 py-1.5 text-[12px] font-bold rounded-lg transition-all ${formData.trip_type === "one_way" ? "bg-[#FFCA00] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"} disabled:opacity-50`}
                                                disabled={viewOnly}
                                            >
                                                <FiArrowRight size={14} /> One-way
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (formData.trip_type !== "round_trip") {
                                                        setFormData(Object.assign({}, formData, {
                                                            trip_type: "round_trip",
                                                            distance_km: formData.distance_km ? String(parseFloat(formData.distance_km) * 2) : ""
                                                        }));
                                                    }
                                                }}
                                                className={`flex-1 flex items-center justify-center gap-2.5 py-1.5 text-[12px] font-bold rounded-lg transition-all ${formData.trip_type === "round_trip" ? "bg-[#FFCA00] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"} disabled:opacity-50`}
                                                disabled={viewOnly}
                                            >
                                                <FiRefreshCw size={14} /> Round-trip
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[13px] font-bold text-gray-900 mb-2 block">Distance (km) <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            value={formData.distance_km}
                                            onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                                            className="w-full px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#FFCA00]/20 focus:border-[#FFCA00] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder="0.00"
                                            disabled={viewOnly}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Row: Map & Routes (Side-by-Side) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                                {/* Visual Map Side */}
                                <div className="bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-sm h-[320px]">
                                    <div className="relative flex-1 bg-[#F8FAFF] flex items-center justify-center p-4 overflow-hidden">
                                        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#4F46E5 1px, transparent 1px)', backgroundSize: '18px 18px' }}></div>
                                        
                                        {formData.distance_km && (
                                            <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-xl shadow-lg border border-gray-100 flex items-center gap-2.5 z-20 border-l-4 border-l-[#279C6F]">
                                                <FiNavigation className="text-[#279C6F] -rotate-45" size={14} />
                                                <span className="text-[13px] font-extrabold text-gray-900">{parseFloat(formData.distance_km).toFixed(1)} km</span>
                                            </div>
                                        )}

                                        {formData.start_address && formData.end_address ? (
                                            <MileageRouteMap 
                                                start={coords.start} 
                                                end={coords.end} 
                                                routeGeometry={routes[selectedRouteIndex]?.geometry}
                                            />
                                          ) : (
                                            <div className="flex flex-col items-center gap-4 text-gray-300">
                                                <FiMapPin size={40} className="opacity-20" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Route Preview</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Suggested Routes Side */}
                                <div className="bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-sm h-[320px]">
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                        <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <FiNavigation className="text-[#FFCA00]" /> Suggested Paths
                                        </h4>
                                        {routes.length > 0 && !viewOnly && (
                                            <button onClick={() => fetchRoutes(coords.start, coords.end, formData.trip_type, true)} className="text-[10px] font-bold text-[#FFCA00] flex items-center gap-1">
                                                <FiRefreshCw size={12} /> Refresh
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {isCalculating ? (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-300">
                                                <FiLoader className="animate-spin mb-3" size={24} />
                                                <span className="text-[11px] font-bold uppercase tracking-widest">Searching...</span>
                                            </div>
                                        ) : routes.length > 0 ? (
                                            routes.map((r, idx) => (
                                                <button
                                                    type="button"
                                                    key={idx}
                                                    onClick={() => {
                                                        if (viewOnly) return;
                                                        setSelectedRouteIndex(idx);
                                                        setFormData({ ...formData, distance_km: r.distance.toFixed(2) });
                                                    }}
                                                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all group ${selectedRouteIndex === idx ? 'border-[#FFCA00] bg-yellow-400/5 shadow-sm' : 'border-gray-50 hover:border-gray-100 bg-white'} ${viewOnly ? 'cursor-default' : ''}`}
                                                    disabled={viewOnly}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="text-[13px] font-medium text-gray-900">{r.name}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-tight">{Math.round(r.duration)} mins driving</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`text-[15px] font-extrabold ${selectedRouteIndex === idx ? 'text-teal-600' : 'text-gray-900'}`}>{r.distance.toFixed(1)} km</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center opacity-30 px-10">
                                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Select journey details to see routes</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rate */}
                    <div className="mb-8 pt-6 border-t border-gray-100">
                        <h3 className="text-[14px] font-bold text-gray-900 mb-4 uppercase tracking-wider">Rate</h3>
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 w-full max-w-2xl">
                                <div>
                                    <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Rate per KM <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-medium text-[13px]">₹</span>
                                        <input
                                            type="number"
                                            value={formData.rate_per_km}
                                            onChange={(e) => setFormData({ ...formData, rate_per_km: e.target.value })}
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

                    {/* References */}
                    <div className="mb-8 pt-6 border-t border-gray-100 mt-10 md:mt-0">
                        <h3 className="text-[14px] font-bold text-gray-900 mb-4 uppercase tracking-wider">References</h3>
                        <div>
                            <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Notes</label>
                            <textarea
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-[13px] h-24 resize-none focus:outline-none focus:ring-1 focus:ring-[#FFCA00] hover:border-[#FFCA00] transition-colors text-gray-900 placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="Add invoice terms or notes"
                                disabled={viewOnly}
                            ></textarea>
                        </div>
                        <div className="mt-4">
                            <label className="text-[12px] font-bold text-gray-900 mb-1.5 block">Attachment</label>
                            <AttachmentUploader
                                context="mileage-entry"
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

export default SalesMileageForm;
