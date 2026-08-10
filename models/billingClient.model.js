const mongoose = require('mongoose');

const paymentContactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, default: '' },
    cel: { type: String, default: '' },
    notes: { type: String, default: '' }
}, { _id: false });

const discountSchema = new mongoose.Schema({
    monthly: { type: Number, default: 0 },
    devices: { type: Number, default: 0 },
    accessories: { type: Number, default: 0 }
}, { _id: false });

const billingClientSchema = new mongoose.Schema({
    type: { type: String, enum: ['client', 'subClient'], default: 'client' },
    userId: { type: Number, required() { return this.type === 'client'; } },
    billingClientFather: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingClient', required() { return this.type === 'subClient'; }, default: null },
    subBillingClients: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BillingClient' }], required() { return this.type === 'client'; }, default: [] },
    billingName: { type: String, required: true },
    paymentContacts: { type: [paymentContactSchema], default: [] },
    voucherType: { type: String, enum: ['Recibo', 'Factura'], default: 'Recibo' },
    cutoffDay: { type: Number, min: 1, max: 31, default: 1 },
    companyName: { type: String, default: '' },
    RFC: { type: String, default: '' },
    useInvoice: { type: String, default: '' },
    taxRegime: { type: String, default: '' },
    email: { type: String, default: '' },
    cp: { type: Number },
    street: { type: String, default: '' },
    streetNumber: { type: String, default: '' },
    suburb: { type: String, default: '' },
    locality: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'México' },
    discounts: { type: discountSchema, default: () => ({}) },
    blacklist: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const BillingClient = mongoose.model('BillingClient', billingClientSchema, 'billingClients');

module.exports = BillingClient;
