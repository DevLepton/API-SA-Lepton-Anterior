const mongoose = require('mongoose');

const boothSchema = new mongoose.Schema({
    name: { type: String, required: true },
    cost: { type: Number, required: true }
}, { _id: false });

const travelExpenseSchema = new mongoose.Schema({
    place: { type: String, required: true },
    km: { type: Number, required: true, min: 0 },
    booths: {
        type: [boothSchema],
        default: []
    },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const TravelExpense = mongoose.model('TravelExpense', travelExpenseSchema, 'travelExpenses');

module.exports = TravelExpense;