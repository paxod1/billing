const db = require('../config/database');

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthsList(limit = 3, from_date, to_date) {
    let num = parseInt(limit, 10);
    if (isNaN(num) || num <= 0) num = 3;
    const now = new Date();
    let currY = now.getFullYear();
    let currM = now.getMonth();

    if (from_date && to_date) {
        const startParts = from_date.split('-');
        const endParts = to_date.split('-');
        let startY = parseInt(startParts[0], 10), startM = parseInt(startParts[1], 10) - 1;
        let endY = parseInt(endParts[0], 10), endM = parseInt(endParts[1], 10) - 1;
        currY = endY;
        currM = endM;
        const months = [];
        while (currY > startY || (currY === startY && currM >= startM)) {
            const key = `${currY}-${String(currM + 1).padStart(2, '0')}`;
            const label = `${monthNames[currM]} ${currY}`;
            months.push({ key, label });
            currM--;
            if (currM < 0) { currM = 11; currY--; }
        }
        return months;
    }

    const months = [];
    for (let i = 0; i < num; i++) {
        const key = `${currY}-${String(currM + 1).padStart(2, '0')}`;
        const label = `${monthNames[currM]} ${currY}`;
        months.push({ key, label });
        currM--;
        if (currM < 0) { currM = 11; currY--; }
    }
    return months;
}

const reportController = {
    // 1. General Ledger Report
    getGeneralLedger: (req, res) => {
        try {
            const { reference, account, limit = 50, skip = 0, from_date, to_date } = req.query;

            let conditions = [];
            let params = [];

            if (account) {
                conditions.push("jl.account_id = ?");
                params.push(account);
            }
            if (reference) {
                conditions.push("je.reference LIKE ?");
                params.push(`%${reference}%`);
            }
            if (from_date) {
                conditions.push("je.date >= ?");
                params.push(from_date);
            }
            if (to_date) {
                conditions.push("je.date <= ?");
                params.push(to_date);
            }

            const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const orderSql = account ? "je.date ASC, je.id ASC, jl.id ASC" : "a.name ASC, je.date ASC, je.id ASC, jl.id ASC";

            const totalCount = db.prepare(`
                SELECT COUNT(*) as count
                FROM journal_lines jl
                JOIN journal_entries je ON jl.journal_id = je.id
                ${whereSql}
            `).get(...params).count;

            const lines = db.prepare(`
                SELECT jl.id, jl.journal_id, jl.account_id, jl.debit, jl.credit,
                       je.date, je.entry_no, je.reference, je.narration, je.entry_type,
                       a.name as account_name, a.code as account_code, a.category as account_category
                FROM journal_lines jl
                JOIN journal_entries je ON jl.journal_id = je.id
                JOIN accounts a ON jl.account_id = a.id
                ${whereSql}
                ORDER BY ${orderSql}
                LIMIT ? OFFSET ?
            `).all(...params, parseInt(limit, 10), parseInt(skip, 10));

            // Compute running balance per account
            const accountBalances = {};

            const offset = parseInt(skip, 10) || 0;
            if (offset > 0 || from_date) {
                let priorConditions = [];
                let priorParams = [];

                if (account) {
                    priorConditions.push("jl.account_id = ?");
                    priorParams.push(account);
                }
                if (reference) {
                    priorConditions.push("je.reference LIKE ?");
                    priorParams.push(`%${reference}%`);
                }

                if (from_date) {
                    priorConditions.push("je.date < ?");
                    priorParams.push(from_date);
                    const priorWhere = priorConditions.length > 0 ? `WHERE ${priorConditions.join(' AND ')}` : '';
                    const priorLines = db.prepare(`
                        SELECT jl.account_id, jl.debit, jl.credit, a.category as account_category
                        FROM journal_lines jl
                        JOIN journal_entries je ON jl.journal_id = je.id
                        JOIN accounts a ON jl.account_id = a.id
                        ${priorWhere}
                    `).all(...priorParams);

                    priorLines.forEach(r => {
                        const isAssetExp = ['Assets', 'Expenses'].includes(r.account_category);
                        const net = isAssetExp ? (r.debit - r.credit) : (r.credit - r.debit);
                        accountBalances[r.account_id] = (accountBalances[r.account_id] || 0) + net;
                    });
                } else if (offset > 0) {
                    const priorLines = db.prepare(`
                        SELECT jl.account_id, jl.debit, jl.credit, a.category as account_category
                        FROM journal_lines jl
                        JOIN journal_entries je ON jl.journal_id = je.id
                        JOIN accounts a ON jl.account_id = a.id
                        ${whereSql}
                        ORDER BY ${orderSql}
                        LIMIT ?
                    `).all(...params, offset);

                    priorLines.forEach(r => {
                        const isAssetExp = ['Assets', 'Expenses'].includes(r.account_category);
                        const net = isAssetExp ? (r.debit - r.credit) : (r.credit - r.debit);
                        accountBalances[r.account_id] = (accountBalances[r.account_id] || 0) + net;
                    });
                }
            }

            const formattedLines = lines.map(line => {
                const isAssetOrExpense = ['Assets', 'Expenses'].includes(line.account_category);
                const lineNet = isAssetOrExpense ? (line.debit - line.credit) : (line.credit - line.debit);
                const accId = line.account_id;

                accountBalances[accId] = (accountBalances[accId] || 0) + lineNet;
                const currentRunningBalance = parseFloat(accountBalances[accId].toFixed(2));

                return {
                    ...line,
                    balance: currentRunningBalance,
                    running_balance: currentRunningBalance
                };
            });

            return res.json({
                success: true,
                data: {
                    data: formattedLines,
                    total: totalCount
                }
            });
        } catch (error) {
            console.error("Error in getGeneralLedger:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // 2. Profit & Loss (P&L) Report
    getProfitLoss: (req, res) => {
        try {
            const { account, months_limit, from_date, to_date } = req.query;
            const months = getMonthsList(months_limit || 3, from_date, to_date);

            let incomeAccounts = db.prepare("SELECT * FROM accounts WHERE category = 'Income' AND is_folder = 0").all();
            let expenseAccounts = db.prepare("SELECT * FROM accounts WHERE category = 'Expenses' AND is_folder = 0").all();

            if (account && account.trim()) {
                const search = account.trim().toLowerCase();
                incomeAccounts = incomeAccounts.filter(a => a.name.toLowerCase().includes(search) || (a.code && a.code.toLowerCase().includes(search)));
                expenseAccounts = expenseAccounts.filter(a => a.name.toLowerCase().includes(search) || (a.code && a.code.toLowerCase().includes(search)));
            }

            const summaryTotalIncome = { total: 0 };
            const summaryTotalExpenses = { total: 0 };
            const summaryNetProfit = { total: 0 };

            months.forEach(m => {
                summaryTotalIncome[m.key] = 0;
                summaryTotalExpenses[m.key] = 0;
                summaryNetProfit[m.key] = 0;
            });

            const incomeRows = incomeAccounts.map(acc => {
                const amounts = {};
                months.forEach(m => {
                    const sum = db.prepare(`
                        SELECT COALESCE(SUM(jl.credit - jl.debit), 0) as total
                        FROM journal_lines jl
                        JOIN journal_entries je ON jl.journal_id = je.id
                        WHERE jl.account_id = ? AND strftime('%Y-%m', je.date) = ?
                    `).get(acc.id, m.key).total;
                    const amt = parseFloat((sum).toFixed(2));
                    amounts[m.key] = amt;
                    summaryTotalIncome[m.key] += amt;
                    summaryTotalIncome.total += amt;
                });
                return {
                    row_type: "account",
                    label: acc.name,
                    account_id: String(acc.id),
                    indent: 1,
                    category: "income",
                    amounts
                };
            });

            const incomeCategoryHeaderAmounts = {};
            months.forEach(m => {
                incomeCategoryHeaderAmounts[m.key] = parseFloat(summaryTotalIncome[m.key].toFixed(2));
            });
            summaryTotalIncome.total = parseFloat(summaryTotalIncome.total.toFixed(2));

            const expenseRows = expenseAccounts.map(acc => {
                const amounts = {};
                months.forEach(m => {
                    const sum = db.prepare(`
                        SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as total
                        FROM journal_lines jl
                        JOIN journal_entries je ON jl.journal_id = je.id
                        WHERE jl.account_id = ? AND strftime('%Y-%m', je.date) = ?
                    `).get(acc.id, m.key).total;
                    const amt = parseFloat((sum).toFixed(2));
                    amounts[m.key] = amt;
                    summaryTotalExpenses[m.key] += amt;
                    summaryTotalExpenses.total += amt;
                });
                return {
                    row_type: "account",
                    label: acc.name,
                    account_id: String(acc.id),
                    indent: 1,
                    category: "expenses",
                    amounts
                };
            });

            const expenseCategoryHeaderAmounts = {};
            months.forEach(m => {
                expenseCategoryHeaderAmounts[m.key] = parseFloat(summaryTotalExpenses[m.key].toFixed(2));
            });
            summaryTotalExpenses.total = parseFloat(summaryTotalExpenses.total.toFixed(2));

            const netProfitAmounts = {};
            months.forEach(m => {
                const net = summaryTotalIncome[m.key] - summaryTotalExpenses[m.key];
                netProfitAmounts[m.key] = parseFloat(net.toFixed(2));
                summaryNetProfit[m.key] = parseFloat(net.toFixed(2));
            });
            summaryNetProfit.total = parseFloat((summaryTotalIncome.total - summaryTotalExpenses.total).toFixed(2));

            const dataRows = [
                {
                    row_type: "category_header",
                    label: "Income",
                    indent: 0,
                    category: "income",
                    amounts: incomeCategoryHeaderAmounts
                },
                ...incomeRows,
                {
                    row_type: "category_total",
                    label: "Total Income (Credit)",
                    indent: 0,
                    category: "income",
                    amounts: incomeCategoryHeaderAmounts
                },
                {
                    row_type: "category_header",
                    label: "Expenses",
                    indent: 0,
                    category: "expenses",
                    amounts: expenseCategoryHeaderAmounts
                },
                ...expenseRows,
                {
                    row_type: "category_total",
                    label: "Total Expenses (Debit)",
                    indent: 0,
                    category: "expenses",
                    amounts: expenseCategoryHeaderAmounts
                },
                {
                    row_type: "net_profit",
                    label: "Net Profit / (Loss)",
                    indent: 0,
                    amounts: netProfitAmounts
                }
            ];

            return res.json({
                success: true,
                statusCode: 200,
                data: {
                    success: true,
                    total: dataRows.length,
                    skip: 0,
                    limit: 50,
                    summary: {
                        months,
                        total_income: summaryTotalIncome,
                        total_expenses: summaryTotalExpenses,
                        net_profit: summaryNetProfit
                    },
                    data: dataRows
                }
            });
        } catch (error) {
            console.error("Error in getProfitLoss:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // 3. Balance Sheet Report
    getBalanceSheet: (req, res) => {
        try {
            const { section, account, months_limit, periods: periodsParam, from_date, to_date } = req.query;

            let periods = [];
            if (periodsParam && typeof periodsParam === 'string') {
                const rawPeriods = periodsParam.split(',');
                periods = rawPeriods.map(p => {
                    const trimmed = p.trim();
                    const parts = trimmed.split('-');
                    let label = trimmed;
                    if (parts.length >= 2) {
                        const mIdx = parseInt(parts[1], 10) - 1;
                        if (mIdx >= 0 && mIdx < 12) {
                            label = `${monthNames[mIdx]} ${parts[0]}`;
                        }
                    }
                    return { key: trimmed, label };
                });
            } else {
                const months = getMonthsList(months_limit || 3, from_date, to_date);
                periods = months.map(m => {
                    const [y, mm] = m.key.split('-').map(Number);
                    const lastDay = new Date(y, mm, 0).getDate();
                    const key = `${m.key}-${String(lastDay).padStart(2, '0')}`;
                    return { key, label: m.label };
                });
            }

            let assetAccounts = db.prepare("SELECT * FROM accounts WHERE category = 'Assets' AND (is_folder = 0 OR id IN (SELECT DISTINCT account_id FROM journal_lines))").all();
            let liabAccounts = db.prepare("SELECT * FROM accounts WHERE category = 'Liabilities' AND (is_folder = 0 OR id IN (SELECT DISTINCT account_id FROM journal_lines))").all();
            let equityAccounts = db.prepare("SELECT * FROM accounts WHERE category = 'Equity' AND (is_folder = 0 OR id IN (SELECT DISTINCT account_id FROM journal_lines))").all();

            if (account && account.trim()) {
                const search = account.trim().toLowerCase();
                assetAccounts = assetAccounts.filter(a => a.name.toLowerCase().includes(search) || (a.code && a.code.toLowerCase().includes(search)));
                liabAccounts = liabAccounts.filter(a => a.name.toLowerCase().includes(search) || (a.code && a.code.toLowerCase().includes(search)));
                equityAccounts = equityAccounts.filter(a => a.name.toLowerCase().includes(search) || (a.code && a.code.toLowerCase().includes(search)));
            }

            const summaryAssets = {};
            const summaryLiab = {};
            const summaryEquity = {};
            const balanced = {};

            periods.forEach(p => {
                summaryAssets[p.key] = 0;
                summaryLiab[p.key] = 0;
                summaryEquity[p.key] = 0;
            });

            const assetRows = assetAccounts.map(acc => {
                const amounts = {};
                periods.forEach(p => {
                    const sum = db.prepare(`
                        SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as total
                        FROM journal_lines jl
                        JOIN journal_entries je ON jl.journal_id = je.id
                        WHERE jl.account_id = ? AND je.date <= ?
                    `).get(acc.id, p.key).total;
                    const amt = parseFloat((sum).toFixed(2));
                    amounts[p.key] = amt;
                    summaryAssets[p.key] += amt;
                });
                return {
                    row_type: "account",
                    label: acc.name,
                    account_id: String(acc.id),
                    indent: 1,
                    section: "assets",
                    amounts
                };
            });

            const liabRows = liabAccounts.map(acc => {
                const amounts = {};
                periods.forEach(p => {
                    const sum = db.prepare(`
                        SELECT COALESCE(SUM(jl.credit - jl.debit), 0) as total
                        FROM journal_lines jl
                        JOIN journal_entries je ON jl.journal_id = je.id
                        WHERE jl.account_id = ? AND je.date <= ?
                    `).get(acc.id, p.key).total;
                    const amt = parseFloat((sum).toFixed(2));
                    amounts[p.key] = amt;
                    summaryLiab[p.key] += amt;
                });
                return {
                    row_type: "account",
                    label: acc.name,
                    account_id: String(acc.id),
                    indent: 1,
                    section: "liabilities",
                    amounts
                };
            });

            const equityRows = equityAccounts.map(acc => {
                const amounts = {};
                periods.forEach(p => {
                    const sum = db.prepare(`
                        SELECT COALESCE(SUM(jl.credit - jl.debit), 0) as total
                        FROM journal_lines jl
                        JOIN journal_entries je ON jl.journal_id = je.id
                        WHERE jl.account_id = ? AND je.date <= ?
                    `).get(acc.id, p.key).total;
                    const amt = parseFloat((sum).toFixed(2));
                    amounts[p.key] = amt;
                    summaryEquity[p.key] += amt;
                });
                return {
                    row_type: "account",
                    label: acc.name,
                    account_id: String(acc.id),
                    indent: 1,
                    section: "equity",
                    amounts
                };
            });

            const retainedAmounts = {};
            periods.forEach(p => {
                const inc = db.prepare(`
                    SELECT COALESCE(SUM(jl.credit - jl.debit), 0) as total
                    FROM journal_lines jl
                    JOIN journal_entries je ON jl.journal_id = je.id
                    JOIN accounts a ON jl.account_id = a.id
                    WHERE a.category = 'Income' AND je.date <= ?
                `).get(p.key).total;

                const exp = db.prepare(`
                    SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as total
                    FROM journal_lines jl
                    JOIN journal_entries je ON jl.journal_id = je.id
                    JOIN accounts a ON jl.account_id = a.id
                    WHERE a.category = 'Expenses' AND je.date <= ?
                `).get(p.key).total;

                const net = inc - exp;
                retainedAmounts[p.key] = parseFloat(net.toFixed(2));
                summaryEquity[p.key] += parseFloat(net.toFixed(2));
            });

            const retainedRow = {
                row_type: "account",
                label: "Retained Earnings (Current Net Profit)",
                account_id: "9999",
                indent: 1,
                section: "equity",
                amounts: retainedAmounts
            };

            periods.forEach(p => {
                summaryAssets[p.key] = parseFloat(summaryAssets[p.key].toFixed(2));
                summaryLiab[p.key] = parseFloat(summaryLiab[p.key].toFixed(2));
                summaryEquity[p.key] = parseFloat(summaryEquity[p.key].toFixed(2));
                const diff = Math.abs(summaryAssets[p.key] - (summaryLiab[p.key] + summaryEquity[p.key]));
                balanced[p.key] = diff < 0.01;
            });

            const assetHeaderAmounts = { ...summaryAssets };
            const liabEquityTotalAmounts = {};
            periods.forEach(p => {
                liabEquityTotalAmounts[p.key] = parseFloat((summaryLiab[p.key] + summaryEquity[p.key]).toFixed(2));
            });

            let dataRows = [];

            const includeAssets = !section || section === 'assets';
            const includeLiab = !section || section === 'liabilities' || section === 'liabilities_equity';
            const includeEquity = !section || section === 'equity' || section === 'liabilities_equity';

            if (includeAssets) {
                dataRows.push(
                    {
                        row_type: "section_header",
                        label: "Application of Funds (Assets)",
                        indent: 0,
                        section: "assets",
                        amounts: assetHeaderAmounts
                    },
                    ...assetRows,
                    {
                        row_type: "section_total",
                        label: "Total Assets (Debit)",
                        indent: 0,
                        section: "assets",
                        amounts: assetHeaderAmounts
                    }
                );
            }

            if (includeLiab || includeEquity) {
                dataRows.push(
                    {
                        row_type: "section_header",
                        label: "Sources of Funds (Liabilities & Equity)",
                        indent: 0,
                        section: "liabilities_equity",
                        amounts: liabEquityTotalAmounts
                    }
                );

                if (includeLiab) dataRows.push(...liabRows);
                if (includeEquity) {
                    dataRows.push(...equityRows);
                    dataRows.push(retainedRow);
                }

                dataRows.push(
                    {
                        row_type: "section_total",
                        label: "Total Liabilities & Equity (Credit)",
                        indent: 0,
                        section: "liabilities_equity",
                        amounts: liabEquityTotalAmounts
                    }
                );
            }

            return res.json({
                success: true,
                statusCode: 200,
                data: {
                    success: true,
                    periods,
                    balanced,
                    summary: {
                        total_assets: summaryAssets,
                        total_liabilities: summaryLiab,
                        total_equity: summaryEquity
                    },
                    data: dataRows
                }
            });
        } catch (error) {
            console.error("Error in getBalanceSheet:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // 4. Trial Balance Report
    getTrialBalance: (req, res) => {
        try {
            const { section, account, from_date, to_date } = req.query;
            const accounts = db.prepare("SELECT * FROM accounts WHERE (is_folder = 0 OR id IN (SELECT DISTINCT account_id FROM journal_lines)) ORDER BY category ASC, code ASC").all();

            let dateFilter = '';
            const params = [];
            if (from_date) {
                dateFilter += ' AND je.date >= ?';
                params.push(from_date);
            }
            if (to_date) {
                dateFilter += ' AND je.date <= ?';
                params.push(to_date);
            }

            const sections = ["Assets", "Liabilities", "Equity", "Income", "Expenses"];
            const sectionLabels = {
                "Assets": "Application of Funds (Assets)",
                "Liabilities": "Sources of Funds (Liabilities)",
                "Equity": "Equity & Capital",
                "Income": "Revenue / Income",
                "Expenses": "Expenses & Outgoings"
            };

            let grandDr = 0;
            let grandCr = 0;
            const dataRows = [];

            sections.forEach(cat => {
                const catKey = cat.toLowerCase();
                if (section && section !== catKey) return;

                let catAccounts = accounts.filter(a => a.category === cat);

                if (account && account.trim()) {
                    const search = account.trim().toLowerCase();
                    catAccounts = catAccounts.filter(a => a.name.toLowerCase().includes(search) || (a.code && a.code.toLowerCase().includes(search)));
                }

                let secDr = 0;
                let secCr = 0;

                const catRows = catAccounts.map(acc => {
                    const dr = db.prepare(`
                        SELECT COALESCE(SUM(jl.debit), 0) as total
                        FROM journal_lines jl
                        JOIN journal_entries je ON jl.journal_id = je.id
                        WHERE jl.account_id = ? ${dateFilter}
                    `).get(acc.id, ...params).total;

                    const cr = db.prepare(`
                        SELECT COALESCE(SUM(jl.credit), 0) as total
                        FROM journal_lines jl
                        JOIN journal_entries je ON jl.journal_id = je.id
                        WHERE jl.account_id = ? ${dateFilter}
                    `).get(acc.id, ...params).total;

                    let closing_dr = 0;
                    let closing_cr = 0;

                    if (['Assets', 'Expenses'].includes(acc.category)) {
                        const net = dr - cr;
                        if (net >= 0) closing_dr = net;
                        else closing_cr = Math.abs(net);
                    } else {
                        const net = cr - dr;
                        if (net >= 0) closing_cr = net;
                        else closing_dr = Math.abs(net);
                    }

                    closing_dr = parseFloat(closing_dr.toFixed(2));
                    closing_cr = parseFloat(closing_cr.toFixed(2));

                    secDr += closing_dr;
                    secCr += closing_cr;

                    return {
                        row_type: "account",
                        label: acc.name,
                        account_id: String(acc.id),
                        indent: 1,
                        section: catKey,
                        amounts: { closing_dr, closing_cr }
                    };
                });

                secDr = parseFloat(secDr.toFixed(2));
                secCr = parseFloat(secCr.toFixed(2));
                grandDr += secDr;
                grandCr += secCr;

                dataRows.push({
                    row_type: "section_header",
                    label: sectionLabels[cat] || cat,
                    indent: 0,
                    section: catKey,
                    amounts: { closing_dr: secDr, closing_cr: secCr }
                });
                dataRows.push(...catRows);
                dataRows.push({
                    row_type: "section_total",
                    label: `Total ${cat}`,
                    indent: 0,
                    section: catKey,
                    amounts: { closing_dr: secDr, closing_cr: secCr }
                });
            });

            dataRows.push({
                row_type: "grand_total",
                label: "Grand Total",
                indent: 0,
                amounts: { closing_dr: parseFloat(grandDr.toFixed(2)), closing_cr: parseFloat(grandCr.toFixed(2)) }
            });

            const periodText = (from_date && to_date) ? `${from_date} to ${to_date}` : "As of Current Period";

            return res.json({
                success: true,
                statusCode: 200,
                data: {
                    success: true,
                    period: periodText,
                    columns: ["debit", "credit"],
                    summary: {
                        grand_total: { closing_dr: parseFloat(grandDr.toFixed(2)), closing_cr: parseFloat(grandCr.toFixed(2)) }
                    },
                    data: dataRows
                }
            });
        } catch (error) {
            console.error("Error in getTrialBalance:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // 5. Tax Filing Report
    getTaxFiling: (req, res) => {
        try {
            const { section, months_limit, from_date, to_date } = req.query;

            let salesWhere = "WHERE status != 'CANCELLED'";
            let purWhere = "WHERE status != 'CANCELLED'";
            const paramsSales = [];
            const paramsPur = [];

            if (from_date) {
                salesWhere += " AND invoice_date >= ?";
                purWhere += " AND invoice_date >= ?";
                paramsSales.push(from_date);
                paramsPur.push(from_date);
            }
            if (to_date) {
                salesWhere += " AND invoice_date <= ?";
                purWhere += " AND invoice_date <= ?";
                paramsSales.push(to_date);
                paramsPur.push(to_date);
            }

            const salesInvoices = db.prepare(`SELECT * FROM sales_invoices ${salesWhere}`).all(...paramsSales);
            const purchaseInvoices = db.prepare(`SELECT * FROM purchase_invoices ${purWhere}`).all(...paramsPur);

            let outTaxable = 0, outIgst = 0, outCgst = 0, outSgst = 0, outTax = 0;
            salesInvoices.forEach(inv => {
                const total = inv.total_amount || 0;
                const tax = inv.tax_amount || 0;
                const taxable = total - tax;
                const halfTax = tax / 2;
                outTaxable += taxable;
                outCgst += halfTax;
                outSgst += halfTax;
                outTax += tax;
            });

            let inTaxable = 0, inIgst = 0, inCgst = 0, inSgst = 0, inTax = 0;
            purchaseInvoices.forEach(inv => {
                const total = inv.total_amount || 0;
                const tax = inv.tax_amount || 0;
                const taxable = total - tax;
                const halfTax = tax / 2;
                inTaxable += taxable;
                inCgst += halfTax;
                inSgst += halfTax;
                inTax += tax;
            });

            const netTaxable = outTaxable - inTaxable;
            const netIgst = outIgst - inIgst;
            const netCgst = outCgst - inCgst;
            const netSgst = outSgst - inSgst;
            const netTax = outTax - inTax;

            const formatAmounts = (taxable, igst, cgst, sgst, tax) => ({
                total: {
                    taxable_amount: parseFloat(taxable.toFixed(2)),
                    igst: parseFloat(igst.toFixed(2)),
                    cgst: parseFloat(cgst.toFixed(2)),
                    sgst: parseFloat(sgst.toFixed(2)),
                    total_tax: parseFloat(tax.toFixed(2))
                }
            });

            const dataRows = [];

            const includeOutward = !section || section === 'outward';
            const includeInward = !section || section === 'inward';
            const includeAdjustments = !section || section === 'adjustments';

            if (includeOutward) {
                dataRows.push(
                    {
                        row_type: "section_header",
                        label: "Outward Supplies (Sales)",
                        indent: 0,
                        section: "outward"
                    },
                    {
                        row_type: "account",
                        label: "Taxable Sales (Standard Rate)",
                        indent: 1,
                        section: "outward",
                        amounts: formatAmounts(outTaxable, outIgst, outCgst, outSgst, outTax)
                    },
                    {
                        row_type: "section_total",
                        label: "Total Outward Tax",
                        indent: 0,
                        section: "outward",
                        amounts: formatAmounts(outTaxable, outIgst, outCgst, outSgst, outTax)
                    }
                );
            }

            if (includeInward) {
                dataRows.push(
                    {
                        row_type: "section_header",
                        label: "Inward Supplies (Purchases & Expenses)",
                        indent: 0,
                        section: "inward"
                    },
                    {
                        row_type: "account",
                        label: "Eligible Input Tax Credit (ITC)",
                        indent: 1,
                        section: "inward",
                        amounts: formatAmounts(inTaxable, inIgst, inCgst, inSgst, inTax)
                    },
                    {
                        row_type: "section_total",
                        label: "Total Inward Tax Credit",
                        indent: 0,
                        section: "inward",
                        amounts: formatAmounts(inTaxable, inIgst, inCgst, inSgst, inTax)
                    }
                );
            }

            if (!section || includeAdjustments) {
                dataRows.push({
                    row_type: "net_total",
                    label: "Net Tax Payable / (Refundable)",
                    indent: 0,
                    amounts: formatAmounts(netTaxable, netIgst, netCgst, netSgst, netTax)
                });
            }

            const months = getMonthsList(months_limit || 3, from_date, to_date);

            return res.json({
                success: true,
                statusCode: 200,
                data: {
                    success: true,
                    summary: {
                        months,
                        total_outward: formatAmounts(outTaxable, outIgst, outCgst, outSgst, outTax).total,
                        total_inward: formatAmounts(inTaxable, inIgst, inCgst, inSgst, inTax).total,
                        total_adjustments: { taxable_amount: 0, igst: 0, cgst: 0, sgst: 0, total_tax: 0 },
                        net_tax_payable: formatAmounts(netTaxable, netIgst, netCgst, netSgst, netTax).total
                    },
                    data: dataRows
                }
            });
        } catch (error) {
            console.error("Error in getTaxFiling:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // 6. Ledger Accounts list
    getLedgerAccounts: (req, res) => {
        try {
            const accounts = db.prepare("SELECT id as account_id, name FROM accounts WHERE is_folder = 0").all();
            return res.json({
                success: true,
                data: accounts
            });
        } catch (error) {
            console.error("Error in getLedgerAccounts:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = reportController;
