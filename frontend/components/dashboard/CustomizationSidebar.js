"use client";

import React, { useEffect, useRef } from "react";
import { CgCloseO } from "react-icons/cg";
import { widgetComponents, widgetConfigs } from "../widgets";
import { iconMap } from "@/utils/IconMapping";

function CustomizationSidebar({
    isOpen,
    onClose,
    activeWidgets = [],
    onWidgetUpdate,
}) {
    const sidebarRef = useRef(null);
    const draggedOutside = useRef(false);

    // Widget definitions with metadata
    const availableWidgets = [
        // Finance Section
        {
            section: "Finance",
            widgets: [
                {
                    id: "net-profit-margin",
                    type: "net-profit-margin",
                    title: "Net Profit Margin (%)",
                    description: "Monitor monthly net profit, income, and expenses",
                },
                {
                    id: "revenue-vs-expenses",
                    type: "revenue-vs-expenses",
                    title: "Total Revenue vs. Total Expenses",
                    description: "Track total revenue generated compared to expenses",
                },
                {
                    id: "liquidity-ratio",
                    type: "liquidity-ratio",
                    title: "Current Liquidity Ratio",
                    description: "Current cash + receivables compared to accounts payable",
                },
                {
                    id: "cash-balance",
                    type: "cash-balance",
                    title: "Available Cash Balance",
                    description: "Per Chart of Accounts liquid cash reserves in bank",
                },
                {
                    id: "estimated-tax",
                    type: "estimated-tax",
                    title: "Estimated Tax Liability",
                    description: "Blended 18% GST estimate on current month net income",
                },
                {
                    id: "break-even",
                    type: "break-even",
                    title: "Break-Even Progress",
                    description: "Monthly break-even progress percentages and net surplus",
                },
                {
                    id: "trial-balance",
                    type: "trial-balance",
                    title: "Trial Balance Consistency Status",
                    description: "Debit and credit double-entry consistency audit status",
                },
            ],
        },
        // Operations Section
        {
            section: "Operations",
            widgets: [
                {
                    id: "receivables-aging",
                    type: "receivables-aging",
                    title: "Total Receivables & Overdue Aging",
                    description: "Total unpaid receivables with standard aging cohorts",
                },
                {
                    id: "payables-obligations",
                    type: "payables-obligations",
                    title: "Total Payables & Upcoming Obligations",
                    description: "Total due supplier payables and aging obligations list",
                },
                {
                    id: "collection-period",
                    type: "collection-period",
                    title: "Average Collection Period",
                    description: "Average days elapsed to collect cash from customers",
                },
                {
                    id: "inventory-status",
                    type: "inventory-status",
                    title: "Inventory Valuation & Turnover",
                    description: "Live valuation, low stock warnings, and top items",
                },
                {
                    id: "top-expenses",
                    type: "top-expenses",
                    title: "Top 5 Expense Categories",
                    description: "Top operational and COGS expenses this month",
                },
                {
                    id: "unbilled-services",
                    type: "unbilled-services",
                    title: "Unbilled Service Value",
                    description: "Pending draft time and mileage value tracker",
                },
            ],
        },
        // Sales Performance
        {
            section: "Sales Performance",
            widgets: [
                {
                    id: "sales-conversion",
                    type: "sales-conversion",
                    title: "Sales Conversion Rate",
                    description: "Conversion rates and estimations to quotes metrics",
                },
                {
                    id: "revenue-breakdown",
                    type: "revenue-breakdown",
                    title: "Revenue Breakdown",
                    description: "Revenue segments by products, customized, and services",
                },
            ],
        },
        // Others Section (Legacy Fallbacks)
        {
            section: "Others",
            widgets: [
                {
                    id: "sales-invoice",
                    type: "sales-invoice",
                    title: "Legacy Sales Invoice",
                    value: "0",
                    description: "Simple recent sales stat preview",
                },
                {
                    id: "purchase-invoice",
                    type: "purchase-invoice",
                    title: "Legacy Purchase Invoice",
                    value: "0",
                    description: "Simple recent purchase stat preview",
                },
                {
                    id: "cards",
                    type: "cards",
                    title: "Cards",
                    description: "Quick access legacy integration cards",
                },
            ],
        },
    ];

    // Auto-hide sidebar when dragging outside
    useEffect(() => {
        const handleDragLeave = (e) => {
            if (sidebarRef.current && !sidebarRef.current.contains(e.relatedTarget)) {
                draggedOutside.current = true;
                // Auto-hide sidebar temporarily to reveal drop zones
                if (sidebarRef.current) {
                    sidebarRef.current.style.transform = "translateX(100%)";
                }
            }
        };

        const handleDragEnd = (e) => {
            if (draggedOutside.current && isOpen) {
                // Restore sidebar visibility after drag ends
                if (sidebarRef.current) {
                    sidebarRef.current.style.transform = "translateX(0)";
                }
                draggedOutside.current = false;
            }
        };

        document.addEventListener("dragend", handleDragEnd);
        document.addEventListener("dragleave", handleDragLeave);

        return () => {
            document.removeEventListener("dragend", handleDragEnd);
            document.removeEventListener("dragleave", handleDragLeave);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDragStart = (e, widget) => {
        console.log("Drag started for widget:", widget);
        draggedOutside.current = false;

        const config = widgetConfigs[widget.type] || { colSpan: 1, rowSpan: 1 };
        const widgetData = {
            id: widget.id,
            type: widget.type,
            title: widget.title,
            value: widget.value,
            // FIXED: Properly handle iconName
            iconName: widget.iconName,
            colSpan: config.colSpan,
            rowSpan: config.rowSpan,
            source: "sidebar",
        };

        // Don't include icon component in JSON
        const jsonData = JSON.stringify(widgetData);
        e.dataTransfer.setData("widget-data", jsonData);
        e.dataTransfer.effectAllowed = "copy";

        // Visual feedback
        setTimeout(() => {
            if (e.target) {
                e.target.style.opacity = "0.6";
            }
        }, 0);
    };

    const handleDragEnd = (e) => {
        if (e.target) {
            e.target.style.opacity = "1";
        }
    };

    const isWidgetActive = (widgetId) => {
        return activeWidgets.includes(widgetId);
    };

    const renderDraggableWidget = (widget) => {
        console.log("widget", widget);
        const WidgetComponent = widgetComponents[widget.type];
        const config = widgetConfigs[widget.type] || { colSpan: 1, rowSpan: 1 };

        if (!WidgetComponent) return null;

        // Create widget with proper icon for preview
        const widgetWithIcon = {
            ...widget,
            // IMPORTANT: Restore icon for preview
            icon: widget.iconName ? iconMap[widget.iconName] : widget.icon,
        };

        return (
            <div
                key={widget.id}
                draggable={!isWidgetActive(widget.id)}
                onDragStart={(e) => handleDragStart(e, widget)}
                onDragEnd={handleDragEnd}
                className={`
        mb-4 border border-[#CCC5C5] rounded-lg bg-white hover:shadow-lg transition-all relative overflow-hidden
        ${config.colSpan > 1 ? "h-auto" : "h-auto"}
        ${isWidgetActive(widget.id)
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-move hover:border-[#FFCA00]"
                    }
      `}
                style={{ userSelect: "none" }}
            >
                {/* Actual widget preview */}
                <div className="bg-gray-50 overflow-hidden relative">
                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit absolute top-0 right-0">
                        {config.colSpan}×{config.rowSpan}
                    </div>
                    <div
                        style={{
                            pointerEvents: "none",
                        }}
                    >
                        <WidgetComponent {...widgetWithIcon} isPreview={true} />
                    </div>
                </div>

                {/* Already added overlay */}
                {isWidgetActive(widget.id) && (
                    <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center rounded-lg">
                        <div className="text-center">
                            <div className="w-8 h-8 mx-auto mb-2 bg-green-200 rounded-full flex items-center justify-center">
                                <svg
                                    className="w-5 h-5 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <span className="text-sm text-gray-600 font-medium">
                                Already Added
                            </span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            ref={sidebarRef}
            className="customization-sidebar fixed right-0 top-0 h-full w-96 bg-[#EEEEEE] shadow-lg z-[9999] overflow-y-auto hide-scrollbar p-2.5 transition-transform duration-300"
        >
            {/* Header */}
            <div className="p-3 flex justify-center items-start flex-col relative">
                <h2 className="text-2xl font-bold mb-2">Customize</h2>
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full text-xl transition-colors"
                >
                    <CgCloseO className="text-[1.79rem] cursor-pointer" />
                </button>
                <p className="text-sm text-gray-600 mb-2.5 font-light">
                    Customize your Billing dashboard to track what matters most.
                    Choose the KPIs, reports, and widgets that align with your workflow.
                </p>
                <p className="text-sm text-black font-light">
                    Drag and drop the elements to add them to your dashboard
                </p>
            </div>

            <hr className="bg-gray-500 mx-4 h-[0.075rem]" />

            {/* Widget sections */}
            <div className="p-3">
                {availableWidgets.map((section) => {
                    const availableInSection = section.widgets.filter(
                        (widget) => !isWidgetActive(widget.id)
                    );

                    console.log("availableInSection", availableInSection);

                    return (
                        <div key={section.section} className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-500 text-lg">
                                    {section.section}
                                </h3>
                                <span className="text-xs text-green-400 bg-green-100 px-2 py-1 rounded">
                                    {availableInSection.length} available
                                </span>
                            </div>

                            <div className="space-y-3">
                                {section.widgets.map((widget) => renderDraggableWidget(widget))}
                            </div>

                            {availableInSection.length === 0 && (
                                <div className="text-center py-4 text-gray-500 bg-gray-100 rounded-lg">
                                    <svg
                                        className="w-8 h-8 mx-auto mb-2 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    <p className="text-sm">
                                        All {section.section.toLowerCase()} widgets have been added
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* All widgets added state */}
                {activeWidgets.length ===
                    availableWidgets.reduce(
                        (total, section) => total + section.widgets.length,
                        0
                    ) && (
                        <div className="text-center py-8 text-gray-500">
                            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                                <svg
                                    className="w-8 h-8 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <h4 className="font-semibold mb-2">All widgets added!</h4>
                            <p className="text-sm">
                                You can remove widgets from the dashboard to add different ones.
                            </p>
                        </div>
                    )}

                {/* Help text */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Tips:</h4>
                    <ul className="list-disc list-outside text-sm text-blue-700 space-y-1 marker:text-blue-600 pl-5">
                        <li>Drag widgets to empty spaces on your dashboard</li>
                        <li>Some widgets need multiple columns (shown as 2×1)</li>
                        <li>Drop on existing widgets to replace them</li>
                        <li>Drag widgets on each other to swap positions</li>
                        <li>Click the X button on widgets to remove them</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default CustomizationSidebar;
