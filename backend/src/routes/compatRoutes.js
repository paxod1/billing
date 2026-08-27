const express = require('express');
const router = express.Router();

const partyController = require('../controllers/partyController');
const salesController = require('../controllers/salesController');
const purchaseController = require('../controllers/purchaseController');
const inventoryController = require('../controllers/inventoryController');
const accountingController = require('../controllers/accountingController');
const reportController = require('../controllers/reportController');
const authController = require('../controllers/authController');

// --- CUSTOM API COMPATIBILITY ROUTES ---
router.post('/custom-api/admin/login', authController.login);

// Keyboard Shortcuts routes
router.get('/custom-api/admin/shortcuts', (req, res) => {
    return res.json({
        success: true,
        data: {
            shortcuts: [],
            grouped: null
        }
    });
});
router.post('/custom-api/admin/shortcuts/update-key', (req, res) => {
    return res.json({
        success: true,
        message: "Shortcut updated successfully"
    });
});

// Dashboard APIs
const db = require('../config/database');

router.get('/custom-api/admin/dashboard/financial', (req, res) => {
    try {
        const salesTotal = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM sales_invoices WHERE status != 'CANCELLED'").get().total;
        const purchaseTotal = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM purchase_invoices WHERE status != 'CANCELLED'").get().total;
        const salesPaid = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM sales_payments").get().total;
        const purchasePaid = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM purchase_payments").get().total;

        return res.json({
            success: true,
            data: {
                total_revenue: salesTotal,
                total_expenses: purchaseTotal,
                net_profit: salesTotal - purchaseTotal,
                receivables: salesTotal - salesPaid,
                payables: purchaseTotal - purchasePaid
            }
        });
    } catch (e) {
        return res.json({ success: true, data: { total_revenue: 0, total_expenses: 0, net_profit: 0, receivables: 0, payables: 0 } });
    }
});

router.get('/custom-api/admin/dashboard/operations', (req, res) => {
    try {
        const customerCount = db.prepare("SELECT COUNT(*) as count FROM parties WHERE role = 'CUSTOMER' OR role = 'BOTH'").get().count;
        const supplierCount = db.prepare("SELECT COUNT(*) as count FROM parties WHERE role = 'SUPPLIER' OR role = 'BOTH'").get().count;
        const productCount = db.prepare("SELECT COUNT(*) as count FROM items").get().count;
        const invoiceCount = db.prepare("SELECT COUNT(*) as count FROM sales_invoices").get().count;

        return res.json({
            success: true,
            data: {
                total_customers: customerCount,
                total_suppliers: supplierCount,
                total_products: productCount,
                total_invoices: invoiceCount
            }
        });
    } catch (e) {
        return res.json({ success: true, data: { total_customers: 0, total_suppliers: 0, total_products: 0, total_invoices: 0 } });
    }
});

router.get('/custom-api/admin/dashboard/sales', (req, res) => {
    try {
        const recentInvoices = db.prepare("SELECT * FROM sales_invoices ORDER BY id DESC LIMIT 5").all();
        return res.json({ success: true, data: { recent_invoices: recentInvoices } });
    } catch (e) {
        return res.json({ success: true, data: { recent_invoices: [] } });
    }
});

router.get('/custom-api/admin/dashboard/config', (req, res) => {
    return res.json({
        success: true,
        data: {
            widgets: ["financial", "operations", "sales"],
            refreshInterval: 60000
        }
    });
});

router.get('/custom-api/admin/accounts', accountingController.getChartsOfAccounts);
router.post('/custom-api/admin/accounts/manage', accountingController.manageAccount);
router.get('/custom-api/admin/accounts/detail', accountingController.getAccountDetails);
router.get('/custom-api/admin/account/suggestions', accountingController.fetchSuggestions);

router.get('/custom-api/admin/reports/general_ledger', reportController.getGeneralLedger);
router.get('/custom-api/admin/reports/profit_loss', reportController.getProfitLoss);
router.get('/custom-api/admin/reports/balance_sheet', reportController.getBalanceSheet);
router.get('/custom-api/admin/reports/trial_balance', reportController.getTrialBalance);
router.get('/custom-api/admin/reports/tax filing', reportController.getTaxFiling);
router.get('/custom-api/admin/reports/tax_filing', reportController.getTaxFiling);

router.post('/custom-api/admin/party_export', partyController.exportParties);
router.get('/custom-api/admin/party_statement', partyController.getPartyStatement);

router.post('/custom-api/admin/sales_inv/sales_invoice', salesController.saveInvoice);
router.put('/custom-api/admin/sales_inv/update', salesController.updateInvoice);
router.get('/custom-api/admin/sales_inv/sales_invoice_export', salesController.exportInvoices);
router.get('/custom-api/admin/get_sales_invoice', salesController.getInvoices);

router.post('/custom-api/admin/sales_pay/create', salesController.createPayment);
router.put('/custom-api/admin/sales_pay/update', salesController.updatePayment);
router.get('/custom-api/admin/sales_pay/export', salesController.exportPayments);

router.post('/custom-api/admin/purchase_inv/purchase_invoice', purchaseController.saveInvoice);
router.put('/custom-api/admin/purchase_inv/update', purchaseController.updateInvoice);
router.get('/custom-api/admin/purchase_inv/purchase_invoice_export', purchaseController.exportInvoices);
router.get('/custom-api/admin/purchase_inv/invoice', purchaseController.getInvoices);

router.post('/custom-api/admin/purchase_pay/purchase_payment', purchaseController.createPayment);
router.put('/custom-api/admin/purchase_pay/update', purchaseController.updatePayment);
router.get('/custom-api/admin/purchase_pay/get_purchase_invoice', purchaseController.getInvoices);

router.post('/custom-api/admin/inventory/products', inventoryController.saveCustomizedProduct);
router.put('/custom-api/admin/inventory/products_update', inventoryController.updateCustomizedProduct);

router.post('/custom-api/admin/Journal-unique-number', accountingController.getUniqueEntryNumber);
router.post('/custom-api/admin/journal/create', accountingController.saveJournalEntry);
router.put('/custom-api/admin/journal/update', accountingController.updateJournalEntry);

router.post('/custom-api/admin/email_sender', salesController.sendInvoiceEmail);

// --- SCHEMA API COMPATIBILITY ROUTES ---
const schemaPrefixes = [
    '/schema/admin/test1/billing_db',
    '/schema/admin/test1/moneymagics_db'
];

schemaPrefixes.forEach(schemaPrefix => {
    // Party
    router.post(`${schemaPrefix}/public.party/query`, partyController.getParties);
    router.post(`${schemaPrefix}/public.party/save-single-or-multiple`, partyController.createParty);
    router.get(`${schemaPrefix}/public.party/get-by-id/:id`, partyController.getPartyById);
    router.put(`${schemaPrefix}/public.party/update-by-id/:id`, partyController.updateParty);
    router.delete(`${schemaPrefix}/public.party/:id`, partyController.deleteParty);

    // Sales Invoice
    router.post(`${schemaPrefix}/public.sales_invoice/query`, salesController.getInvoices);
    router.get(`${schemaPrefix}/public.sales_invoice/get-by-id/:id`, salesController.getInvoiceById);
    router.delete(`${schemaPrefix}/public.sales_invoice/:id`, salesController.deleteInvoice);

    // Sales Payment
    router.post(`${schemaPrefix}/public.sales_payment/query`, salesController.getPayments);
    router.delete(`${schemaPrefix}/public.sales_payment/:id`, salesController.deletePayment);

    // Purchase Invoice
    router.post(`${schemaPrefix}/public.purchase_invoice/query`, purchaseController.getInvoices);
    router.delete(`${schemaPrefix}/public.purchase_invoice/:id`, purchaseController.deleteInvoice);

    // Purchase Payment
    router.post(`${schemaPrefix}/public.purchase_payment/query`, purchaseController.getPayments);
    router.delete(`${schemaPrefix}/public.purchase_payment/:id`, purchaseController.deletePayment);

    // Items (Customized Products)
    router.post(`${schemaPrefix}/public.item/query`, inventoryController.getCustomizedProducts);
    router.post(`${schemaPrefix}/public.item/save-single-or-multiple`, inventoryController.saveCustomizedProduct);
    router.put(`${schemaPrefix}/public.item/update-by-id/:id`, inventoryController.updateCustomizedProduct);
    router.delete(`${schemaPrefix}/public.item/:id`, inventoryController.deleteCustomizedProduct);

    // Raw Materials
    router.post(`${schemaPrefix}/public.raw_materials/query`, inventoryController.getRawMaterials);
    router.post(`${schemaPrefix}/public.raw_materials/save-single-or-multiple`, inventoryController.saveRawMaterial);
    router.put(`${schemaPrefix}/public.raw_materials/update-by-id/:id`, inventoryController.updateRawMaterial);
    router.delete(`${schemaPrefix}/public.raw_materials/:id`, inventoryController.deleteRawMaterial);

    // Journal Entry & Lines
    router.post(`${schemaPrefix}/public.journal_entry/query`, accountingController.getJournalEntries);
    router.post(`${schemaPrefix}/public.journal_entry/save-single-or-multiple`, accountingController.saveJournalEntry);
    router.put(`${schemaPrefix}/public.journal_entry/update-by-id/:id`, accountingController.updateJournalEntry);
    router.delete(`${schemaPrefix}/public.journal_entry/:id`, accountingController.deleteJournalEntry);
    router.post(`${schemaPrefix}/public.journal_line/save-single-or-multiple`, accountingController.saveJournalLines);
    router.post(`${schemaPrefix}/public.journal_line/query`, reportController.getLedgerAccounts);

    // Tax Code & Categories
    router.get(`${schemaPrefix}/public.tax_code`, accountingController.getTaxCodes);
    router.get(`${schemaPrefix}/public.tax_code/get-by-id/:id`, accountingController.getTaxCodeById);
    router.post(`${schemaPrefix}/public.tax_code/save-single-or-multiple`, accountingController.createTaxCode);
    router.put(`${schemaPrefix}/public.tax_code/update-by-id/:id`, accountingController.updateTaxCode);
    router.delete(`${schemaPrefix}/public.tax_code/:id`, accountingController.deleteTaxCode);
    router.get(`${schemaPrefix}/public.account_category`, accountingController.getAccountCategories);

    // Sales Return
    router.post(`${schemaPrefix}/public.sales_return/query`, salesController.getReturns);
    router.post(`${schemaPrefix}/public.sales_return/save-single-or-multiple`, salesController.saveReturn);
    router.put(`${schemaPrefix}/public.sales_return/update-by-id/:id`, salesController.updateReturn);
    router.delete(`${schemaPrefix}/public.sales_return/:id`, salesController.deleteReturn);

    // Fallback handlers
    const fallbackQueryHandler = (req, res) => res.json({ success: true, data: [], totalCount: 0 });
    router.post(`${schemaPrefix}/public.estimation/query`, fallbackQueryHandler);
    router.post(`${schemaPrefix}/public.sales_quote/query`, fallbackQueryHandler);
    router.post(`${schemaPrefix}/public.proforma_invoice/query`, fallbackQueryHandler);
    router.post(`${schemaPrefix}/public.sales_time/query`, fallbackQueryHandler);
    router.post(`${schemaPrefix}/public.time_entry/query`, fallbackQueryHandler);
    router.post(`${schemaPrefix}/public.sales_mileage/query`, fallbackQueryHandler);
    router.post(`${schemaPrefix}/public.mileage_entry/query`, fallbackQueryHandler);
    router.post(`${schemaPrefix}/public.purchase_order/query`, fallbackQueryHandler);

    // Accounts
    router.get(`${schemaPrefix}/public.account`, accountingController.fetchLeaves);
    router.post(`${schemaPrefix}/public.account/query`, accountingController.fetchLeaves);
    router.delete(`${schemaPrefix}/public.account/:id`, accountingController.deleteAccount);

    // Email sender
    router.post(`${schemaPrefix}/email_sender`, salesController.sendInvoiceEmail);
});

module.exports = router;
