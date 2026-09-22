const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
    holder: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    CLABE: { type: String, required: true, trim: true },
    rfc: { type: String, required: true, trim: true },
}, { versionKey: false });

const BankAccount = mongoose.model('BankAccount', bankAccountSchema, 'bankAccounts');

module.exports = BankAccount;