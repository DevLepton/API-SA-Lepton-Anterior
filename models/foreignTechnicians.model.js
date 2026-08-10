const mongoose = require('mongoose');

const foreignTechnicianSchema = new mongoose.Schema({
    type: { type: String, required: true, enum: ['Local', 'Foráneo'] },
    name: { type: String, required: true },
    cel: { type: String, required: true },
    bill: { type: Boolean, default: false },
    city: { type: String, default: '' },
    ownLocal: { type: Boolean, default: false },
    address: { type: String, default: '' },
    installationPrice: { type: Number, default: 0 },
    inspectionFee: { type: Number, default: 0 },
    withdrawalPrice: { type: Number, default: 0 },
    priceFalseReversal: { type: Number, default: 0 },
    travelExpensesPrice: { type: Number, default: 0 },
    transferPrice: { type: Number, default: 0 },
    comments: { type: String },
}, { versionKey: false });

const ForeignTechnician = mongoose.model('ForeignTechnician', foreignTechnicianSchema, 'foreignTechnicians');

module.exports = ForeignTechnician;