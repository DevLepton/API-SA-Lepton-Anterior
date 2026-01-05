const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

let servicioSchema = new mongoose.Schema({
    idServ: { type: Number, unique: true },
    descripcion: { type: String, required: true }, // Descripción del servicio
    precio: { type: Number, required: true },
    precioConIVA: { type: Number, required: true },      // Precio del servicio
    codigo: { type: String, required: true },      // Código único del servicio
}, { versionKey: false });

servicioSchema.plugin(AutoIncrement, { inc_field: 'idServ' });

module.exports = mongoose.model('Servicio', servicioSchema, 'servicios');
