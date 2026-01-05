const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  type: { type: String, enum: ['gps', 'accessory', 'sim'], required: true },

  // GPS
  name: { type: String, required: function () { return this.type === 'gps' || this.type === 'accessory'; } },
  brand: { type: String, required: function () { return this.type === 'gps' || this.type === 'accessory'; } },
  model: { type: String, required: true },
  imei: { type: String, required: function () { return this.type === 'gps'; }, unique: true },
  sn: { type: String, required: function () { return this.type !== 'sim'; }, unique: true },

  // Accesorio
  id: { type: String, required: function () { return this.type === 'accessory'; }, unique: true },

  // SIM
  iccid: { type: String, required: function () { return this.type === 'sim'; }, unique: true },
  company: { type: String, required: function () { return this.type === 'sim'; } },

  status: { type: String, enum: ['En inventario', 'En configuración', 'Instalado'], required: true, trim: true },
  purchaseDate: { type: Date, required: true },
  entryDate: { type: Date, required: true },

  installationDate: { type: Date, default: null, alias: 'instalationDate' },
  client: { type: String, trim: true, default: null },
  comments: { type: String, trim: true, default: null },
}, { versionKey: false });


const Device = mongoose.model('Device', deviceSchema, 'devices');

module.exports = Device;