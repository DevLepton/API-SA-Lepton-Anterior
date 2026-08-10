const mongoose = require('mongoose');

const travelExpenseExtraSchema = new mongoose.Schema({
    kmRate: { type: Number, required: true, min: 0 },
    lodging: { type: Number, required: true, min: 0 },
    breakfast: { type: Number, required: true, min: 0 },
    lunch: { type: Number, required: true, min: 0 },
    dinner: { type: Number, required: true, min: 0 },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const TravelExpenseExtra = mongoose.model('TravelExpenseExtra', travelExpenseExtraSchema,'travelExpensesExtras');

module.exports = TravelExpenseExtra;