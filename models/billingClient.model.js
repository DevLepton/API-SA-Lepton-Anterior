const mongoose = require('mongoose');

const paymentContactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, default: '' },
    cel: { type: String, default: '' },
    notes: { type: String, default: '' },
    type: { type: String, enum: ['titular', 'cobranza', 'soporte', 'emergencia'], required: true }
}, { _id: false });

const discountSchema = new mongoose.Schema({
    monthly: { type: Number, default: 0 },
    devices: { type: Number, default: 0 },
    accessories: { type: Number, default: 0 }
}, { _id: false });

const addressSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['fiscal', 'soporte', 'cobranza', 'titular'],
        required: true
    },
    cp: { type: Number },
    suburb: { type: String, default: '' },
    street: { type: String, default: '' },
    streetNumber: { type: String, default: '' },
    locality: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'México' },
    comments: { type: String, default: '' }
}, { _id: false });

const logSchema = new mongoose.Schema({
    log: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    userName: { type: String, required: true }
}, { _id: false });

const billingClientSchema = new mongoose.Schema({
    type: { type: String, enum: ['client', 'subClient'], default: 'client' },
    userId: { type: Number, required() { return this.type === 'client'; } },
    billingClientFather: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingClient', required() { return this.type === 'subClient'; }, default: null },
    subBillingClients: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BillingClient' }], required() { return this.type === 'client'; }, default: [] },
    billingName: { type: String, required: true },
    voucherType: { type: String, enum: ['Recibo', 'Factura'], default: 'Recibo' },
    issuer: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', default: null },
    paymentContacts: { type: [paymentContactSchema], default: [] },
    cutoffDay: { type: Number, min: 1, max: 31, default: 1 },
    companyName: { type: String, default: '' },
    RFC: { type: String, default: '' },
    useInvoice: { type: String, default: '' },
    taxRegime: { type: String, default: '' },
    email: { type: String, default: '' },
    discounts: { type: discountSchema, default: () => ({}) },
    blacklist: { type: Boolean, default: false },
    periodicity: { type: String, enum: ['annual', 'monthly'], default: 'monthly' },
    comments: { type: String, default: '' },
    labels: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Label' }], default: [] },
    contractType: { type: String, enum: ['free', 'comodato', 'lease'], default: 'free' },
    addresses: { type: [addressSchema], default: [] },
    changeLog: { type: [logSchema], default: [] },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const BillingClient = mongoose.model('BillingClient', billingClientSchema, 'billingClients');

module.exports = BillingClient;