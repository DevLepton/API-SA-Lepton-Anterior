const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const pedidoSchema = new mongoose.Schema({
  idPedido: { type: Number, unique: true },
  cliente: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cliente', 
    required: true 
  }, // Relación con Cliente
  plan: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Plan',
  }, // Relación con Plan (opcional)
  dispositivos: [
    {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Dispositivo'
    }
  ], // Relación con múltiples dispositivos
  servicios: [
    {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Servicio'
    }
  ], // Relación con múltiples servicios
  vehiculo: { type: String, required: true }, // Información del vehículo
  imei: { type: String, required: true }, // IMEI del dispositivo
  fechaRegistro: { type: Date, default: Date.now }, // Fecha de registro
  fechaInstalacion: { type: Date }, // Fecha de instalación
  estatus: {
    type: String,
    required: true,
    enum: ['pendiente de pago', 'pendiente de instalación', 'pagado'],
    default: 'pendiente de pago',
  }, // Estado del pedido
  precio: { type: Number, required: true }, // Precio base
  descuento: { type: Number, default: 0 }, // Descuento aplicado
  total: { type: Number, required: true }, // Precio total calculado
}, { versionKey: false });

pedidoSchema.plugin(AutoIncrement, { inc_field: 'idPedido' });

module.exports = mongoose.model('Pedido', pedidoSchema, 'pedidos');
