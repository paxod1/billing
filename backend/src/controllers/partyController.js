const db = require('../config/database');

const partyController = {
    // Get all parties with search, filter, pagination
    getParties: (req, res) => {
        try {
            const { role, search, name, email, phone, limit = 10, skip = 0 } = req.query;
            let find = req.body?.find || {};
            
            // Build WHERE clause conditions
            let conditions = [];
            let params = [];

            // Role filter
            let targetRole = role || find.role || req.body.role;
            if (targetRole && typeof targetRole === 'object') {
                targetRole = targetRole._eq || (Array.isArray(targetRole._in) ? targetRole._in[0] : targetRole._in) || targetRole.value || (Array.isArray(targetRole) ? targetRole[0] : null);
            }
            if (targetRole && typeof targetRole === 'string' && targetRole.toUpperCase() !== 'ALL') {
                conditions.push("(role = ? OR role = 'BOTH')");
                params.push(targetRole.toUpperCase());
            }

            // Search filter
            const searchTerm = search || find.search || req.body.search;
            if (searchTerm && String(searchTerm).trim() !== '') {
                const term = `%${String(searchTerm).trim()}%`;
                conditions.push("(name LIKE ? OR email LIKE ? OR phone LIKE ? OR address LIKE ?)");
                params.push(term, term, term, term);
            }

            // Specific field filters
            if (name) {
                conditions.push("name LIKE ?");
                params.push(`%${name}%`);
            }
            if (email) {
                conditions.push("email LIKE ?");
                params.push(`%${email}%`);
            }
            if (phone) {
                conditions.push("phone LIKE ?");
                params.push(`%${phone}%`);
            }

            const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            
            // Total count query
            const totalCount = db.prepare(`SELECT COUNT(*) as count FROM parties ${whereSql}`).get(...params).count;

            // Data query with sorting and pagination based on role limits
            let reqLimit = parseInt(req.body.limit || limit, 10);
            if (req.user && req.user.dataLimit && !req.user.hasAllAccess) {
                reqLimit = Math.min(reqLimit, req.user.dataLimit);
            }
            const reqSkip = parseInt(req.body.skip || skip, 10);
            const dataSql = `SELECT * FROM parties ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`;
            const parties = db.prepare(dataSql).all(...params, reqLimit, reqSkip);

            return res.json({
                success: true,
                data: parties,
                totalCount: totalCount
            });
        } catch (error) {
            console.error("Error in getParties:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get single party by ID
    getPartyById: (req, res) => {
        try {
            const id = req.params.id || req.query.id;
            const party = db.prepare("SELECT * FROM parties WHERE id = ?").get(id);
            if (!party) {
                return res.status(404).json({ success: false, message: "Party not found" });
            }
            return res.json({ success: true, data: party });
        } catch (error) {
            console.error("Error in getPartyById:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Create party (single or multiple)
    createParty: (req, res) => {
        try {
            const payload = Array.isArray(req.body) ? req.body : [req.body];
            const stmt = db.prepare(`
                INSERT INTO parties (name, role, email, phone, address, currency, gst_reg, opening_balance)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const insertedIds = [];
            const insertTransaction = db.transaction((items) => {
                for (const item of items) {
                    const info = stmt.run(
                        item.name || '',
                        (item.role || 'CUSTOMER').toUpperCase(),
                        item.email || '',
                        item.phone || '',
                        item.address || '',
                        item.currency || 'INR',
                        item.gst_reg || item.gstRegistration || '',
                        parseFloat(item.opening_balance || 0)
                    );
                    insertedIds.push(info.lastInsertRowid);
                }
            });

            insertTransaction(payload);
            const created = db.prepare(`SELECT * FROM parties WHERE id IN (${insertedIds.join(',')})`).all();

            return res.status(201).json({
                success: true,
                message: "Party created successfully",
                data: Array.isArray(req.body) ? created : created[0]
            });
        } catch (error) {
            console.error("Error in createParty:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Update party by ID
    updateParty: (req, res) => {
        try {
            const id = req.params.id || req.body.id;
            const party = db.prepare("SELECT * FROM parties WHERE id = ?").get(id);
            if (!party) {
                return res.status(404).json({ success: false, message: "Party not found" });
            }

            const data = req.body;
            db.prepare(`
                UPDATE parties
                SET name = ?, role = ?, email = ?, phone = ?, address = ?, currency = ?, gst_reg = ?, opening_balance = ?
                WHERE id = ?
            `).run(
                data.name !== undefined ? data.name : party.name,
                data.role !== undefined ? data.role.toUpperCase() : party.role,
                data.email !== undefined ? data.email : party.email,
                data.phone !== undefined ? data.phone : party.phone,
                data.address !== undefined ? data.address : party.address,
                data.currency !== undefined ? data.currency : party.currency,
                data.gst_reg !== undefined ? data.gst_reg : (data.gstRegistration !== undefined ? data.gstRegistration : party.gst_reg),
                data.opening_balance !== undefined ? parseFloat(data.opening_balance) : party.opening_balance,
                id
            );

            const updated = db.prepare("SELECT * FROM parties WHERE id = ?").get(id);
            return res.json({ success: true, message: "Party updated successfully", data: updated });
        } catch (error) {
            console.error("Error in updateParty:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Delete party by ID
    deleteParty: (req, res) => {
        try {
            const id = req.params.id;
            db.prepare("DELETE FROM parties WHERE id = ?").run(id);
            return res.json({ success: true, message: "Party deleted successfully" });
        } catch (error) {
            console.error("Error in deleteParty:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Export parties (limited for ADMIN, full access for SUPERADMIN)
    exportParties: (req, res) => {
        try {
            const { role = 'all' } = req.body;
            let sql = "SELECT * FROM parties";
            let params = [];
            if (role.toLowerCase() !== 'all') {
                sql += " WHERE role = ? OR role = 'BOTH'";
                params.push(role.toUpperCase());
            }
            if (req.user && req.user.dataLimit && !req.user.hasAllAccess) {
                sql += " LIMIT " + req.user.dataLimit;
            }
            const parties = db.prepare(sql).all(...params);
            return res.json({ success: true, data: parties });
        } catch (error) {
            console.error("Error in exportParties:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get party statement (invoices & payments history)
    getPartyStatement: (req, res) => {
        try {
            const partyId = req.query.party_id || req.query.id;
            const type = (req.query.type || 'SALES').toUpperCase(); // "PURCHASE" or "SALES"
            const fromDate = req.query.from_date;
            const toDate = req.query.to_date;

            if (!partyId) {
                return res.status(400).json({ success: false, message: "Party ID required" });
            }

            const party = db.prepare("SELECT * FROM parties WHERE id = ?").get(partyId);
            if (!party) {
                return res.status(404).json({ success: false, message: "Party not found" });
            }

            let invoiceRows = [];
            let paymentRows = [];
            
            if (type === 'PURCHASE') {
                invoiceRows = db.prepare("SELECT * FROM purchase_invoices WHERE supplier_id = ? AND status != 'CANCELLED'").all(partyId);
                paymentRows = db.prepare("SELECT * FROM purchase_payments WHERE supplier_id = ? AND status != 'CANCELLED'").all(partyId);
            } else {
                invoiceRows = db.prepare("SELECT * FROM sales_invoices WHERE customer_id = ? AND status != 'CANCELLED'").all(partyId);
                paymentRows = db.prepare("SELECT * FROM sales_payments WHERE customer_id = ? AND status != 'CANCELLED'").all(partyId);
            }

            // Optional Date Filtering
            if (fromDate) {
                invoiceRows = invoiceRows.filter(i => (i.invoice_date || i.created_at || '').split('T')[0] >= fromDate);
            }
            if (toDate) {
                invoiceRows = invoiceRows.filter(i => (i.invoice_date || i.created_at || '').split('T')[0] <= toDate);
            }

            const formattedInvoices = invoiceRows.map(inv => {
                const invTotal = parseFloat(inv.total_amount || 0);
                
                // Find payments linked to this invoice
                const invPayments = paymentRows.filter(p => p.invoice_id === inv.id || p.document_id === inv.id);
                
                const totalPaid = invPayments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
                const dueAmount = Math.max(0, invTotal - totalPaid);
                
                return {
                    id: inv.id,
                    invoice_number: inv.invoice_number,
                    invoice_name: inv.invoice_name || (type === 'PURCHASE' ? 'Purchase Invoice' : 'Sales Invoice'),
                    invoice_date: inv.invoice_date,
                    status: inv.status,
                    invoice_total: invTotal,
                    total_paid: totalPaid,
                    due_amount: dueAmount,
                    payments: invPayments.map(p => ({
                        payment_number: p.payment_number || p.payment_id,
                        payment_date: p.payment_date,
                        payment_name: p.notes || p.payment_name || p.reference || 'Payment',
                        payment_mode: p.payment_mode || 'Cash/Bank',
                        amount: parseFloat(p.amount || 0)
                    }))
                };
            });

            // Sort by Date Descending
            formattedInvoices.sort((a, b) => new Date(b.invoice_date || 0) - new Date(a.invoice_date || 0));

            return res.json({
                success: true,
                data: {
                    party,
                    invoices: formattedInvoices,
                    total_invoiced: formattedInvoices.reduce((acc, i) => acc + i.invoice_total, 0),
                    total_paid: formattedInvoices.reduce((acc, i) => acc + i.total_paid, 0)
                }
            });
        } catch (error) {
            console.error("Error in getPartyStatement:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = partyController;
