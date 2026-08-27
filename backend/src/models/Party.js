const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, enum: ['CUSTOMER', 'SUPPLIER', 'BOTH'], default: 'CUSTOMER' },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    currency: { type: String, default: 'INR' },
    gst_reg: { type: String },
    opening_balance: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Party || mongoose.model('Party', partySchema);
