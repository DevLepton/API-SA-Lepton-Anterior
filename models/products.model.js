const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    log: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    userName: { type: String, required: true }
}, { _id: false });

const productSchema = new mongoose.Schema({
    type: { type: String, required: true, enum: ['GPS', 'Accesorio', 'Servicio', 'Plan'] },
    name: { type: String, required: true },
    concept: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    priceIVA: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    linkedProdModel: { type: String, default: null },
    linkedProdType: { type: String, default: null },
    comments: { type: String, default: '' },
    changeLog: { type: [logSchema], default: [] },
    duration: {
        type: String,
        enum: ['1 mes', '3 meses', '6 meses', '1 año'],
        required: function () {
            return this.type === 'Plan';
        },
        default: undefined
    },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const Product = mongoose.model('Product', productSchema, 'products');

module.exports = Product;