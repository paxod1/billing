const db = require('../config/database');

function hydratePurchaseInvoice(inv) {
    if (!inv) return null;
    const supplierRaw = db.prepare("SELECT * FROM parties WHERE id = ?").get(inv.supplier_id) || null;

    let supplier = null;
    if (supplierRaw) {
        const purDue = db.prepare(`
            SELECT COALESCE(SUM(total_amount), 0) as total
            FROM purchase_invoices
            WHERE supplier_id = ? AND status != 'CANCELLED' AND status != 'PAID'
        `).get(supplierRaw.id).total;

        const paidTotal = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM purchase_payments
            WHERE supplier_id = ? AND status != 'CANCELLED'
        `).get(supplierRaw.id).total;

        const netPurchaseDue = Math.max(0, purDue - paidTotal);

        supplier = {
            ...supplierRaw,
            due_amount: netPurchaseDue.toFixed(2),
            sales_due_amount: "0.00",
            purchase_due_amount: netPurchaseDue.toFixed(2),
            supplierCredit: "0.00"
        };
    }

    const items = db.prepare("SELECT * FROM purchase_items WHERE document_type = 'invoice' AND document_id = ?").all(inv.id);

    const formattedItems = items.map(item => {
        let itemObj = null;
        let rawObj = null;

        if (item.source_id) {
            itemObj = db.prepare("SELECT * FROM items WHERE id = ?").get(item.source_id);
            rawObj = db.prepare("SELECT * FROM raw_materials WHERE id = ?").get(item.source_id);
        }

        return {
            id: item.id,
            quantity: item.quantity,
            rate: parseFloat(item.rate || 0).toFixed(2),
            tax_percent: parseFloat(item.tax_percent || 0).toFixed(2),
            amount: parseFloat(item.amount || (item.quantity * item.rate)).toFixed(2),
            tax_id: item.tax_id || null,
            document_type: item.document_type || 'invoice',
            document_id: item.document_id || inv.id,
            source_type: item.source_type || 'raw_material',
            source_id: item.source_id || null,
            description: item.description || null,
            raw_material: rawObj ? {
                id: rawObj.id,
                name: rawObj.name,
                quantity: parseFloat(rawObj.quantity || 0).toFixed(2),
                unit: rawObj.unit || 'Unit',
                unit_price: parseFloat(rawObj.unit_price || 0).toFixed(2),
                last_updated: rawObj.created_at || new Date().toISOString(),
                description: rawObj.description || '',
                tax_id: rawObj.tax_id || null,
                tax_percent: String(item.tax_percent || 0)
            } : null,
            items: itemObj ? {
                id: itemObj.id,
                name: itemObj.name,
                item_type: itemObj.item_type || 'CUSTOMISED PRODUCTS',
                category: itemObj.category || 'SALES',
                item_code: itemObj.item_code || '',
                hsn_sac_code: itemObj.hsn_sac_code || null,
                unit: itemObj.unit || 'Pcs',
                description: itemObj.description || '',
                rate: parseFloat(itemObj.rate || 0).toFixed(2),
                tax: itemObj.tax_id || null,
                Production_cost: parseFloat(itemObj.Production_cost || itemObj.cost_price || 0).toFixed(2),
                opening_quantity: String(itemObj.opening_quantity || 0),
                current_quantity: String(itemObj.quantity || 0)
            } : null
        };
    });

    const paidSum = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM purchase_payments
        WHERE invoice_id = ? AND status != 'CANCELLED'
    `).get(inv.id).total;

    const returnedSum = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM purchase_returns
        WHERE return_against = ? AND status != 'CANCELLED'
    `).get(inv.id).total;

    const totalAmount = parseFloat(inv.total_amount || 0);
    const totalPaid = parseFloat(paidSum || 0);
    const totalReturned = parseFloat(returnedSum || 0);
    const netPayable = Math.max(0, totalAmount - totalReturned);
    const remainingDue = Math.max(0, netPayable - totalPaid);

    const isReturn = !!inv.return_against || (inv.invoice_number && inv.invoice_number.startsWith('PRN'));
    let paymentScenario = "NORMAL";
    if (isReturn) {
        paymentScenario = returnedSum > totalAmount ? "OVER_RETURN" : "UNDER_RETURN";
    } else if (returnedSum > 0) {
        paymentScenario = returnedSum > totalAmount ? "OVER_RETURN" : "UNDER_RETURN";
    } else if (remainingDue === 0 && totalPaid > 0) {
        paymentScenario = "PAID";
    } else if (totalPaid > 0 && remainingDue > 0) {
        paymentScenario = "PARTIALLY_PAID";
    }

    return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_name: inv.invoice_name || '',
        supplier_id: supplier || (supplierRaw ? supplierRaw : null),
        supplier: supplier || supplierRaw,
        invoice_date: inv.invoice_date ? (inv.invoice_date.includes('T') ? inv.invoice_date : `${inv.invoice_date}T00:00:00.000Z`) : new Date().toISOString(),
        status: inv.status || 'DRAFT',
        total_amount: totalAmount,
        notes: inv.notes || '',
        attachment: inv.attachment || null,
        order_id: inv.order_id || null,
        return_against: inv.return_against || null,
        is_auto_created: false,
        discount_total: "0.00",
        additional_amount: "0.00",
        purchase_item: formattedItems,
        is_return: isReturn,
        total_paid: totalPaid,
        total_returned: totalReturned,
        net_payable: netPayable,
        remaining_due: remainingDue,
        payment_scenario: paymentScenario
    };
}

function hydratePurchasePayment(pay) {
    if (!pay) return null;
    const supplier = db.prepare("SELECT * FROM parties WHERE id = ?").get(pay.supplier_id) || null;
    const items = db.prepare("SELECT * FROM purchase_items WHERE document_type = 'payment' AND document_id = ?").all(pay.id);

    return {
        ...pay,
        supplier_id: supplier ? [supplier] : [],
        supplier: supplier,
        payment_item: items
    };
}

function hydratePurchaseReturn(ret) {
    if (!ret) return null;
    const supplier = db.prepare("SELECT * FROM parties WHERE id = ?").get(ret.supplier_id) || null;
    const items = db.prepare("SELECT * FROM purchase_items WHERE document_type = 'return' AND document_id = ?").all(ret.id);

    return {
        ...ret,
        supplier_id: supplier ? [supplier] : [],
        supplier: supplier,
        purchase_item: items
    };
}

function adjustItemStock(sourceType, sourceId, qtyDelta) {
    const numId = Number(sourceId);
    const delta = parseFloat(qtyDelta);
    if (!numId || isNaN(numId) || !delta || isNaN(delta)) return;

    let sType = String(sourceType || '').toLowerCase();
    if (numId) {
        const rawExists = db.prepare("SELECT id FROM raw_materials WHERE id = ?").get(numId);
        const itemExists = db.prepare("SELECT id FROM items WHERE id = ?").get(numId);
        if (rawExists && !itemExists) {
            sType = 'raw_material';
        } else if (itemExists && !rawExists) {
            sType = 'customized_product';
        }
    }

    const isRaw = sType.includes('raw');
    if (isRaw) {
        db.prepare("UPDATE raw_materials SET quantity = COALESCE(quantity, 0) + ? WHERE id = ?").run(delta, numId);
    } else {
        db.prepare("UPDATE items SET quantity = COALESCE(quantity, 0) + ? WHERE id = ?").run(delta, numId);
    }
}

const purchaseController = {
    // --- PURCHASE INVOICES ---
    getInvoices: (req, res) => {
        try {
            const body = req.body || {};
            const find = body.find || {};
            const { limit = 10, skip = 0, search } = req.query;

            let conditions = [];
            let params = [];

            const searchVal = search || find.search;
            if (searchVal && String(searchVal).trim() !== '') {
                const term = `%${String(searchVal).trim()}%`;
                conditions.push("(invoice_number LIKE ? OR invoice_name LIKE ?)");
                params.push(term, term);
            }

            const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const totalCount = db.prepare(`SELECT COUNT(*) as count FROM purchase_invoices ${whereSql}`).get(...params).count;

            const reqLimit = parseInt(body.limit || limit, 10);
            const reqSkip = parseInt(body.skip || skip, 10);
            const invoices = db.prepare(`SELECT * FROM purchase_invoices ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, reqLimit, reqSkip);

            const hydrated = invoices.map(hydratePurchaseInvoice);

            return res.json({
                success: true,
                statusCode: 200,
                data: hydrated,
                total: totalCount,
                totalCount
            });
        } catch (error) {
            console.error("Error in getPurchaseInvoices:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    saveInvoice: (req, res) => {
        try {
            const data = req.body;
            const supplierId = Array.isArray(data.supplier_id) ? (data.supplier_id[0]?.id || data.supplier_id[0]) : (data.supplier_id?.id || data.supplier_id);

            const count = db.prepare("SELECT COUNT(*) as count FROM purchase_invoices").get().count;
            const invNo = data.invoice_number || `PINV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

            const items = data.items || data.purchase_item || [];
            let subtotal = 0;
            let taxTotal = 0;

            items.forEach(item => {
                const qty = parseFloat(item.quantity || 1);
                const rate = parseFloat(item.rate || 0);
                const tax = parseFloat(item.tax_percent || 0);
                const lineAmount = qty * rate;
                subtotal += lineAmount;
                taxTotal += lineAmount * (tax / 100);
            });

            const grandTotal = parseFloat(data.total_amount || (subtotal + taxTotal));

            const stmt = db.prepare(`
                INSERT INTO purchase_invoices (invoice_number, invoice_name, supplier_id, invoice_date, status, total_amount, subtotal, tax_amount, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const info = stmt.run(
                invNo,
                data.invoice_name || `Purchase Invoice ${invNo}`,
                supplierId || null,
                data.invoice_date || new Date().toISOString().split('T')[0],
                (data.status || 'DRAFT').toUpperCase(),
                grandTotal,
                subtotal,
                taxTotal,
                data.notes || ''
            );

            const invId = info.lastInsertRowid;
            const itemStmt = db.prepare(`
                INSERT INTO purchase_items (document_type, document_id, source_type, source_id, description, quantity, rate, tax_percent, tax_id, amount)
                VALUES ('invoice', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            items.forEach(item => {
                const srcId = item.source_id || item.item_id || (item.items?.id) || (item.raw_material?.id);
                const qty = parseFloat(item.quantity || 1);
                let srcType = item.source_type || (item.raw_material ? 'raw_material' : 'customized_product');

                if (srcId) {
                    const numId = Number(srcId);
                    const rawExists = db.prepare("SELECT id FROM raw_materials WHERE id = ?").get(numId);
                    const itemExists = db.prepare("SELECT id FROM items WHERE id = ?").get(numId);
                    if (rawExists && !itemExists) {
                        srcType = 'raw_material';
                    } else if (itemExists && !rawExists) {
                        srcType = 'customized_product';
                    }
                }

                itemStmt.run(
                    invId,
                    srcType,
                    srcId || null,
                    item.description || item.name || 'Item',
                    qty,
                    parseFloat(item.rate || 0),
                    parseFloat(item.tax_percent || 0),
                    item.tax_id || null,
                    parseFloat(item.amount || (qty * item.rate))
                );

                if (srcId) {
                    adjustItemStock(srcType, srcId, qty);
                }
            });

            const createdInv = db.prepare("SELECT * FROM purchase_invoices WHERE id = ?").get(invId);
            if (createdInv.status === 'POSTED' || createdInv.status === 'SENT') {
                const automatedJournalService = require('../services/automatedJournalService');
                try {
                    automatedJournalService.postPurchaseInvoiceJournal(createdInv);
                } catch (jErr) {
                    console.warn("[JOURNAL WARNING] Automatic journal posting for purchase invoice:", jErr.message);
                }
            }
            return res.status(201).json({ success: true, message: "Purchase Invoice saved successfully", data: hydratePurchaseInvoice(createdInv) });
        } catch (error) {
            console.error("Error in savePurchaseInvoice:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    updateInvoice: (req, res) => {
        try {
            const id = req.params.id || req.query.id;
            const data = req.body;
            const existing = db.prepare("SELECT * FROM purchase_invoices WHERE id = ?").get(id);
            if (!existing) return res.status(404).json({ success: false, message: "Purchase Invoice not found" });

            db.prepare(`
                UPDATE purchase_invoices
                SET invoice_name = ?, invoice_date = ?, total_amount = ?, status = ?, notes = ?
                WHERE id = ?
            `).run(
                data.invoice_name || existing.invoice_name,
                data.invoice_date || existing.invoice_date,
                data.total_amount !== undefined ? parseFloat(data.total_amount) : existing.total_amount,
                data.status ? data.status.toUpperCase() : existing.status,
                data.notes !== undefined ? data.notes : existing.notes,
                id
            );

            if (data.items || data.purchase_item) {
                const oldItems = db.prepare("SELECT * FROM purchase_items WHERE document_type = 'invoice' AND document_id = ?").all(id);
                oldItems.forEach(oldItem => {
                    if (oldItem.source_id) {
                        adjustItemStock(oldItem.source_type, oldItem.source_id, -parseFloat(oldItem.quantity || 0));
                    }
                });

                db.prepare("DELETE FROM purchase_items WHERE document_type = 'invoice' AND document_id = ?").run(id);

                const itemStmt = db.prepare(`
                    INSERT INTO purchase_items (document_type, document_id, source_type, source_id, description, quantity, rate, tax_percent, tax_id, amount)
                    VALUES ('invoice', ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                const items = data.items || data.purchase_item;
                items.forEach(item => {
                    const srcId = item.source_id || item.item_id || (item.items?.id) || (item.raw_material?.id);
                    const qty = parseFloat(item.quantity || 1);
                    const srcType = item.source_type || (item.raw_material ? 'raw_material' : 'customized_product');

                    itemStmt.run(
                        id,
                        srcType,
                        srcId || null,
                        item.description || item.name || 'Item',
                        qty,
                        parseFloat(item.rate || 0),
                        parseFloat(item.tax_percent || 0),
                        item.tax_id || null,
                        parseFloat(item.amount || (qty * item.rate))
                    );

                    if (srcId) {
                        adjustItemStock(srcType, srcId, qty);
                    }
                });
            }

            const updated = db.prepare("SELECT * FROM purchase_invoices WHERE id = ?").get(id);
            return res.json({ success: true, message: "Purchase Invoice updated successfully", data: hydratePurchaseInvoice(updated) });
        } catch (error) {
            console.error("Error in updatePurchaseInvoice:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    deleteInvoice: (req, res) => {
        try {
            const id = req.params.id;
            const oldItems = db.prepare("SELECT * FROM purchase_items WHERE document_type = 'invoice' AND document_id = ?").all(id);
            oldItems.forEach(oldItem => {
                if (oldItem.source_id) {
                    adjustItemStock(oldItem.source_type, oldItem.source_id, -parseFloat(oldItem.quantity || 0));
                }
            });
            db.prepare("DELETE FROM purchase_items WHERE document_type = 'invoice' AND document_id = ?").run(id);
            db.prepare("DELETE FROM purchase_invoices WHERE id = ?").run(id);
            return res.json({ success: true, message: "Purchase Invoice deleted successfully" });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    exportInvoices: (req, res) => {
        try {
            const invoices = db.prepare("SELECT * FROM purchase_invoices ORDER BY id DESC").all();
            return res.json({ success: true, data: invoices.map(hydratePurchaseInvoice) });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // --- PURCHASE PAYMENTS ---
    getPayments: (req, res) => {
        try {
            const body = req.body || {};
            const { limit = 10, skip = 0 } = req.query;
            const totalCount = db.prepare("SELECT COUNT(*) as count FROM purchase_payments").get().count;
            const payments = db.prepare("SELECT * FROM purchase_payments ORDER BY id DESC LIMIT ? OFFSET ?").all(parseInt(limit, 10), parseInt(skip, 10));

            return res.json({
                success: true,
                statusCode: 200,
                data: payments.map(hydratePurchasePayment),
                total: totalCount,
                totalCount
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    createPayment: (req, res) => {
        try {
            const data = req.body;
            const count = db.prepare("SELECT COUNT(*) as count FROM purchase_payments").get().count;
            const payNo = data.payment_number || `PPAY-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
            const supplierId = Array.isArray(data.supplier_id) ? (data.supplier_id[0]?.id || data.supplier_id[0]) : (data.supplier_id?.id || data.supplier_id);
            const invoiceId = data.invoice_id || data.document_id || null;

            const stmt = db.prepare(`
                INSERT INTO purchase_payments (payment_number, supplier_id, invoice_id, payment_date, amount, payment_mode, reference, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const info = stmt.run(
                payNo,
                supplierId || null,
                invoiceId,
                data.payment_date || new Date().toISOString().split('T')[0],
                parseFloat(data.amount || 0),
                data.payment_mode || 'Bank Transfer',
                data.reference || '',
                (data.status || 'PAID').toUpperCase(),
                data.notes || ''
            );

            const created = db.prepare("SELECT * FROM purchase_payments WHERE id = ?").get(info.lastInsertRowid);

            // Post automated journal entry for Purchase Payment (enforces fund balance check)
            const automatedJournalService = require('../services/automatedJournalService');
            automatedJournalService.postPurchasePaymentJournal(created);

            // Update associated Purchase Invoice status and remaining due
            if (invoiceId) {
                const inv = db.prepare("SELECT total_amount FROM purchase_invoices WHERE id = ?").get(invoiceId);
                if (inv) {
                    const paidSum = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM purchase_payments WHERE invoice_id = ? AND status != 'CANCELLED'").get(invoiceId).total;
                    const remDue = inv.total_amount - paidSum;
                    const newStatus = remDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';
                    db.prepare("UPDATE purchase_invoices SET status = ? WHERE id = ?").run(newStatus, invoiceId);
                }
            }

            return res.status(201).json({
                success: true,
                statusCode: 200,
                message: "Purchase Payment created successfully",
                data: hydratePurchasePayment(created)
            });
        } catch (error) {
            console.error("Error in createPayment:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    updatePayment: (req, res) => {
        try {
            const id = req.params.id || req.query.id;
            const data = req.body;
            db.prepare(`
                UPDATE purchase_payments
                SET amount = ?, payment_date = ?, payment_mode = ?, notes = ?
                WHERE id = ?
            `).run(
                data.amount !== undefined ? parseFloat(data.amount) : 0,
                data.payment_date || new Date().toISOString().split('T')[0],
                data.payment_mode || 'Bank Transfer',
                data.notes || '',
                id
            );
            const updated = db.prepare("SELECT * FROM purchase_payments WHERE id = ?").get(id);
            return res.json({ success: true, message: "Purchase Payment updated successfully", data: hydratePurchasePayment(updated) });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    deletePayment: (req, res) => {
        try {
            const id = req.params.id;
            db.prepare("DELETE FROM purchase_payments WHERE id = ?").run(id);
            return res.json({ success: true, message: "Purchase Payment deleted successfully" });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // --- PURCHASE RETURNS ---
    getReturns: (req, res) => {
        try {
            const { limit = 10, skip = 0 } = req.query;
            const totalCount = db.prepare("SELECT COUNT(*) as count FROM purchase_returns").get().count;
            const returns = db.prepare("SELECT * FROM purchase_returns ORDER BY id DESC LIMIT ? OFFSET ?").all(parseInt(limit, 10), parseInt(skip, 10));

            return res.json({
                success: true,
                data: returns.map(hydratePurchaseReturn),
                totalCount
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    saveReturn: (req, res) => {
        try {
            const data = req.body;
            const count = db.prepare("SELECT COUNT(*) as count FROM purchase_returns").get().count;
            const retNo = data.invoice_number || `PRN-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
            const supplierId = Array.isArray(data.supplier_id) ? (data.supplier_id[0]?.id || data.supplier_id[0]) : (data.supplier_id?.id || data.supplier_id);

            const stmt = db.prepare(`
                INSERT INTO purchase_returns (invoice_number, invoice_name, supplier_id, return_against, invoice_date, total_amount, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const info = stmt.run(
                retNo,
                data.invoice_name || `Return for ${retNo}`,
                supplierId || null,
                data.return_against || null,
                data.invoice_date || new Date().toISOString().split('T')[0],
                parseFloat(data.total_amount || 0),
                (data.status || 'DRAFT').toUpperCase(),
                data.notes || ''
            );

            const created = db.prepare("SELECT * FROM purchase_returns WHERE id = ?").get(info.lastInsertRowid);
            if (created.status === 'POSTED' || created.status === 'SENT') {
                const automatedJournalService = require('../services/automatedJournalService');
                try {
                    automatedJournalService.postPurchaseInvoiceJournal(created);
                } catch (jErr) {
                    console.warn("[JOURNAL WARNING] Automatic journal posting for purchase return:", jErr.message);
                }
            }
            return res.status(201).json({ success: true, message: "Purchase Return saved successfully", data: hydratePurchaseReturn(created) });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    updateReturn: (req, res) => {
        try {
            const id = req.params.id || req.query.id;
            const data = req.body;
            db.prepare(`
                UPDATE purchase_returns
                SET invoice_name = ?, invoice_date = ?, total_amount = ?, notes = ?
                WHERE id = ?
            `).run(data.invoice_name || '', data.invoice_date || '', parseFloat(data.total_amount || 0), data.notes || '', id);
            const updated = db.prepare("SELECT * FROM purchase_returns WHERE id = ?").get(id);
            return res.json({ success: true, message: "Purchase Return updated successfully", data: hydratePurchaseReturn(updated) });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    deleteReturn: (req, res) => {
        try {
            const id = req.params.id;
            db.prepare("DELETE FROM purchase_returns WHERE id = ?").run(id);
            return res.json({ success: true, message: "Purchase Return deleted successfully" });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    sendInvoiceEmail: (req, res) => {
        const automatedJournalService = require('../services/automatedJournalService');
        return automatedJournalService.handleDocumentEmailAndJournal(req, res);
    }
};

module.exports = purchaseController;
