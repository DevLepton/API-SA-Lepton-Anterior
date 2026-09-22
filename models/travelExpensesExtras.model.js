const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    log: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    userName: { type: String, required: true }
}, { _id: false });

const travelExpenseExtraSchema = new mongoose.Schema({
    kmRate: { type: Number, required: true, min: 0 },
    lodging: { type: Number, required: true, min: 0 },
    breakfast: { type: Number, required: true, min: 0 },
    lunch: { type: Number, required: true, min: 0 },
    dinner: { type: Number, required: true, min: 0 },
    changeLog: { type: [logSchema], default: [] },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const TravelExpenseExtra = mongoose.model('TravelExpenseExtra', travelExpenseExtraSchema,'travelExpensesExtras');

module.exports = TravelExpenseExtra;