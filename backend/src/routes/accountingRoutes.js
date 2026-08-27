const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accountingController');

// Chart of Accounts
router.get('/accounts', accountingController.getChartsOfAccounts);
router.post('/accounts', accountingController.manageAccount);
router.put('/accounts/:id', accountingController.manageAccount);
router.get('/accounts/chart', accountingController.getChartsOfAccounts);
router.post('/accounts/manage', accountingController.manageAccount);
router.get('/accounts/leaves', accountingController.fetchLeaves);
router.get('/accounts/detail', accountingController.getAccountDetails);
router.get('/accounts/suggestions', accountingController.fetchSuggestions);
router.delete('/accounts/:id', accountingController.deleteAccount);

// Journal Entries
router.get('/journal-entries', accountingController.getJournalEntries);
router.post('/journal-entries/query', accountingController.getJournalEntries);
router.post('/journal-entries', accountingController.saveJournalEntry);
router.post('/journal-entries/lines', accountingController.saveJournalLines);
router.put('/journal-entries/:id', accountingController.updateJournalEntry);
router.delete('/journal-entries/:id', accountingController.deleteJournalEntry);
router.get('/journal-entries/unique-number', accountingController.getUniqueEntryNumber);
router.post('/journal-entries/unique-number', accountingController.getUniqueEntryNumber);

// Tax Templates & Codes
router.get('/tax-codes/categories', accountingController.getAccountCategories);
router.get('/tax-codes/export', accountingController.exportTaxCodes);
router.get('/tax-codes', accountingController.getTaxCodes);
router.get('/tax-codes/:id', accountingController.getTaxCodeById);
router.post('/tax-codes', accountingController.createTaxCode);
router.put('/tax-codes/:id', accountingController.updateTaxCode);
router.delete('/tax-codes/:id', accountingController.deleteTaxCode);

module.exports = router;
