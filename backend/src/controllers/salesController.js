const db = require('../config/database');

function adjustItemStock(sourceType, sourceId, qtyDelta) {
    if (!sourceId || !qtyDelta || isNaN(qtyDelta)) return;
    const isRaw = sourceType === 'raw_material' || sourceType === 'RAW_MATERIAL';
    if (isRaw) {
        db.prepare("UPDATE raw_materials SET quantity = COALESCE(quantity, 0) + ? WHERE id = ?").run(qtyDelta, sourceId);
    } else {
        db.prepare("UPDATE items SET quantity = COALESCE(quantity, 0) + ? WHERE id = ?").run(qtyDelta, sourceId);
    }
}

// Helper to attach deep relations to Sales Invoices
function hydrateSalesInvoice(inv) {
    if (!inv) return null;
    const customer = db.prepare("SELECT * FROM parties WHERE id = ?").get(inv.customer_id) || null;
    const items = db.prepare("SELECT * FROM sales_items WHERE document_type = 'INVOICE' AND document_id = ?").all(inv.id);
    
    // Map items to match frontend expects: items object & item detail
    const formattedItems = items.map(item => {
        const itemObj = item.source_id ? db.prepare("SELECT * FROM items WHERE id = ?").get(item.source_id) : null;
        return {
            ...item,
            items: itemObj || { id: item.source_id || item.id, name: item.description }
        };
    });

    return {
        ...inv,
        customer_id: customer ? [customer] : [],
        customer: customer,
        sales_item: formattedItems
    };
}

// Helper to attach deep relations to Sales Payments
function hydrateSalesPayment(pay) {
    if (!pay) return null;
    const customer = db.prepare("SELECT * FROM parties WHERE id = ?").get(pay.customer_id) || null;
    const items = db.prepare("SELECT * FROM sales_items WHERE document_type = 'PAYMENT' AND document_id = ?").all(pay.id);

    return {
        ...pay,
        customer_id: customer ? [customer] : [],
        customer: customer,
        sales_item: items
    };
}

// Helper to attach deep relations to Sales Returns
function hydrateSalesReturn(ret) {
    if (!ret) return null;
    const customer = db.prepare("SELECT * FROM parties WHERE id = ?").get(ret.customer_id) || null;
    const items = db.prepare("SELECT * FROM sales_items WHERE document_type = 'RETURN' AND document_id = ?").all(ret.id);
    const originalInv = ret.return_against ? db.prepare("SELECT * FROM sales_invoices WHERE id = ?").get(ret.return_against) : null;

    const formattedItems = items.map(item => {
        const itemObj = item.source_id ? db.prepare("SELECT * FROM items WHERE id = ?").get(item.source_id) : null;
        return {
            ...item,
            items: itemObj || { id: item.source_id || item.id, name: item.description }
        };
    });

    return {
        ...ret,
        customer_id: customer ? [customer] : [],
        customer: customer,
        sales_item: formattedItems,
        invoice_summary: {
            original_total: originalInv ? originalInv.total_amount : ret.total_amount,
            amount_paid_on_original: 0,
            original_tax_total: originalInv ? originalInv.tax_amount : 0,
            total_returned: ret.total_amount
        }
    };
}

const salesController = {
    // --- SALES INVOICES ---
    getInvoices: (req, res) => {
        try {
            const body = req.body || {};
            const find = body.find || {};
            const { limit = 10, skip = 0, search, customer_id, status } = req.query;

            let conditions = [];
            let params = [];

            const searchVal = search || find.search;
            if (searchVal && String(searchVal).trim() !== '') {
                const term = `%${String(searchVal).trim()}%`;
                conditions.push("(invoice_number LIKE ? OR invoice_name LIKE ?)");
                params.push(term, term);
            }

            const statusVal = status || find.status;
            if (statusVal) {
                conditions.push("status = ?");
                params.push(String(statusVal).toUpperCase());
            }

            const custId = customer_id || find.customer_id;
            if (custId) {
                conditions.push("customer_id = ?");
                params.push(parseInt(custId, 10));
            }

            const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const totalCount = db.prepare(`SELECT COUNT(*) as count FROM sales_invoices ${whereSql}`).get(...params).count;

            let reqLimit = parseInt(body.limit || limit, 10);
            if (req.user && req.user.dataLimit && !req.user.hasAllAccess) {
                reqLimit = Math.min(reqLimit, req.user.dataLimit);
            }
            const reqSkip = parseInt(body.skip || skip, 10);
            const rawInvoices = db.prepare(`SELECT * FROM sales_invoices ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, reqLimit, reqSkip);

            const hydrated = rawInvoices.map(hydrateSalesInvoice);

            return res.json({
                success: true,
                data: hydrated,
                totalCount
            });
        } catch (error) {
            console.error("Error in getInvoices:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getInvoiceById: (req, res) => {
        try {
            const id = req.params.id || req.query.id;
            const inv = db.prepare("SELECT * FROM sales_invoices WHERE id = ?").get(id);
            if (!inv) return res.status(404).json({ success: false, message: "Invoice not found" });

            return res.json({ success: true, data: hydrateSalesInvoice(inv) });
        } catch (error) {
            console.error("Error in getInvoiceById:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    saveInvoice: (req, res) => {
        try {
            const data = req.body;
            const customerId = Array.isArray(data.customer_id) ? (data.customer_id[0]?.id || data.customer_id[0]) : (data.customer_id?.id || data.customer_id);

            // Generate invoice number if missing
            const count = db.prepare("SELECT COUNT(*) as count FROM sales_invoices").get().count;
            const invNo = data.invoice_number || `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

            const items = data.items || data.sales_item || [];
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
                INSERT INTO sales_invoices (invoice_number, invoice_name, customer_id, invoice_date, status, total_amount, subtotal, tax_amount, notes, payment_terms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const info = stmt.run(
                invNo,
                data.invoice_name || `Invoice for ${invNo}`,
                customerId || null,
                data.invoice_date || new Date().toISOString().split('T')[0],
                (data.status || 'DRAFT').toUpperCase(),
                grandTotal,
                subtotal,
                taxTotal,
                data.notes || '',
                data.payment_terms || 'Net 15'
            );

            const invId = info.lastInsertRowid;

            // Insert line items
            const itemStmt = db.prepare(`
                INSERT INTO sales_items (document_type, document_id, source_type, source_id, description, quantity, rate, tax_percent, tax_id, amount)
                VALUES ('INVOICE', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            items.forEach(item => {
                const srcId = item.source_id || item.item_id || (item.items?.id) || (item.raw_material?.id);
                const qty = parseFloat(item.quantity || 1);
                const srcType = item.source_type || (item.raw_material ? 'raw_material' : 'customized_product');

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
                    adjustItemStock(srcType, srcId, -qty);
                }
            });

            const createdInv = db.prepare("SELECT * FROM sales_invoices WHERE id = ?").get(invId);
            if (createdInv.status === 'POSTED' || createdInv.status === 'SENT') {
                const automatedJournalService = require('../services/automatedJournalService');
                try {
                    automatedJournalService.postSalesInvoiceJournal(createdInv);
                } catch (jErr) {
                    console.warn("[JOURNAL WARNING] Automatic journal posting for sales invoice:", jErr.message);
                }
            }
            return res.status(201).json({ success: true, message: "Invoice saved successfully", data: hydrateSalesInvoice(createdInv) });
        } catch (error) {
            console.error("Error in saveInvoice:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    updateInvoice: (req, res) => {
        try {
            const id = req.params.id || req.query.id;
            const data = req.body;
            const existing = db.prepare("SELECT * FROM sales_invoices WHERE id = ?").get(id);
            if (!existing) return res.status(404).json({ success: false, message: "Invoice not found" });

            const customerId = Array.isArray(data.customer_id) ? (data.customer_id[0]?.id || data.customer_id[0]) : (data.customer_id?.id || data.customer_id || existing.customer_id);

            db.prepare(`
                UPDATE sales_invoices
                SET invoice_name = ?, customer_id = ?, invoice_date = ?, status = ?, total_amount = ?, notes = ?
                WHERE id = ?
            `).run(
                data.invoice_name || existing.invoice_name,
                customerId,
                data.invoice_date || existing.invoice_date,
                data.status ? data.status.toUpperCase() : existing.status,
                data.total_amount !== undefined ? parseFloat(data.total_amount) : existing.total_amount,
                data.notes !== undefined ? data.notes : existing.notes,
                id
            );

            // Re-insert line items if provided
            if (data.items || data.sales_item) {
                const oldItems = db.prepare("SELECT * FROM sales_items WHERE document_type = 'INVOICE' AND document_id = ?").all(id);
                oldItems.forEach(oldItem => {
                    if (oldItem.source_id) {
                        adjustItemStock(oldItem.source_type, oldItem.source_id, +parseFloat(oldItem.quantity || 0));
                    }
                });

                db.prepare("DELETE FROM sales_items WHERE document_type = 'INVOICE' AND document_id = ?").run(id);

                const itemStmt = db.prepare(`
                    INSERT INTO sales_items (document_type, document_id, source_type, source_id, description, quantity, rate, tax_percent, tax_id, amount)
                    VALUES ('INVOICE', ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                const items = data.items || data.sales_item;
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
                        adjustItemStock(srcType, srcId, -qty);
                    }
                });
            }

            const updated = db.prepare("SELECT * FROM sales_invoices WHERE id = ?").get(id);
            return res.json({ success: true, message: "Invoice updated successfully", data: hydrateSalesInvoice(updated) });
        } catch (error) {
            console.error("Error in updateInvoice:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    deleteInvoice: (req, res) => {
        try {
            const id = req.params.id;
            const oldItems = db.prepare("SELECT * FROM sales_items WHERE document_type = 'INVOICE' AND document_id = ?").all(id);
            oldItems.forEach(oldItem => {
                if (oldItem.source_id) {
                    adjustItemStock(oldItem.source_type, oldItem.source_id, +parseFloat(oldItem.quantity || 0));
                }
            });
            db.prepare("DELETE FROM sales_items WHERE document_type = 'INVOICE' AND document_id = ?").run(id);
            db.prepare("DELETE FROM sales_invoices WHERE id = ?").run(id);
            return res.json({ success: true, message: "Invoice deleted successfully" });
        } catch (error) {
            console.error("Error in deleteInvoice:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    exportInvoices: (req, res) => {
        try {
            let sql = "SELECT * FROM sales_invoices ORDER BY id DESC";
            if (req.user && req.user.dataLimit && !req.user.hasAllAccess) {
                sql += " LIMIT " + req.user.dataLimit;
            }
            const invoices = db.prepare(sql).all();
            return res.json({ success: true, data: invoices.map(hydrateSalesInvoice) });
        } catch (error) {
            console.error("Error in exportInvoices:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    sendInvoiceEmail: (req, res) => {
        const automatedJournalService = require('../services/automatedJournalService');
        return automatedJournalService.handleDocumentEmailAndJournal(req, res);
    },

    // --- SALES PAYMENTS ---
    getPayments: (req, res) => {
        try {
            const body = req.body || {};
            const find = body.find || {};
            const { limit = 10, skip = 0, search } = req.query;

            let conditions = [];
            let params = [];

            const searchVal = search || find.search;
            if (searchVal && String(searchVal).trim() !== '') {
                const term = `%${String(searchVal).trim()}%`;
                conditions.push("payment_number LIKE ?");
                params.push(term);
            }

            const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const totalCount = db.prepare(`SELECT COUNT(*) as count FROM sales_payments ${whereSql}`).get(...params).count;

            const reqLimit = parseInt(body.limit || limit, 10);
            const reqSkip = parseInt(body.skip || skip, 10);
            const payments = db.prepare(`SELECT * FROM sales_payments ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, reqLimit, reqSkip);

            return res.json({
                success: true,
                data: payments.map(hydrateSalesPayment),
                totalCount
            });
        } catch (error) {
            console.error("Error in getPayments:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    createPayment: (req, res) => {
        try {
            const data = req.body;
            const count = db.prepare("SELECT COUNT(*) as count FROM sales_payments").get().count;
            const payNo = data.payment_number || `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

            const customerId = Array.isArray(data.customer_id) ? (data.customer_id[0]?.id || data.customer_id[0]) : (data.customer_id?.id || data.customer_id);

            const stmt = db.prepare(`
                INSERT INTO sales_payments (payment_number, customer_id, invoice_id, payment_date, amount, payment_mode, reference, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const info = stmt.run(
                payNo,
                customerId || null,
                data.invoice_id || null,
                data.payment_date || new Date().toISOString().split('T')[0],
                parseFloat(data.amount || 0),
                data.payment_mode || 'Bank Transfer',
                data.reference || '',
                (data.status || 'PAID').toUpperCase(),
                data.notes || ''
            );

            // Update associated sales invoice status if provided
            if (data.invoice_id) {
                db.prepare("UPDATE sales_invoices SET status = 'PAID' WHERE id = ?").run(data.invoice_id);
            }

            const created = db.prepare("SELECT * FROM sales_payments WHERE id = ?").get(info.lastInsertRowid);
            const automatedJournalService = require('../services/automatedJournalService');
            automatedJournalService.postSalesPaymentJournal(created);
            return res.status(201).json({ success: true, message: "Payment created successfully", data: hydrateSalesPayment(created) });
        } catch (error) {
            console.error("Error in createPayment:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    updatePayment: (req, res) => {
        try {
            const id = req.params.id || req.query.id;
            const data = req.body;
            const existing = db.prepare("SELECT * FROM sales_payments WHERE id = ?").get(id);
            if (!existing) return res.status(404).json({ success: false, message: "Payment not found" });

            db.prepare(`
                UPDATE sales_payments
                SET amount = ?, payment_date = ?, payment_mode = ?, notes = ?
                WHERE id = ?
            `).run(
                data.amount !== undefined ? parseFloat(data.amount) : existing.amount,
                data.payment_date || existing.payment_date,
                data.payment_mode || existing.payment_mode,
                data.notes !== undefined ? data.notes : existing.notes,
                id
            );

            const updated = db.prepare("SELECT * FROM sales_payments WHERE id = ?").get(id);
            return res.json({ success: true, message: "Payment updated successfully", data: hydrateSalesPayment(updated) });
        } catch (error) {
            console.error("Error in updatePayment:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    deletePayment: (req, res) => {
        try {
            const id = req.params.id;
            db.prepare("DELETE FROM sales_payments WHERE id = ?").run(id);
            return res.json({ success: true, message: "Payment deleted successfully" });
        } catch (error) {
            console.error("Error in deletePayment:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    exportPayments: (req, res) => {
        try {
            const payments = db.prepare("SELECT * FROM sales_payments ORDER BY id DESC").all();
            return res.json({ success: true, data: payments.map(hydrateSalesPayment) });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // --- SALES RETURNS ---
    getReturns: (req, res) => {
        try {
            const body = req.body || {};
            const find = body.find || {};
            const { limit = 10, skip = 0, search } = req.query;

            let conditions = [];
            let params = [];

            const searchVal = search || find.search;
            if (searchVal && String(searchVal).trim() !== '') {
                const term = `%${String(searchVal).trim()}%`;
                conditions.push("invoice_number LIKE ?");
                params.push(term);
            }

            const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const totalCount = db.prepare(`SELECT COUNT(*) as count FROM sales_returns ${whereSql}`).get(...params).count;

            const reqLimit = parseInt(body.limit || limit, 10);
            const reqSkip = parseInt(body.skip || skip, 10);
            const returns = db.prepare(`SELECT * FROM sales_returns ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, reqLimit, reqSkip);

            return res.json({
                success: true,
                data: returns.map(hydrateSalesReturn),
                totalCount
            });
        } catch (error) {
            console.error("Error in getReturns:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    saveReturn: (req, res) => {
        try {
            const data = req.body;
            const count = db.prepare("SELECT COUNT(*) as count FROM sales_returns").get().count;
            const retNo = data.invoice_number || `SRN-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
            const customerId = Array.isArray(data.customer_id) ? (data.customer_id[0]?.id || data.customer_id[0]) : (data.customer_id?.id || data.customer_id);

            const stmt = db.prepare(`
                INSERT INTO sales_returns (invoice_number, invoice_name, customer_id, return_against, invoice_date, total_amount, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const info = stmt.run(
                retNo,
                data.invoice_name || `Return for ${retNo}`,
                customerId || null,
                data.return_against || null,
                data.invoice_date || new Date().toISOString().split('T')[0],
                parseFloat(data.total_amount || 0),
                (data.status || 'DRAFT').toUpperCase(),
                data.notes || ''
            );

            const retId = info.lastInsertRowid;
            const items = data.items || data.sales_item || [];

            const itemStmt = db.prepare(`
                INSERT INTO sales_items (document_type, document_id, source_type, source_id, description, quantity, rate, tax_percent, tax_id, amount)
                VALUES ('RETURN', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            items.forEach(item => {
                const srcId = item.source_id || item.item_id || (item.items?.id);
                itemStmt.run(
                    retId,
                    item.source_type || 'customized_product',
                    srcId || null,
                    item.description || item.name || 'Returned Item',
                    parseFloat(item.quantity || 1),
                    parseFloat(item.rate || 0),
                    parseFloat(item.tax_percent || 0),
                    item.tax_id || null,
                    parseFloat(item.amount || (item.quantity * item.rate))
                );
            });

            const created = db.prepare("SELECT * FROM sales_returns WHERE id = ?").get(retId);
            if (created.status === 'POSTED' || created.status === 'SENT') {
                const automatedJournalService = require('../services/automatedJournalService');
                try {
                    automatedJournalService.postSalesReturnJournal(created);
                } catch (jErr) {
                    console.warn("[JOURNAL WARNING] Automatic journal posting for sales return:", jErr.message);
                }
            }
            return res.status(201).json({ success: true, message: "Sales Return saved successfully", data: hydrateSalesReturn(created) });
        } catch (error) {
            console.error("Error in saveReturn:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    updateReturn: (req, res) => {
        try {
            const id = req.params.id || req.query.id;
            const data = req.body;
            const existing = db.prepare("SELECT * FROM sales_returns WHERE id = ?").get(id);
            if (!existing) return res.status(404).json({ success: false, message: "Return not found" });

            db.prepare(`
                UPDATE sales_returns
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

            const updated = db.prepare("SELECT * FROM sales_returns WHERE id = ?").get(id);
            return res.json({ success: true, message: "Sales Return updated successfully", data: hydrateSalesReturn(updated) });
        } catch (error) {
            console.error("Error in updateReturn:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    deleteReturn: (req, res) => {
        try {
            const id = req.params.id;
            db.prepare("DELETE FROM sales_items WHERE document_type = 'RETURN' AND document_id = ?").run(id);
            db.prepare("DELETE FROM sales_returns WHERE id = ?").run(id);
            return res.json({ success: true, message: "Sales Return deleted successfully" });
        } catch (error) {
            console.error("Error in deleteReturn:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = salesController;
