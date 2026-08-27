const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/general-ledger', reportController.getGeneralLedger);
router.get('/ledger', reportController.getGeneralLedger);

router.get('/profit-loss', reportController.getProfitLoss);
router.get('/profit_loss', reportController.getProfitLoss);
router.get('/pl', reportController.getProfitLoss);

router.get('/trial-balance', reportController.getTrialBalance);
router.get('/trial_balance', reportController.getTrialBalance);

router.get('/balance-sheet', reportController.getBalanceSheet);
router.get('/balance_sheet', reportController.getBalanceSheet);

router.get('/tax-filing', reportController.getTaxFiling);
router.get('/tax_filing', reportController.getTaxFiling);

router.get('/ledger-accounts', reportController.getLedgerAccounts);
router.post('/ledger-accounts', reportController.getLedgerAccounts);

module.exports = router;
