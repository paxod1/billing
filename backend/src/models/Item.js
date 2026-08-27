const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sku: { type: String },
    description: { type: String },
    unit: { type: String, default: 'Pcs' },
    rate: { type: Number, default: 0 },
    unit_price: { type: Number, default: 0 },
    cost_price: { type: Number, default: 0 },
    production_cost: { type: Number, default: 0 },
    item_type: { type: String, default: 'CUSTOMISED PRODUCTS' },
    category: { type: String, default: 'SALES' },
    quantity: { type: Number, default: 0 },
    tax_id: { type: Number },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Item || mongoose.model('Item', itemSchema);
