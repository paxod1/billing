"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { widgetComponents } from "../widgets";

import { iconMap } from "@/utils/IconMapping";

function MobileWidgetSelector({
    isOpen,
    onClose,
    activeWidgets = [],
    onWidgetUpdate,
}) {
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

    const isWidgetActive = (widgetId) => {
        return activeWidgets.includes(widgetId);
    };

    const handleWidgetToggle = (widget) => {
        const isActive = isWidgetActive(widget.id);

        if (isActive) {
            // Remove widget
            onWidgetUpdate("remove-widget", widget.id);
        } else {
            // Add widget - find an empty position
            const newPosition = findEmptyPosition();
            const newWidget = {
                ...widget,
                position: newPosition,
                colSpan: 1,
                rowSpan: 1,
                // IMPORTANT: Restore icon from iconName
                icon: widget.iconName ? iconMap[widget.iconName] : widget.icon,
            };
            onWidgetUpdate("add-widget", newWidget);
        }
    };

    const findEmptyPosition = () => {
        const maxCol = 3;
        let row = 0;
        let col = 0;

        // Get all existing widgets from activeWidgets (need actual widget objects, not just IDs)
        // We need to get this from the parent component or localStorage
        const existingWidgets = getExistingWidgets();

        while (true) {
            const isOccupied = existingWidgets.some((widget) => {
                if (!widget.position) return false;

                const startRow = widget.position.row;
                const endRow = startRow + (widget.rowSpan || 1);
                const startCol = widget.position.col;
                const endCol = startCol + (widget.colSpan || 1);

                return (
                    row >= startRow && row < endRow && col >= startCol && col < endCol
                );
            });

            if (!isOccupied) {
                return { row, col };
            }

            col++;
            if (col >= maxCol) {
                col = 0;
                row++;
            }
        }
    };

    const getExistingWidgets = () => {
        if (typeof window === "undefined") return [];
        try {
            const saved = localStorage.getItem("dashboard-widgets-leads");
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.warn("Could not load saved widgets:", error);
        }
        return [];
    };

    const renderWidgetPreview = (widget) => {
        const WidgetComponent = widgetComponents[widget.type];

        if (!WidgetComponent) return null;

        // Create widget with proper icon for preview
        const widgetWithIcon = {
            ...widget,
            // IMPORTANT: Restore icon for preview
            icon: widget.iconName ? iconMap[widget.iconName] : widget.icon,
        };
        return (
            <div className="h-auto border rounded-lg bg-gray-50 w-full">
                <div
                    style={{
                        pointerEvents: "none",
                    }}
                >
                    <WidgetComponent {...widgetWithIcon} isPreview={true} />
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50 lg:hidden"
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{
                            type: "spring",
                            damping: 35,
                            stiffness: 300,
                        }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl max-h-[80vh] overflow-y-auto hide-scrollbar z-[51] lg:hidden"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-[10002]">
                            <div>
                                <h2 className="text-lg font-bold">Select Widgets</h2>
                                <p className="text-sm text-gray-600">
                                    Choose widgets to display on your dashboard
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Widget sections */}
                        <div className="p-4">
                            {availableWidgets.map((section, sectionIndex) => {
                                const availableInSection = section.widgets.filter(
                                    (widget) => !isWidgetActive(widget.id)
                                );

                                return (
                                    <motion.div
                                        key={section.section}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            delay: sectionIndex * 0.1,
                                            duration: 0.3,
                                        }}
                                        className="mb-6"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-gray-800">
                                                {section.section}
                                            </h3>
                                            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                                                {
                                                    section.widgets.filter((w) => isWidgetActive(w.id))
                                                        .length
                                                }
                                                /{section.widgets.length} active
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {section.widgets.map((widget, widgetIndex) => {
                                                const isActive = isWidgetActive(widget.id);
                                                return (
                                                    <motion.div
                                                        key={widget.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{
                                                            delay: sectionIndex * 0.1 + widgetIndex * 0.05,
                                                            duration: 0.3,
                                                        }}
                                                        className={`p-3 border rounded-lg transition-all ${isActive
                                                            ? "bg-[#FFCA00]/5 border-[#FFCA00]"
                                                            : "bg-white border-gray-200"
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            {/* Widget preview */}
                                                            <div className="mt-2 w-full flex flex-1">
                                                                {renderWidgetPreview(widget)}
                                                            </div>
                                                            <div className="flex justify-end gap-3 items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isActive}
                                                                    onChange={() => handleWidgetToggle(widget)}
                                                                    className="w-5 h-5 text-[#FFCA00] border-gray-300 rounded focus:ring-[#FFCA00] accent-[#FFCA00] cursor-pointer"
                                                                />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default MobileWidgetSelector;