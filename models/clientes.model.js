const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

let clienteSchema = new mongoose.Schema(
  {
    idCliente: { type: Number, unique: true },
    nombreEmpresa: { type: String }, // Tipo de cliente
    nombre: { type: String, required: true }, // Nombre del cliente
    aPaterno: { type: String, required: true }, // Apellido paterno del cliente
    aMaterno: { type: String }, // Apellido materno del cliente
    domicilio: {
      codigoPostal: { type: String, required: true }, // Código postal
      colonia: { type: String, required: true }, // Colonia
      estado: { type: String, required: true }, // Estado
      municipio: { type: String, required: true }, // Municipio
      calle: { type: String, required: true }, // Calle
      numeroExterior: { type: String, required: true }, // Número exterior
      numeroInterior: { type: String }, // Número interior (opcional)
    },
    contacto: {
      correo: { type: String, required: true, unique: true }, 
      telefono: { type: String, required: true }, // Teléfono del cliente
    },
    datosComerciales: {
      comprobante: { type: String, required: true }, // Tipo de comprobante
      emisorComprobante: { type: String, required: true }, // Emisor del comprobante
      diaCorte: { type: Number, required: true }, // Día del corte
      fechaCorte: { type: Date, required: true }, // Fecha del corte
      fechaPago: { type: Date, required: true }, // Fecha del pago
      // Nuevos campos
      correoFactura: { type: String, required: function() { return this.datosComerciales.comprobante === 'factura'; } }, // Correo de la factura (obligatorio si comprobante es factura)
      rfcFactura: { type: String, required: function() { return this.datosComerciales.comprobante === 'factura'; } }, // RFC de la factura (obligatorio si comprobante es factura)
      regimenFiscal: { type: String, required: function() { return this.datosComerciales.comprobante === 'factura'; } }, // Régimen fiscal (obligatorio si comprobante es factura)
      razonSocial: { type: String, required: function() { return this.datosComerciales.comprobante === 'factura'; } }, // Razón social (obligatorio si comprobante es factura)
      banco: { type: String }, // Nombre del banco (opcional)
      cuentaBancaria: { type: String }, // Cuenta bancaria (opcional)
      domicilioFiscal: { type: String }, // Domicilio fiscal (opcional)
    },
    estatus: { type: String, required: true, enum: ['activo', 'inactivo', 'pendiente'] }, // Estado del cliente
  },
  {
    timestamps: true, // Agrega automáticamente campos de createdAt y updatedAt
    versionKey: false
  }
);

clienteSchema.plugin(AutoIncrement, { inc_field: 'idCliente' });

module.exports = mongoose.model('Cliente', clienteSchema, 'clientes');
