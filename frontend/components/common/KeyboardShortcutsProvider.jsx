"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { tokenRequest } from "@/lib/axiosCreate";

const KeyboardShortcutsContext = createContext(null);

const DEFAULT_SHORTCUTS = {
    open_tabs: [
        {
            category: "Dashboard",
            items: [
                { name: "Dashboard Home", key: "G + D", path: "/dashboard" }
            ]
        },
        {
            category: "Sales",
            items: [
                { name: "Estimation", key: "G + S,E", path: "/sales/estimation" },
                { name: "Time", key: "G + S,T", path: "/sales/times" },
                { name: "Mileage", key: "G + S,M", path: "/sales/mileage" },
                { name: "Sales Quote", key: "G + S,Q", path: "/sales/quotes" },
                { name: "Proforma Invoice", key: "G + S,F", path: "/sales/proformaInvoice" },
                { name: "Sales Invoice", key: "G + S,I", path: "/sales/invoice" },
                { name: "Sales Payment", key: "G + S,Y", path: "/sales/payment" }
            ]
        },
        {
            category: "Purchases",
            items: [
                { name: "Purchase Order", key: "G + P,O", path: "/purchases/orders" },
                { name: "Purchase Invoices", key: "G + P,I", path: "/purchases/invoices" },
                { name: "Purchase Payments", key: "G + P,Y", path: "/purchases/payment" }
            ]
        },
        {
            category: "Inventory",
            items: [
                { name: "Raw Materials", key: "G + I,W", path: "/inventory/raw-materials" },
                { name: "Products", key: "G + I,P", path: "/inventory/products" },
                { name: "C. Products", key: "G + I,C", path: "/inventory/customized-products" }
            ]
        },
        {
            category: "Accounting",
            items: [
                { name: "Journal Entry", key: "G + A,J", path: "/common/journalEntry" },
                { name: "C. O. Accounts", key: "G + A,C", path: "/setup/chartsOfAccounts" }
            ]
        },
        {
            category: "Parties",
            items: [
                { name: "Customers", key: "G + C,C", path: "/sales/customers" },
                { name: "Suppliers", key: "G + C,S", path: "/purchases/suppliers" }
            ]
        },
        {
            category: "Reports",
            items: [
                { name: "General Ledger", key: "G + R,L", path: "/reports/ledger" },
                { name: "Profit and Loss", key: "G + R,P", path: "/reports/pl" },
                { name: "Balance Sheet", key: "G + R,B", path: "/reports/balance-sheet" },
                { name: "Trial Balance", key: "G + R,T", path: "/reports/trial-balance" }
            ]
        },
        {
            category: "Settings",
            items: [
                { name: "Settings", key: "G + T", path: "/settings" }
            ]
        }
    ],
    create_records: [
        {
            category: "Sales",
            items: [
                { name: "Estimation", key: "C + S,E", path: "/sales/estimation" },
                { name: "Time", key: "C + S,T", path: "/sales/times" },
                { name: "Mileage", key: "C + S,M", path: "/sales/mileage" },
                { name: "Sales Quote", key: "C + S,Q", path: "/sales/quotes" },
                { name: "Proforma Invoice", key: "C + S,F", path: "/sales/proformaInvoice" },
                { name: "Sales Invoice", key: "C + S,I", path: "/sales/invoice" },
                { name: "Sales Payment", key: "C + S,Y", path: "/sales/payment" }
            ]
        },
        {
            category: "Purchases",
            items: [
                { name: "Purchase Order", key: "C + P,O", path: "/purchases/orders" },
                { name: "Purchase Invoices", key: "C + P,I", path: "/purchases/invoices" },
                { name: "Purchase Payments", key: "C + P,Y", path: "/purchases/payment" }
            ]
        },
        {
            category: "Inventory",
            items: [
                { name: "Raw Materials", key: "C + I,W", path: "/inventory/raw-materials" },
                { name: "Products", key: "C + I,P", path: "/inventory/products" },
                { name: "C. Products", key: "C + I,C", path: "/inventory/customized-products" }
            ]
        },
        {
            category: "Parties",
            items: [
                { name: "Customers", key: "C + C,C", path: "/sales/customers" },
                { name: "Suppliers", key: "C + C,S", path: "/purchases/suppliers" }
            ]
        }
    ],
    system_actions: [
        {
            category: "Export/Print/Edit",
            items: [
                { name: "Export current page", key: "G + E", action: "export" },
                { name: "Print current page", key: "G + P", action: "print" },
                { name: "Edit current page", key: "E", action: "edit" }
            ]
        }
    ]
};

const SHORTCUT_METADATA = {
    open_tabs: {
        "Dashboard Home": { path: "/dashboard" },
        "Estimation": { path: "/sales/estimation" },
        "Time": { path: "/sales/times" },
        "Mileage": { path: "/sales/mileage" },
        "Sales Quote": { path: "/sales/quotes" },
        "Proforma Invoice": { path: "/sales/proformaInvoice" },
        "Sales Invoice": { path: "/sales/invoice" },
        "Sales Payment": { path: "/sales/payment" },
        "Purchase Order": { path: "/purchases/orders" },
        "Purchase Invoices": { path: "/purchases/invoices" },
        "Purchase Payments": { path: "/purchases/payment" },
        "Raw Materials": { path: "/inventory/raw-materials" },
        "Products": { path: "/inventory/products" },
        "C. Products": { path: "/inventory/customized-products" },
        "Journal Entry": { path: "/common/journalEntry" },
        "C. O. Accounts": { path: "/setup/chartsOfAccounts" },
        "Customers": { path: "/sales/customers" },
        "Suppliers": { path: "/purchases/suppliers" },
        "General Ledger": { path: "/reports/ledger" },
        "Profit and Loss": { path: "/reports/pl" },
        "Balance Sheet": { path: "/reports/balance-sheet" },
        "Trial Balance": { path: "/reports/trial-balance" },
        "Settings": { path: "/settings" }
    },
    create_records: {
        "Estimation": { path: "/sales/estimation" },
        "Time": { path: "/sales/times" },
        "Mileage": { path: "/sales/mileage" },
        "Sales Quote": { path: "/sales/quotes" },
        "Proforma Invoice": { path: "/sales/proformaInvoice" },
        "Sales Invoice": { path: "/sales/invoice" },
        "Sales Payment": { path: "/sales/payment" },
        "Purchase Order": { path: "/purchases/orders" },
        "Purchase Invoices": { path: "/purchases/invoices" },
        "Purchase Payments": { path: "/purchases/payment" },
        "Raw Materials": { path: "/inventory/raw-materials" },
        "Products": { path: "/inventory/products" },
        "C. Products": { path: "/inventory/customized-products" },
        "Customers": { path: "/sales/customers" },
        "Suppliers": { path: "/purchases/suppliers" }
    },
    system_actions: {
        "Export current page": { action: "export" },
        "Print current page": { action: "print" },
        "Edit current page": { action: "edit" }
    }
};

const formatKeyForDisplay = (keyStr) => {
    if (!keyStr) return "";
    return keyStr
        .split(",")
        .map(seqPart => {
            return seqPart
                .split("+")
                .map(k => k.trim())
                .join(" + ");
        })
        .join(", ");
};

const getEventKey = (e) => {
    const code = e.code || "";
    if (code.startsWith("Key")) {
        return code.slice(3).toLowerCase();
    }
    if (code.startsWith("Digit")) {
        return code.slice(5).toLowerCase();
    }
    if (code === "Space") {
        return " ";
    }
    if (code === "ArrowUp") return "up";
    if (code === "ArrowDown") return "down";
    if (code === "ArrowLeft") return "left";
    if (code === "ArrowRight") return "right";
    if (code === "Escape") return "escape";
    if (code === "Enter") return "enter";
    if (code === "Tab") return "tab";
    if (code.startsWith("Numpad") && code.length === 7) {
        return code.slice(6).toLowerCase();
    }
    return e.key.toLowerCase();
};

const getCleanedBufferStr = (itemKey, buffer) => {
    const parts = itemKey.split(",").map(p => {
        let norm = p.toLowerCase().replace(/\s+/g, "").replace(/\+/g, "");
        norm = norm.replace(/ctrl\/cmd/g, "CTRL_CMD_PLACEHOLDER")
                   .replace(/ctrl/g, "CTRL_CMD_PLACEHOLDER")
                   .replace(/cmd/g, "CTRL_CMD_PLACEHOLDER")
                   .replace(/CTRL_CMD_PLACEHOLDER/g, "ctrl/cmd");
        return norm;
    });

    const cleanedBuffer = buffer.map((b, idx) => {
        const s = parts[idx];
        if (!s) return b;

        let cleaned = b;
        
        // Strip shift at any index if the shortcut does not require it
        if (!s.includes("shift")) {
            cleaned = cleaned.replace("shift", "");
        }
        
        // Strip alt and ctrl/cmd only at subsequent indices (idx > 0) if not required
        if (idx > 0) {
            if (!s.includes("alt") && cleaned.startsWith("alt")) {
                cleaned = cleaned.slice(3);
            }
            if (!s.includes("ctrl/cmd") && cleaned.startsWith("ctrl/cmd")) {
                cleaned = cleaned.slice(8);
            }
        }
        return cleaned;
    });

    return cleanedBuffer.join("");
};

const mapApiResponseToShortcuts = (groupedData) => {
    const result = {
        open_tabs: [],
        create_records: [],
        system_actions: []
    };

    Object.keys(result).forEach((categoryKey) => {
        const categoryData = groupedData[categoryKey];
        if (!categoryData) return;

        const sections = Object.keys(categoryData).map((sectionName) => {
            const items = categoryData[sectionName].map((item) => {
                const meta = SHORTCUT_METADATA[categoryKey]?.[item.name] || {};
                let displayKey = item.keys || item.default_keys || "";
                displayKey = formatKeyForDisplay(displayKey);

                return {
                    id: item.id,
                    name: item.name,
                    key: displayKey,
                    is_customized: item.is_customized || false,
                    default_keys: formatKeyForDisplay(item.default_keys),
                    ...meta
                };
            });

            const sectionOrder = categoryData[sectionName][0]?.section_order || 99;

            return {
                category: sectionName,
                section_order: sectionOrder,
                items
            };
        });

        // Sort sections by section_order
        sections.sort((a, b) => a.section_order - b.section_order);

        // Sort items inside each section by shortcut_order
        sections.forEach((sec) => {
            sec.items.sort((a, b) => {
                const itemA = categoryData[sec.category].find(i => i.id === a.id);
                const itemB = categoryData[sec.category].find(i => i.id === b.id);
                const orderA = itemA?.shortcut_order || 99;
                const orderB = itemB?.shortcut_order || 99;
                return orderA - orderB;
            });
        });

        result[categoryKey] = sections;
    });

    // Merge default values if any category was completely missing from the API response
    Object.keys(result).forEach((key) => {
        if (result[key].length === 0) {
            result[key] = DEFAULT_SHORTCUTS[key];
        }
    });

    return result;
};

export function KeyboardShortcutsProvider({ children }) {
    const router = useRouter();
    const [stateShortcuts, setStateShortcuts] = useState(DEFAULT_SHORTCUTS);
    const [loading, setLoading] = useState(true);
    const keyBuffer = useRef([]);

    // Fetch shortcuts from server on mount
    const fetchShortcuts = async () => {
        setLoading(true);
        try {
            const response = await tokenRequest.get("custom-api/admin/shortcuts");
            if (response.data?.success && response.data?.data?.grouped) {
                const mapped = mapApiResponseToShortcuts(response.data.data.grouped);
                setStateShortcuts(mapped);
                localStorage.setItem("billing_shortcuts", JSON.stringify(mapped));
            }
        } catch (e) {
            console.error("Error loading shortcuts from API, falling back:", e);
            // Fallback to localStorage on error
            const saved = localStorage.getItem("billing_shortcuts");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.open_tabs && parsed.create_records && parsed.system_actions) {
                        setStateShortcuts(parsed);
                    }
                } catch (err) {
                    console.error("Error parsing saved shortcuts:", err);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShortcuts();
    }, []);

    // Update single shortcut on server and persist
    const updateShortcut = async (sectionKey, categoryIdx, itemIdx, newKey, itemId) => {
        try {
            // Strip spaces for the API format (e.g. "A + B" -> "A+B")
            const apiKeys = newKey.replace(/\s+/g, "");
            
            const response = await tokenRequest.post("custom-api/admin/shortcuts/update-key", {
                shortcut_id: itemId,
                custom_keys: apiKeys
            });

            if (response.data?.success) {
                setStateShortcuts((prev) => {
                    const updated = JSON.parse(JSON.stringify(prev)); // Deep clone
                    updated[sectionKey][categoryIdx].items[itemIdx].key = newKey;
                    updated[sectionKey][categoryIdx].items[itemIdx].is_customized = true;
                    try {
                        localStorage.setItem("billing_shortcuts", JSON.stringify(updated));
                    } catch (e) {
                        console.error("Error saving shortcuts to localStorage:", e);
                    }
                    return updated;
                });
                return true;
            }
        } catch (e) {
            console.error("Error updating shortcut on server:", e);
            throw e;
        }
        return false;
    };

    // Reset shortcuts to defaults
    const resetShortcuts = () => {
        setStateShortcuts(DEFAULT_SHORTCUTS);
        try {
            localStorage.setItem("billing_shortcuts", JSON.stringify(DEFAULT_SHORTCUTS));
        } catch (e) {
            console.error("Error resetting shortcuts:", e);
        }
    };

    useEffect(() => {
        let timeoutId = null;

        const handleKeyDown = (e) => {
            // Disable shortcuts when user is typing in inputs
            const activeEl = document.activeElement;
            if (
                activeEl &&
                (activeEl.tagName === "INPUT" ||
                    activeEl.tagName === "TEXTAREA" ||
                    activeEl.isContentEditable)
            ) {
                return;
            }

            const rawKey = getEventKey(e);
            if (["control", "alt", "shift", "meta"].includes(rawKey)) {
                return;
            }

            // Build dynamic combo string for simultaneous modifier keypresses
            let keyCombo = "";
            if (e.ctrlKey || e.metaKey) keyCombo += "ctrl/cmd";
            if (e.altKey) keyCombo += "alt";
            if (e.shiftKey) keyCombo += "shift";
            keyCombo += rawKey;

            // Append key combo to sequential buffer
            const buffer = [...keyBuffer.current, keyCombo];
            keyBuffer.current = buffer;

            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                keyBuffer.current = [];
            }, 1200);

            // Normalize helper
            const normalize = (keyString) => {
                let norm = keyString
                    .toLowerCase()
                    .replace(/\s+/g, "")
                    .replace(/\+/g, "")
                    .replace(/,/g, "");
                // Unify ctrl/cmd, ctrl, and cmd into ctrl/cmd
                norm = norm.replace(/ctrl\/cmd/g, "CTRL_CMD_PLACEHOLDER")
                           .replace(/ctrl/g, "CTRL_CMD_PLACEHOLDER")
                           .replace(/cmd/g, "CTRL_CMD_PLACEHOLDER")
                           .replace(/CTRL_CMD_PLACEHOLDER/g, "ctrl/cmd");
                return norm;
            };

            // Compile shortcut maps
            let matched = false;

            // 1. Open Tabs
            stateShortcuts.open_tabs.forEach((cat) => {
                cat.items.forEach((item) => {
                    const cleanBufStr = getCleanedBufferStr(item.key, buffer);
                    if (item.path && normalize(item.key) === cleanBufStr) {
                        e.preventDefault();
                        router.push(item.path);
                        keyBuffer.current = [];
                        matched = true;
                    }
                });
            });

            if (matched) return;

            // 2. Create Records
            stateShortcuts.create_records.forEach((cat) => {
                cat.items.forEach((item) => {
                    const cleanBufStr = getCleanedBufferStr(item.key, buffer);
                    if (item.path && normalize(item.key) === cleanBufStr) {
                        e.preventDefault();
                        router.push(`${item.path}?action=create`);
                        keyBuffer.current = [];
                        matched = true;
                    }
                });
            });

            if (matched) return;

            // 3. System Actions
            stateShortcuts.system_actions.forEach((cat) => {
                cat.items.forEach((item) => {
                    const cleanBufStr = getCleanedBufferStr(item.key, buffer);
                    if (normalize(item.key) === cleanBufStr) {
                        e.preventDefault();
                        keyBuffer.current = [];
                        matched = true;

                        if (item.action === "print") {
                            window.print();
                        } else if (item.action === "export") {
                            // Find any button with "Export" or "Exporting" text on the active page and click it
                            const buttons = Array.from(document.querySelectorAll("button"));
                            const exportButton = buttons.find((btn) => {
                                const txt = (btn.textContent || btn.innerText || "").trim().toLowerCase();
                                return txt === "export" || txt.startsWith("exporting");
                            });

                            if (exportButton && !exportButton.disabled) {
                                exportButton.click();
                            } else {
                                console.warn("No clickable export button found on this page.");
                            }
                        } else if (item.action === "edit") {
                            // Find any button or link with "Edit" or "Modify" text on the active page and click it
                            const elements = Array.from(document.querySelectorAll("button, a"));
                            const editElement = elements.find((el) => {
                                const txt = (el.textContent || el.innerText || "").trim().toLowerCase();
                                return txt === "edit" || txt === "modify" || txt.startsWith("edit ");
                            });

                            if (editElement) {
                                editElement.click();
                            } else {
                                console.warn("No clickable edit element found on this page.");
                            }
                        }
                    }
                });
            });

            if (!matched) {
                // Check if the current buffer is a potential prefix for any shortcut
                let hasPotentialMatch = false;
                Object.keys(stateShortcuts).forEach((section) => {
                    stateShortcuts[section].forEach((cat) => {
                        cat.items.forEach((item) => {
                            const cleanedBufStr = getCleanedBufferStr(item.key, buffer);
                            const normKey = normalize(item.key);
                            if (normKey.startsWith(cleanedBufStr)) {
                                hasPotentialMatch = true;
                            }
                        });
                    });
                });

                if (!hasPotentialMatch) {
                    keyBuffer.current = [];
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [router, stateShortcuts]);

    return (
        <KeyboardShortcutsContext.Provider value={{ stateShortcuts, updateShortcut, resetShortcuts, fetchShortcuts, loading }}>
            {children}
        </KeyboardShortcutsContext.Provider>
    );
}

export function useKeyboardShortcuts() {
    const context = useContext(KeyboardShortcutsContext);
    if (!context) {
        throw new Error("useKeyboardShortcuts must be used within a KeyboardShortcutsProvider");
    }
    return context;
}
