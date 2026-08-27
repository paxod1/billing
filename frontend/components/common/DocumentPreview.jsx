"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(val) {
    const n = parseFloat(val);
    return isNaN(n) ? "0.00" : n.toFixed(2);
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── convert lab/oklch → rgb (canvas trick) ───────────────────────────────────
function convertToRgb(color) {
    if (!color || typeof color !== "string") return color;
    if (!/(lab|oklch|oklab|hwb)\(/i.test(color)) return color;
    try {
        const c = document.createElement("canvas");
        c.width = 1; c.height = 1;
        const ctx = c.getContext("2d");
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return `rgba(${d[0]},${d[1]},${d[2]},${d[3] / 255})`;
    } catch { return color; }
}

function sanitizeColors(clonedDoc) {
    const all = clonedDoc.getElementsByTagName("*");
    for (const el of all) {
        const st = window.getComputedStyle(el);
        ["color", "backgroundColor", "borderColor"].forEach(p => {
            const v = st[p];
            if (v && /(lab|oklch|oklab|hwb)\(/i.test(v)) el.style[p] = convertToRgb(v);
        });
    }
}

// ─── item-row resolvers ────────────────────────────────────────────────────────
function resolveItems(type, items, isReturnDoc = false) {
    if (!items || !items.length) return { cols: [], rows: [] };

    const sourceTypes = [...new Set(items.map(i => (i.source_type || "item").toLowerCase()))];
    const hasTime       = sourceTypes.includes("time");
    const hasMileage    = sourceTypes.includes("mileage");
    const hasEstimation = sourceTypes.includes("estimation");
    const multipleTypes = sourceTypes.length > 1 && (hasTime || hasMileage || hasEstimation);

    const MIXED = ["SALES_INVOICE", "PROFORMA_INVOICE", "SALES_PAYMENT", "PURCHASE_INVOICE", "PURCHASE_PAYMENT", "QUOTE"];
    const isMixed = MIXED.includes(type);

    let cols;
    if (type === "TIME")     cols = ["#", "Description", "Duration", "Amount"];
    else if (type === "MILEAGE")    cols = ["#", "Description", "Distance", "Amount"];
    else if (isMixed || type === "ESTIMATION") {
        if (multipleTypes)      cols = ["#", "Name", "Qty / Duration / Distance", "Amount"];
        else if (hasTime)       cols = ["#", "Name", "Duration", "Amount"];
        else if (hasMileage)    cols = ["#", "Name", "Distance", "Amount"];
        else if (hasEstimation) cols = ["#", "Name", "Category", "Amount"];
        else {
            if (isReturnDoc) {
                cols = ["#", "Item", "Type", "Original Quantity", "Return Quantity", "Rate", "Tax", "Return Amount"];
            } else {
                cols = ["#", "Item", "Type", "Quantity", "Rate", "Tax", "Amount"];
            }
        }
    } else {
        if (isReturnDoc) {
             cols = ["#", "Item", "Type", "Original Quantity", "Return Quantity", "Rate", "Tax", "Return Amount"];
        } else {
             cols = ["#", "Item", "Type", "Quantity", "Rate", "Tax", "Amount"];
        }
    }

    const use4col = cols.length === 4;
    const use8col = cols.length === 8;

    const rows = items.map((item, i) => {
        const src = (item.source_type || "item").toLowerCase();
        const base = i + 1;

        if (src === "time") {
            const mins = Number(item.duration_minutes || 0);
            const h = Math.floor(mins / 60), m = mins % 60;
            const dur = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
            return { cells: [base, item.name || item.description || "Time Entry", dur, fmt(item.amount)], isAmount: [false, false, false, true] };
        }
        if (src === "mileage") {
            return { cells: [base, item.name || item.description || "Mileage", `${item.distance_km || item.quantity || "-"} km`, fmt(item.amount)], isAmount: [false, false, false, true] };
        }
        if (src === "estimation") {
            const meta = item.metadata || {};
            const cat = (meta.line_category || item.category || "").toLowerCase();
            const desc = meta.line_name || item.description || item.name || "Estimation";
            
            if (use4col) {
                return { cells: [base, desc, cat || "-", fmt(item.amount)], isAmount: [false, false, false, true] };
            } else {
                return {
                    cells: [base, desc, item.item_type || item.type || cat || "Estimation", item.quantity || 1, `₹ ${fmt(item.rate || item.amount)}`, `${fmt(item.tax_percent || 0)}%`, fmt(item.amount)],
                    isAmount: [false, false, false, false, false, false, true]
                };
            }
        }

        if (use4col) {
            const isService = src === "service";
            return {
                cells: [base, item.name || item.description || "-", item.quantity || 0, fmt(item.amount)],
                isAmount: [false, false, false, true],
                subtext: isService ? undefined : `${item.item_type || "Product"} · qty ${item.quantity || 0} · ₹${fmt(item.rate)}/unit`
            };
        }

        if (use8col) {
            const unitTax = Number(item.rate || 0) * (Number(item.tax_percent || 0) / 100);
            const taxAmt = Number(item.rate || 0) * Number(item.return_quantity || item.quantity || 0) * (Number(item.tax_percent || 0) / 100);
            const rowReturnAmt = (Number(item.rate || 0) * Number(item.return_quantity || item.quantity || 0)) + taxAmt;
            return {
                cells: [
                    base, 
                    item.name || item.description || "-", 
                    item.item_type || item.type || "Product", 
                    item.original_quantity || 0, 
                    item.return_quantity || item.quantity || 0, 
                    `₹ ${fmt(item.rate)}`, 
                    `₹ ${fmt(unitTax)}`, 
                    fmt(rowReturnAmt)
                ],
                isAmount: [false, false, false, false, false, false, false, true]
            };
        }

        const taxAmt = Number(item.rate || 0) * Number(item.quantity || 0) * (Number(item.tax_percent || 0) / 100);
        return {
            cells: [base, item.name || item.description || "-", item.item_type || item.type || "Product", item.quantity || 0, `₹ ${fmt(item.rate)}`, `${fmt(item.tax_percent || 0)}%`, fmt(item.amount)],
            isAmount: [false, false, false, false, false, false, true]
        };
    });

    return { cols, rows };
}

// ─── DocumentPreview component ─────────────────────────────────────────────────
/**
 * Props:
 *   type        – one of: QUOTE | SALES_INVOICE | PROFORMA_INVOICE | SALES_PAYMENT |
 *                         TIME | MILEAGE | ESTIMATION | PURCHASE_INVOICE | PURCHASE_ORDER | PURCHASE_PAYMENT
 *   payload     – { company, party, document, items, totals }
 *   filename    – PDF save name (without .pdf)
 */
const DocumentPreview = forwardRef(function DocumentPreview({ type, payload, filename }, ref) {
    const containerRef = useRef(null);

    // ── exposed handle ──────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        async downloadPDF() {
            if (!containerRef.current) return;
            try {
                const el = containerRef.current.cloneNode(true);
                el.style.width = "800px";
                el.style.padding = "40px"; // Added padding for PDF edges
                el.style.backgroundColor = "white";
                el.style.position = "absolute";
                el.style.left = "-9999px";
                el.style.top = "0";
                document.body.appendChild(el);

                const canvas = await html2canvas(el, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: "#ffffff",
                    windowWidth: 800,
                    onclone: sanitizeColors,
                });
                document.body.removeChild(el);

                const imgData = canvas.toDataURL("image/png");
                const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
                const pw = pdf.internal.pageSize.getWidth();
                const ph = pdf.internal.pageSize.getHeight();
                const ratio = Math.min(pw / canvas.width, ph / canvas.height);
                pdf.addImage(imgData, "PNG", (pw - canvas.width * ratio) / 2, 0, canvas.width * ratio, canvas.height * ratio);
                pdf.save(`${filename || "document"}.pdf`);
            } catch (e) {
                console.error("PDF Error:", e);
            }
        },

        print() {
            if (!containerRef.current) return;
            const iframe = document.createElement("iframe");
            iframe.style.position = "fixed";
            iframe.style.right = "0";
            iframe.style.bottom = "0";
            iframe.style.width = "0";
            iframe.style.height = "0";
            iframe.style.border = "0";
            document.body.appendChild(iframe);
            const doc = iframe.contentWindow.document;
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Document</title>
                    <style>
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { 
                            font-family: 'Inter', 'Inter Fallback', sans-serif; 
                            background: white; 
                            color: #111; 
                        }
                        @media print { 
                            @page { size: A4; margin: 15mm; } 
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    ${containerRef.current.innerHTML}
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() {
                                window.parent.document.body.removeChild(window.frameElement);
                            }, 100);
                        };
                    </script>
                </body>
                </html>
            `);
            doc.close();
        }
    }));

    if (!payload) return null;

    const { company, party, document: doc, items, totals } = payload;

    const rb = doc?.returnBreakdown;
    const pb = doc?.paymentBreakdown;
    const sc = doc?.paymentScenario || "NORMAL";
    const isPaymentDoc = pb && (type === "SALES_PAYMENT" || type === "PURCHASE_PAYMENT");
    const isReturnDoc = rb && (type === "PURCHASE_INVOICE" || type === "PURCHASE_PAYMENT" || type === "SALES_INVOICE" || type === "SALES_PAYMENT");
    const isOverReturn = sc === "OVER_RETURN";

    // ── document meta ───────────────────────────────────────────────────────
    const DocMeta = {
        QUOTE:            { title: "SALES QUOTE",      numberLabel: "Quote Number",  dateLabel: "Quote Date",   detailsLabel: "QUOTE DETAILS",           detailsTitle: "Quote Name",       extraDateLabel: "Expiry Date",  partyLabel: "BILL TO",   footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        SALES_INVOICE:    { title: "SALES INVOICE",    numberLabel: "Invoice #",     dateLabel: "Invoice Date", detailsLabel: "INVOICE DETAILS",         detailsTitle: "Invoice Name",     extraDateLabel: null,           partyLabel: "BILL TO",   footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        PURCHASE_INVOICE: { title: "PURCHASE INVOICE", numberLabel: "Invoice #",     dateLabel: "Invoice Date", detailsLabel: "INVOICE DETAILS",         detailsTitle: "Invoice Name",     extraDateLabel: null,           partyLabel: "BILL FROM", footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        PURCHASE_ORDER:   { title: "PURCHASE ORDER",   numberLabel: "Order #",       dateLabel: "Order Date",   detailsLabel: "ORDER DETAILS",           detailsTitle: "Order Name",       extraDateLabel: null,           partyLabel: "BILL FROM", footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        PROFORMA_INVOICE: { title: "PROFORMA INVOICE", numberLabel: "Invoice #",     dateLabel: "Date",         detailsLabel: "INVOICE DETAILS",         detailsTitle: "Invoice Name",     extraDateLabel: null,           partyLabel: "BILL TO",   footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        SALES_PAYMENT:    { title: "SALES PAYMENT",    numberLabel: "Payment #",     dateLabel: "Date",         detailsLabel: "PAYMENT DETAILS",         detailsTitle: "Payment Name",     extraDateLabel: null,           partyLabel: "BILL TO",   footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        PURCHASE_PAYMENT: { title: "PAYMENT RECEIPT", numberLabel: "Payment #",     dateLabel: "Date",         detailsLabel: "PAYMENT DETAILS",         detailsTitle: "Reference",        extraDateLabel: null,           partyLabel: "SUPPLIER",   footer: "Thank you for your business!" },
        TIME:             { title: "TIME TRACKER",     numberLabel: null,            dateLabel: "Date",         detailsLabel: "TIME TRACKER DETAILS",    detailsTitle: "Name",             extraDateLabel: null,           partyLabel: "BILL TO",   footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        MILEAGE:          { title: "MILEAGE TRACKER",  numberLabel: null,            dateLabel: "Date",         detailsLabel: "MILEAGE TRACKER DETAILS", detailsTitle: "Name",             extraDateLabel: null,           partyLabel: "BILL TO",   footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        ESTIMATION:       { title: "ESTIMATE",         numberLabel: "Estimate #",    dateLabel: "Date",         detailsLabel: "ESTIMATE DETAILS",        detailsTitle: "Estimation Name",  extraDateLabel: "Expiry Date",  partyLabel: "BILL TO",   footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
    };

    const meta = DocMeta[type] || DocMeta.SALES_INVOICE;
    
    let originalTotalVal = 0;
    let amountPaidOnOriginalVal = 0;
    let originalTaxTotalVal = 0;
    let totalReturnedVal = 0;
    let originalDueVal = 0;

    if (isReturnDoc) {
        originalTotalVal = parseFloat(rb?.originalTotal ?? rb?.original_total ?? 0);
        amountPaidOnOriginalVal = parseFloat(rb?.amountPaidOnOriginal ?? rb?.amount_paid_on_original ?? rb?.totalPaidOnParent ?? 0);
        originalTaxTotalVal = parseFloat(rb?.originalTaxTotal ?? rb?.original_tax_total ?? 0);
        totalReturnedVal = parseFloat(rb?.totalReturned ?? rb?.total_returned ?? rb?.returnAmount ?? grandTotal ?? 0);
        originalDueVal = Math.max(0, originalTotalVal - amountPaidOnOriginalVal);
    }

    let finalTitle = meta.title;
    if (isReturnDoc) {
        if (type === "PURCHASE_INVOICE" || type === "SALES_INVOICE") {
            const prefix = type === "PURCHASE_INVOICE" ? "PURCHASE" : "SALES";
            if (amountPaidOnOriginalVal === 0) {
                finalTitle = `${prefix} RETURN`;
            } else if (originalDueVal < totalReturnedVal) {
                finalTitle = `${prefix} RETURN & PARTIAL REFUND`;
            } else {
                finalTitle = `${prefix} RETURN & BALANCE UPDATE`;
            }
        } else {
            if (type === "PURCHASE_PAYMENT") finalTitle = `PURCHASE RETURN & ${isOverReturn ? "PARTIAL REFUND" : "BALANCE UPDATE"}`;
            if (type === "SALES_PAYMENT") finalTitle = `SALES RETURN & ${isOverReturn ? "PARTIAL REFUND" : "BALANCE UPDATE"}`;
        }
    }

    const { cols, rows } = resolveItems(type, items, isReturnDoc);

    // ── totals ───────────────────────────────────────────────────────────────
    const grandEntry = totals?.find(t => t.isGrand);
    const grandTotal = parseFloat(grandEntry?.value ?? 0);
    const taxEntry   = totals?.find(t => t.label?.toLowerCase().includes("tax"));
    const taxTotal   = taxEntry ? parseFloat(taxEntry.value || 0)
        : (items || []).reduce((s, it) => {
            return s + Number(it.rate || 0) * Number(it.quantity || 0) * (Number(it.tax_percent || 0) / 100);
        }, 0);
    const subtotal = grandTotal - taxTotal;

    // ── column widths ────────────────────────────────────────────────────────
    const colCount = cols.length;
    const is7col = colCount === 7;
    const is8col = colCount === 8;

    let watermarkText = "";
    if (isReturnDoc) watermarkText = "RETURN BILL";
    else if (sc === 'RETURN_REFUND' || sc === 'OVER_RETURN') watermarkText = "REFUND";
    else if (pb && pb.balanceDue > 0) watermarkText = "BALANCE DUE";

    return (
        <div
            ref={containerRef}
            style={{
                background: "#fff",
                fontFamily: "'Inter', 'Inter Fallback', sans-serif",
                color: "#111",
                lineHeight: 1.5,
                padding: "40px 44px",
                maxWidth: "760px",
                margin: "0 auto",
                position: "relative",
            }}
        >
            {watermarkText && (
                <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%) rotate(-45deg)",
                    fontSize: "120px",
                    fontWeight: "bold",
                    color: "rgba(0, 0, 0, 0.04)",
                    textAlign: "center",
                    zIndex: 1,
                    pointerEvents: "none",
                    whiteSpace: "nowrap"
                }}>
                    {watermarkText}
                </div>
            )}

            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                {/* Company */}
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 3 }}>
                        {company?.name || "BrandMagics Software Labs"}
                    </div>
                    <div style={{ fontSize: 12, color: "#555", lineHeight: 1.7 }}>
                        {company?.address && <>{company.address}<br /></>}
                        {company?.city && <>{company.city}</>}
                    </div>
                </div>

                {/* Title + meta */}
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 500, color: "#111", letterSpacing: 0.5, marginBottom: 6 }}>
                        {finalTitle}
                    </div>
                    {meta.numberLabel && doc?.number && (
                        <div style={{ fontSize: 13, color: "#555", marginBottom: 2 }}>
                            <strong style={{ color: "#111" }}>{isReturnDoc ? "Return #" : meta.numberLabel}:</strong>{" "}
                            <span style={{ color: "#0d9488", fontWeight: 600 }}>{doc.number}</span>
                        </div>
                    )}
                    {isReturnDoc && doc?.originalInvoiceNumber && (
                        <div style={{ fontSize: 13, color: "#555", marginBottom: 2 }}>
                            <strong style={{ color: "#111" }}>Original Invoice #:</strong>{" "}
                            <span style={{ color: "#0d9488", fontWeight: 600 }}>{doc.originalInvoiceNumber}</span>
                        </div>
                    )}
                    <div style={{ fontSize: 13, color: "#555", marginBottom: 2 }}>
                        <strong style={{ color: "#111" }}>{meta.dateLabel}:</strong>{" "}
                        {formatDate(doc?.date)}
                    </div>
                    {meta.extraDateLabel && doc?.expiry_date && (
                        <div style={{ fontSize: 13, color: "#555" }}>
                            <strong style={{ color: "#111" }}>{meta.extraDateLabel}:</strong>{" "}
                            {formatDate(doc.expiry_date)}
                        </div>
                    )}
                </div>
            </div>

            {/* ── DETAILS BOX ────────────────────────────────────────────────── */}
            <div style={{
                background: "#f7f7f7",
                borderRadius: 6,
                padding: "18px 22px",
                display: "flex",
                justifyContent: "space-between",
                gap: 24,
                marginBottom: 28,
            }}>
                {/* Party */}
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", color: "#555", textTransform: "uppercase", marginBottom: 6 }}>
                        {pb?.isReturn ? "RECEIVED FROM" : (doc?.partyLabel || meta.partyLabel)}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 3 }}>{party?.name || "-"}</div>
                    <div style={{ fontSize: 12, color: "#444", lineHeight: 1.7 }}>
                        {party?.address && <>{party.address}<br /></>}
                        {party?.email && <span style={{ color: "#0d9488" }}>{party.email}<br /></span>}
                        {party?.phone && <span style={{ color: "#0d9488" }}>{party.phone}</span>}
                    </div>
                </div>

                {/* Document details */}
                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", color: "#555", textTransform: "uppercase", marginBottom: 6 }}>
                        {meta.detailsLabel}
                    </div>
                    <div style={{ fontSize: 13, color: "#444" }}>
                        <strong style={{ color: "#111" }}>{meta.detailsTitle}:</strong>{" "}
                        {doc?.reference || "-"}
                    </div>
                    {doc?.status && (
                        <div style={{ marginTop: 8 }}>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 800,
                                padding: "5px 12px",
                                borderRadius: "6px",
                                textTransform: "uppercase",
                                display: "inline-block",
                                ...(doc.status.toUpperCase().replace(/ /g, "_") === "FULLY_PAID" || doc.status.toUpperCase() === "PAID" ? {
                                    backgroundColor: "#E8F5E9",
                                    color: "#2E7D32",
                                } : doc.status.toUpperCase() === "RETURNED" ? {
                                    backgroundColor: "#FFEBEE",
                                    color: "#C62828",
                                } : (doc.status.toUpperCase().replace(/ /g, "_") === "PARTIALLY_PAID" || doc.status.toUpperCase().includes("PARTIAL")) ? {
                                    backgroundColor: "#FFF8E1",
                                    color: "#F57F17",
                                } : {
                                    backgroundColor: "#F5F5F5",
                                    color: "#616161",
                                })
                            }}>
                                Status: <span style={{ marginLeft: 4 }}>{doc.status.replace(/_/g, " ")}</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── ITEMS TABLE ─────────────────────────────────────────────────── */}
            {rows.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
                            {cols.map((c, ci) => (
                                <th key={ci} style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "#555",
                                    padding: "10px 8px",
                                    textAlign: ci === 0 ? "left" : ci === cols.length - 1 ? "right" : "left",
                                    paddingLeft: ci === 0 ? 0 : 8,
                                    paddingRight: ci === cols.length - 1 ? 0 : 8,
                                }}>
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: ri < rows.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                                {row.cells.map((cell, ci) => {
                                    const isAmt = row.isAmount?.[ci];
                                    const isFirst = ci === 0;
                                    const isLast = ci === row.cells.length - 1;
                                    return (
                                        <td key={ci} style={{
                                            fontSize: (is7col || is8col) ? 12.5 : 13,
                                            color: isAmt ? "#0d9488" : isFirst ? "#888" : "#222",
                                            fontWeight: isAmt ? 700 : isFirst ? 400 : 400,
                                            padding: "13px 8px",
                                            textAlign: isFirst ? "left" : isLast ? "right" : "left",
                                            paddingLeft: isFirst ? 0 : 8,
                                            paddingRight: isLast ? 0 : 8,
                                            verticalAlign: "middle",
                                        }}>
                                            {isAmt && !String(cell).includes("₹") ? `₹ ${cell}` : cell}
                                            {ci === 1 && row.subtext && (
                                                <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{row.subtext}</div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* ── TOTALS ──────────────────────────────────────────────────────── */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, paddingTop: 20, borderTop: "1px solid #e8e8e8" }}>
                <table style={{ width: 280 }}>
                    <tbody>
                        {(() => {
                            if (isPaymentDoc) {
                                const isRefund = sc === "RETURN_REFUND" || sc === "OVER_RETURN";
                                const dueValue = isRefund
                                    ? Math.max(0, (pb?.originalTotal || 0) - (pb?.alreadyPaid || 0) - (pb?.payingNow || 0))
                                    : (pb?.balanceDue ?? 0);
                                const dueColor = dueValue <= 0 ? "#0a7d3b" : "#e53935";
                                
                                return (
                                    <>
                                        <tr><td style={totCell}>Subtotal:</td><td style={totVal}>₹ {fmt(subtotal)}</td></tr>
                                        <tr><td style={totCell}>Tax:</td><td style={totVal}>₹ {fmt(taxTotal)}</td></tr>
                                        <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                                            <td style={{ ...totCell, paddingTop: 10 }}>Invoice total:</td>
                                            <td style={{ ...totVal, paddingTop: 10 }}>₹ {fmt(pb?.originalTotal)}</td>
                                        </tr>
                                        <tr><td style={totCell}>{isRefund ? "Already refunded:" : "Amount paid:"}</td><td style={totVal}>₹ {fmt(pb?.alreadyPaid)}</td></tr>
                                        <tr>
                                            <td style={{ ...totCell, color: "#0d9488", fontWeight: 600 }}>{isRefund ? "Refunding now:" : "Paying now:"}</td>
                                            <td style={{ ...totVal, color: "#0d9488", fontWeight: 700 }}>{pb?.isReturn ? "+ " : ""}₹ {fmt(pb?.payingNow)}</td>
                                        </tr>
                                        <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                                            <td style={{ ...totCell, paddingTop: 10, fontWeight: 700, fontSize: 13, color: "#111" }}>{isRefund ? "Refund due (INR):" : "Balance due (INR):"}</td>
                                            <td style={{ ...totVal, paddingTop: 10, fontSize: 15, fontWeight: 800, color: dueColor }}>
                                                ₹ {fmt(dueValue)}
                                            </td>
                                        </tr>
                                    </>
                                );
                            }
                            
                            if (isReturnDoc) {
                                const partyName = party?.name || "";
                                const origAmountLabel = type === "SALES_INVOICE" ? "Original Amount (Sales):" : "Original Amount (Purchase):";
                                const origTotalLabel = type === "SALES_INVOICE" ? "Original Total (Sales):" : "Original Total (Purchase):";
                                const paidToText = type === "SALES_INVOICE" ? `by ${partyName}` : `to ${partyName}`;
                                const balanceDueLabel = type === "SALES_INVOICE" ? "Balance Due (Sales):" : "Balance Due (Purchase):";

                                if (amountPaidOnOriginalVal === 0) {
                                    // Case 1: Image 1
                                    return (
                                        <>
                                            <tr>
                                                <td style={totCell}>{origTotalLabel}</td>
                                                <td style={totVal}>₹ {fmt(originalTotalVal)}</td>
                                            </tr>
                                            <tr>
                                                <td style={totCell}>Subtotal (Returned):</td>
                                                <td style={totVal}>₹ {fmt(subtotal)}</td>
                                            </tr>
                                            <tr>
                                                <td style={totCell}>Tax (Returned):</td>
                                                <td style={totVal}>₹ {fmt(taxTotal)}</td>
                                            </tr>
                                            <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                                                <td style={{ ...totCell, paddingTop: 10 }}>Total Return Value:</td>
                                                <td style={{ ...totVal, paddingTop: 10 }}>₹ {fmt(totalReturnedVal)}</td>
                                            </tr>
                                            <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                                                <td style={{ ...totCell, paddingTop: 10, fontWeight: 700, fontSize: 13, color: "#111" }}>Refund Due (INR):</td>
                                                <td style={{ ...totVal, paddingTop: 10, fontSize: 15, fontWeight: 800, color: "#0a7d3b" }}>
                                                    ₹ {fmt(totalReturnedVal)}
                                                </td>
                                            </tr>
                                        </>
                                    );
                                } else if (originalDueVal < totalReturnedVal) {
                                    // Case 2: Image 2
                                    const netCashRefund = totalReturnedVal - originalDueVal;
                                    const refundFromText = type === "SALES_INVOICE" ? `to ${partyName}` : `from ${partyName}`;
                                    return (
                                        <>
                                            <tr>
                                                <td style={totCell}>{origAmountLabel}</td>
                                                <td style={totVal}>₹ {fmt(originalTotalVal)}</td>
                                            </tr>
                                            <tr>
                                                <td style={totCell}>Tax:</td>
                                                <td style={totVal}>₹ {fmt(originalTaxTotalVal)}</td>
                                            </tr>
                                            <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                                                <td style={{ ...totCell, paddingTop: 10 }}>Net Total:</td>
                                                <td style={{ ...totVal, paddingTop: 10 }}>₹ {fmt(originalTotalVal)}</td>
                                            </tr>
                                            <tr>
                                                <td style={totCell}>Amount Originally Paid ({paidToText}):</td>
                                                <td style={totVal}>₹ {fmt(amountPaidOnOriginalVal)}</td>
                                            </tr>
                                            <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                                                <td style={totCell}>{balanceDueLabel}</td>
                                                <td style={totVal}>₹ {fmt(originalDueVal)}</td>
                                            </tr>
                                            <tr>
                                                <td style={totCell}>Refund Value (from above):</td>
                                                <td style={totVal}>₹ {fmt(totalReturnedVal)}</td>
                                            </tr>
                                            <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                                                <td style={{ ...totCell, paddingTop: 10, fontWeight: 700, fontSize: 13, color: "#111" }}>
                                                    Net Cash Refund {refundFromText}:
                                                </td>
                                                <td style={{ ...totVal, paddingTop: 10, fontSize: 15, fontWeight: 800, color: "#0a7d3b" }}>
                                                    ₹ {fmt(netCashRefund)}
                                                </td>
                                            </tr>
                                        </>
                                    );
                                } else {
                                    // Case 3: Image 3
                                    const netBalanceDue = originalDueVal - totalReturnedVal;
                                    const finalBalanceDueLabel = type === "SALES_INVOICE" ? `Final Net Balance Due from ${partyName}` : `Final Net Balance Due to ${partyName}`;
                                    return (
                                        <>
                                            <tr>
                                                <td style={totCell}>{origAmountLabel}</td>
                                                <td style={totVal}>₹ {fmt(originalTotalVal)}</td>
                                            </tr>
                                            <tr>
                                                <td style={totCell}>Tax:</td>
                                                <td style={totVal}>₹ {fmt(originalTaxTotalVal)}</td>
                                            </tr>
                                            <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                                                <td style={{ ...totCell, paddingTop: 10 }}>Net Total:</td>
                                                <td style={{ ...totVal, paddingTop: 10 }}>₹ {fmt(originalTotalVal)}</td>
                                            </tr>
                                            <tr>
                                                <td style={totCell}>Amount Originally Paid ({paidToText}):</td>
                                                <td style={totVal}>₹ {fmt(amountPaidOnOriginalVal)}</td>
                                            </tr>
                                            <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                                                <td style={totCell}>{balanceDueLabel}</td>
                                                <td style={totVal}>₹ {fmt(originalDueVal)}</td>
                                            </tr>
                                            <tr>
                                                <td style={totCell}>Refund Value (from above):</td>
                                                <td style={totVal}>₹ {fmt(totalReturnedVal)}</td>
                                            </tr>
                                            <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                                                <td style={{ ...totCell, paddingTop: 10, fontWeight: 700, fontSize: 13, color: "#e53935" }}>
                                                    {finalBalanceDueLabel}:
                                                </td>
                                                <td style={{ ...totVal, paddingTop: 10, fontSize: 15, fontWeight: 800, color: "#e53935" }}>
                                                    ₹ {fmt(netBalanceDue)}
                                                </td>
                                            </tr>
                                        </>
                                    );
                                }
                            }

                            return (
                                <>
                                    <tr><td style={totCell}>Subtotal:</td><td style={totVal}>₹ {fmt(subtotal)}</td></tr>
                                    <tr><td style={totCell}>Tax:</td><td style={totVal}>₹ {fmt(taxTotal)}</td></tr>
                                    <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                                        <td style={{ ...totCell, paddingTop: 10, fontWeight: 700, fontSize: 13, color: "#111" }}>Total (INR):</td>
                                        <td style={{ ...totVal, paddingTop: 10, fontSize: 15, fontWeight: 800, color: "#0a7d3b" }}>₹ {fmt(grandTotal)}</td>
                                    </tr>
                                </>
                            );
                        })()}
                    </tbody>
                </table>
            </div>

            {/* ── FOOTER ──────────────────────────────────────────────────────── */}
            <div style={{ borderTop: "1px solid #e8e8e8", marginTop: 28, paddingTop: 18, textAlign: "center" }}>
                {meta.footer.split("\n").map((l, i) => (
                    <p key={i} style={{ fontSize: 11.5, color: "#888", lineHeight: 1.8 }}>{l}</p>
                ))}
            </div>
        </div>
    );
});

// inline style constants
const totCell = { border: "none", padding: "4px 0", fontSize: 13, color: "#444" };
const totVal  = { border: "none", padding: "4px 0", fontSize: 13, fontWeight: 500, color: "#111", textAlign: "right" };

export default DocumentPreview;
