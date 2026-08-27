const mongoose = require('mongoose');

const salesPaymentSchema = new mongoose.Schema({
    payment_number: { type: String, required: true, unique: true },
    customer_id: { type: String },
    invoice_id: { type: String },
    payment_date: { type: String },
    amount: { type: Number, default: 0 },
    payment_mode: { type: String, default: 'Bank Transfer' },
    reference: { type: String },
    status: { type: String, default: 'PAID' },
    notes: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.SalesPayment || mongoose.model('SalesPayment', salesPaymentSchema);
