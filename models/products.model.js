const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    type: { type: String, required: true, enum: ['GPS', 'Accesorio', 'Servicio', 'Plan'] },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    priceIVA: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    comments: { type: String },
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