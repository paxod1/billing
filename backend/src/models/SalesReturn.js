const mongoose = require('mongoose');

const salesReturnSchema = new mongoose.Schema({
    invoice_number: { type: String, required: true, unique: true },
    invoice_name: { type: String },
    customer_id: { type: String },
    return_against: { type: String },
    invoice_date: { type: String },
    total_amount: { type: Number, default: 0 },
    status: { type: String, default: 'DRAFT' },
    notes: { type: String },
    items: [{
        description: String,
        quantity: Number,
        rate: Number,
        tax_percent: Number,
        amount: Number
    }],
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.SalesReturn || mongoose.model('SalesReturn', salesReturnSchema);
