// controllers/device.controller.js
const Device = require('../models/device.model'); // ajusta la ruta si es distinta
const { logEvent } = require('../utils/events.logger');

// === Config ===
const ALLOWED_TYPES = ['gps', 'accessory', 'sim'];
const STATUS_ENUM = ['En inventario', 'En configuración', 'Instalado']; // los mismos del schema

// === Helpers ===
function toDateOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function validateStatus(status) {
  if (!status) throw new Error('El campo "status" es requerido');
  if (!STATUS_ENUM.includes(status)) {
    throw new Error(`"status" inválido. Valores permitidos: ${STATUS_ENUM.join(', ')}`);
  }
}
function translateDupKeyError(err) {
  if (err && err.code === 11000 && err.keyValue) {
    const field = Object.keys(err.keyValue)[0];
    return `Ya existe un dispositivo con el mismo valor en "${field}": ${err.keyValue[field]}`;
  }
  return null;
}

/**
 * Construye el payload final combinando:
 * - Campos específicos por tipo
 * - Campos comunes de inventario/estado
 * - Convierte fechas a Date
 * - Acepta alias "instalationDate"
 */
function buildPayload(body, isUpdate = false, currentType = null) {
  const {
    type,
    name, brand, model, imei, sn, id, iccid, company,

    // inventario
    status, purchaseDate, entryDate,
    installationDate, instalationDate, // alias
    client, comments,
  } = body;

  // type
  if (!isUpdate) {
    if (!type) throw new Error('El campo "type" es requerido');
    if (!ALLOWED_TYPES.includes(type)) {
      throw new Error(`El campo "type" debe ser uno de: ${ALLOWED_TYPES.join(', ')}`);
    }
  } else if (currentType && body.type && body.type !== currentType) {
    throw new Error('No se permite cambiar el "type" de un dispositivo');
  }
  const t = currentType || type;

  // específicos por tipo
  let specific = {};
  if (t === 'gps') {
    specific = { type: 'gps', name, brand, model, imei, sn };
  } else if (t === 'accessory') {
    specific = { type: 'accessory', name, brand, model, id, sn };
  } else if (t === 'sim') {
    specific = { type: 'sim', iccid, model, company };
  } else {
    throw new Error('Tipo de dispositivo inválido');
  }
  
  // comunes (status + fechas + opcionales)
  if (!isUpdate) validateStatus(status);
  const payload = {
    ...specific,
    status, // validado arriba
    purchaseDate: toDateOrNull(purchaseDate), // requerido en schema (Date)
    entryDate: toDateOrNull(entryDate),       // requerido en schema (Date)

    // alias soportado
    installationDate: toDateOrNull(installationDate ?? instalationDate ?? null),

    // opcionales con default null en schema
    client: (client === undefined ? null : client),
    comments: (comments === undefined ? null : comments),
  };

  return payload;
}

/** Crea un dispositivo */
exports.createDevice = async (req, res) => {
  try {
    const payload = buildPayload(req.body, false, null);
    const device = await Device.create(payload);

    await logEvent({ req, identifier: device.iccid || device.imei, collectionName: 'Dispositivos', operation: 'Creación', document: device });

    return res.status(201).json({ message: 'Dispositivo creado correctamente', data: device });
  } catch (error) {
    const dup = translateDupKeyError(error);
    if (dup) return res.status(400).json({ error: dup });
    return res.status(400).json({ error: error.message || 'Error al crear el dispositivo' });
  }
};

// Lista de dispositivos

exports.getDevices = async (req, res) => {
  try {
    const { type } = req.query;
    const q = {};
    if (type && ['gps','accessory','sim'].includes(type)) q.type = type;

    const items = await Device.find(q);
    return res.status(200).json({ message: 'Dispositivos obtenidos con éxito', data: items });
  } catch (error) {
    return res.status(500).json({ message: 'Error al consultar dispositivos', error: error.message });
  }
};

/** Obtiene un dispositivo por ID */
exports.getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await Device.findById(id);
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });
    return res.status(200).json({ message: 'Dispositivo obtenido con éxito', data: device });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar el dispositivo' });
  }
};

/** Actualiza un dispositivo (no permite cambiar el type) */
exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Device.findById(id);
    if (!existing) return res.status(404).json({ error: 'Dispositivo no encontrado' });

    // permitir updates parciales:
    // - si llega status, validar enum
    if (req.body.status !== undefined) validateStatus(req.body.status);

    // soportar alias instalationDate:
    if (req.body.instalationDate !== undefined && req.body.installationDate === undefined) {
      req.body.installationDate = req.body.instalationDate;
    }

    // construir payload respetando el type actual
    const payload = buildPayload(
      {
        ...existing.toObject(),
        ...req.body
      },
      true,
      existing.type
    );

    const updated = await Device.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true
    });

    await logEvent({ req, identifier: updated.iccid || updated.imei, collectionName: 'Dispositivos', operation: 'Actualización', document: updated });

    return res.status(200).json({ message: 'Dispositivo actualizado correctamente', data: updated });
  } catch (error) {
    const dup = translateDupKeyError(error);
    if (dup) return res.status(400).json({ error: dup });
    return res.status(400).json({ error: error.message || 'Error al actualizar el dispositivo' });
  }
};

/** Elimina un dispositivo */
exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Device.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Dispositivo no encontrado' });

    await logEvent({ req, identifier: deleted.iccid || deleted.imei, collectionName: 'Dispositivos', operation: 'Eliminación', document: deleted });

    return res.status(200).json({ message: 'Dispositivo eliminado correctamente', deviceId: deleted._id });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar el dispositivo' });
  }
};
