const mongoose = require('mongoose');

const labelSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  color: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const Label = mongoose.model('Label', labelSchema, 'labels');

module.exports = Label;