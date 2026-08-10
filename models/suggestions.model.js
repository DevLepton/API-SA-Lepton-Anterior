const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    action: { type: String, enum: ['add', 'remove'], required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true
    }
}, { _id: false });

const suggestionSchema = new mongoose.Schema({
    description: { type: String, required: true, trim: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    action: { type: String, enum: ['add', 'remove'], required: true },
    response: { type: [responseSchema], default: [] },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const Suggestion = mongoose.model('Suggestion', suggestionSchema, 'suggestions');

module.exports = Suggestion;