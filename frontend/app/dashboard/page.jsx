"use client";

import React, { useState, useRef, useEffect } from "react";
import { IoIosArrowDown } from "react-icons/io";
import Activity from "@/components/dashboard/Activity";
import AdminNavbar from "@/components/dashboard/DashBoardNavbar";
import MobileHeader from "@/components/dashboard/MobileHeader";
import CustomizationSidebar from "@/components/dashboard/CustomizationSidebar";
import MobileWidgetSelector from "@/components/dashboard/MobileWidgetSelector";
import { FaPlus } from "react-icons/fa";
// ADD THIS IMPORT - Icon mapping utility
import { iconMap, getIconName } from "@/utils/IconMapping";
import { tokenRequest } from "@/lib/axiosCreate";
import { partyService } from "@/services/partyService";
import { taxService } from "@/services/taxService";
import { inventoryService } from "@/services/inventoryService";
import Loader from "@/components/commonComp/Loader";

// Helper functions for mapping DB names <-> FE IDs
const mapDbKeyToFeId = (key) => {
    if (key === "inventory") return "inventory-status";
    if (key === "payables") return "payables-obligations";
    if (key === "liquidity") return "liquidity-ratio";
    if (key === "receivables") return "receivables-aging";
    if (key === "top_expense_categories") return "top-expenses";
    if (key === "trial_balance_status") return "trial-balance";
    return key.replace(/_/g, "-");
};

const mapFeIdToDbKey = (id) => {
    if (id === "inventory-status") return "inventory";
    if (id === "payables-obligations") return "payables";
    if (id === "liquidity-ratio") return "liquidity";
    if (id === "receivables-aging") return "receivables";
    if (id === "top-expenses") return "top_expense_categories";
    if (id === "trial-balance") return "trial_balance_status";
    return id.replace(/-/g, "_");
};

// Default widgets with proper positioning and spans
const defaultWidgets = [
    {
        id: "net-profit-margin",
        type: "net-profit-margin",
        title: "Net Profit Margin (%)",
        position: { row: 0, col: 0 },
        colSpan: 1,
        rowSpan: 1,
    },
    {
        id: "revenue-vs-expenses",
        type: "revenue-vs-expenses",
        title: "Total Revenue vs. Total Expenses",
        position: { row: 0, col: 1 },
        colSpan: 2,
        rowSpan: 1,
    },
    {
        id: "receivables-aging",
        type: "receivables-aging",
        title: "Total Receivables & Overdue Aging",
        position: { row: 1, col: 0 },
        colSpan: 2,
        rowSpan: 1,
    },
    {
        id: "liquidity-ratio",
        type: "liquidity-ratio",
        title: "Current Liquidity Ratio",
        position: { row: 1, col: 2 },
        colSpan: 1,
        rowSpan: 1,
    },
    {
        id: "payables-obligations",
        type: "payables-obligations",
        title: "Total Payables & Upcoming Obligations",
        position: { row: 2, col: 0 },
        colSpan: 2,
        rowSpan: 1,
    },
    {
        id: "cash-balance",
        type: "cash-balance",
        title: "Available Cash Balance",
        position: { row: 2, col: 2 },
        colSpan: 1,
        rowSpan: 1,
    },
    {
        id: "estimated-tax",
        type: "estimated-tax",
        title: "Estimated Tax Liability",
        position: { row: 3, col: 0 },
        colSpan: 1,
        rowSpan: 1,
    },
    {
        id: "trial-balance",
        type: "trial-balance",
        title: "Trial Balance Consistency Status",
        position: { row: 3, col: 1 },
        colSpan: 2,
        rowSpan: 1,
    },
    {
        id: "collection-period",
        type: "collection-period",
        title: "Average Collection Period",
        position: { row: 4, col: 0 },
        colSpan: 1,
        rowSpan: 1,
    },
    {
        id: "inventory-status",
        type: "inventory-status",
        title: "Inventory Valuation & Turnover",
        position: { row: 4, col: 1 },
        colSpan: 1,
        rowSpan: 1,
    },
];

// Enhanced localStorage loading with icon restoration
const loadWidgetsFromStorage = () => {
    if (typeof window === "undefined") return defaultWidgets;
    try {
        const saved = localStorage.getItem("dashboard-widgets-leads");
        if (saved) {
            const widgets = JSON.parse(saved);

            // Auto-reset if the saved widgets have more than 10 items (migration to 4-long / 6-short layout)
            if (widgets.length > 10) {
                localStorage.removeItem("dashboard-widgets-leads");
                return defaultWidgets;
            }

            // Restore icons from iconNames and clamp colSpan to 2 columns
            const restoredWidgets = widgets.map((widget) => {
                const baseWidget = defaultWidgets.find(w => w.id === widget.id);
                const colSpan = baseWidget ? Math.min(widget.colSpan || baseWidget.colSpan || 1, 2) : Math.min(widget.colSpan || 1, 2);
                return {
                    ...widget,
                    colSpan,
                    // Restore icon component from iconName
                    icon: widget.iconName ? iconMap[widget.iconName] : widget.icon,
                };
            });
            return restoredWidgets;
        }
    } catch (error) {
        console.warn("Could not load saved widgets:", error);
    }
    return defaultWidgets;
};

// Enhanced localStorage saving with icon serialization
const saveWidgetsToStorage = (widgets) => {
    if (typeof window === "undefined") return;
    try {
        // Convert icons to iconNames before saving
        const serializableWidgets = widgets.map((widget) => {
            const serializableWidget = {
                ...widget,
                // Ensure iconName is preserved
                iconName: widget.iconName || getIconName(widget.icon),
            };

            // Remove non-serializable properties
            delete serializableWidget.icon;

            return serializableWidget;
        });

        localStorage.setItem(
            "dashboard-widgets-leads",
            JSON.stringify(serializableWidgets)
        );
    } catch (error) {
        console.warn("Could not save widgets to localStorage:", error);
    }
};

function compactWidgets(widgets) {
    const GRID_COLS = 3;
    const compacted = [];

    // Sort widgets by their current position (row, then col)
    const sortedWidgets = [...widgets].sort((a, b) => {
        if (a.position.row !== b.position.row) {
            return a.position.row - b.position.row;
        }
        return a.position.col - b.position.col;
    });

    sortedWidgets.forEach((widget) => {
        // Find first available position for this widget
        let placed = false;

        for (let row = 0; row < 50 && !placed; row++) {
            for (let col = 0; col < GRID_COLS && !placed; col++) {
                // Clamp widget colSpan to maximum of 2 columns so it never takes full width of the 3-column grid
                const colSpan = Math.min(widget.colSpan || 1, 2);
                const rowSpan = widget.rowSpan || 1;

                // Check if fits in grid bounds
                if (col + colSpan > GRID_COLS) continue;

                // Check if position is free
                let isFree = true;
                for (let r = row; r < row + rowSpan && isFree; r++) {
                    for (let c = col; c < col + colSpan && isFree; c++) {
                        const conflict = compacted.find((w) => {
                            const startRow = w.position.row;
                            const endRow = startRow + (w.rowSpan || 1);
                            const startCol = w.position.col;
                            const endCol = startCol + (w.colSpan || 1);
                            return (
                                r >= startRow && r < endRow && c >= startCol && c < endCol
                            );
                        });
                        if (conflict) isFree = false;
                    }
                }

                if (isFree) {
                    compacted.push({
                        ...widget,
                        colSpan,
                        position: { row, col },
                    });
                    placed = true;
                }
            }
        }
    });

    return compacted;
}

function AdminHome() {
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const [showMobileSelector, setShowMobileSelector] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const activityRef = useRef(null);
    const [dashboardData, setDashboardData] = useState({ financial: null, operations: null, sales: null });
    const [configRecord, setConfigRecord] = useState(null);
    const [supplierCount, setSupplierCount] = useState(0);
    const [taxCount, setTaxCount] = useState(0);
    const [rawMaterialCount, setRawMaterialCount] = useState(0);
    const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true);
    const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

    const [activeWidgets, setActiveWidgets] = useState(() => {
        return loadWidgetsFromStorage();
    });

    const [savedWidgets, setSavedWidgets] = useState(activeWidgets);

    useEffect(() => {
        const fetchDashboardAPIs = async () => {
            let financialData = null;
            let operationsData = null;
            let salesData = null;

            try {
                const financialRes = await tokenRequest.get("custom-api/admin/dashboard/financial/");
                console.log("=== FINANCIAL DASHBOARD API RESPONSE ===");
                console.log(JSON.stringify(financialRes.data, null, 2));
                financialData = financialRes.data?.data || financialRes.data;
            } catch (err) {
                console.error("Error fetching financial dashboard API:", err);
            }

            try {
                const operationsRes = await tokenRequest.get("custom-api/admin/dashboard/operations/");
                console.log("=== OPERATIONS DASHBOARD API RESPONSE ===");
                console.log(JSON.stringify(operationsRes.data, null, 2));
                operationsData = operationsRes.data?.data || operationsRes.data;
            } catch (err) {
                console.error("Error fetching operations dashboard API:", err);
            }

            try {
                const salesRes = await tokenRequest.get("custom-api/admin/dashboard/sales/");
                console.log("=== SALES DASHBOARD API RESPONSE ===");
                console.log(JSON.stringify(salesRes.data, null, 2));
                salesData = salesRes.data?.data || salesRes.data;
            } catch (err) {
                console.error("Error fetching sales dashboard API:", err);
            }

            setDashboardData({
                financial: financialData,
                operations: operationsData,
                sales: salesData
            });

            // Fetch Onboarding status
            try {
                const supplierRes = await partyService.getParties({ role: "SUPPLIER", limit: 1 });
                setSupplierCount(supplierRes.totalCount || supplierRes.data?.length || 0);
            } catch (err) {
                console.error("Error fetching suppliers count:", err);
            }

            try {
                const taxRes = await taxService.getTaxCodes();
                setTaxCount(taxRes.length || 0);
            } catch (err) {
                console.error("Error fetching tax codes count:", err);
            }

            try {
                const rawRes = await inventoryService.getRawMaterials({ limit: 1 });
                setRawMaterialCount(rawRes.totalCount || rawRes.data?.length || 0);
            } catch (err) {
                console.error("Error fetching raw materials count:", err);
            }

            setIsLoadingOnboarding(false);

            // Fetch Dashboard Config
            try {
                const configRes = await tokenRequest.get("custom-api/admin/dashboard/config");
                console.log("=== DASHBOARD CONFIG API RESPONSE ===");
                console.log(JSON.stringify(configRes.data, null, 2));
                const responseData = configRes.data?.data || configRes.data;
                const data = Array.isArray(responseData) ? responseData[0] : responseData;

                if (data) {
                    setConfigRecord(data);
                    if (data.widgets) {
                        const dbWidgets = typeof data.widgets === "string" ? JSON.parse(data.widgets) : data.widgets;
                        if (Array.isArray(dbWidgets)) {
                            if (dbWidgets.length > 10) {
                                console.log("DB widgets count > 10, resetting to default widgets...");
                                setTimeout(() => {
                                    saveWidgetsToStorage(defaultWidgets);
                                    saveWidgetsToDb(defaultWidgets);
                                }, 100);
                                setActiveWidgets(defaultWidgets);
                                setSavedWidgets(defaultWidgets);
                            } else {
                                // Map to frontend widgets
                                const mapped = dbWidgets.map((dbKey, index) => {
                                    const feId = mapDbKeyToFeId(dbKey);
                                    const baseWidget = defaultWidgets.find(w => w.id === feId);
                                    if (baseWidget) {
                                        return {
                                            ...baseWidget,
                                            icon: baseWidget.icon || (baseWidget.iconName ? iconMap[baseWidget.iconName] : null),
                                            iconName: baseWidget.iconName || getIconName(baseWidget.icon),
                                            position: { row: index, col: 0 }
                                        };
                                    }
                                    return null;
                                }).filter(Boolean);

                                if (mapped.length > 0) {
                                    const compacted = compactWidgets(mapped);
                                    setActiveWidgets(compacted);
                                    setSavedWidgets(compacted);
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching dashboard config API:", err);
            } finally {
                setIsLoadingDashboard(false);
            }
        };

        fetchDashboardAPIs();
    }, []);

    // Check if mobile/tablet
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024); // lg breakpoint
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const handleCustomizeClick = () => {
        setIsCustomizing(true);
        setSavedWidgets([...activeWidgets]); // Save current state

        setTimeout(() => {
            if (activityRef.current) {
                const top =
                    activityRef.current.getBoundingClientRect().top + window.scrollY - 45;
                window.scrollTo({ top, behavior: "smooth" });
            }
        }, 100);
    };

    const handleCancelClick = () => {
        // Restore to saved state
        setActiveWidgets(savedWidgets);
        setIsCustomizing(false);
        setShowSidebar(false);
        setShowMobileSelector(false);
    };

    const saveWidgetsToDb = async (widgetsList) => {
        try {
            // Map frontend widget IDs to backend DB keys
            const dbWidgetKeys = widgetsList
                .map(w => mapFeIdToDbKey(w.id))
                .filter(key => [
                    "net_profit_margin",
                    "revenue_vs_expenses",
                    "liquidity",
                    "cash_balance",
                    "estimated_tax",
                    "top_expense_categories",
                    "trial_balance_status",
                    "break_even",
                    "receivables",
                    "collection_period",
                    "payables",
                    "inventory",
                    "unbilled_services",
                    "sales_conversion",
                    "revenue_breakdown",
                    "revenue_trend"
                ].includes(key));

            // Construct payload
            const payload = {
                widgets: JSON.stringify(dbWidgetKeys)
            };

            console.log("Saving dashboard config via API...");
            const response = await tokenRequest.post("custom-api/admin/dashboard/config_create_update", payload);

            const savedData = response.data?.data;
            if (savedData) {
                setConfigRecord(Array.isArray(savedData) ? savedData[0] : savedData);
            }
        } catch (error) {
            console.error("Error saving dashboard config to DB:", error);
        }
    };

    const handleSaveClick = () => {
        // Auto-compact widgets before saving
        const compactedWidgets = compactWidgets(activeWidgets);
        setActiveWidgets(compactedWidgets);
        setSavedWidgets(compactedWidgets);
        saveWidgetsToStorage(compactedWidgets);
        saveWidgetsToDb(compactedWidgets);

        setIsCustomizing(false);
        setShowSidebar(false);
        setShowMobileSelector(false);
    };

    const handleManageWidgetsClick = () => {
        if (isMobile) {
            setShowMobileSelector(true);
        } else {
            setShowSidebar(true);
        }
    };

    const handleSidebarClose = () => {
        setShowSidebar(false);
    };

    const handleMobileSelectorClose = () => {
        setShowMobileSelector(false);
    };

    // UPDATED: Enhanced widget management with icon support
    const handleWidgetUpdate = (action, data = null) => {
        // console.log("Widget update:", action, data);

        let updatedWidgets = [];

        switch (action) {
            case "add-widget":
                setActiveWidgets((prev) => {
                    const filtered = prev.filter((w) => w.id !== data.id);
                    // If no position provided or position conflicts, find a safe one
                    let position = data.position;
                    if (
                        !position ||
                        getConflictingWidgetsAtPosition(
                            prev,
                            position,
                            data.colSpan || 1,
                            data.rowSpan || 1
                        ).length > 0
                    ) {
                        position = findNextAvailablePosition(
                            prev,
                            data.colSpan || 1,
                            data.rowSpan || 1
                        );
                    }
                    const newWidget = {
                        id: data.id,
                        type: data.type,
                        title: data.title,
                        value: data.value,
                        // UPDATED: Ensure icon is properly handled
                        icon: data.iconName ? iconMap[data.iconName] : data.icon,
                        iconName: data.iconName || getIconName(data.icon),
                        position: data.position,
                        colSpan: data.colSpan || 1,
                        rowSpan: data.rowSpan || 1,
                    };
                    updatedWidgets = [...filtered, newWidget];
                    return updatedWidgets;
                });
                break;

            case "remove-widget":
                setActiveWidgets((prev) => {
                    updatedWidgets = prev.filter((w) => w.id !== data);
                    return updatedWidgets;
                });
                break;

            case "move-widget":
                setActiveWidgets((prev) => {
                    updatedWidgets = prev.map((widget) => {
                        if (widget.id === data.widgetId) {
                            return {
                                ...widget,
                                position: data.newPosition,
                                // UPDATED: Preserve icon during move
                                icon:
                                    widget.icon ||
                                    (widget.iconName ? iconMap[widget.iconName] : null),
                                iconName: widget.iconName || getIconName(widget.icon),
                            };
                        }
                        return widget;
                    });
                    return updatedWidgets;
                });
                break;

            case "replace-widgets":
                setActiveWidgets((prev) => {
                    const filtered = prev.filter(
                        (w) =>
                            !data.conflictingWidgets.some((conflict) => conflict.id === w.id)
                    );
                    const enhancedNewWidget = {
                        ...data.newWidget,
                        // UPDATED: Ensure icon is restored
                        icon: data.newWidget.iconName
                            ? iconMap[data.newWidget.iconName]
                            : data.newWidget.icon,
                        iconName:
                            data.newWidget.iconName || getIconName(data.newWidget.icon),
                    };
                    updatedWidgets = [...filtered, enhancedNewWidget];
                    return updatedWidgets;
                });
                break;

            case "swap-widgets":
                setActiveWidgets((prev) => {
                    updatedWidgets = prev.map((widget) => {
                        if (widget.id === data.widget1.id) {
                            return {
                                ...widget,
                                position: data.widget2.position,
                                // UPDATED: Preserve icon during swap
                                icon:
                                    widget.icon ||
                                    (widget.iconName ? iconMap[widget.iconName] : null),
                                iconName: widget.iconName || getIconName(widget.icon),
                            };
                        }
                        if (widget.id === data.widget2.id) {
                            return {
                                ...widget,
                                position: data.widget1.position,
                                // UPDATED: Preserve icon during swap
                                icon:
                                    widget.icon ||
                                    (widget.iconName ? iconMap[widget.iconName] : null),
                                iconName: widget.iconName || getIconName(widget.icon),
                            };
                        }
                        return widget;
                    });
                    return updatedWidgets;
                });
                break;

            default:
                console.warn("Unknown widget update action:", action);
                return; // Don't save if unknown action
        }

        // Auto-save after widget updates (only if not customizing)
        if (!isCustomizing && updatedWidgets.length >= 0) {
            setTimeout(() => {
                saveWidgetsToStorage(updatedWidgets);
                saveWidgetsToDb(updatedWidgets);
            }, 100);
        }
    };

    const getActiveWidgetIds = () => {
        return activeWidgets.map((w) => w.id);
    };

    // Rest of your existing functions remain the same...
    const findNextAvailablePosition = (
        existingWidgets,
        colSpan = 1,
        rowSpan = 1
    ) => {
        const maxCol = isMobile ? 1 : 3; // Respect mobile/desktop grid
        // Clamp colSpan to maximum 2 columns so it never spans full width in a 3-column layout
        const clampedColSpan = isMobile ? 1 : Math.min(colSpan, 2);
        let row = 0;
        let col = 0;

        while (true) {
            // Check if the widget would fit at this position
            let canFit = true;

            // Check if it goes beyond grid bounds
            if (col + clampedColSpan > maxCol) {
                canFit = false;
            } else {
                // Check for conflicts with existing widgets
                for (let r = row; r < row + rowSpan && canFit; r++) {
                    for (let c = col; c < col + clampedColSpan && canFit; c++) {
                        const conflictingWidget = existingWidgets.find((widget) => {
                            if (!widget.position) return false;

                            const startRow = widget.position.row;
                            const endRow = startRow + (widget.rowSpan || 1);
                            const startCol = widget.position.col;
                            const endCol = startCol + (widget.colSpan || 1);

                            return r >= startRow && r < endRow && c >= startCol && c < endCol;
                        });

                        if (conflictingWidget) {
                            canFit = false;
                        }
                    }
                }
            }

            if (canFit) {
                return { row, col };
            }

            col++;
            if (col >= maxCol) {
                col = 0;
                row++;
            }
        }
    };

    // Helper function to check for conflicts at a specific position
    const getConflictingWidgetsAtPosition = (
        widgets,
        position,
        colSpan,
        rowSpan
    ) => {
        const conflicts = [];

        for (let row = position.row; row < position.row + rowSpan; row++) {
            for (let col = position.col; col < position.col + colSpan; col++) {
                const conflictingWidget = widgets.find((widget) => {
                    if (!widget.position) return false;

                    const startRow = widget.position.row;
                    const endRow = startRow + (widget.rowSpan || 1);
                    const startCol = widget.position.col;
                    const endCol = startCol + (widget.colSpan || 1);

                    return (
                        row >= startRow && row < endRow && col >= startCol && col < endCol
                    );
                });

                if (conflictingWidget && !conflicts.includes(conflictingWidget)) {
                    conflicts.push(conflictingWidget);
                }
            }
        }

        return conflicts;
    };

    const params = {
        from: "home",
        heading: "Hello, John!",
        subheading:
            "Welcome to Billing – Keep your books, cash flow, and reports all in one place.",
        isCustomizing,
        onCustomizeClick: handleCustomizeClick,
        onCancelClick: handleCancelClick,
        onSaveClick: handleSaveClick,
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            // Check if sidebar is open and click is outside
            if (showSidebar) {
                const sidebar = document.querySelector(".customization-sidebar");
                if (sidebar && !sidebar.contains(e.target)) {
                    // Check if the click target is not a button that opens the sidebar
                    const isOpenButton = e.target.closest("[data-sidebar-trigger]");
                    if (!isOpenButton) {
                        setShowSidebar(false);
                    }
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showSidebar]);

    const showOnboarding = !isLoadingOnboarding && !(supplierCount > 0 && taxCount > 0 && rawMaterialCount > 0);

    return (
        <>
            {/* Desktop Header */}
            <div className="hidden lg:block">
                <AdminNavbar data={params} />
            </div>

            {/* Mobile Header */}
            <div className="lg:hidden">
                <MobileHeader data={params} isMobileCustomizing={isCustomizing} />
            </div>

            {isLoadingDashboard ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] bg-[#F8F8F8]">
                    <Loader message="Loading dashboard widgets..." />
                </div>
            ) : (
                <div className="pt-8 overflow-y-auto pb-10 w-full bg-[#F8F8F8] flex justify-center items-center">
                    <div className="w-full ">
                        {showOnboarding && (
                            <div className="w-full flex xl:flex-row flex-col items-start h-fit md:gap-0 gap-3 2xl:max-w-7xl 2xl:mx-auto 2xl:justify-between 2xl:gap-8">
                                <div className="w-full flex items-center xl:justify-start justify-center flex-wrap">
                                    <img
                                        src="/home-left-image.png"
                                        alt="left-img"
                                        className="sm:h-110  h-80"
                                    />
                                </div>

                                <div className="flex-1 md:flex hidden items-start md:justify-center lg:justify-center xl:justify-start 2xl:justify-start w-full">
                                    <div className="w-full flex flex-wrap md:items-start lg:items-start items-center gap-8">
                                        {/* Wrapper for Cards 1 & 2 - This will center */}
                                        <div className="w-full flex gap-[165px] items-stretch md:max-w-max md:mx-auto lg:max-w-max lg:mx-auto xl:mx-0 xl:max-w-full">
                                            {/* Card 1 - Add Suppliers */}
                                            <div className="relative w-[250px] p-5 border-2 border-black rounded-[24px] bg-[#F8F8F8] h-full pb-2">
                                                <h1 className="text-[16px] font-bold">
                                                    Add Suppliers
                                                </h1>
                                                <p className="text-[13px] mt-1 mb-5 font-semibold leading-[16px]">
                                                    Keep your supplier records organized. Add details like contact info, billing addresses, and defaults to streamline purchasing.
                                                </p>
                                                <div className="relative">
                                                    {supplierCount > 0 ? (
                                                        <img
                                                            src="/tickgreen.png"
                                                            alt="completed"
                                                            className="h-12 "
                                                        />
                                                    ) : (
                                                        <>
                                                            <img
                                                                src="/home-card-images.png"
                                                                alt="home-card-images"
                                                                className="h-12 "
                                                            />
                                                            <span className="absolute top-3 left-3 ">
                                                                1
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="absolute top-[130px] right-[-10px] text-black text-[18px]">
                                                    <IoIosArrowDown />
                                                </div>
                                                <div className="h-5 w-5 bg-[#F8F8F8] absolute top-[142px] right-[-10px]" />
                                                <div className="h-5 w-5 bg-[#F8F8F8] absolute bottom-[-10px] right-[40px]" />
                                            </div>

                                            {/* Card 2 - Add First Raw Material */}
                                            <div className="relative w-[250px] p-5 border-2 border-black rounded-[24px] pb-2 bg-[#F8F8F8] z-[9]">
                                                <h1 className="text-[17px] font-bold">
                                                    Add First Raw Material
                                                </h1>
                                                <p className="text-[12px] font-semibold mt-2 mb-3 leading-[16px]">
                                                    Begin tracking your inventory. Record raw materials with unit rates, minimum stock limits, and suppliers to manage production.
                                                </p>
                                                <div className="relative">
                                                    {rawMaterialCount > 0 ? (
                                                        <img
                                                            src="/tickgreen.png"
                                                            alt="completed"
                                                            className="h-12 "
                                                        />
                                                    ) : (
                                                        <>
                                                            <img
                                                                src="/home-card-images.png"
                                                                alt="home-card-images"
                                                                className="h-12 "
                                                            />
                                                            <span className="absolute top-3 left-2.5 ">
                                                                3
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 3 - Add Tax Template */}
                                        <div className="relative w-[250px] p-5 border-2 border-black rounded-[24px] bg-[#F8F8F8] mt-[-100px] ml-[208px] pb-2 md:ml-[calc(50%-125px)] lg:ml-[calc(50%-125px)] xl:ml-[208px]">
                                            <h1 className="text-[17px] font-bold w-[80%]">
                                                Add Tax Template
                                            </h1>
                                            <p className="text-[12px] font-semibold mt-2 mb-3 leading-[16px]">
                                                Define tax rates for your transactions. Set up CGST, SGST, and custom taxes to automatically calculate invoices and payments.
                                            </p>
                                            <div className="relative">
                                                {taxCount > 0 ? (
                                                    <img
                                                        src="/tickgreen.png"
                                                        alt="completed"
                                                        className="h-12 "
                                                    />
                                                ) : (
                                                    <>
                                                        <img
                                                            src="/home-card-images.png"
                                                            alt="home-card-images"
                                                            className="h-12 "
                                                        />
                                                        <span className="absolute top-3 left-2.5 ">
                                                            2
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="absolute top-[79px] right-[-10px] text-black text-[18px]">
                                                <IoIosArrowDown className="rotate-180" />
                                            </div>
                                            <div className="h-5 w-5 bg-[#F8F8F8] absolute top-[-10px] right-[40px]" />
                                            <div className="h-5 w-5 bg-[#F8F8F8] absolute top-[65px] right-[-10px]" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 md:hidden flex justify-center items-center w-full pb-4">
                                    <div className="w-full flex flex-col gap-6 items-center">
                                        {/* Card 1 - Add Suppliers */}
                                        <div className="relative w-[250px] p-5 border-2 border-black rounded-[24px] bg-[#F8F8F8] h-full pb-2">
                                            <h1 className="text-[16px] font-bold">
                                                Add Suppliers
                                            </h1>
                                            <p className="text-xs mt-1 mb-5 font-semibold leading-[16px]">
                                                Keep your supplier records organized. Add details like contact info, billing addresses, and defaults to streamline purchasing.
                                            </p>
                                            <div className="relative">
                                                {supplierCount > 0 ? (
                                                    <img
                                                        src="/tickgreen.png"
                                                        alt="completed"
                                                        className="h-12 "
                                                    />
                                                ) : (
                                                    <>
                                                        <img
                                                            src="/home-card-images.png"
                                                            alt="home-card-images"
                                                            className="h-12 "
                                                        />
                                                        <span className="absolute top-3 left-2.5 ">
                                                            1
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="absolute top-[110px] right-[-10px] text-black text-[18px]">
                                                <IoIosArrowDown />
                                            </div>
                                            <div className="h-[90px] w-[60px] bg-[#F8F8F8] absolute top-[123px] right-[-10px]" />
                                            <div className="h-[60px] w-[72px] bg-[#F8F8F8] absolute bottom-[-9px] right-[10px]" />
                                        </div>

                                        {/* Card 3 - Add Tax Template */}
                                        <div className="relative w-[250px] p-5 border-2 border-black rounded-[24px] bg-[#F8F8F8] pb-2">
                                            <h1 className="text-[17px] font-bold w-[80%]">
                                                Add Tax Template
                                            </h1>
                                            <p className="text-xs font-semibold mt-2 mb-3 leading-[16px]">
                                                Define tax rates for your transactions. Set up CGST, SGST, and custom taxes to automatically calculate invoices and payments.
                                            </p>
                                            <div className="relative">
                                                {taxCount > 0 ? (
                                                    <img
                                                        src="/tickgreen.png"
                                                        alt="completed"
                                                        className="h-12 "
                                                    />
                                                ) : (
                                                    <>
                                                        <img
                                                            src="/home-card-images.png"
                                                            alt="home-card-images"
                                                            className="h-12 "
                                                        />
                                                        <span className="absolute top-3 left-2.5 ">
                                                            2
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="absolute top-[110px] right-[-10px] text-black text-[18px]">
                                                <IoIosArrowDown />
                                            </div>
                                            <div className="h-[90px] w-[60px] bg-[#F8F8F8] absolute top-[123px] right-[-16px]" />
                                            <div className="h-[60px] w-[88px] bg-[#F8F8F8] absolute bottom-[-9px] right-[0px]" />
                                        </div>

                                        {/* Card 2 - Add First Raw Material */}
                                        <div className="relative w-[250px] p-5 border-2 border-black rounded-[24px] pb-2 bg-[#F8F8F8] z-[9]">
                                            <h1 className="text-[17px] font-bold">
                                                Add First Raw Material
                                            </h1>
                                            <p className="text-xs font-semibold mt-2 mb-3 leading-[16px]">
                                                Begin tracking your inventory. Record raw materials with unit rates, minimum stock limits, and suppliers to manage production.
                                            </p>
                                            <div className="relative">
                                                {rawMaterialCount > 0 ? (
                                                    <img
                                                        src="/tickgreen.png"
                                                        alt="completed"
                                                        className="h-12 "
                                                    />
                                                ) : (
                                                    <>
                                                        <img
                                                            src="/home-card-images.png"
                                                            alt="home-card-images"
                                                            className="h-12 "
                                                        />
                                                        <span className="absolute top-3 left-2.5 ">
                                                            3
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="absolute top-[110px] right-[-10px] text-black text-[18px]">
                                                <IoIosArrowDown />
                                            </div>
                                            <div className="h-[90px] w-[60px] bg-[#F8F8F8] absolute top-[123px] right-[-16px]" />
                                            <div className="h-[60px] w-[72px] bg-[#F8F8F8] absolute bottom-[-9px] right-[10px]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={activityRef} className="pt-2 mt-2  ">
                            {/* Desktop customization info banner */}
                            {isCustomizing && !isMobile && (
                                <div className="mb-4 p-4 bg-[#644c98eb]/10 border border-[#644c98eb]/30 rounded-lg flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 bg-[#644c98eb] rounded-full flex items-center justify-center shrink-0">
                                            <span className="text-white text-sm">i</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#644c98eb]">
                                                You&apos;re customizing your homepage.
                                            </p>
                                            <p className="text-sm text-[#644c98eb]/80">
                                                Add or remove widgets, then save your changes to finalize
                                                the customization.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        data-sidebar-trigger="true"
                                        onClick={handleManageWidgetsClick}
                                        className="px-4 py-2 text-[#644c98eb] text-nowrap border border-[#644c98eb]/40 rounded-md hover:bg-[#644c98eb]/10 transition-colors flex items-center gap-2 font-semibold"
                                    >
                                        <FaPlus className="text-sm" />
                                        Manage widgets
                                    </button>
                                </div>
                            )}

                            {/* Mobile customization info banner */}
                            {isCustomizing && isMobile && (
                                <div className="mb-4 p-3 bg-[#644c98eb]/10 border border-[#644c98eb]/30 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-5 h-5 bg-[#644c98eb] rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs">i</span>
                                        </div>
                                        <p className="font-medium text-[#644c98eb] text-sm">
                                            Customizing your dashboard
                                        </p>
                                    </div>
                                    <p className="text-xs text-[#644c98eb]/80 mb-3">
                                        Tap &quot;Select Widgets&quot; below to add or remove widgets, then save
                                        your changes.
                                    </p>
                                    <button
                                        onClick={handleManageWidgetsClick}
                                        className="w-full py-2 text-[#644c98eb] border border-[#644c98eb]/40 rounded-md hover:bg-[#644c98eb]/10 transition-colors text-sm font-semibold"
                                    >
                                        Select Widgets
                                    </button>
                                </div>
                            )}

                            <Activity
                                isCustomizing={isCustomizing}
                                activeWidgets={activeWidgets}
                                onWidgetUpdate={handleWidgetUpdate}
                                onManageWidgetsClick={handleManageWidgetsClick}
                                isMobile={isMobile}
                                dashboardData={dashboardData}
                            />
                        </div>
                        {/* Desktop Manage Widgets Button - Bottom of page */}
                        {isCustomizing && (
                            <div className="w-full flex justify-center mt-8 mb-6 border border-dashed border-[#FFCA00] rounded-xl bg-[#FFCA00]/5 hover:bg-[#d9ac00]/10 p-4">
                                <button
                                    className="px-6 py-3 text-[#FFCA00] text-nowrap font-semibold cursor-pointer transition-colors flex items-center gap-3"
                                    onClick={handleManageWidgetsClick}
                                >
                                    <FaPlus />
                                    Manage Widgets
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Desktop Customization Sidebar */}
            {!isMobile && (
                <CustomizationSidebar
                    isOpen={showSidebar}
                    onClose={handleSidebarClose}
                    activeWidgets={getActiveWidgetIds()}
                    onWidgetUpdate={handleWidgetUpdate}
                />
            )}

            {/* Mobile Widget Selector */}
            {isMobile && (
                <MobileWidgetSelector
                    isOpen={showMobileSelector}
                    onClose={handleMobileSelectorClose}
                    activeWidgets={getActiveWidgetIds()}
                    activeWidgetsData={activeWidgets}
                    onWidgetUpdate={handleWidgetUpdate}
                />
            )}
        </>
    );
}

export default AdminHome;
