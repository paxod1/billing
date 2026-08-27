const db = require('../config/database');

function formatAccountNode(acc) {
    return {
        id: Number(acc.id),
        name: acc.name,
        code: acc.code || "",
        category: (acc.category || "assets").toLowerCase(),
        parent_id: acc.parent_id ? Number(acc.parent_id) : null,
        is_folder: Boolean(acc.is_folder),
        balance: parseFloat(acc.balance || 0),
        children: []
    };
}

function buildAccountTree() {
    const accounts = db.prepare("SELECT * FROM accounts ORDER BY id ASC").all();

    const accountMap = {};
    accounts.forEach(acc => {
        accountMap[acc.id] = formatAccountNode(acc);
    });

    const categories = {
        assets: [],
        expenses: [],
        equity: [],
        income: [],
        liabilities: []
    };

    accounts.forEach(acc => {
        const item = accountMap[acc.id];
        if (acc.parent_id && accountMap[acc.parent_id]) {
            accountMap[acc.parent_id].children.push(item);
        } else {
            const catLower = (acc.category || 'assets').toLowerCase();
            if (categories[catLower]) {
                categories[catLower].push(item);
            } else {
                categories.assets.push(item);
            }
        }
    });

    return categories;
}

function hydrateJournalEntry(entry) {
    if (!entry) return null;
    const lines = db.prepare("SELECT * FROM journal_lines WHERE journal_id = ?").all(entry.id);

    const formattedLines = lines.map(line => {
        const acc = db.prepare("SELECT id, name FROM accounts WHERE id = ?").get(line.account_id);
        return {
            id: line.id,
            journal_id: line.journal_id,
            account_id: acc ? { id: Number(acc.id), name: acc.name } : { id: Number(line.account_id), name: "" },
            debit: parseFloat(line.debit || 0).toFixed(2),
            credit: parseFloat(line.credit || 0).toFixed(2)
        };
    });

    return {
        ...entry,
        date: entry.date ? (entry.date.includes('T') ? entry.date : `${entry.date}T00:00:00.000Z`) : new Date().toISOString(),
        created_at: entry.created_at ? (entry.created_at.includes('T') ? entry.created_at : `${entry.created_at}T00:00:00.000Z`) : new Date().toISOString(),
        updated_at: entry.updated_at ? (entry.updated_at.includes('T') ? entry.updated_at : `${entry.updated_at}T00:00:00.000Z`) : new Date().toISOString(),
        lines_data: formattedLines
    };
}

const accountingController = {
    // --- CHART OF ACCOUNTS ---
    getChartsOfAccounts: (req, res) => {
        try {
            const automatedJournalService = require('../services/automatedJournalService');
            automatedJournalService.ensureDefaultAccounts();

            const tree = buildAccountTree();
            return res.json({
                success: true,
                statusCode: 200,
                data: tree
            });
        } catch (error) {
            console.error("Error in getChartsOfAccounts:", error);
            return res.status(500).json({ success: false, statusCode: 500, error: error.message });
        }
    },

    manageAccount: (req, res) => {
        try {
            const { id, name, category = 'Assets', parent_id, is_folder = 0, balance = 0 } = req.body;

            if (id) {
                // Update
                db.prepare("UPDATE accounts SET name = ? WHERE id = ?").run(name, id);
                const updated = db.prepare("SELECT * FROM accounts WHERE id = ?").get(id);
                return res.json({ success: true, message: "Account updated", data: updated });
            } else {
                // Create
                const stmt = db.prepare(`
                    INSERT INTO accounts (name, category, parent_id, is_folder, balance)
                    VALUES (?, ?, ?, ?, ?)
                `);
                const info = stmt.run(name, category, parent_id || null, is_folder ? 1 : 0, parseFloat(balance || 0));
                const created = db.prepare("SELECT * FROM accounts WHERE id = ?").get(info.lastInsertRowid);
                return res.status(201).json({ success: true, message: "Account created", data: created });
            }
        } catch (error) {
            console.error("Error in manageAccount:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    deleteAccount: (req, res) => {
        try {
            const id = req.params.id;
            db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
            return res.json({ success: true, message: "Account deleted successfully" });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    fetchLeaves: (req, res) => {
        try {
            const leaves = db.prepare("SELECT * FROM accounts WHERE is_folder = 0").all();
            return res.json({ success: true, data: leaves });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getAccountDetails: (req, res) => {
        try {
            const accountId = req.query.account_id || req.params.id;
            const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(accountId);
            if (!account) return res.status(404).json({ success: false, message: "Account not found" });

            const lines = db.prepare(`
                SELECT jl.*, je.date, je.entry_no, je.narration
                FROM journal_lines jl
                JOIN journal_entries je ON jl.journal_id = je.id
                WHERE jl.account_id = ?
                ORDER BY je.date DESC
            `).all(accountId);

            let totalDebit = 0;
            let totalCredit = 0;
            lines.forEach(l => {
                totalDebit += l.debit || 0;
                totalCredit += l.credit || 0;
            });

            return res.json({
                success: true,
                data: {
                    account,
                    transactions: lines,
                    total_debit: totalDebit,
                    total_credit: totalCredit,
                    balance: account.balance + totalDebit - totalCredit
                }
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    fetchSuggestions: (req, res) => {
        try {
            const accounts = db.prepare("SELECT * FROM accounts WHERE is_folder = 0 LIMIT 10").all();
            return res.json({ success: true, data: { accounts } });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // --- JOURNAL ENTRIES ---
    getJournalEntries: (req, res) => {
        try {
            const body = req.body || {};
            const find = body.find || {};
            const { limit = 10, skip = 0 } = req.query;

            const totalCount = db.prepare("SELECT COUNT(*) as count FROM journal_entries").get().count;
            const entries = db.prepare("SELECT * FROM journal_entries ORDER BY id DESC LIMIT ? OFFSET ?").all(parseInt(limit, 10), parseInt(skip, 10));

            return res.json({
                success: true,
                data: entries.map(hydrateJournalEntry),
                totalCount
            });
        } catch (error) {
            console.error("Error in getJournalEntries:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    saveJournalEntry: (req, res) => {
        try {
            const data = req.body;
            const count = db.prepare("SELECT COUNT(*) as count FROM journal_entries").get().count;
            const entryNo = data.entry_no || `JV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

            const stmt = db.prepare(`
                INSERT INTO journal_entries (entry_no, date, reference, narration, entry_type, status)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            const info = stmt.run(
                entryNo,
                data.date || new Date().toISOString().split('T')[0],
                data.reference || '',
                data.narration || '',
                data.entry_type || 'JOURNAL',
                (data.status || 'POSTED').toUpperCase()
            );

            const journalId = info.lastInsertRowid;

            // If lines provided directly in payload
            if (data.lines || data.lines_data) {
                const lines = data.lines || data.lines_data;
                const lineStmt = db.prepare("INSERT INTO journal_lines (journal_id, account_id, debit, credit) VALUES (?, ?, ?, ?)");
                lines.forEach(l => {
                    const accId = l.account_id?.id || l.account_id;
                    if (accId) {
                        lineStmt.run(journalId, Number(accId), parseFloat(l.debit || 0), parseFloat(l.credit || 0));
                    }
                });
            }

            const created = db.prepare("SELECT * FROM journal_entries WHERE id = ?").get(journalId);
            return res.status(201).json({ success: true, message: "Journal Entry saved successfully", data: hydrateJournalEntry(created) });
        } catch (error) {
            console.error("Error in saveJournalEntry:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    saveJournalLines: (req, res) => {
        try {
            const lines = req.body;
            const lineStmt = db.prepare("INSERT INTO journal_lines (journal_id, account_id, debit, credit) VALUES (?, ?, ?, ?)");
            const flatLines = Array.isArray(lines[0]) ? lines[0] : lines;

            flatLines.forEach(l => {
                const accId = l.account_id?.id || l.account_id;
                lineStmt.run(l.journal_id, Number(accId), parseFloat(l.debit || 0), parseFloat(l.credit || 0));
            });

            return res.status(201).json({ success: true, message: "Journal lines saved successfully" });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    updateJournalEntry: (req, res) => {
        try {
            const id = req.params.id || req.body.id;
            const data = req.body;
            db.prepare(`
                UPDATE journal_entries
                SET date = ?, reference = ?, narration = ?, entry_type = ?
                WHERE id = ?
            `).run(data.date || '', data.reference || '', data.narration || '', data.entry_type || 'JOURNAL', id);

            const updated = db.prepare("SELECT * FROM journal_entries WHERE id = ?").get(id);
            return res.json({ success: true, message: "Journal entry updated", data: hydrateJournalEntry(updated) });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    deleteJournalEntry: (req, res) => {
        try {
            const id = req.params.id;
            db.prepare("DELETE FROM journal_lines WHERE journal_id = ?").run(id);
            db.prepare("DELETE FROM journal_entries WHERE id = ?").run(id);
            return res.json({ success: true, message: "Journal Entry deleted successfully" });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getUniqueEntryNumber: (req, res) => {
        try {
            const count = db.prepare("SELECT COUNT(*) as count FROM journal_entries").get().count;
            const entry_no = `JV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
            return res.json({ success: true, data: { entry_no }, entry_no });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // --- TAX TEMPLATES / CODES ---
    getAccountCategories: (req, res) => {
        try {
            const categories = [
                { id: 1, name: 'Assets' },
                { id: 2, name: 'Liabilities' },
                { id: 3, name: 'Equity' },
                { id: 4, name: 'Income' },
                { id: 5, name: 'Expenses' }
            ];
            return res.json({ success: true, data: categories });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getTaxCodes: (req, res) => {
        try {
            const taxes = db.prepare("SELECT * FROM tax_codes ORDER BY id ASC").all();
            const formatted = taxes.map(t => ({
                ...t,
                tax_rates: t.tax_rates ? JSON.parse(t.tax_rates) : {}
            }));
            return res.json({ success: true, data: formatted });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getTaxCodeById: (req, res) => {
        try {
            const id = req.params.id;
            const tax = db.prepare("SELECT * FROM tax_codes WHERE id = ?").get(id);
            if (!tax) return res.json({ success: true, data: null });
            tax.tax_rates = tax.tax_rates ? JSON.parse(tax.tax_rates) : {};
            return res.json({ success: true, data: tax });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    createTaxCode: (req, res) => {
        try {
            const data = req.body;
            const taxRatesObj = data.tax_rates ? (typeof data.tax_rates === 'string' ? JSON.parse(data.tax_rates) : data.tax_rates) : {};
            let totalRate = parseFloat(data.rate || 0);
            if (!totalRate && taxRatesObj) {
                totalRate = Object.values(taxRatesObj).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
            }
            const stmt = db.prepare("INSERT INTO tax_codes (name, country, rate, tax_rates) VALUES (?, ?, ?, ?)");
            const info = stmt.run(
                data.name || 'Custom Tax',
                data.country || 'India',
                totalRate,
                JSON.stringify(taxRatesObj)
            );
            const created = db.prepare("SELECT * FROM tax_codes WHERE id = ?").get(info.lastInsertRowid);
            created.tax_rates = JSON.parse(created.tax_rates);
            return res.status(201).json({ success: true, message: "Tax code created", data: created });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    updateTaxCode: (req, res) => {
        try {
            const id = req.params.id;
            const data = req.body;
            const taxRatesObj = data.tax_rates ? (typeof data.tax_rates === 'string' ? JSON.parse(data.tax_rates) : data.tax_rates) : {};
            let totalRate = parseFloat(data.rate || 0);
            if (!totalRate && taxRatesObj) {
                totalRate = Object.values(taxRatesObj).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
            }
            db.prepare("UPDATE tax_codes SET name = ?, country = ?, rate = ?, tax_rates = ? WHERE id = ?").run(
                data.name || '',
                data.country || 'India',
                totalRate,
                JSON.stringify(taxRatesObj),
                id
            );
            const updated = db.prepare("SELECT * FROM tax_codes WHERE id = ?").get(id);
            updated.tax_rates = JSON.parse(updated.tax_rates);
            return res.json({ success: true, message: "Tax code updated", data: updated });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    deleteTaxCode: (req, res) => {
        try {
            db.prepare("DELETE FROM tax_codes WHERE id = ?").run(req.params.id);
            return res.json({ success: true, message: "Tax code deleted" });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    exportTaxCodes: (req, res) => {
        try {
            const taxes = db.prepare("SELECT * FROM tax_codes ORDER BY id ASC").all();
            const formatted = taxes.map(t => ({
                ...t,
                tax_rates: t.tax_rates ? JSON.parse(t.tax_rates) : {}
            }));
            return res.json({ success: true, data: formatted });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = accountingController;
