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
            if (!partyId) {
                return res.status(400).json({ success: false, message: "Party ID required" });
            }

            const party = db.prepare("SELECT * FROM parties WHERE id = ?").get(partyId);
            const invoices = db.prepare("SELECT * FROM sales_invoices WHERE customer_id = ?").all(partyId);
            const payments = db.prepare("SELECT * FROM sales_payments WHERE customer_id = ?").all(partyId);

            return res.json({
                success: true,
                data: {
                    party,
                    invoices,
                    payments,
                    total_invoiced: invoices.reduce((acc, i) => acc + (i.total_amount || 0), 0),
                    total_paid: payments.reduce((acc, p) => acc + (p.amount || 0), 0)
                }
            });
        } catch (error) {
            console.error("Error in getPartyStatement:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = partyController;
