const mongoose = require('mongoose');

const purchasePaymentSchema = new mongoose.Schema({
    payment_number: { type: String, required: true, unique: true },
    supplier_id: { type: String },
    invoice_id: { type: String },
    payment_date: { type: String },
    amount: { type: Number, default: 0 },
    payment_mode: { type: String, default: 'Bank Transfer' },
    reference: { type: String },
    status: { type: String, default: 'PAID' },
    notes: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.PurchasePayment || mongoose.model('PurchasePayment', purchasePaymentSchema);
