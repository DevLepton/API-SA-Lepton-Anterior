const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

let dispositivoSchema = new mongoose.Schema({
    idDis: { type: Number, unique: true },
    codigoDis: { type: String, required: true }, // Código único del dispositivo
    nombre: { type: String, required: true }, // Nombre descriptivo del dispositivo
    precio: { type: Number, required: true }, // Precio del dispositivo
    precioConIVA: { type: Number, required: true },
    tipoDis: { type: String, required: true }, // Tipo de dispositivo (GPS, accesorio, etc.)
    marca: { type: String, required: true }, // Marca del dispositivo
    modelo: { type: String, required: true }, // Modelo del dispositivo
    tipoImp: { type: String, required: true },
    codigoSat: { type: String, required: true },
    unidad: { type: String, required: true },
    claveUnidad: { type: String, required: true },
}, { versionKey: false });

dispositivoSchema.plugin(AutoIncrement, { inc_field: 'idDis' });

module.exports = mongoose.model('Dispositivo', dispositivoSchema, 'dispositivos');
