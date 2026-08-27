const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    is_folder: { type: Boolean, default: false },
    parent_id: { type: String, default: null },
    balance: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Account || mongoose.model('Account', accountSchema);
