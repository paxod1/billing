const mongoose = require('mongoose');

const taxCodeSchema = new mongoose.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    rate: { type: Number, required: true },
    description: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.TaxCode || mongoose.model('TaxCode', taxCodeSchema);
