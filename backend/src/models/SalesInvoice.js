const mongoose = require('mongoose');

const salesInvoiceSchema = new mongoose.Schema({
    invoice_number: { type: String, required: true, unique: true },
    invoice_name: { type: String },
    customer_id: { type: String },
    invoice_date: { type: String },
    status: { type: String, default: 'DRAFT' },
    total_amount: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    notes: { type: String },
    payment_terms: { type: String, default: 'Net 15' },
    items: [{
        description: String,
        quantity: Number,
        rate: Number,
        tax_percent: Number,
        amount: Number
    }],
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.SalesInvoice || mongoose.model('SalesInvoice', salesInvoiceSchema);
