"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── TemplatePreview component ─────────────────────────────────────────────────
/**
 * Props:
 * type     – one of: QUOTE | SALES_INVOICE | PROFORMA_INVOICE | SALES_PAYMENT |
 * TIME | MILEAGE | ESTIMATION | PURCHASE_INVOICE | PURCHASE_ORDER | PURCHASE_PAYMENT
 * filename – Name for the download file
 */
const TemplatePreview = forwardRef(function TemplatePreview({ type, filename }, ref) {
    const containerRef = useRef(null);

    // ── document meta ───────────────────────────────────────────────────────
    const DocMeta = {
        QUOTE: { title: "SALES QUOTE", numberLabel: "Quote Number", dateLabel: "Quote Date", detailsLabel: "QUOTE DETAILS", detailsTitle: "Quote Name", extraDateLabel: "Expiry Date", partyLabel: "BILL TO", footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        SALES_INVOICE: { title: "SALES INVOICE", numberLabel: "Invoice #", dateLabel: "Invoice Date", detailsLabel: "INVOICE DETAILS", detailsTitle: "Invoice Name", extraDateLabel: null, partyLabel: "BILL TO", footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        PURCHASE_INVOICE: { title: "PURCHASE INVOICE", numberLabel: "Invoice #", dateLabel: "Invoice Date", detailsLabel: "INVOICE DETAILS", detailsTitle: "Invoice Name", extraDateLabel: null, partyLabel: "BILL FROM", footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        PURCHASE_ORDER: { title: "PURCHASE ORDER", numberLabel: "Order #", dateLabel: "Order Date", detailsLabel: "ORDER DETAILS", detailsTitle: "Order Name", extraDateLabel: null, partyLabel: "BILL FROM", footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        PROFORMA_INVOICE: { title: "PROFORMA INVOICE", numberLabel: "Invoice #", dateLabel: "Date", detailsLabel: "INVOICE DETAILS", detailsTitle: "Invoice Name", extraDateLabel: null, partyLabel: "BILL TO", footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        SALES_PAYMENT: { title: "SALES PAYMENT", numberLabel: "Payment #", dateLabel: "Date", detailsLabel: "PAYMENT DETAILS", detailsTitle: "Payment Name", extraDateLabel: null, partyLabel: "BILL TO", footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        PURCHASE_PAYMENT: { title: "PURCHASE PAYMENT", numberLabel: "Payment #", dateLabel: "Date", detailsLabel: "PAYMENT DETAILS", detailsTitle: "Payment Name", extraDateLabel: null, partyLabel: "BILL FROM", footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        TIME: { title: "TIME TRACKER", numberLabel: null, dateLabel: "Date", detailsLabel: "TIME TRACKER DETAILS", detailsTitle: "Name", extraDateLabel: null, partyLabel: "BILL TO", footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        MILEAGE: { title: "MILEAGE TRACKER", numberLabel: null, dateLabel: "Date", detailsLabel: "MILEAGE TRACKER DETAILS", detailsTitle: "Name", extraDateLabel: null, partyLabel: "BILL TO", footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
        ESTIMATION: { title: "ESTIMATE", numberLabel: "Estimate #", dateLabel: "Date", detailsLabel: "ESTIMATE DETAILS", detailsTitle: "Estimation Name", extraDateLabel: "Expiry Date", partyLabel: "BILL TO", footer: "Thank you for your business!\nPlease make payment using the methods shared in the invoice email." },
    }; 

    const meta = DocMeta[type] || DocMeta.SALES_INVOICE;

    // Resolve Columns based on type
    let cols;
    if (type === "TIME") cols = ["#", "Description", "Duration", "Amount"];
    else if (type === "MILEAGE") cols = ["#", "Description", "Distance", "Amount"];
    else if (type === "ESTIMATION") cols = ["#", "Description", "Category", "Amount"];
    else cols = ["#", "Item", "Type", "Quantity", "Rate", "Tax", "Amount"];

    // ── exposed handle ──────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({

        // Updated to download PDF directly maintaining 100% identical styling
        async downloadPdf() {
            if (!containerRef.current) return;

            try {
                // Capture the exact DOM visually
                const canvas = await html2canvas(containerRef.current, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    width: 800,
                    windowWidth: 800, // Force the capture to think the window is 800px wide
                    // Ensure we capture the full scroll height
                    height: containerRef.current.scrollHeight || 1123, 
                    onclone: (clonedDoc) => {
                        // Crucial: Make the element visible in the clone so html2canvas captures it
                        const el = clonedDoc.body.querySelector('div'); 
                        if (el) {
                            el.style.opacity = "1";
                            el.style.visibility = "visible";
                            el.style.position = "static";
                            el.style.left = "0";
                            el.style.top = "0";
                        }
                    }
                });

                const imgData = canvas.toDataURL("image/png");

                // Create PDF (A4 size)
                const pdf = new jsPDF("p", "mm", "a4");
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                pdf.save(`${filename || "document"}.pdf`);
            } catch (error) {
                console.error("Failed to generate PDF", error);
            }
        },

        // Added Word download functionality
        downloadWord() {
            if (!containerRef.current) return;

            const content = containerRef.current.innerHTML;

            // Standard Word XML wrapper for HTML content
            const html = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                    <head>
                        <meta charset='utf-8'>
                        <title>${filename || "document"}</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                            th, td { padding: 8px; border: 1px solid #e0e0e0; vertical-align: top; }
                            .no-border { border: none !important; }
                        </style>
                    </head>
                    <body>
                        ${content}
                    </body>
                </html>
            `;

            const blob = new Blob(['\ufeff', html], {
                type: 'application/msword'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename || "document"}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
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
                    <title>Print Template</title>
                    <style>
                        * { 
                            box-sizing: border-box; 
                            margin: 0; 
                            padding: 0; 
                            -webkit-print-color-adjust: exact !important; 
                            print-color-adjust: exact !important; 
                        }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                            background: white; 
                            color: #111; 
                            display: flex;
                            justify-content: center;
                        }
                        .print-wrapper {
                            width: 800px; /* Lock width to match preview exactly */
                            margin: 0 auto;
                        }
                        @media print { 
                            @page { size: auto; margin: 0; } 
                            body { background: white; padding: 0; margin: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-wrapper">
                        ${containerRef.current.outerHTML}
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                setTimeout(function() {
                                    window.parent.document.body.removeChild(window.frameElement);
                                }, 500);
                            }, 200); // Slight delay ensures fonts/styles load
                        };
                    </script>
                </body>
                </html>
            `);
            doc.close();
        }
    }));

    // ── style constants ──────────────────────────────────────────────────────
    const totCell = { border: "none", padding: "8px 0", fontSize: 13, color: "#444" };
    const totVal = { border: "none", padding: "8px 0", fontSize: 13, fontWeight: 500, color: "#111", textAlign: "right", minWidth: 80 };

    return (
        <div
            ref={containerRef}
            style={{
                background: "#fff",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: "#111",
                lineHeight: 1.5,
                padding: "40px",
                width: "800px",
                minHeight: "1040px", // Reduced to fit single A4 page including print margins
                boxSizing: "border-box",
                margin: "0 auto",
                position: "relative",
                display: "flex",
                flexDirection: "column"
            }}
        >
            <div style={{ flex: 1 }}>
                {/* ── HEADER ─────────────────────────────────────────────────────── */}
                <table border="0" cellPadding="0" cellSpacing="0" style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                    <tbody>
                        <tr>
                            <td style={{ verticalAlign: "top" }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 3 }}>
                                    BrandMagics Software Labs
                                </div>
                                <div style={{ fontSize: 12, color: "#555", lineHeight: 1.7 }}>
                                    193, Software Park Road<br />
                                    Kochi, Kerala, IN 682001
                                </div>
                            </td>
                            <td style={{ verticalAlign: "top", textAlign: "right" }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: "#111", letterSpacing: 0.5, marginBottom: 6 }}>
                                    {meta.title}
                                </div>
                                <div style={{ fontSize: 13, color: "#555", marginBottom: 2 }}>
                                    <strong style={{ color: "#111" }}>{meta.dateLabel}:</strong>{" "}
                                    <span style={{ display: "inline-block", width: 80, height: 14 }}></span>
                                </div>
                                {meta.extraDateLabel && (
                                    <div style={{ fontSize: 13, color: "#555" }}>
                                        <strong style={{ color: "#111" }}>{meta.extraDateLabel}:</strong>{" "}
                                        <span style={{ display: "inline-block", width: 80, height: 14 }}></span>
                                    </div>
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── DETAILS BOX ────────────────────────────────────────────────── */}
                <table border="0" cellPadding="0" cellSpacing="0" style={{
                    width: "100%",
                    background: "#f7f7f7",
                    borderRadius: 6,
                    borderCollapse: "collapse",
                    marginBottom: 20
                }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: "18px 22px", verticalAlign: "top", width: "50%" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", color: "#555", textTransform: "uppercase", marginBottom: 6 }}>
                                    {meta.partyLabel}
                                </div>
                                <div style={{ minHeight: 60 }}></div>
                            </td>
                            <td style={{ padding: "18px 22px", verticalAlign: "top", textAlign: "right", width: "50%" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", color: "#555", textTransform: "uppercase", marginBottom: 6 }}>
                                    {meta.detailsLabel}
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── ITEMS TABLE ─────────────────────────────────────────────────── */}
                <table border="0" cellPadding="0" cellSpacing="0" style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                    <thead>
                        <tr>
                            {cols.map((c, ci) => (
                                <th key={ci} style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "#555",
                                    padding: "10px 8px",
                                    textAlign: ci === 0 ? "left" : ci === cols.length - 1 ? "right" : "left",
                                    paddingLeft: ci === 0 ? 0 : 8,
                                    paddingRight: ci === cols.length - 1 ? 0 : 8,
                                    borderBottom: "1px solid #e0e0e0"
                                }}>
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(3)].map((_, ri) => (
                            <tr key={ri} style={{ height: 30 }}>
                                {cols.map((_, ci) => (
                                    <td key={ci} style={{ border: "none" }}></td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── TOTALS ──────────────────────────────────────────────────────── */}
            <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid #e8e8e8" }}>
                <table border="0" cellPadding="0" cellSpacing="0" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                        <tr>
                            <td width="100%" style={{ width: "auto" }}></td>
                            <td width="240" style={{ width: "240px" }}>
                                <table border="0" cellPadding="0" cellSpacing="0" style={{ width: 240, borderCollapse: "collapse" }}>
                                    <tbody>
                                        <tr><td style={totCell}>Subtotal:</td><td style={totVal}></td></tr>
                                        <tr><td style={totCell}>Tax:</td><td style={totVal}></td></tr>
                                        <tr style={{ borderTop: "1px solid #e0e0e0" }}>
                                            <td style={{ ...totCell, paddingTop: 10, fontWeight: 700, fontSize: 13, color: "#111" }}>
                                                Total (INR):
                                            </td>
                                            <td style={{ ...totVal, paddingTop: 10, fontSize: 15, fontWeight: 800 }}></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── FOOTER ──────────────────────────────────────────────────────── */}
            <div style={{ borderTop: "1px solid #e8e8e8", marginTop: 30, paddingTop: 18, textAlign: "center" }}>
                {meta.footer.split("\n").map((l, i) => (
                    <p key={i} style={{ fontSize: 11.5, color: "#888", lineHeight: 1.8, margin: 0 }}>{l}</p>
                ))}
            </div>
        </div>
    );
});

export default TemplatePreview;