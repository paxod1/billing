import { purchaseInvoiceService } from "@/services/purchaseInvoiceService";
import { purchasePaymentService } from "@/services/purchasePaymentService";
import { inventoryService } from "@/services/inventoryService";

/**
 * Executes restock operation for items.
 * If supplier_id is provided, it calls the Purchase Invoice API (Save & Send) first,
 * followed by the Purchase Payment API without closing the modal early.
 * If supplier_id is not provided, it falls back to the direct inventory restock API.
 */
export const processRestock = async (restockItem, data, restockType) => {
    const supplierId = data?.supplier_id ? (data.supplier_id.id || data.supplier_id) : null;
    const addedAmount = parseFloat(data?.amount) || 0;

    const unitPrice = restockItem ? parseFloat(
        restockType === "Raw Materials" ? (restockItem.unit_price || 0) :
            (restockItem.Production_cost || restockItem.cost_price || restockItem.rate || 0)
    ) || 0 : 0;

    const totalPrice = addedAmount * unitPrice;

    const itemId = Number(restockItem?.id?.id || restockItem?.id || restockItem?.item_id || restockItem?.source_id);

    if (supplierId) {
        const isCustomizedOrProduct = restockType === "Customized Products" || restockType === "Products" || restockItem?.item_type !== undefined || restockItem?.Production_cost !== undefined || restockItem?.cost_price !== undefined;
        const isRawMaterial = restockType === "Raw Materials" || (!isCustomizedOrProduct && restockItem?.unit_price !== undefined);
        const sourceType = isRawMaterial ? "raw_material" : "customized_product";

        const invoicePayload = {
            supplier_id: supplierId,
            invoice_date: new Date().toISOString().split('T')[0],
            status: "SENT", // Save & Send method
            total_amount: totalPrice,
            items: [
                {
                    source_type: sourceType,
                    source_id: itemId,
                    description: restockItem.name || restockItem.description || "Restock Item",
                    quantity: addedAmount,
                    rate: unitPrice,
                    tax_id: restockItem.tax_id?.id || restockItem.tax_id || restockItem.tax || null,
                    tax_percent: parseFloat(restockItem.tax_percent || 0),
                    amount: totalPrice
                }
            ],
            notes: `Restock purchase invoice for ${restockItem.name || 'Item'}`
        };

        // Step 1: Save & Send Purchase Invoice
        const invRes = await purchaseInvoiceService.saveInvoice(invoicePayload);
        const createdInvoice = invRes?.data || invRes;
        const invoiceId = createdInvoice?.id;

        // Step 2: Record Purchase Payment against the created invoice
        if (invoiceId && data.payment_method) {
            const paymentModeMap = {
                BANK_TRANSFER: "Bank Transfer",
                UPI: "UPI",
                NEFT: "NEFT",
                CHEQUE: "Cheque",
                CASH: "Cash"
            };
            const paymentMode = paymentModeMap[data.payment_method] || data.payment_method || "Bank Transfer";
            const paidAmountNum = parseFloat(data.paid_amount) || totalPrice;
            const paymentStatus = (data.payment_status === "FULLY_PAID" || paidAmountNum >= totalPrice) ? "PAID" : "PARTIALLY_PAID";

            const paymentPayload = {
                supplier_id: supplierId,
                invoice_id: invoiceId,
                payment_date: new Date().toISOString().split('T')[0],
                amount: paidAmountNum,
                payment_mode: paymentMode,
                status: paymentStatus,
                notes: `Payment for restock purchase invoice #${createdInvoice?.invoice_number || invoiceId}`
            };

            await purchasePaymentService.createPayment(paymentPayload);
        }

        return { success: true, method: "PURCHASE_FLOW", invoice: createdInvoice };
    } else {
        // Fallback: direct inventory restock
        if (restockType === "Raw Materials") {
            await inventoryService.restockRawMaterial(restockItem, data);
        } else if (restockType === "Products") {
            await inventoryService.restockProduct(restockItem, data);
        } else {
            await inventoryService.restockCustomizedProduct(restockItem, data);
        }
        return { success: true, method: "DIRECT_FLOW" };
    }
};
