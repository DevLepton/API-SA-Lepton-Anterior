const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

let planSchema = new mongoose.Schema({
    idPlan: {type: Number, unique: true},
    nombrePlan: {type: String, required: true},
    precio: { type: Number, required: true },
    precioConIVA: { type: Number, required: true },      
    duracion: {type: String, required: true},
    noIdentificacion: {type: String, required: true},
    codigoSAT: {type: String, required: true},
    claveUnidad: {type: String, required: true},
    color: {type: String, required: true},
    servicios: {type: Number, required: true},
}, { versionKey: false });

planSchema.plugin(AutoIncrement, {inc_field: 'idPlan'});

module.exports = mongoose.model('Plan', planSchema, 'planes'); 