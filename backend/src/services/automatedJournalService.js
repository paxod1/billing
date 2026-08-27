const db = require('../config/database');

/**
 * Defensive data-access normalization: Array.isArray(x) ? x : (x?.data?.data ?? x?.data ?? [])
 */
function normalizeArray(x) {
    return Array.isArray(x) ? x : (x?.data?.data ?? x?.data ?? []);
}

/**
 * Ensure mandatory default GL accounts exist in the Chart of Accounts.
 */
function ensureDefaultAccounts() {
    const defaultStructure = [
        // Root Folders & Sub-folders
        { name: 'Current Assets', code: '1100', category: 'Assets', is_folder: 1, parent_name: null },
        { name: 'Input Tax', code: '1170', category: 'Assets', is_folder: 1, parent_name: 'Current Assets' },
        { name: 'Operating Expenses', code: '5020', category: 'Expenses', is_folder: 1, parent_name: null },
        { name: 'Purchases', code: '5000', category: 'Expenses', is_folder: 1, parent_name: null },
        { name: 'Direct Expenses', code: '5090', category: 'Expenses', is_folder: 1, parent_name: null },
        { name: 'Current Liabilities', code: '2100', category: 'Liabilities', is_folder: 1, parent_name: null },
        { name: 'Output Tax', code: '2160', category: 'Liabilities', is_folder: 1, parent_name: 'Current Liabilities' },

        // Assets Accounts
        { name: 'Cash', code: '1010', category: 'Assets', is_folder: 0, parent_name: 'Current Assets' },
        { name: 'Inventory Asset', code: '1030', category: 'Assets', is_folder: 0, parent_name: 'Current Assets' },
        { name: 'Accounts Receivable', code: '1020', category: 'Assets', is_folder: 0, parent_name: 'Current Assets' },
        { name: 'bank account', code: '1040', category: 'Assets', is_folder: 0, parent_name: 'Current Assets' },
        { name: 'Input CGST Receivable', code: '1110', category: 'Assets', is_folder: 0, parent_name: 'Input Tax' },
        { name: 'Input SGST Receivable', code: '1120', category: 'Assets', is_folder: 0, parent_name: 'Input Tax' },
        { name: 'Input IGST Receivable', code: '1130', category: 'Assets', is_folder: 0, parent_name: 'Input Tax' },

        // Expenses Accounts
        { name: 'Salary Expense', code: '5030', category: 'Expenses', is_folder: 0, parent_name: 'Operating Expenses' },
        { name: 'Electricity Expense', code: '5040', category: 'Expenses', is_folder: 0, parent_name: 'Operating Expenses' },
        { name: 'Advertisement Expense', code: '5050', category: 'Expenses', is_folder: 0, parent_name: 'Operating Expenses' },
        { name: 'Office Rent', code: '5060', category: 'Expenses', is_folder: 0, parent_name: 'Operating Expenses' },
        { name: 'Cost of Goods Sold', code: '5010', category: 'Expenses', is_folder: 0, parent_name: null },
        { name: 'Sales Discount', code: '5070', category: 'Expenses', is_folder: 0, parent_name: null },
        { name: 'Purchase Returns', code: '5080', category: 'Expenses', is_folder: 0, parent_name: 'Purchases' },

        // Equity Accounts
        { name: 'Retained Earnings', code: '3020', category: 'Equity', is_folder: 0, parent_name: null },
        { name: 'Capital Account', code: '3010', category: 'Equity', is_folder: 0, parent_name: null },

        // Income Accounts
        { name: 'Sales Income', code: '4010', category: 'Income', is_folder: 0, parent_name: null },
        { name: 'Purchase Discount', code: '4020', category: 'Income', is_folder: 0, parent_name: null },

        // Liabilities Accounts
        { name: 'Accounts Payable', code: '2010', category: 'Liabilities', is_folder: 0, parent_name: 'Current Liabilities' },
        { name: 'GST Payable', code: '2020', category: 'Liabilities', is_folder: 0, parent_name: 'Current Liabilities' },
        { name: 'Output CGST Payable', code: '2110', category: 'Liabilities', is_folder: 0, parent_name: 'Output Tax' },
        { name: 'Output SGST Payable', code: '2120', category: 'Liabilities', is_folder: 0, parent_name: 'Output Tax' },
        { name: 'Output IGST Payable', code: '2130', category: 'Liabilities', is_folder: 0, parent_name: 'Output Tax' }
    ];

    defaultStructure.forEach(acc => {
        const existing = db.prepare("SELECT * FROM accounts WHERE LOWER(name) = LOWER(?)").get(acc.name);
        if (!existing) {
            let parentId = null;
            if (acc.parent_name) {
                const parent = db.prepare("SELECT id FROM accounts WHERE LOWER(name) = LOWER(?)").get(acc.parent_name);
                if (parent) parentId = parent.id;
            }
            db.prepare(`
                INSERT INTO accounts (name, code, category, parent_id, is_folder, balance)
                VALUES (?, ?, ?, ?, ?, 0)
            `).run(acc.name, acc.code, acc.category, parentId, acc.is_folder);
        }
    });
}

/**
 * Look up a GL Account by name (with fallbacks if needed).
 */
function getAccountByName(accountName) {
    ensureDefaultAccounts();
    let acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) = LOWER(?)").get(accountName);
    if (acc) return acc;

    // Fallbacks for similar names
    if (accountName === 'Sales Income') {
        acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) LIKE '%sales%' OR LOWER(name) LIKE '%revenue%'").get();
    } else if (accountName === 'Cash') {
        acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) LIKE '%cash%'").get();
    } else if (accountName === 'bank account') {
        acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) LIKE '%bank%'").get();
    } else if (accountName === 'Accounts Receivable') {
        acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) LIKE '%receivable%'").get();
    } else if (accountName === 'Accounts Payable') {
        acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) LIKE '%payable%'").get();
    } else if (accountName === 'Operating Expenses') {
        acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) LIKE '%operating%expense%' OR LOWER(name) LIKE '%expense%'").get();
    } else if (accountName === 'Inventory Asset') {
        acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) LIKE '%inventory%'").get();
    } else if (accountName === 'Output CGST Payable') {
        acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) LIKE '%output%cgst%' OR LOWER(name) LIKE '%cgst%payable%'").get();
    } else if (accountName === 'Output SGST Payable') {
        acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) LIKE '%output%sgst%' OR LOWER(name) LIKE '%sgst%payable%'").get();
    } else if (accountName === 'Output IGST Payable') {
        acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) LIKE '%output%igst%' OR LOWER(name) LIKE '%igst%payable%'").get();
    } else if (accountName === 'Input CGST Receivable') {
        acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) LIKE '%input%cgst%' OR LOWER(name) LIKE '%cgst%receivable%'").get();
    } else if (accountName === 'Input SGST Receivable') {
        acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) LIKE '%input%sgst%' OR LOWER(name) LIKE '%sgst%receivable%'").get();
    } else if (accountName === 'Input IGST Receivable') {
        acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) LIKE '%input%igst%' OR LOWER(name) LIKE '%igst%receivable%'").get();
    }

    if (!acc) {
        throw new Error(`Required account '${accountName}' missing from Chart of Accounts.`);
    }
    return acc;
}

/**
 * Calculate Fund Account Balance from posted journal lines
 */
function getFundAccountBalance(accountId) {
    const res = db.prepare(`
        SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as balance
        FROM journal_lines jl
        JOIN journal_entries je ON jl.journal_id = je.id
        WHERE jl.account_id = ? AND je.status = 'POSTED'
    `).get(accountId);
    return res ? parseFloat(res.balance || 0) : 0;
}

/**
 * Update payment statuses (FULLY_PAID / PARTIALLY_PAID) and cascade updates down to linked invoices and return closures.
 */
function updatePaymentStatus(invoiceId, documentType = 'SALES') {
    if (!invoiceId) return;

    if (documentType === 'SALES') {
        const inv = db.prepare("SELECT * FROM sales_invoices WHERE id = ?").get(invoiceId);
        if (!inv) return;

        const paidRes = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM sales_payments 
            WHERE invoice_id = ? AND status IN ('PAID', 'POSTED')
        `).get(invoiceId);

        const retRes = db.prepare(`
            SELECT COALESCE(SUM(total_amount), 0) as total 
            FROM sales_returns 
            WHERE return_against = ? AND status IN ('SENT', 'POSTED')
        `).get(invoiceId);

        const totalPaid = parseFloat(paidRes?.total || 0);
        const totalReturned = parseFloat(retRes?.total || 0);
        const invTotal = parseFloat(inv.total_amount || 0);
        const netPayable = Math.max(0, invTotal - totalReturned);

        let newStatus = inv.status;
        if (totalPaid >= netPayable && netPayable >= 0) {
            newStatus = 'FULLY_PAID';
        } else if (totalPaid > 0) {
            newStatus = 'PARTIALLY_PAID';
        }

        db.prepare("UPDATE sales_invoices SET status = ? WHERE id = ?").run(newStatus, invoiceId);
    } else if (documentType === 'PURCHASE') {
        const inv = db.prepare("SELECT * FROM purchase_invoices WHERE id = ?").get(invoiceId);
        if (!inv) return;

        const paidRes = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM purchase_payments 
            WHERE invoice_id = ? AND status IN ('PAID', 'POSTED')
        `).get(invoiceId);

        const retRes = db.prepare(`
            SELECT COALESCE(SUM(total_amount), 0) as total 
            FROM purchase_returns 
            WHERE return_against = ? AND status IN ('SENT', 'POSTED')
        `).get(invoiceId);

        const totalPaid = parseFloat(paidRes?.total || 0);
        const totalReturned = parseFloat(retRes?.total || 0);
        const invTotal = parseFloat(inv.total_amount || 0);
        const netPayable = Math.max(0, invTotal - totalReturned);

        let newStatus = inv.status;
        if (totalPaid >= netPayable && netPayable >= 0) {
            newStatus = 'FULLY_PAID';
        } else if (totalPaid > 0) {
            newStatus = 'PARTIALLY_PAID';
        }

        db.prepare("UPDATE purchase_invoices SET status = ? WHERE id = ?").run(newStatus, invoiceId);
    }
}

/**
 * Dynamic GL Account lookup/creation for Tax Accounts specified in Tax Templates.
 */
function getTaxGLAccount(taxAccountName, isPurchase = false) {
    ensureDefaultAccounts();
    if (!taxAccountName || String(taxAccountName).trim() === '') {
        taxAccountName = isPurchase ? 'Input Tax' : 'Output Tax';
    }

    const cleanName = String(taxAccountName).trim();

    // 1. Check exact match for cleanName
    let acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) = LOWER(?)").get(cleanName);
    if (acc) return acc;

    // 2. Check formatted names (Input / Output prefix)
    const prefixedName = isPurchase
        ? (cleanName.toLowerCase().startsWith('input') ? cleanName : `Input ${cleanName} Receivable`)
        : (cleanName.toLowerCase().startsWith('output') ? cleanName : `Output ${cleanName} Payable`);

    acc = db.prepare("SELECT * FROM accounts WHERE LOWER(name) = LOWER(?)").get(prefixedName);
    if (acc) return acc;

    // 3. Auto-create account if exact/prefixed account not found
    const category = isPurchase ? 'Assets' : 'Liabilities';
    const parentName = isPurchase ? 'Input Tax' : 'Output Tax';
    let parent = db.prepare("SELECT id FROM accounts WHERE LOWER(name) = LOWER(?)").get(parentName);
    if (!parent) {
        parent = db.prepare("SELECT id FROM accounts WHERE category = ? AND is_folder = 1 LIMIT 1").get(category);
    }
    const parentId = parent ? parent.id : null;

    const codeNum = Math.floor(1000 + Math.random() * 8999);
    const info = db.prepare(`
        INSERT INTO accounts (name, code, category, parent_id, is_folder, balance)
        VALUES (?, ?, ?, ?, 0, 0)
    `).run(prefixedName, String(codeNum), category, parentId);

    return db.prepare("SELECT * FROM accounts WHERE id = ?").get(info.lastInsertRowid);
}

/**
 * Dynamic Tax Component Breakdown from Tax Codes / Tax Templates
 */
function calculateTaxBreakdown(items) {
    const accountsMap = {};
    let totalTax = 0;

    const itemList = normalizeArray(items);

    itemList.forEach(item => {
        const qty = parseFloat(item.quantity || 1);
        const rate = parseFloat(item.rate || 0);
        const lineAmt = parseFloat(item.amount || (qty * rate));
        const taxPct = parseFloat(item.tax_percent || 0);

        let itemTaxBreakdown = [];

        if (item.tax_id) {
            const taxCode = db.prepare("SELECT * FROM tax_codes WHERE id = ?").get(item.tax_id);
            if (taxCode && taxCode.tax_rates) {
                try {
                    const parsed = typeof taxCode.tax_rates === 'string' ? JSON.parse(taxCode.tax_rates) : taxCode.tax_rates;
                    if (Array.isArray(parsed)) {
                        parsed.forEach(entry => {
                            const accName = entry.account || entry.name || entry.tax_account || entry.account_name || 'Tax';
                            const accRate = parseFloat(entry.rate || entry.tax_rate || 0);
                            itemTaxBreakdown.push({ accountName: accName, rate: accRate });
                        });
                    } else if (typeof parsed === 'object') {
                        Object.keys(parsed).forEach(accName => {
                            const accRate = parseFloat(parsed[accName] || 0);
                            itemTaxBreakdown.push({ accountName: accName, rate: accRate });
                        });
                    }
                } catch (e) {}
            }
        }

        // Fallback if no specific tax account breakdown defined in tax template
        if (itemTaxBreakdown.length === 0 && taxPct > 0) {
            itemTaxBreakdown.push({ accountName: 'Tax', rate: taxPct });
        }

        itemTaxBreakdown.forEach(({ accountName, rate: accRate }) => {
            const lineTax = lineAmt * (accRate / 100);
            if (!accountsMap[accountName]) {
                accountsMap[accountName] = 0;
            }
            accountsMap[accountName] += lineTax;
            totalTax += lineTax;
        });
    });

    const roundedMap = {};
    Object.keys(accountsMap).forEach(accName => {
        roundedMap[accName] = parseFloat(accountsMap[accName].toFixed(2));
    });

    return {
        accountsMap: roundedMap,
        totalTax: parseFloat(totalTax.toFixed(2))
    };
}

/**
 * Generate 5-digit zero-padded journal entry number (00001, 00002...).
 */
function getNextJournalEntryNo() {
    const lastEntry = db.prepare("SELECT entry_no FROM journal_entries ORDER BY id DESC LIMIT 1").get();
    let nextNum = 1;
    if (lastEntry && lastEntry.entry_no) {
        const matches = lastEntry.entry_no.match(/(\d+)$/);
        if (matches) {
            nextNum = parseInt(matches[1], 10) + 1;
        } else {
            const allNums = lastEntry.entry_no.match(/\d+/g);
            if (allNums && allNums.length > 0) {
                nextNum = parseInt(allNums[allNums.length - 1], 10) + 1;
            }
        }
    }
    return String(nextNum).padStart(5, '0');
}

/**
 * Shared routine to balance and save an automated journal entry header + line rows.
 */
function saveAutomatedJournalEntry({ date, reference, narration, entry_type = 'JOURNAL', lines }) {
    if (!lines || lines.length === 0) {
        throw new Error("No journal lines to post.");
    }

    // Check idempotency: if entry with same reference and entry_type already exists, return existing
    if (reference && reference.trim() !== '') {
        const existing = db.prepare("SELECT * FROM journal_entries WHERE reference = ? AND entry_type = ?").get(reference, entry_type);
        if (existing) {
            console.log(`[AUTOMATED JOURNAL] Entry for reference '${reference}' (${entry_type}) already exists (ID: ${existing.id}).`);
            return existing;
        }
    }

    let totalDebit = 0;
    let totalCredit = 0;

    lines.forEach(l => {
        totalDebit += parseFloat(l.debit || 0);
        totalCredit += parseFloat(l.credit || 0);
    });

    totalDebit = parseFloat(totalDebit.toFixed(2));
    totalCredit = parseFloat(totalCredit.toFixed(2));

    // Handle minor sub-cent / rounding discrepancies (up to 0.05) by adjusting last credit/debit line
    const diff = parseFloat((totalDebit - totalCredit).toFixed(2));
    if (Math.abs(diff) > 0 && Math.abs(diff) <= 0.05) {
        const lastLine = lines[lines.length - 1];
        if (parseFloat(lastLine.credit || 0) > 0) {
            lastLine.credit = parseFloat((parseFloat(lastLine.credit) + diff).toFixed(2));
        } else if (parseFloat(lastLine.debit || 0) > 0) {
            lastLine.debit = parseFloat((parseFloat(lastLine.debit) - diff).toFixed(2));
        }
        totalDebit = lines.reduce((s, l) => s + parseFloat(l.debit || 0), 0);
        totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);
    }

    totalDebit = parseFloat(totalDebit.toFixed(2));
    totalCredit = parseFloat(totalCredit.toFixed(2));

    // Enforce Journal Balance Validation: throw if |Σdebit − Σcredit| > 0.01
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Unbalanced journal entry! Total Debits (${totalDebit.toFixed(2)}) do not match Total Credits (${totalCredit.toFixed(2)}).`);
    }

    const entryNo = getNextJournalEntryNo();
    const entryDate = date ? (date.includes('T') ? date.split('T')[0] : date) : new Date().toISOString().split('T')[0];

    const stmt = db.prepare(`
        INSERT INTO journal_entries (entry_no, date, reference, narration, entry_type, status)
        VALUES (?, ?, ?, ?, ?, 'POSTED')
    `);

    const info = stmt.run(entryNo, entryDate, reference || '', narration || '', entry_type);
    const journalId = info.lastInsertRowid;

    const lineStmt = db.prepare(`
        INSERT INTO journal_lines (journal_id, account_id, debit, credit)
        VALUES (?, ?, ?, ?)
    `);

    lines.forEach(l => {
        lineStmt.run(journalId, Number(l.account_id), parseFloat(l.debit || 0), parseFloat(l.credit || 0));

        // Update live balance on accounts table
        const acc = db.prepare("SELECT category FROM accounts WHERE id = ?").get(l.account_id);
        if (acc) {
            const netChange = (['Assets', 'Expenses'].includes(acc.category))
                ? parseFloat(l.debit || 0) - parseFloat(l.credit || 0)
                : parseFloat(l.credit || 0) - parseFloat(l.debit || 0);
            db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(netChange, l.account_id);
        }
    });

    const created = db.prepare("SELECT * FROM journal_entries WHERE id = ?").get(journalId);
    console.log(`[AUTOMATED JOURNAL] Created Journal Entry #${entryNo} (ID: ${journalId}) for reference '${reference}'`);
    return created;
}

/**
 * 1. Generate Sales Invoice Journal Entry
 */
function postSalesInvoiceJournal(invoice) {
    if (!invoice || !invoice.id) {
        throw new Error("Invalid Sales Invoice data.");
    }
    const ref = invoice.invoice_number;
    if (ref) {
        const existing = db.prepare("SELECT * FROM journal_entries WHERE reference = ? AND entry_type = 'SALES_INVOICE'").get(ref);
        if (existing) return existing;
    }

    const grandTotal = parseFloat(invoice.total_amount || 0);
    if (grandTotal <= 0) {
        throw new Error("Zero or negative value invoice cannot be journaled.");
    }

    const arAcc = getAccountByName('Accounts Receivable');
    const salesIncomeAcc = getAccountByName('Sales Income');
    const cogsAcc = getAccountByName('Cost of Goods Sold');
    const inventoryAcc = getAccountByName('Inventory Asset');
    const cgstAcc = getAccountByName('Output CGST Payable');
    const sgstAcc = getAccountByName('Output SGST Payable');
    const igstAcc = getAccountByName('Output IGST Payable');

    // Fetch line items
    const rawItems = db.prepare("SELECT * FROM sales_items WHERE document_type = 'INVOICE' AND document_id = ?").all(invoice.id);
    const items = normalizeArray(rawItems);

    let totalCOGS = 0;
    const stockUpdates = [];

    // Pre-validate stock availability for product lines before mutating database
    items.forEach(line => {
        const qty = parseFloat(line.quantity || 1);
        const srcId = line.source_id;

        const isService = line.source_type === 'time' || line.source_type === 'mileage' || line.source_type === 'estimation';
        if (srcId && !isService) {
            const itemObj = db.prepare("SELECT * FROM items WHERE id = ?").get(srcId);
            if (itemObj && itemObj.item_type !== 'SERVICE') {
                const prodCost = parseFloat(itemObj.Production_cost || itemObj.cost_price || 0);
                if (prodCost > 0) {
                    totalCOGS += (prodCost * qty);
                }
            }
        }
    });

    const taxAmount = parseFloat(invoice.tax_amount || 0);
    let taxBreakdown = calculateTaxBreakdown(items);

    if (taxAmount > 0 && taxBreakdown.totalTax === 0) {
        taxBreakdown.accountsMap['Sales Tax'] = taxAmount;
        taxBreakdown.totalTax = taxAmount;
    }

    // Absorb floating-point sub-cent drift (0 to 0.02) into Sales Income line
    let subtotalAmount = parseFloat((grandTotal - taxBreakdown.totalTax).toFixed(2));
    const calculatedTotal = parseFloat((subtotalAmount + taxBreakdown.totalTax).toFixed(2));
    const drift = parseFloat((grandTotal - calculatedTotal).toFixed(2));
    if (Math.abs(drift) > 0 && Math.abs(drift) <= 0.02) {
        subtotalAmount = parseFloat((subtotalAmount + drift).toFixed(2));
    }

    const lines = [
        // 1. Customer Debt - Accounts Receivable (DEBIT Grand Total)
        { account_id: arAcc.id, debit: grandTotal, credit: 0 },
        // 2. Revenue - Sales Income (CREDIT Subtotal, net of tax)
        { account_id: salesIncomeAcc.id, debit: 0, credit: subtotalAmount }
    ];

    // 3. Tax Liabilities (CREDIT Tax Payables based on Tax Template)
    Object.keys(taxBreakdown.accountsMap).forEach(taxAccName => {
        const amt = taxBreakdown.accountsMap[taxAccName];
        if (amt > 0) {
            const taxGLAcc = getTaxGLAccount(taxAccName, false);
            lines.push({ account_id: taxGLAcc.id, debit: 0, credit: amt });
        }
    });

    // 4. Perpetual Inventory: COGS (DEBIT) -> Inventory Asset (CREDIT)
    if (totalCOGS > 0) {
        lines.push({ account_id: cogsAcc.id, debit: parseFloat(totalCOGS.toFixed(2)), credit: 0 });
        lines.push({ account_id: inventoryAcc.id, debit: 0, credit: parseFloat(totalCOGS.toFixed(2)) });
    }

    return saveAutomatedJournalEntry({
        date: invoice.invoice_date,
        reference: invoice.invoice_number,
        narration: `Sales Invoice - ${invoice.invoice_number}`,
        entry_type: 'SALES_INVOICE',
        lines
    });
}

/**
 * 2. Generate Sales Payment Journal Entry
 */
function postSalesPaymentJournal(payment) {
    if (!payment || !payment.id) {
        throw new Error("Invalid Sales Payment data.");
    }
    const ref = payment.payment_number;
    if (ref) {
        const existing = db.prepare("SELECT * FROM journal_entries WHERE reference = ? AND entry_type = 'SALES_PAYMENT'").get(ref);
        if (existing) return existing;
    }

    const amount = parseFloat(payment.amount || 0);
    if (amount <= 0) {
        throw new Error("Payment amount must be greater than zero.");
    }

    const isCash = (payment.payment_mode || '').toLowerCase().includes('cash');
    const modeName = isCash ? 'Cash' : (payment.payment_mode || 'bank account');
    const debitAccount = isCash ? getAccountByName('Cash') : getAccountByName('bank account');
    const arAcc = getAccountByName('Accounts Receivable');

    const lines = [
        // 1. Fund Account Cash/Bank (DEBIT Payment Amount)
        { account_id: debitAccount.id, debit: amount, credit: 0 },
        // 2. Reduce Customer Debt - Accounts Receivable (CREDIT Payment Amount)
        { account_id: arAcc.id, debit: 0, credit: amount }
    ];

    const journal = saveAutomatedJournalEntry({
        date: payment.payment_date,
        reference: payment.payment_number,
        narration: `Sales Payment - ${payment.payment_number} (${modeName})`,
        entry_type: 'SALES_PAYMENT',
        lines
    });

    db.prepare("UPDATE sales_payments SET status = 'POSTED' WHERE id = ?").run(payment.id);

    if (payment.invoice_id) {
        updatePaymentStatus(payment.invoice_id, 'SALES');
    }

    return journal;
}

/**
 * 3. Generate Purchase Invoice & Purchase Return Journal Entry
 */
function postPurchaseInvoiceJournal(invoice) {
    if (!invoice || !invoice.id) {
        throw new Error("Invalid Purchase Invoice data.");
    }

    const isReturn = !!invoice.return_against || (invoice.invoice_number && invoice.invoice_number.startsWith('PRN')) || invoice.document_type === 'return';
    const entryType = isReturn ? 'PURCHASE_RETURN' : 'PURCHASE_INVOICE';

    const ref = invoice.invoice_number;
    if (ref) {
        const existing = db.prepare("SELECT * FROM journal_entries WHERE reference = ? AND entry_type = ?").get(ref, entryType);
        if (existing) return existing;
    }

    const grandTotal = parseFloat(invoice.total_amount || 0);
    if (grandTotal <= 0) {
        throw new Error("Zero or negative value purchase invoice cannot be journaled.");
    }

    const apAcc = getAccountByName('Accounts Payable');
    const inventoryAcc = getAccountByName('Inventory Asset');
    const opExpAcc = getAccountByName('Operating Expenses');
    const cgstAcc = getAccountByName('Input CGST Receivable');
    const sgstAcc = getAccountByName('Input SGST Receivable');
    const igstAcc = getAccountByName('Input IGST Receivable');

    const rawItems = db.prepare("SELECT * FROM purchase_items WHERE document_id = ?").all(invoice.id);
    const items = normalizeArray(rawItems);

    let serviceSubtotal = 0;
    let productSubtotal = 0;
    const stockUpdates = [];

    items.forEach(line => {
        const qty = parseFloat(line.quantity || 1);
        const rate = parseFloat(line.rate || 0);
        const lineAmt = parseFloat(line.amount || (qty * rate));
        const srcId = line.source_id;

        let isProduct = false;
        let itemObj = null;

        if (srcId) {
            itemObj = db.prepare("SELECT * FROM items WHERE id = ?").get(srcId);
            if (itemObj && itemObj.item_type !== 'SERVICE') {
                isProduct = true;
            }
        }

        if (isProduct && itemObj) {
            productSubtotal += lineAmt;
        } else {
            serviceSubtotal += lineAmt;
        }
    });

    const taxAmount = parseFloat(invoice.tax_amount || 0);
    let taxBreakdown = calculateTaxBreakdown(items);

    if (taxAmount > 0 && taxBreakdown.totalTax === 0) {
        taxBreakdown.accountsMap['Purchase Tax'] = taxAmount;
        taxBreakdown.totalTax = taxAmount;
    }

    const lines = [];

    if (!isReturn) {
        // Normal Purchase
        if (serviceSubtotal > 0) lines.push({ account_id: opExpAcc.id, debit: parseFloat(serviceSubtotal.toFixed(2)), credit: 0 });
        if (productSubtotal > 0 || (serviceSubtotal === 0 && productSubtotal === 0)) {
            const prodAmt = productSubtotal > 0 ? productSubtotal : (grandTotal - taxBreakdown.totalTax - serviceSubtotal);
            lines.push({ account_id: inventoryAcc.id, debit: parseFloat(prodAmt.toFixed(2)), credit: 0 });
        }
        Object.keys(taxBreakdown.accountsMap).forEach(taxAccName => {
            const amt = taxBreakdown.accountsMap[taxAccName];
            if (amt > 0) {
                const taxGLAcc = getTaxGLAccount(taxAccName, true);
                lines.push({ account_id: taxGLAcc.id, debit: amt, credit: 0 });
            }
        });
        lines.push({ account_id: apAcc.id, debit: 0, credit: grandTotal });
    } else {
        // Purchase Return
        lines.push({ account_id: apAcc.id, debit: grandTotal, credit: 0 });
        if (serviceSubtotal > 0) lines.push({ account_id: opExpAcc.id, debit: 0, credit: parseFloat(serviceSubtotal.toFixed(2)) });
        if (productSubtotal > 0 || (serviceSubtotal === 0 && productSubtotal === 0)) {
            const prodAmt = productSubtotal > 0 ? productSubtotal : (grandTotal - taxBreakdown.totalTax - serviceSubtotal);
            lines.push({ account_id: inventoryAcc.id, debit: 0, credit: parseFloat(prodAmt.toFixed(2)) });
        }
        Object.keys(taxBreakdown.accountsMap).forEach(taxAccName => {
            const amt = taxBreakdown.accountsMap[taxAccName];
            if (amt > 0) {
                const taxGLAcc = getTaxGLAccount(taxAccName, true);
                lines.push({ account_id: taxGLAcc.id, debit: 0, credit: amt });
            }
        });
    }

    const journal = saveAutomatedJournalEntry({
        date: invoice.invoice_date,
        reference: invoice.invoice_number,
        narration: isReturn
            ? `Purchase Return - ${invoice.invoice_number}`
            : `Purchase Invoice - ${invoice.invoice_number}`,
        entry_type: entryType,
        lines
    });

    if (isReturn && invoice.return_against) {
        updatePaymentStatus(invoice.return_against, 'PURCHASE');
    }

    return journal;
}

/**
 * 4. Generate Purchase Payment Journal Entry (with Fund Balance Check & Return Reversal support)
 */
function postPurchasePaymentJournal(payment) {
    if (!payment || !payment.id) {
        throw new Error("Invalid Purchase Payment data.");
    }
    const ref = payment.payment_number;
    if (ref) {
        const existing = db.prepare("SELECT * FROM journal_entries WHERE reference = ? AND entry_type = 'PURCHASE_PAYMENT'").get(ref);
        if (existing) return existing;
    }

    const amount = parseFloat(payment.amount || 0);
    if (amount <= 0) {
        throw new Error("Payment amount must be greater than zero.");
    }

    const isCash = (payment.payment_mode || '').toLowerCase().includes('cash');
    const modeName = isCash ? 'Cash' : (payment.payment_mode || 'bank account');
    const creditAccount = isCash ? getAccountByName('Cash') : getAccountByName('bank account');
    const apAcc = getAccountByName('Accounts Payable');

    // Allow payments to proceed even if fund account has insufficient initial balance (going into negative balance)
    const fundBalance = getFundAccountBalance(creditAccount.id);
    console.log(`[PURCHASE PAYMENT] Posting payment of ${amount} from ${creditAccount.name} (Current balance: ${fundBalance.toFixed(2)})`);

    const lines = [
        // 1. Reduce Supplier Liability - Accounts Payable (DEBIT Payment Amount)
        { account_id: apAcc.id, debit: amount, credit: 0 },
        // 2. Fund Account Cash/Bank (CREDIT Payment Amount)
        { account_id: creditAccount.id, debit: 0, credit: amount }
    ];

    const journal = saveAutomatedJournalEntry({
        date: payment.payment_date,
        reference: payment.payment_number,
        narration: `Purchase Payment - ${payment.payment_number} (${modeName})`,
        entry_type: 'PURCHASE_PAYMENT',
        lines
    });

    db.prepare("UPDATE purchase_payments SET status = 'POSTED' WHERE id = ?").run(payment.id);

    if (payment.invoice_id) {
        updatePaymentStatus(payment.invoice_id, 'PURCHASE');
    }

    return journal;
}

/**
 * 5. Generate Sales Return Journal Entry
 */
function postSalesReturnJournal(returnDoc) {
    if (!returnDoc || !returnDoc.id) {
        throw new Error("Invalid Sales Return data.");
    }
    const ref = returnDoc.invoice_number;
    if (ref) {
        const existing = db.prepare("SELECT * FROM journal_entries WHERE reference = ? AND entry_type = 'SALES_RETURN'").get(ref);
        if (existing) return existing;
    }

    const grandTotal = parseFloat(returnDoc.total_amount || 0);
    if (grandTotal <= 0) {
        throw new Error("Zero or negative value sales return cannot be journaled.");
    }

    const taxAmount = parseFloat(returnDoc.tax_amount || 0);

    const rawItems = db.prepare("SELECT * FROM sales_items WHERE document_type = 'RETURN' AND document_id = ?").all(returnDoc.id);
    const items = normalizeArray(rawItems);

    // Restock returned product items
    items.forEach(line => {
        const qty = parseFloat(line.quantity || 1);
        const srcId = line.source_id;
        if (srcId) {
            const itemObj = db.prepare("SELECT * FROM items WHERE id = ?").get(srcId);
            if (itemObj && itemObj.item_type !== 'SERVICE') {
                db.prepare("UPDATE items SET quantity = quantity + ? WHERE id = ?").run(qty, srcId);
            }
        }
    });

    let taxBreakdown = calculateTaxBreakdown(items);

    if (taxAmount > 0 && taxBreakdown.totalTax === 0) {
        taxBreakdown.accountsMap['Sales Tax'] = taxAmount;
        taxBreakdown.totalTax = taxAmount;
    }

    const subtotalAmount = parseFloat((grandTotal - taxBreakdown.totalTax).toFixed(2));

    const arAcc = getAccountByName('Accounts Receivable');
    const salesIncomeAcc = getAccountByName('Sales Income');

    const lines = [
        { account_id: salesIncomeAcc.id, debit: subtotalAmount, credit: 0 }
    ];

    Object.keys(taxBreakdown.accountsMap).forEach(taxAccName => {
        const amt = taxBreakdown.accountsMap[taxAccName];
        if (amt > 0) {
            const taxGLAcc = getTaxGLAccount(taxAccName, false);
            lines.push({ account_id: taxGLAcc.id, debit: amt, credit: 0 });
        }
    });

    lines.push({ account_id: arAcc.id, debit: 0, credit: grandTotal });

    const journal = saveAutomatedJournalEntry({
        date: returnDoc.invoice_date,
        reference: returnDoc.invoice_number,
        narration: `Sales Return - ${returnDoc.invoice_number}`,
        entry_type: 'SALES_RETURN',
        lines
    });

    if (returnDoc.return_against) {
        updatePaymentStatus(returnDoc.return_against, 'SALES');
    }

    return journal;
}

/**
 * Main Trigger Endpoint Handler (/custom-api/admin/email_sender)
 */
function handleDocumentEmailAndJournal(req, res) {
    try {
        const body = req.body || {};

        const docType = String(body.document_type || body.documentType || body.type || body.entity || '').toUpperCase();
        const docId = body.document_id || body.documentId || body.id || body.invoice_id || body.payment_id;

        if (!docType || !docId) {
            return res.status(400).json({
                success: false,
                message: "Missing document_type or document_id in email request."
            });
        }

        console.log(`[EMAIL SENDER] Processing email request for document: ${docType} (ID: ${docId})`);

        let doc = null;
        let table = '';

        if (['SALES_INVOICE', 'INVOICE', 'SALES_INV'].includes(docType)) {
            table = 'sales_invoices';
            doc = db.prepare("SELECT * FROM sales_invoices WHERE id = ? OR invoice_number = ?").get(docId, docId);
        } else if (['SALES_PAYMENT', 'PAYMENT', 'SALES_PAY'].includes(docType)) {
            table = 'sales_payments';
            doc = db.prepare("SELECT * FROM sales_payments WHERE id = ? OR payment_number = ?").get(docId, docId);
        } else if (['PURCHASE_PAYMENT', 'PURCHASE_PAY'].includes(docType)) {
            table = 'purchase_payments';
            doc = db.prepare("SELECT * FROM purchase_payments WHERE id = ? OR payment_number = ?").get(docId, docId);
        } else if (['PURCHASE_INVOICE', 'PURCHASE_INV', 'PURCHASE_RETURN', 'PURCHASE_RET'].includes(docType)) {
            table = 'purchase_invoices';
            doc = db.prepare("SELECT * FROM purchase_invoices WHERE id = ? OR invoice_number = ?").get(docId, docId);
            if (!doc) {
                table = 'purchase_returns';
                doc = db.prepare("SELECT * FROM purchase_returns WHERE id = ? OR invoice_number = ?").get(docId, docId);
            }
        }

        if (!doc) {
            doc = db.prepare("SELECT * FROM purchase_payments WHERE id = ? OR payment_number = ?").get(docId, docId) ||
                  db.prepare("SELECT * FROM purchase_invoices WHERE id = ? OR invoice_number = ?").get(docId, docId) ||
                  db.prepare("SELECT * FROM sales_payments WHERE id = ? OR payment_number = ?").get(docId, docId) ||
                  db.prepare("SELECT * FROM sales_invoices WHERE id = ? OR invoice_number = ?").get(docId, docId);
        }

        if (!doc) {
            return res.status(404).json({
                success: false,
                message: `Document of type '${docType}' with ID '${docId}' not found.`
            });
        }

        const currentStatus = (doc.status || '').toUpperCase();

        // Check status DRAFT gate / duplicate posting
        if (currentStatus === 'SENT' || currentStatus === 'POSTED' || currentStatus === 'FULLY_PAID' || currentStatus === 'PARTIALLY_PAID') {
            console.log(`[JOURNAL SKIP] Document ${docType} #${docId} status is already '${currentStatus}'. Skipping journal creation.`);
            return res.json({
                success: true,
                message: `Email sent successfully. Document ${docType} #${docId} was already posted; journal creation skipped.`,
                skipped: true
            });
        }

        let journalEntry = null;

        // Wrap execution in transaction for atomicity
        const processTransaction = db.transaction(() => {
            if (['SALES_INVOICE', 'INVOICE', 'SALES_INV'].includes(docType)) {
                journalEntry = postSalesInvoiceJournal(doc);
                db.prepare("UPDATE sales_invoices SET status = 'SENT' WHERE id = ?").run(doc.id);
            } else if (['SALES_PAYMENT', 'PAYMENT', 'SALES_PAY'].includes(docType)) {
                journalEntry = postSalesPaymentJournal(doc);
                db.prepare("UPDATE sales_payments SET status = 'POSTED' WHERE id = ?").run(doc.id);
            } else if (['PURCHASE_PAYMENT', 'PURCHASE_PAY'].includes(docType)) {
                journalEntry = postPurchasePaymentJournal(doc);
                db.prepare("UPDATE purchase_payments SET status = 'POSTED' WHERE id = ?").run(doc.id);
            } else if (['PURCHASE_INVOICE', 'PURCHASE_INV', 'PURCHASE_RETURN', 'PURCHASE_RET'].includes(docType)) {
                journalEntry = postPurchaseInvoiceJournal(doc);
                if (table === 'purchase_invoices') {
                    db.prepare("UPDATE purchase_invoices SET status = 'SENT' WHERE id = ?").run(doc.id);
                } else if (table === 'purchase_returns') {
                    db.prepare("UPDATE purchase_returns SET status = 'SENT' WHERE id = ?").run(doc.id);
                }
            } else {
                console.log(`[JOURNAL SKIP] Document type ${docType} does not post automated journal entries.`);
                if (table) {
                    db.prepare(`UPDATE ${table} SET status = 'SENT' WHERE id = ?`).run(doc.id);
                }
            }
        });

        processTransaction();

        return res.json({
            success: true,
            message: `Email sent successfully and automated journal entry posted for ${docType}.`,
            data: {
                journal_entry: journalEntry
            }
        });
    } catch (error) {
        console.error("Error in handleDocumentEmailAndJournal:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    normalizeArray,
    ensureDefaultAccounts,
    getAccountByName,
    getFundAccountBalance,
    updatePaymentStatus,
    getNextJournalEntryNo,
    saveAutomatedJournalEntry,
    calculateTaxBreakdown,
    postSalesInvoiceJournal,
    postSalesPaymentJournal,
    postPurchaseInvoiceJournal,
    postPurchasePaymentJournal,
    postSalesReturnJournal,
    handleDocumentEmailAndJournal
};
