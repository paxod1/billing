"use client";

import { widgetComponents, widgetConfigs } from "@/components/widgets";
import React, { useState } from "react";
import { AiOutlinePlus } from "react-icons/ai";
import { IoClose } from "react-icons/io5";
import { FaPlus } from "react-icons/fa";

import { iconMap } from "@/utils/IconMapping";

function Activity({
    isCustomizing,
    activeWidgets,
    onWidgetUpdate,
    onManageWidgetsClick,
    isMobile = false,
    dashboardData = null,
}) {
    const [dragOverPosition, setDragOverPosition] = useState(null);
    const [dragOverSpan, setDragOverSpan] = useState(null);
    const [draggedWidget, setDraggedWidget] = useState(null);

    // Grid configuration
    const GRID_COLS = isMobile ? 1 : 3;

    const handleDragOver = (e) => {
        if (isMobile) return;
        e.preventDefault();

        const dragData = e.dataTransfer.getData("widget-data");
        if (dragData) {
            try {
                const parsed = JSON.parse(dragData);
                e.dataTransfer.dropEffect =
                    parsed.source === "existing" ? "move" : "copy";
            } catch {
                e.dataTransfer.dropEffect = "copy";
            }
        }
    };

    const handleDragEnter = (e, position) => {
        if (isMobile) return;
        e.preventDefault();

        const dragData = e.dataTransfer.getData("widget-data");
        if (dragData) {
            try {
                const widgetData = JSON.parse(dragData);
                const config = widgetConfigs[widgetData.type] || {
                    colSpan: 1,
                    rowSpan: 1,
                };
                const colSpan = widgetData.colSpan || config.colSpan;
                const rowSpan = widgetData.rowSpan || config.rowSpan;

                setDragOverPosition(position);
                setDragOverSpan({ colSpan, rowSpan, mode: widgetData.source });
            } catch {
                setDragOverPosition(position);
                setDragOverSpan({ colSpan: 1, rowSpan: 1, mode: "sidebar" });
            }
        }
    };

    const handleDragLeave = (e) => {
        if (isMobile) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setDragOverPosition(null);
            setDragOverSpan(null);
        }
    };

    const removeWidget = (widgetId) => {
        onWidgetUpdate("remove-widget", widgetId);
    };

    const handleWidgetDragStart = (e, widget) => {
        if (!isCustomizing || isMobile) {
            e.preventDefault();
            return;
        }

        e.stopPropagation();

        const widgetData = {
            id: widget.id,
            type: widget.type,
            title: widget.title,
            value: widget.value,
            iconName: widget.iconName || (widget.icon ? widget.icon.name : null),
            colSpan: widget.colSpan || 1,
            rowSpan: widget.rowSpan || 1,
            position: widget.position,
            source: "existing",
        };

        e.dataTransfer.setData("widget-data", JSON.stringify(widgetData));
        e.dataTransfer.effectAllowed = "move";
        setDraggedWidget(widget);
        e.target.classList.add("dragging");
    };

    const handleDrop = (e, position) => {
        if (isMobile) return;
        e.preventDefault();
        e.stopPropagation();
        setDragOverPosition(null);
        setDragOverSpan(null);

        const dragData = e.dataTransfer.getData("widget-data");

        if (!dragData) {
            console.error("No widget data found in drop event");
            return;
        }

        try {
            const widgetData = JSON.parse(dragData);

            if (widgetData.iconName && !widgetData.icon) {
                widgetData.icon = iconMap[widgetData.iconName];
            }

            // Check if this is an existing widget being moved
            if (widgetData.source === "existing") {
                const draggedWidget = activeWidgets.find((w) => w.id === widgetData.id);

                if (!draggedWidget) {
                    console.error("Dragged widget not found in active widgets");
                    return;
                }

                const targetWidget = getWidgetAtPosition(position.row, position.col);

                if (targetWidget && draggedWidget.id !== targetWidget.id) {
                    // SWAP the two widgets
                    onWidgetUpdate("swap-widgets", {
                        widget1: draggedWidget,
                        widget2: targetWidget,
                    });
                    return;
                }

                // If dropping on empty space, just move
                if (!targetWidget) {
                    const canFit = canWidgetFitAtPosition(
                        position.row,
                        position.col,
                        draggedWidget.colSpan || 1,
                        draggedWidget.rowSpan || 1,
                        draggedWidget.id
                    );

                    if (canFit) {
                        onWidgetUpdate("move-widget", {
                            widgetId: draggedWidget.id,
                            newPosition: position,
                        });
                    } else {
                        console.log("Widget doesn't fit at this position");
                    }
                    return;
                }

                if (targetWidget && draggedWidget.id === targetWidget.id) {
                    return;
                }
            } else {
                // This is a new widget from sidebar - ALLOW FREE POSITIONING
                const config = widgetConfigs[widgetData.type] || {
                    colSpan: 1,
                    rowSpan: 1,
                };

                const colSpan = isMobile ? 1 : config.colSpan;

                if (position.col + colSpan > GRID_COLS) {
                    console.log("Widget doesn't fit in grid bounds");
                    return;
                }

                const targetWidget = getWidgetAtPosition(position.row, position.col);

                if (targetWidget) {
                    // Replace the existing widget
                    const newWidget = {
                        ...widgetData,
                        position,
                        colSpan: colSpan,
                        rowSpan: config.rowSpan,
                        id: widgetData.id || `${widgetData.type}-${Date.now()}`,
                        icon: widgetData.icon,
                    };

                    onWidgetUpdate("replace-widgets", {
                        newWidget,
                        conflictingWidgets: [targetWidget],
                    });
                } else {
                    // Check for any conflicting widgets in the area
                    const conflictingWidgets = getConflictingWidgets(
                        position.row,
                        position.col,
                        colSpan,
                        config.rowSpan
                    );

                    const newWidget = {
                        ...widgetData,
                        position, // USE THE EXACT DROP POSITION - NO AUTO-FILL
                        colSpan: colSpan,
                        rowSpan: config.rowSpan,
                        id: widgetData.id || `${widgetData.type}-${Date.now()}`,
                        icon: widgetData.icon,
                    };

                    if (conflictingWidgets.length > 0) {
                        onWidgetUpdate("replace-widgets", {
                            newWidget,
                            conflictingWidgets,
                        });
                    } else {
                        onWidgetUpdate("add-widget", newWidget);
                    }
                }
            }
        } catch (error) {
            console.error("Drop handling error:", error);
        }
    };

    const handleWidgetDragEnd = (e) => {
        if (e.target) {
            e.target.classList.remove("dragging");
        }

        const draggingElements = document.querySelectorAll(".dragging");
        draggingElements.forEach((el) => {
            el.classList.remove("dragging");
        });

        setDraggedWidget(null);
        setDragOverPosition(null);
        setDragOverSpan(null);
    };

    // Helper functions
    const canWidgetFitAtPosition = (
        startRow,
        startCol,
        colSpan,
        rowSpan,
        excludeWidgetId = null
    ) => {
        if (startCol + colSpan > GRID_COLS) {
            return false;
        }

        for (let row = startRow; row < startRow + rowSpan; row++) {
            for (let col = startCol; col < startCol + colSpan; col++) {
                const existingWidget = getWidgetAtPosition(row, col);
                if (existingWidget && existingWidget.id !== excludeWidgetId) {
                    return false;
                }
            }
        }

        return true;
    };

    const getConflictingWidgets = (
        startRow,
        startCol,
        colSpan,
        rowSpan,
        excludeWidgetId = null
    ) => {
        const conflicts = new Set();

        for (let row = startRow; row < startRow + rowSpan; row++) {
            for (let col = startCol; col < startCol + colSpan; col++) {
                const widget = getWidgetAtPosition(row, col);
                if (widget && widget.id !== excludeWidgetId) {
                    conflicts.add(widget);
                }
            }
        }

        return Array.from(conflicts);
    };

    const isPositionOccupied = (row, col) => {
        return activeWidgets.some((widget) => {
            const startRow = widget.position.row;
            const endRow = startRow + (widget.rowSpan || 1);
            const startCol = widget.position.col;
            const endCol = startCol + (widget.colSpan || 1);

            return row >= startRow && row < endRow && col >= startCol && col < endCol;
        });
    };

    const getWidgetAtPosition = (row, col) => {
        return activeWidgets.find((widget) => {
            const startRow = widget.position.row;
            const endRow = startRow + (widget.rowSpan || 1);
            const startCol = widget.position.col;
            const endCol = startCol + (widget.colSpan || 1);

            return row >= startRow && row < endRow && col >= startCol && col < endCol;
        });
    };

    const shouldHighlightPosition = (row, col) => {
        if (!dragOverPosition || !dragOverSpan || isMobile) return null;

        const startRow = dragOverPosition.row;
        const endRow = startRow + dragOverSpan.rowSpan;
        const startCol = dragOverPosition.col;
        const endCol = startCol + dragOverSpan.colSpan;

        if (row >= startRow && row < endRow && col >= startCol && col < endCol) {
            return dragOverSpan.mode;
        }
        return null;
    };

    const renderWidget = (widget) => {
        const WidgetComponent = widgetComponents[widget.type];

        if (!WidgetComponent) {
            return (
                <div className="w-full h-full p-4 rounded-lg bg-white">
                    <h3 className="font-bold text-lg">{widget.title || widget.type}</h3>
                    <p className="text-sm text-gray-500">
                        Unknown widget type: {widget.type}
                    </p>
                </div>
            );
        }

        return <WidgetComponent {...widget} apiData={dashboardData} />;
    };

    const getRequiredRows = () => {
        if (activeWidgets.length === 0) return 4;

        const maxRow = Math.max(
            ...activeWidgets.map((w) => w.position.row + (w.rowSpan || 1))
        );

        const TOTAL_AVAILABLE_WIDGETS = 17;
        const remainingWidgets = TOTAL_AVAILABLE_WIDGETS - activeWidgets.length;

        console.log("getRequiredRows:", {
            maxRow,
            isCustomizing,
            activeCount: activeWidgets.length,
            remainingWidgets,
            willReturn: isCustomizing
                ? remainingWidgets <= 0
                    ? maxRow
                    : maxRow + 1
                : maxRow,
        });

        if (isCustomizing) {
            // If all widgets are added (0 remaining), don't show ANY extra rows
            if (remainingWidgets <= 0) {
                return maxRow; // NO BUFFER - Shows only 1 empty slot naturally
            }

            // Otherwise show just 1 extra row (3 slots) as buffer
            return maxRow + 1;
        }

        // Normal mode: compact view, no extra empty slots
        return maxRow;
    };

    const AddWidgetButton = ({ onClick }) => (
        <div
            className="w-full h-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#FFCA00] rounded-2xl bg-gradient-to-br from-[#FFCA00]/5 to-[#FFCA00]/10 hover:from-[#FFCA00]/10 hover:to-[#FFCA00]/20 transition-all cursor-pointer group"
            onClick={onClick}
        >
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <FaPlus className="text-2xl text-[#FFCA00]" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-semibold text-[#FFCA00] mb-2">
                    Add Widget
                </h3>
                <p className="text-sm text-gray-600">
                    {isMobile
                        ? "Tap to select widgets"
                        : "Click to browse available widgets"}
                </p>
            </div>
        </div>
    );

    const renderMobileWidgets = () => {
        if (activeWidgets.length === 0) {
            return (
                <div className="text-center py-10 text-gray-500">
                    <h3 className="text-xl font-semibold mb-2">No widgets added yet</h3>
                    <p className="mb-4">
                        {isCustomizing
                            ? "Tap 'Select Widgets' to add widgets to your dashboard"
                            : "Tap 'Customize' to start adding widgets to your dashboard"}
                    </p>
                    {isCustomizing && (
                        <button
                            onClick={onManageWidgetsClick}
                            className="px-6 py-3 bg-[#FFCA00] text-[#353333] rounded-lg font-semibold hover:bg-[#d9ac00]"
                        >
                            Select Widgets
                        </button>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {activeWidgets.map((widget) => (
                    <div
                        key={widget.id}
                        className="relative border border-[#CCC5C5] rounded-lg bg-white shadow-sm"
                    >
                        {isCustomizing && (
                            <button
                                className="absolute -top-2 -right-2 p-1 flex items-center justify-center bg-[#D9D9D9] hover:bg-gray-400 hover:text-white text-black rounded-full text-sm font-bold z-10 transition-colors"
                                onClick={() => removeWidget(widget.id)}
                            >
                                <IoClose />
                            </button>
                        )}
                        <div className="h-full">{renderWidget(widget)}</div>
                    </div>
                ))}
            </div>
        );
    };

    const renderGrid = () => {
        const cells = [];
        const requiredRows = getRequiredRows();
        let emptySlotsRendered = 0;

        // Debug: Log grid calculation
        console.log("Grid Debug:", {
            requiredRows,
            gridCols: GRID_COLS,
            totalCells: requiredRows * GRID_COLS,
            activeWidgetsCount: activeWidgets.length,
            isCustomizing,
        });

        // Hide plus cards when not customizing or when all 17 widgets are added
        const remainingWidgets = 17 - activeWidgets.length;
        const showPlusCards = isCustomizing && remainingWidgets > 0;

        for (let row = 0; row < requiredRows; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const widget = getWidgetAtPosition(row, col);
                const isOccupied = isPositionOccupied(row, col);
                const isMainPosition =
                    widget && widget.position.row === row && widget.position.col === col;

                if (isOccupied && !isMainPosition) {
                    continue;
                }

                if (!isOccupied) {
                    emptySlotsRendered++;
                }

                const position = { row, col };
                const highlightMode = shouldHighlightPosition(row, col);

                cells.push(
                    <div
                        key={`${row}-${col}`}
                        className={`
               rounded-2xl relative transition-all h-[180px] min-h-[180px]
              ${isOccupied
                                ? ""
                                : showPlusCards
                                    ? `border-dashed ${highlightMode === "sidebar"
                                        ? "border-green-500 bg-green-50 scale-105"
                                        : highlightMode === "existing"
                                            ? "border-blue-500 bg-blue-50 scale-105"
                                            : "border-[#CCC5C5] bg-gray-50"
                                    }`
                                    : "pointer-events-none"
                            }
             `}
                        style={{
                            gridColumn:
                                isMainPosition && widget.colSpan > 1
                                    ? `span ${Math.min(widget.colSpan, 2)}`
                                    : "auto",
                            gridRow:
                                isMainPosition && widget.rowSpan > 1
                                    ? `span ${widget.rowSpan}`
                                    : "auto",
                        }}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, position)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, position)}
                    >
                        {isMainPosition && isCustomizing && (
                            <button
                                className="absolute -top-2 -right-2 p-1 flex items-center justify-center bg-[#D9D9D9] hover:bg-gray-400 hover:text-white text-black rounded-full text-sm font-bold z-10 transition-colors"
                                onClick={() => removeWidget(widget.id)}
                            >
                                <IoClose />
                            </button>
                        )}

                        {isMainPosition ? (
                            <div
                                draggable={isCustomizing && !isMobile}
                                onDragStart={(e) => handleWidgetDragStart(e, widget)}
                                onDragEnd={handleWidgetDragEnd}
                                className={`${isCustomizing && !isMobile ? "cursor-move" : ""
                                    } h-full`}
                                style={{
                                    userSelect: isCustomizing && !isMobile ? "none" : "auto",
                                    WebkitUserDrag:
                                        isCustomizing && !isMobile ? "element" : "none",
                                }}
                            >
                                <div
                                    style={{
                                        pointerEvents: isCustomizing && !isMobile ? "none" : "auto",
                                    }}
                                    className="h-full"
                                >
                                    {renderWidget(widget)}
                                </div>
                            </div>
                        ) : showPlusCards ? (
                            <div className="w-full h-full flex justify-center items-center bg-white rounded-2xl">
                                <AddWidgetButton onClick={onManageWidgetsClick} />
                            </div>
                        ) : null}
                    </div>
                );
            }
        }

        return cells;
    };

    if (isMobile) {
        return <div className="w-full">{renderMobileWidgets()}</div>;
    }

    return (
        <div className="w-full">
            <div
                className="grid gap-x-8 gap-y-6"
                style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
            >
                {renderGrid()}
            </div>

            {activeWidgets.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    <h3 className="text-xl font-semibold mb-2">No widgets added yet</h3>
                    <p>
                        {isCustomizing
                            ? "Click the + buttons above to add widgets"
                            : "Click 'Customize' to start adding widgets to your dashboard"}
                    </p>
                </div>
            )}
        </div>
    );
}

export default Activity;
