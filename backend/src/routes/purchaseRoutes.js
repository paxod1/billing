const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');

// Purchase Invoices
router.get('/invoices', purchaseController.getInvoices);
router.post('/invoices/query', purchaseController.getInvoices);
router.get('/invoices/export', purchaseController.exportInvoices);
router.post('/invoices', purchaseController.saveInvoice);
router.put('/invoices/:id', purchaseController.updateInvoice);
router.delete('/invoices/:id', purchaseController.deleteInvoice);

// Email & Journal Triggers
router.post('/email', purchaseController.sendInvoiceEmail);
router.post('/invoices/send-email', purchaseController.sendInvoiceEmail);
router.post('/payments/send-email', purchaseController.sendInvoiceEmail);

// Purchase Payments
router.get('/payments', purchaseController.getPayments);
router.post('/payments/query', purchaseController.getPayments);
router.post('/payments', purchaseController.createPayment);
router.put('/payments/:id', purchaseController.updatePayment);
router.delete('/payments/:id', purchaseController.deletePayment);

// Purchase Returns
router.get('/returns', purchaseController.getReturns);
router.post('/returns/query', purchaseController.getReturns);
router.post('/returns', purchaseController.saveReturn);
router.put('/returns/:id', purchaseController.updateReturn);
router.delete('/returns/:id', purchaseController.deleteReturn);

module.exports = router;
