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

  netPrice: { type: mongoose.Schema.Types.Decimal128, default: null },
  grossPrice: { type: mongoose.Schema.Types.Decimal128, default: null },
  satCode: { type: String, default: null },

  status: { type: String, enum: ['En inventario', 'En configuración', 'Instalado', 'Listo para usar'], required: true, trim: true },
  purchaseDate: { type: Date, required: function () { return this.type === 'sim'; }, default: null },
  entryDate: { type: Date, required: true },

  installationDate: { type: Date, default: null, alias: 'instalationDate' },
  client: { type: String, trim: true, default: null },
  comments: { type: String, trim: true, default: null },
}, { versionKey: false });

const transformDecimals = (doc, ret) => {
  if (ret.netPrice instanceof mongoose.Types.Decimal128) {
    ret.netPrice = ret.netPrice.toString();
  }
  if (ret.grossPrice instanceof mongoose.Types.Decimal128) {
    ret.grossPrice = ret.grossPrice.toString();
  }
  return ret;
};

deviceSchema.set('toJSON', { transform: transformDecimals });
deviceSchema.set('toObject', { transform: transformDecimals });

const Device = mongoose.model('Device', deviceSchema, 'devices');

module.exports = Device;