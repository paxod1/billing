const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

// Sales Invoices
router.get('/invoices', salesController.getInvoices);
router.post('/invoices/query', salesController.getInvoices);
router.get('/invoices/export', salesController.exportInvoices);
router.get('/invoices/:id', salesController.getInvoiceById);
router.post('/invoices', salesController.saveInvoice);
router.put('/invoices/:id', salesController.updateInvoice);
router.delete('/invoices/:id', salesController.deleteInvoice);
// Email & Journal Triggers
router.post('/email', salesController.sendInvoiceEmail);
router.post('/invoices/send-email', salesController.sendInvoiceEmail);
router.post('/payments/send-email', salesController.sendInvoiceEmail);

// Sales Payments
router.get('/payments', salesController.getPayments);
router.post('/payments/query', salesController.getPayments);
router.get('/payments/export', salesController.exportPayments);
router.post('/payments', salesController.createPayment);
router.put('/payments/:id', salesController.updatePayment);
router.delete('/payments/:id', salesController.deletePayment);

// Sales Returns
router.get('/returns', salesController.getReturns);
router.post('/returns/query', salesController.getReturns);
router.post('/returns', salesController.saveReturn);
router.put('/returns/:id', salesController.updateReturn);
router.delete('/returns/:id', salesController.deleteReturn);

module.exports = router;
