const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    concept: { type: String, required: true },
    description: { type: String, default: null },
    type: { type: String, default: null },
    price: { type: Number, required: true },
    priceIVA: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['%', '$'], default: '%' },
    amount: { type: Number, required: true },
    total: { type: Number, required: true }
}, { _id: false });

const quoteSchema = new mongoose.Schema({
    quoteNum: { type: String, required: true, unique: true, trim: true },
    userName: { type: String, required: true, trim: true },

    clientName: { type: String, required: true, trim: true },
    companyName: { type: String, default: null, trim: true },
    place: { type: String, default: null, trim: true },

    validity: { type: Date, required: true },

    products: {
        type: [productSchema],
        validate: {
            validator: value => Array.isArray(value) && value.length > 0,
            message: 'La cotización debe contener al menos un producto'
        }
    },

    subtotal: { type: Number, required: true },
    discounts: { type: Number, default: 0 },
    IVA: { type: Number, required: true },
    total: { type: Number, required: true },

    units: { type: Number, default: null },
    model: { type: String, default: null },

    paymentNextMonthly: { type: Number, default: null },

    billable: { type: Boolean, default: false },
    bankName: { type: String, default: null, trim: true },
    rfc: { type: String, default: null, trim: true },
    paymentMethodHolder: { type: String, default: null, trim: true },
    accountNumber: { type: String, default: null, trim: true },
    CLABE: { type: String, default: null, trim: true },

    comments: { type: String, default: null },

    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const Quote = mongoose.model('Quote', quoteSchema, 'quotes');

module.exports = Quote;