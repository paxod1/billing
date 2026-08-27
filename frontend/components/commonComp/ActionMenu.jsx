"use client";

import React, { useEffect, useRef, useState } from "react";
import { FiEdit2, FiTrash2, FiEye, FiPlusCircle } from "react-icons/fi";

const ActionMenu = ({ isOpen, onClose, onEdit, onDelete, onView, onRestock, editDisabled, deleteDisabled, actions = [], children, position = "top-full mt-2", anchorMode = "absolute right-0", style = {} }) => {
    const menuRef = useRef(null);
    const [dynamicPosition, setDynamicPosition] = useState(position);

    React.useLayoutEffect(() => {
        if (!isOpen) {
            setDynamicPosition(position);
            return;
        }
        if (menuRef.current && menuRef.current.parentElement) {
            const rect = menuRef.current.getBoundingClientRect();
            const parentRect = menuRef.current.parentElement.getBoundingClientRect();

            const spaceBelow = window.innerHeight - parentRect.bottom;
            const spaceAbove = parentRect.top;
            const menuHeight = rect.height || 200; // fallback if needed

            // If there's less space below than the menu height, and more space above, flip it
            if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                setDynamicPosition("bottom-full mt-0 mb-2");
            } else {
                setDynamicPosition(position);
            }
        }
    }, [isOpen, position]);

    useEffect(() => {
        const handleEvents = (event) => {
            // For click: close if clicked outside
            if (event.type === 'click' && menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
            // For scroll: close immediately
            if (event.type === 'scroll') {
                onClose();
            }
        };

        if (isOpen) {
            // Use a small timeout to avoid the click that opened the menu from immediately closing it
            const timeoutId = setTimeout(() => {
                window.addEventListener("click", handleEvents);
                window.addEventListener("scroll", handleEvents, true); // Use capture to detect scroll on any element
            }, 0);
            return () => {
                clearTimeout(timeoutId);
                window.removeEventListener("click", handleEvents);
                window.removeEventListener("scroll", handleEvents, true);
            };
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            style={style}
            className={`${anchorMode} ${dynamicPosition} bg-white border border-gray-100 rounded-xl shadow-2xl py-2 z-[50] min-w-[170px] animate-in fade-in zoom-in duration-200`}
        >
            {onView && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onView();
                        onClose();
                    }}
                    className="w-full px-4 py-3 text-left text-[15px] font-medium text-[#374151] hover:bg-gray-50 hover:text-blue-600 transition-colors flex items-center gap-3 cursor-pointer group"
                >
                    <FiEye size={16} className="text-[#374151] group-hover:text-blue-600 transition-colors" /> View
                </button>
            )}
            {onRestock && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRestock();
                        onClose();
                    }}
                    className="w-full px-4 py-3 text-left text-[15px] font-medium text-[#374151] hover:bg-gray-50 transition-colors flex items-center gap-3 group hover:text-[#FFCA00] cursor-pointer group"
                >
                    <FiPlusCircle size={16} className="text-[#374151] group-hover:text-[#FFCA00] transition-colors" /> Restock
                </button>
            )}
            {onEdit && (
                <button
                    disabled={editDisabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!editDisabled) {
                            onEdit();
                            onClose();
                        }
                    }}
                    className={`w-full px-4 py-3 text-left text-[15px] font-medium transition-colors flex items-center gap-3 h-[42px] ${editDisabled ? "opacity-40 cursor-not-allowed text-gray-400" : "text-[#374151] hover:bg-gray-50 group hover:text-blue-600 cursor-pointer"
                        }`}
                >
                    <FiEdit2 size={16} className={editDisabled ? "text-gray-400" : "text-[#374151] group-hover:text-blue-600 transition-colors"} /> Edit
                </button>
            )}
            {onDelete && (
                <button
                    disabled={deleteDisabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!deleteDisabled) {
                            onDelete();
                            onClose();
                        }
                    }}
                    className={`w-full px-4 py-3 text-left text-[15px] font-medium transition-colors flex items-center gap-3 h-[42px] ${deleteDisabled ? "opacity-40 cursor-not-allowed text-gray-400" : "text-[#EF4444] hover:bg-red-50 cursor-pointer"
                        }`}
                >
                    <FiTrash2 size={16} className={deleteDisabled ? "text-gray-400" : "text-[#EF4444]"} /> Delete
                </button>
            )}

            {/* Custom Actions */}
            {actions && actions.length > 0 && actions.map((action, index) => {
                if (action.hide) return null;
                return (
                    <button
                        key={index}
                        disabled={action.disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!action.disabled) {
                                action.onClick();
                                onClose();
                            }
                        }}
                        className={`w-full px-4 py-3 text-left text-[15px] font-medium transition-colors flex items-center gap-3 h-[42px] ${action.disabled
                                ? "opacity-40 cursor-not-allowed grayscale-[0.5]"
                                : action.variant === 'danger'
                                    ? "text-[#EF4444] hover:bg-red-50"
                                    : "text-[#374151] hover:bg-gray-50 group hover:text-blue-600 focus:outline-none"
                            }`}
                    >
                        {action.icon && <span className={action.disabled ? "text-gray-400" : "text-inherit group-hover:text-blue-600 transition-colors"}>{action.icon}</span>}
                        <span>{action.label}</span>
                    </button>
                );
            })}
            {children}
        </div>
    );
};

export default ActionMenu;
