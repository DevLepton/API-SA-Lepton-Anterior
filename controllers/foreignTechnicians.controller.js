const ForeignTechnician = require('../models/foreignTechnicians.model');
const { logEvent } = require('../utils/events.logger');

const TYPE_ENUM = ForeignTechnician.schema.path('type').enumValues;

function normalizeType(type) {
  if (type === null || type === undefined || type === '') return type;

  const raw = String(type).trim();
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized === 'local') return 'Local';
  if (normalized === 'foraneo' || raw.toLowerCase().startsWith('for')) {
    return TYPE_ENUM.find((value) => value !== 'Local') || raw;
  }

  return raw;
}

function validateType(type) {
  if (!type) throw new Error('El campo "type" es requerido');
  if (!TYPE_ENUM.includes(type)) {
    throw new Error(`"type" invalido. Valores permitidos: ${TYPE_ENUM.join(', ')}`);
  }
}

function toNumberOrDefault(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') return defaultValue;

  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error('Valor numerico invalido');

  return n;
}

function toBoolean(value, defaultValue = false) {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;

  return Boolean(value);
}

function translateDupKeyError(err) {
  if (err && err.code === 11000 && err.keyValue) {
    const field = Object.keys(err.keyValue)[0];
    return `Ya existe un tecnico foraneo con el mismo valor en "${field}": ${err.keyValue[field]}`;
  }
  return null;
}

function buildPayload(body, isUpdate = false) {
  const {
    type,
    name,
    cel,
    bill,
    city,
    ownLocal,
    address,
    installationPrice,
    inspectionFee,
    withdrawalPrice,
    priceFalseReversal,
    travelExpensesPrice,
    transferPrice,
    comments
  } = body;

  const finalType = normalizeType(type);

  if (!isUpdate || finalType !== undefined) validateType(finalType);
  if (!isUpdate && !name) throw new Error('El campo "name" es requerido');
  if (!isUpdate && !cel) throw new Error('El campo "cel" es requerido');

  return {
    type: finalType,
    name: String(name ?? '').trim(),
    cel: String(cel ?? '').trim(),
    bill: toBoolean(bill),
    city: String(city ?? '').trim(),
    ownLocal: toBoolean(ownLocal),
    address: String(address ?? '').trim(),
    installationPrice: toNumberOrDefault(installationPrice),
    inspectionFee: toNumberOrDefault(inspectionFee),
    withdrawalPrice: toNumberOrDefault(withdrawalPrice),
    priceFalseReversal: toNumberOrDefault(priceFalseReversal),
    travelExpensesPrice: toNumberOrDefault(travelExpensesPrice),
    transferPrice: toNumberOrDefault(transferPrice),
    comments: String(comments ?? '').trim() || null
  };
}

exports.createForeignTechnician = async (req, res) => {
  try {
    const payload = buildPayload(req.body, false);
    const technician = await ForeignTechnician.create(payload);

    await logEvent({
      req,
      identifier: technician.name,
      collectionName: 'Tecnicos foraneos',
      operation: 'Creación',
      document: technician
    });

    return res.status(201).json({
      message: 'Tecnico foraneo creado correctamente',
      data: technician
    });
  } catch (error) {
    const dup = translateDupKeyError(error);
    if (dup) return res.status(400).json({ error: dup });
    return res.status(400).json({ error: error.message || 'Error al crear el tecnico foraneo' });
  }
};

exports.getForeignTechnicians = async (req, res) => {
  try {
    const { type, city, q } = req.query;
    const filters = {};

    if (type) filters.type = normalizeType(type);
    if (city) filters.city = new RegExp(String(city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    if (q) {
      const safe = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(safe, 'i');
      filters.$or = [{ name: rx }, { cel: rx }, { city: rx }, { address: rx }];
    }

    const items = await ForeignTechnician.find(filters);

    return res.status(200).json({
      message: 'Tecnicos foraneos obtenidos con exito',
      filters,
      total: items.length,
      data: items
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al consultar tecnicos foraneos',
      error: error.message
    });
  }
};

exports.getForeignTechnicianById = async (req, res) => {
  try {
    const technician = await ForeignTechnician.findById(req.params.id);
    if (!technician) return res.status(404).json({ error: 'Tecnico foraneo no encontrado' });

    return res.status(200).json({
      message: 'Tecnico foraneo obtenido con exito',
      data: technician
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar el tecnico foraneo' });
  }
};

exports.updateForeignTechnician = async (req, res) => {
  try {
    const existing = await ForeignTechnician.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tecnico foraneo no encontrado' });

    const payload = buildPayload({ ...existing.toObject(), ...req.body }, true);
    const updated = await ForeignTechnician.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    await logEvent({
      req,
      identifier: updated.name,
      collectionName: 'Tecnicos foraneos',
      operation: 'Actualización',
      document: updated
    });

    return res.status(200).json({
      message: 'Tecnico foraneo actualizado correctamente',
      data: updated
    });
  } catch (error) {
    const dup = translateDupKeyError(error);
    if (dup) return res.status(400).json({ error: dup });
    return res.status(400).json({ error: error.message || 'Error al actualizar el tecnico foraneo' });
  }
};

exports.deleteForeignTechnician = async (req, res) => {
  try {
    const deleted = await ForeignTechnician.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Tecnico foraneo no encontrado' });

    await logEvent({
      req,
      identifier: deleted.name,
      collectionName: 'Tecnicos foraneos',
      operation: 'Eliminación',
      document: deleted
    });

    return res.status(200).json({
      message: 'Tecnico foraneo eliminado correctamente',
      foreignTechnicianId: deleted._id
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar el tecnico foraneo' });
  }
};
