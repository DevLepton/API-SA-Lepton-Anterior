const Request = require('../models/request.model'); // ajusta la ruta si es distinta
const { logEvent } = require('../utils/events.logger');

// === Config ===
const STATUS_ENUM = ['Pendiente', 'Rechazada', 'Atendida', 'Aceptada']; // los mismos del schema
// Si tu "resultado" tiene reglas/enum, puedes agregarlo. Aquí lo dejamos libre.

const Device = require('../models/device.model');

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
    return `Ya existe una petición con el mismo valor en "${field}": ${err.keyValue[field]}`;
  }
  return null;
}

function normalizeDevicesRequested(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error('El campo "devicesRequested" es requerido y debe tener al menos 1 elemento');
  }

  const map = new Map();

  for (const item of arr) {
    const model = String(item?.model ?? '').trim();
    const qty = Number(item?.quantity ?? 0);
    const response = Array.isArray(item?.response) ? item.response : [];

    if (!model) throw new Error('Cada elemento en "devicesRequested" debe incluir "model"');
    if (!Number.isFinite(qty) || qty < 1) throw new Error(`Cantidad inválida para "${model}"`);

    const prev = map.get(model);

    if (prev) {
      prev.quantity += qty;
      prev.response.push(...response);
    } else {
      map.set(model, {
        model,
        quantity: qty,
        response
      });
    }
  }

  const normalized = Array.from(map.values());

  const total = normalized.reduce((sum, x) => sum + x.quantity, 0);

  if (total < 1) throw new Error('La cantidad total debe ser mayor a 0');
  if (total > 50) throw new Error('La cantidad total solicitada no puede exceder 50 dispositivos');

  return { normalized, total };
}

/**
 * Payload de Petición:
 * - status (enum)
 * - requestDate (fechaSolicitud)
 * - responseDate (fechaRespuesta)
 * - deviceRequested (dispositivoSolicitado)
 * - quantity (cantidad)
 * - result (resultado)
 *
 * Soporta aliases por compatibilidad con tu front:
 * - fechaSolicitud / requestDate
 * - fechaRespuesta / responseDate
 * - dispositivoSolicitado / deviceRequested
 * - cantidad / quantity
 * - resultado / result
 */
function buildPayload(body, isUpdate = false) {
  const {
    status, estatus,
    requestDate, fechaSolicitud,
    responseDate, fechaRespuesta,

    // ✅ nuevo
    devicesRequested, dispositivosSolicitados,

    comments, comentarios,
  } = body;

  const finalStatus = status ?? estatus ?? (isUpdate ? undefined : 'Pendiente');

  if (!isUpdate) validateStatus(finalStatus);
  if (isUpdate && finalStatus !== undefined) validateStatus(finalStatus);

  const rawDevices = devicesRequested ?? dispositivosSolicitados;

  let normalized;
  let total;

  if (!isUpdate) {
    const result = normalizeDevicesRequested(rawDevices);

    normalized = result.normalized;
    total = result.total;
  } else {
    if (Array.isArray(rawDevices)) {
      normalized = rawDevices;
      total = rawDevices.reduce(
        (sum, x) => sum + Number(x.quantity || 0),
        0
      );
    } else {
      normalized = body.devicesRequested;
      total = body.quantity;
    }
  }

  return {
    status: finalStatus ?? 'Pendiente',
    requestDate: toDateOrNull(requestDate ?? fechaSolicitud ?? new Date()),
    responseDate: toDateOrNull(responseDate ?? fechaRespuesta ?? null),

    devicesRequested: normalized,
    quantity: total,

    comments: (comments ?? comentarios ?? null),
  };
}

/** Crea una petición */
exports.createRequest = async (req, res) => {
  try {
    const payload = buildPayload(req.body, false);
    const request = await Request.create(payload);

    await logEvent({
      req,
      identifier: request._id,
      collectionName: 'Peticiones',
      operation: 'Creación',
      document: request
    });

    return res.status(201).json({ message: 'Petición creada correctamente', data: request });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Error al crear la petición' });
  }
};

/** Lista de peticiones (opcional: filtrar por status) */
exports.getRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const q = {};
    if (status && STATUS_ENUM.includes(status)) q.status = status;

    const items = await Request.find(q);
    return res.status(200).json({ message: 'Peticiones obtenidas con éxito', data: items });
  } catch (error) {
    return res.status(500).json({ message: 'Error al consultar peticiones', error: error.message });
  }
};

/** Obtiene una petición por ID */
exports.getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id);
    if (!request) return res.status(404).json({ error: 'Petición no encontrada' });
    return res.status(200).json({ message: 'Petición obtenida con éxito', data: request });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar la petición' });
  }
};

function getDeviceIds(devicesRequested) {
  const ids = [];

  devicesRequested.forEach(d => {
    if (Array.isArray(d.response)) {
      d.response.forEach(r => {
        if (r.id) ids.push(r.id);
      });
    }
  });

  return ids;
}

/** Actualiza una petición */
exports.updateRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Obtener petición actual
    const existing = await Request.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Petición no encontrada' });
    }

    // 2. Obtener IDs actuales
    const oldIds = getDeviceIds(existing.devicesRequested);

    // 3. Construir nuevo payload
    const payload = buildPayload(
      { ...existing.toObject(), ...req.body },
      true
    );

    // 4. Obtener nuevos IDs
    const newIds = getDeviceIds(payload.devicesRequested);

    // 5. Detectar cambios
    const idsAsignados = newIds.filter(id => !oldIds.includes(id));
    const idsDevueltos = oldIds.filter(id => !newIds.includes(id));

    // 6. ACTUALIZAR DISPOSITIVOS

    // nuevos asignados → En configuración
    if (idsAsignados.length > 0) {
      await Device.updateMany(
        {
          _id: { $in: idsAsignados },
          status: 'En inventario' // protección
        },
        {
          $set: { status: 'En configuración' }
        }
      );
    }

    // devueltos → En inventario
    if (idsDevueltos.length > 0) {
      await Device.updateMany(
        {
          _id: { $in: idsDevueltos },
          status: 'En configuración' // protección
        },
        {
          $set: { status: 'En inventario' }
        }
      );
    }

    // 7. ACTUALIZAR PETICIÓN
    const updated = await Request.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true
    });

    // 8. LOG
    await logEvent({
      req,
      identifier: updated._id,
      collectionName: 'Peticiones',
      operation: 'Actualización',
      document: updated
    });

    
    // 9. RESPUESTA
    
    return res.status(200).json({
      message: 'Petición actualizada correctamente',
      data: updated
    });

  } catch (error) {
    console.error(error);

    return res.status(400).json({
      error: error.message || 'Error al actualizar la petición'
    });
  }
};

/** Elimina una petición */
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Request.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Petición no encontrada' });

    await logEvent({
      req,
      identifier: deleted._id,
      collectionName: 'Peticiones',
      operation: 'Eliminación',
      document: deleted
    });

    return res.status(200).json({ message: 'Petición eliminada correctamente', requestId: deleted._id });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar la petición' });
  }
};