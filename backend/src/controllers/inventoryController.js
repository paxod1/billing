const db = require('../config/database');

function resolveTaxId(item) {
    if (!item) return null;

    // Explicitly no tax selected
    if (item.tax_id === null || item.tax_id === '' || item.tax === null || item.tax === '') {
        return null;
    }

    // 1. Check item.tax_id first
    if (item.tax_id !== undefined && item.tax_id !== null && item.tax_id !== '') {
        const val = parseInt(item.tax_id, 10);
        if (!isNaN(val)) {
            const match = db.prepare("SELECT id FROM tax_codes WHERE id = ?").get(val);
            if (match) return match.id;
        }
    }

    // 2. Check item.tax
    if (item.tax !== undefined && item.tax !== null && item.tax !== '') {
        if (typeof item.tax === 'object') {
            if (item.tax.id) {
                const match = db.prepare("SELECT id FROM tax_codes WHERE id = ?").get(item.tax.id);
                if (match) return match.id;
            }
            if (item.tax.rate !== undefined) {
                const match = db.prepare("SELECT id FROM tax_codes WHERE rate = ?").get(parseFloat(item.tax.rate));
                if (match) return match.id;
            }
        } else {
            const numVal = parseFloat(item.tax);
            if (!isNaN(numVal)) {
                // Check matching ID in tax_codes
                const matchId = db.prepare("SELECT id FROM tax_codes WHERE id = ?").get(parseInt(numVal, 10));
                if (matchId) return matchId.id;

                // Check matching rate in tax_codes
                const matchRate = db.prepare("SELECT id FROM tax_codes WHERE rate = ?").get(numVal);
                if (matchRate) return matchRate.id;

                // Check matching name
                const matchName = db.prepare("SELECT id FROM tax_codes WHERE name LIKE ?").get(`%${numVal}%`);
                if (matchName) return matchName.id;

                // Auto-create tax code for rate if valid number and not present
                if (numVal >= 0 && numVal <= 100) {
                    const halfRate = numVal / 2;
                    const info = db.prepare(`
                        INSERT INTO tax_codes (name, country, rate, tax_rates)
                        VALUES (?, 'India', ?, ?)
                    `).run(`GST ${numVal}%`, numVal, JSON.stringify({ CGST: halfRate, SGST: halfRate }));
                    return info.lastInsertRowid;
                }
            }
        }
    }

    return null;
}

function hydrateItem(item) {
    if (!item) return null;
    const composition = db.prepare("SELECT * FROM product_compositions WHERE product_id = ?").all(item.id);
    const taxRecord = item.tax_id ? db.prepare("SELECT * FROM tax_codes WHERE id = ?").get(item.tax_id) : null;

    const finalTaxId = item.tax_id || (taxRecord ? taxRecord.id : null);
    const taxVal = taxRecord ? taxRecord.id : finalTaxId;
    const currentQty = item.quantity !== undefined && item.quantity !== null ? parseFloat(item.quantity) : 0;

    return {
        ...item,
        quantity: currentQty,
        current_quantity: currentQty,
        opening_quantity: item.opening_quantity !== undefined ? parseFloat(item.opening_quantity) : 0,
        sku: item.sku || item.item_code || '',
        tax_id: finalTaxId,
        tax: taxVal,
        tax_data: taxRecord,
        tax_rate: taxRecord ? taxRecord.rate : 0,
        composition: composition.map(c => {
            const raw = db.prepare("SELECT * FROM raw_materials WHERE id = ?").get(c.raw_material_id);
            return {
                ...c,
                raw_material_id: raw ? [raw] : []
            };
        })
    };
}

const inventoryController = {
    // --- CUSTOMIZED PRODUCTS ---
    getCustomizedProducts: (req, res) => {
        try {
            const body = req.body || {};
            const find = body.find || {};
            const { limit = 10, skip = 0, search } = req.query;

            let conditions = ["item_type = 'CUSTOMISED PRODUCTS'"];
            let params = [];

            const searchVal = search || find.search;
            if (searchVal && String(searchVal).trim() !== '') {
                const term = `%${String(searchVal).trim()}%`;
                conditions.push("name LIKE ?");
                params.push(term);
            }

            const whereSql = `WHERE ${conditions.join(' AND ')}`;
            const totalCount = db.prepare(`SELECT COUNT(*) as count FROM items ${whereSql}`).get(...params).count;

            const reqLimit = parseInt(body.limit || limit, 10);
            const reqSkip = parseInt(body.skip || skip, 10);
            const items = db.prepare(`SELECT * FROM items ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, reqLimit, reqSkip);

            return res.json({
                success: true,
                data: items.map(hydrateItem),
                totalCount
            });
        } catch (error) {
            console.error("Error in getCustomizedProducts:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    saveCustomizedProduct: (req, res) => {
        try {
            const payload = Array.isArray(req.body) ? req.body : [req.body];
            const stmt = db.prepare(`
                INSERT INTO items (name, sku, description, unit, rate, unit_price, cost_price, Production_cost, item_type, category, quantity, tax_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CUSTOMISED PRODUCTS', 'SALES', ?, ?)
            `);

            const insertedIds = [];
            payload.forEach(item => {
                const taxId = resolveTaxId(item);
                const info = stmt.run(
                    item.name || 'Customized Product',
                    item.sku || item.item_code || '',
                    item.description || '',
                    item.unit || 'Pcs',
                    parseFloat(item.rate || item.unit_price || item.selling_price || 0),
                    parseFloat(item.unit_price || item.rate || 0),
                    parseFloat(item.cost_price || item.Production_cost || 0),
                    parseFloat(item.Production_cost || item.cost_price || 0),
                    parseFloat(item.quantity !== undefined ? item.quantity : (item.current_quantity !== undefined ? item.current_quantity : (item.opening_quantity || 0))),
                    taxId
                );
                insertedIds.push(info.lastInsertRowid);
            });

            const created = db.prepare(`SELECT * FROM items WHERE id IN (${insertedIds.join(',')})`).all();
            return res.status(201).json({
                success: true,
                message: "Customized Product created successfully",
                data: Array.isArray(req.body) ? created.map(hydrateItem) : hydrateItem(created[0])
            });
        } catch (error) {
            console.error("Error in saveCustomizedProduct:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    updateCustomizedProduct: (req, res) => {
        try {
            const id = req.params.id || req.body.id;
            const data = req.body;
            const existing = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
            if (!existing) return res.status(404).json({ success: false, message: "Item not found" });

            if (data.restock !== undefined && data.restock !== null) {
                const restockQty = parseFloat(data.restock || data.amount || 0);
                if (restockQty > 0) {
                    db.prepare("UPDATE items SET quantity = COALESCE(quantity, 0) + ? WHERE id = ?").run(restockQty, id);
                }
                const updated = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
                return res.json({ success: true, message: "Restocked successfully", data: hydrateItem(updated) });
            }

            const taxId = (data.tax === null || data.tax === '' || data.tax_id === null || data.tax_id === '')
                ? null
                : (resolveTaxId(data) ?? existing.tax_id);

            db.prepare(`
                UPDATE items
                SET name = ?, sku = ?, description = ?, unit = ?, rate = ?, unit_price = ?, cost_price = ?, Production_cost = ?, quantity = ?, tax_id = ?
                WHERE id = ?
            `).run(
                data.name || existing.name,
                data.sku !== undefined ? data.sku : (data.item_code !== undefined ? data.item_code : existing.sku),
                data.description !== undefined ? data.description : existing.description,
                data.unit || existing.unit,
                data.rate !== undefined ? parseFloat(data.rate) : existing.rate,
                data.unit_price !== undefined ? parseFloat(data.unit_price) : existing.unit_price,
                data.cost_price !== undefined ? parseFloat(data.cost_price) : existing.cost_price,
                data.Production_cost !== undefined ? parseFloat(data.Production_cost) : existing.Production_cost,
                data.quantity !== undefined ? parseFloat(data.quantity) : (data.current_quantity !== undefined ? parseFloat(data.current_quantity) : existing.quantity),
                taxId,
                id
            );

            const updated = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
            return res.json({ success: true, message: "Customized Product updated successfully", data: hydrateItem(updated) });
        } catch (error) {
            console.error("Error in updateCustomizedProduct:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    deleteCustomizedProduct: (req, res) => {
        try {
            const id = req.params.id;
            db.prepare("DELETE FROM product_compositions WHERE product_id = ?").run(id);
            db.prepare("DELETE FROM items WHERE id = ?").run(id);
            return res.json({ success: true, message: "Customized Product deleted successfully" });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    restockCustomizedProduct: (req, res) => {
        try {
            const data = req.body;
            const id = Number(data.id || req.params.id);
            const restockQty = parseFloat(data.restock || data.amount || 0);

            if (id && restockQty > 0) {
                db.prepare("UPDATE items SET quantity = COALESCE(quantity, 0) + ? WHERE id = ?").run(restockQty, id);
            }

            const updated = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
            return res.json({ success: true, message: "Restocked successfully", data: hydrateItem(updated) });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // --- RAW MATERIALS ---
    getRawMaterials: (req, res) => {
        try {
            const { limit = 10, skip = 0 } = req.query;
            const totalCount = db.prepare("SELECT COUNT(*) as count FROM raw_materials").get().count;
            const materials = db.prepare("SELECT * FROM raw_materials ORDER BY id DESC LIMIT ? OFFSET ?").all(parseInt(limit, 10), parseInt(skip, 10));
            const formatted = materials.map(m => ({
                ...m,
                quantity: parseFloat(m.quantity || 0),
                current_quantity: parseFloat(m.quantity || 0)
            }));
            return res.json({ success: true, data: formatted, totalCount });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    saveRawMaterial: (req, res) => {
        try {
            const payload = Array.isArray(req.body) ? req.body : [req.body];
            const stmt = db.prepare("INSERT INTO raw_materials (name, unit, unit_price, quantity, tax_id) VALUES (?, ?, ?, ?, ?)");
            const insertedIds = [];
            payload.forEach(m => {
                const taxId = resolveTaxId(m);
                const info = stmt.run(m.name || '', m.unit || 'Kg', parseFloat(m.unit_price || 0), parseFloat(m.quantity || 0), taxId);
                insertedIds.push(info.lastInsertRowid);
            });
            const created = db.prepare(`SELECT * FROM raw_materials WHERE id IN (${insertedIds.join(',')})`).all();
            return res.status(201).json({ success: true, data: Array.isArray(req.body) ? created : created[0] });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    updateRawMaterial: (req, res) => {
        try {
            const id = req.params.id;
            const data = req.body;

            if (data.restock !== undefined && data.restock !== null) {
                const restockQty = parseFloat(data.restock || data.amount || 0);
                if (restockQty > 0) {
                    db.prepare("UPDATE raw_materials SET quantity = COALESCE(quantity, 0) + ? WHERE id = ?").run(restockQty, id);
                }
                const updated = db.prepare("SELECT * FROM raw_materials WHERE id = ?").get(id);
                return res.json({ success: true, message: "Restocked successfully", data: updated });
            }

            const existing = db.prepare("SELECT * FROM raw_materials WHERE id = ?").get(id);
            if (!existing) return res.status(404).json({ success: false, message: "Raw material not found" });

            const taxId = resolveTaxId(data);
            db.prepare("UPDATE raw_materials SET name = ?, unit = ?, unit_price = ?, quantity = ?, tax_id = ? WHERE id = ?").run(
                data.name || existing.name,
                data.unit || existing.unit,
                data.unit_price !== undefined ? parseFloat(data.unit_price) : existing.unit_price,
                data.quantity !== undefined ? parseFloat(data.quantity) : existing.quantity,
                taxId,
                id
            );
            return res.json({ success: true, message: "Raw material updated" });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    deleteRawMaterial: (req, res) => {
        try {
            db.prepare("DELETE FROM raw_materials WHERE id = ?").run(req.params.id);
            return res.json({ success: true, message: "Raw material deleted" });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = inventoryController;
