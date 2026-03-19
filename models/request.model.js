const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['Pendiente', 'Rechazada', 'Atendida', 'Aceptada'],
    required: true,
    trim: true,
    default: 'Pendiente',
  },

  requestDate: { type: Date, required: true, default: Date.now, alias: 'fechaSolicitud' },
  responseDate: { type: Date, default: null, alias: 'fechaRespuesta' },

  devicesRequested: {
    type: [
      {
        _id: false,

        model: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 1 },

        response: {
          type: [
            {
              _id: false,
              id: { type: String, required: true },
              model: { type: String, required: true },
              identifier: { type: String, required: true }
            }
          ],
          default: [], // vacío por defecto
        }
      }
    ],
    required: true,
    validate: {
      validator: function (arr) {
        return Array.isArray(arr) && arr.length > 0;
      },
      message: 'El campo "devicesRequested" debe contener al menos 1 elemento',
    },
    alias: 'dispositivosSolicitados'
  },

  quantity: { type: Number, required: true, min: 1, alias: 'cantidad' },

  comments: { type: String, trim: true, default: null, alias: 'comentarios' },

}, { versionKey: false });

const Request = mongoose.model('Request', requestSchema, 'requests');
module.exports = Request;
