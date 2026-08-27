const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema({
    entry_no: { type: String, required: true, unique: true },
    date: { type: String, required: true },
    reference: { type: String },
    narration: { type: String },
    lines: [{
        account_id: String,
        debit: { type: Number, default: 0 },
        credit: { type: Number, default: 0 }
    }],
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.JournalEntry || mongoose.model('JournalEntry', journalEntrySchema);
