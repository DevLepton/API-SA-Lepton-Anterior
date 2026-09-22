const mongoose = require('mongoose');
const BillingClient = require('../models/billingClient.model');
const Label = require('../models/labels.model');
const { logEvent } = require('../utils/events.logger');
const BankAccount = require('../models/bankAccounts.model');

const TYPES = ['client', 'subClient'];
const VOUCHER_TYPES = ['Recibo', 'Factura'];
const PERIODICITY_ENUM = ['annual', 'monthly'];
const CONTRACT_TYPE_ENUM = ['free', 'comodato', 'lease'];
const ADDRESS_TYPE_ENUM = ['fiscal', 'soporte', 'cobranza', 'titular'];

function toNumber(value, field, options = {}) {
  const { required = false, defaultValue = undefined, min, max } = options;

  if (value === null || value === undefined || value === '') {
    if (required) throw new Error(`El campo "${field}" es requerido`);
    return defaultValue;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`El campo "${field}" debe ser numerico`);
  if (min !== undefined && n < min) throw new Error(`El campo "${field}" debe ser mayor o igual a ${min}`);
  if (max !== undefined && n > max) throw new Error(`El campo "${field}" debe ser menor o igual a ${max}`);

  return n;
}

function toBoolean(value, defaultValue = false) {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;

  return Boolean(value);
}

function normalizePaymentContacts(contacts) {
  if (!Array.isArray(contacts)) return [];

  return contacts.map((contact) => {
    const name = String(contact?.name ?? '').trim();
    if (!name) throw new Error('Cada contacto de pago debe incluir "name"');

    return {
      name,
      email: String(contact?.email ?? '').trim(),
      cel: String(contact?.cel ?? '').trim(),
      notes: String(contact?.notes ?? '').trim(),
      type: String(contact?.type ?? '').trim()
    };
  });
}

function normalizeDiscounts(discounts = {}) {
  return {
    monthly: toNumber(discounts.monthly, 'discounts.monthly', { defaultValue: 0 }),
    devices: toNumber(discounts.devices, 'discounts.devices', { defaultValue: 0 }),
    accessories: toNumber(discounts.accessories, 'discounts.accessories', { defaultValue: 0 })
  };
}

function translateDupKeyError(err) {
  if (err && err.code === 11000 && err.keyValue) {
    const field = Object.keys(err.keyValue)[0];
    return `Ya existe un subcliente con el mismo valor en "${field}": ${err.keyValue[field]}`;
  }
  return null;
}

async function normalizeLabels(labels) {
  if (labels === null || labels === undefined || labels === '') return [];

  if (!Array.isArray(labels)) {
    throw new Error('El campo "labels" debe ser un arreglo');
  }

  const invalidIds = labels.filter(id => !mongoose.Types.ObjectId.isValid(id));

  if (invalidIds.length) {
    throw new Error('Uno o más IDs de etiqueta no son válidos');
  }

  const uniqueIds = [...new Set(labels.map(id => String(id)))];

  const existingLabels = await Label.find({ _id: { $in: uniqueIds } }).select('_id');

  const existingIds = new Set(existingLabels.map(label => label._id.toString()));

  const missingIds = uniqueIds.filter(id => !existingIds.has(id));

  if (missingIds.length) {
    throw new Error(`Una o más etiquetas no existen: ${missingIds.join(', ')}`);
  }

  return uniqueIds;
}

function normalizeAddresses(addresses) {
  if (addresses === null || addresses === undefined || addresses === '') {
    return [];
  }

  if (!Array.isArray(addresses)) {
    throw new Error('El campo "addresses" debe ser un arreglo');
  }

  return addresses.map((address) => {
    if (!address?.type) {
      throw new Error('Cada domicilio debe incluir "type"');
    }

    if (!ADDRESS_TYPE_ENUM.includes(address.type)) {
      throw new Error(`"type" de domicilio inválido. Valores permitidos: ${ADDRESS_TYPE_ENUM.join(', ')}`);
    }

    return {
      type: address.type,
      cp: toNumber(address.cp, 'addresses.cp'),
      suburb: String(address.suburb ?? '').trim(),
      street: String(address.street ?? '').trim(),
      streetNumber: String(address.streetNumber ?? '').trim(),
      locality: String(address.locality ?? '').trim(),
      state: String(address.state ?? '').trim(),
      country: String(address.country ?? 'México').trim(),
      comments: String(address.comments ?? '').trim()
    };
  });
}

async function buildPayload(body, isUpdate = false) {
  const {
    type,
    userId,
    billingClientFather,
    subBillingClients,
    billingName,
    paymentContacts,
    voucherType,
    issuer,
    cutoffDay,
    companyName,
    RFC,
    useInvoice,
    taxRegime,
    email,
    discounts,
    blacklist,
    periodicity,
    comments,
    labels,
    contractType,
    addresses,
    createdAt
  } = body;

  const normalizedType = type || 'client';

  if (!TYPES.includes(normalizedType)) {
    throw new Error(`"type" inválido. Valores permitidos: ${TYPES.join(', ')}`);
  }

  if (normalizedType === 'client' && (userId === undefined || userId === null || userId === '')) {
    throw new Error('El campo "userId" es requerido para clientes');
  }

  if (normalizedType === 'subClient' && !billingClientFather) {
    throw new Error('El campo "billingClientFather" es requerido para subclientes');
  }

  if (!isUpdate && !billingName) {
    throw new Error('El campo "billingName" es requerido');
  }

  if (voucherType && !VOUCHER_TYPES.includes(voucherType)) {
    throw new Error(`"voucherType" invalido. Valores permitidos: ${VOUCHER_TYPES.join(', ')}`);
  }

  if (periodicity !== undefined && periodicity !== null && periodicity !== '' && !PERIODICITY_ENUM.includes(periodicity)) {
    throw new Error(`"periodicity" inválida. Valores permitidos: ${PERIODICITY_ENUM.join(', ')}`);
  }

  if (contractType !== undefined && contractType !== null && contractType !== '' && !CONTRACT_TYPE_ENUM.includes(contractType)) {
    throw new Error(`"contractType" inválido. Valores permitidos: ${CONTRACT_TYPE_ENUM.join(', ')}`);
  }

  if (issuer) {
    if (!mongoose.Types.ObjectId.isValid(issuer)) throw new Error('El ID de la cuenta bancaria no es válido');

    const bankAccount = await BankAccount.findById(issuer).select('_id');

    if (!bankAccount) throw new Error('La cuenta bancaria seleccionada no existe');
  }

  return {
    type: normalizedType,
    userId: normalizedType === 'client' ? toNumber(userId, 'userId', { required: true }) : null,
    billingClientFather: normalizedType === 'subClient' ? String(billingClientFather) : null,
    subBillingClients: normalizedType === 'client' ? Array.isArray(subBillingClients) ? subBillingClients : [] : [],
    billingName: String(billingName ?? '').trim(),
    paymentContacts: normalizePaymentContacts(paymentContacts),
    voucherType: voucherType || 'Recibo',
    issuer: issuer || null,
    cutoffDay: toNumber(cutoffDay, 'cutoffDay', { defaultValue: 1, min: 1, max: 31 }),
    companyName: String(companyName ?? '').trim(),
    RFC: String(RFC ?? '').trim(),
    useInvoice: String(useInvoice ?? '').trim(),
    taxRegime: String(taxRegime ?? '').trim(),
    email: String(email ?? '').trim(),
    discounts: normalizeDiscounts(discounts),
    blacklist: toBoolean(blacklist, false),
    periodicity: periodicity || 'monthly',
    comments: String(comments ?? '').trim(),
    labels: await normalizeLabels(labels),
    contractType: contractType || 'free',
    addresses: normalizeAddresses(addresses),
    createdAt: createdAt ? new Date(createdAt) : undefined
  };
}

exports.createBillingClient = async (req, res) => {
  try {
    const payload = await buildPayload(req.body, false);
    const billingClient = await BillingClient.create(payload);

    if (billingClient.type === 'subClient' && billingClient.billingClientFather
    ) {
      await BillingClient.findByIdAndUpdate(
        billingClient.billingClientFather,
        {
          $addToSet: {
            subBillingClients: billingClient._id
          }
        }
      );
    }

    await logEvent({
      req,
      identifier: billingClient.billingName,
      collectionName: 'Clientes de cobranza',
      operation: 'Creación',
      document: billingClient
    });

    return res.status(201).json({
      message: 'Cliente de facturación creado correctamente',
      data: billingClient
    });
  } catch (error) {
    const dup = translateDupKeyError(error);
    if (dup) return res.status(400).json({ error: dup });
    return res.status(400).json({ error: error.message || 'Error al crear el cliente de cobranza' });
  }
};

exports.getBillingClients = async (req, res) => {
  try {
    const { userId, voucherType, type, q } = req.query;
    const filters = {};

    if (userId !== undefined && userId !== null && userId !== '' && userId !== 'null') {
      filters.userId = toNumber(userId, 'userId');
    }
    if (voucherType && VOUCHER_TYPES.includes(voucherType)) filters.voucherType = voucherType;
    if (type && TYPES.includes(type)) filters.type = type;

    if (q) {
      const safe = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(safe, 'i');
      filters.$or = [
        { billingName: rx },
        { companyName: rx },
        { RFC: rx },
        { email: rx },
        { 'paymentContacts.name': rx },
        { 'paymentContacts.email': rx }
      ];
    }

    const items = await BillingClient.find(filters);

    return res.status(200).json({
      message: 'Clientes de facturación obtenidos con éxito',
      filters,
      total: items.length,
      data: items
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al consultar clientes de facturación',
      error: error.message
    });
  }
};

exports.getBillingClientById = async (req, res) => {
  try {
    const billingClient = await BillingClient.findById(req.params.id);
    if (!billingClient) return res.status(404).json({ error: 'Cliente de facturación no encontrado' });

    return res.status(200).json({
      message: 'Cliente de facturación obtenido con éxito',
      data: billingClient
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar el cliente de cobranza' });
  }
};

exports.updateBillingClient = async (req, res) => {
  try {
    const existing = await BillingClient.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Cliente de facturación no encontrado' });
    }

    const payload = await buildPayload({ ...existing.toObject(), ...req.body }, true);

    if (!payload.createdAt) {
      delete payload.createdAt;
    }

    const oldType = existing.type;
    const newType = payload.type;

    const oldFather = existing.billingClientFather?.toString() || null;
    const newFather = payload.billingClientFather?.toString() || null;

    // CHANGE LOG
    const changeLog = String(req.body.changeLog ?? '').trim();

    if (changeLog) {
      payload.changeLog = [
        ...(existing.changeLog || []),
        {
          log: changeLog,
          date: new Date(),
          userName: String(
            req.userName ?? ''
          ).trim()
        }
      ];
    } else {
      payload.changeLog =
        existing.changeLog || [];
    }

    const updated = await BillingClient.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });

    // Antes era subcliente y ya no lo es
    if (oldType === 'subClient' && newType !== 'subClient' && oldFather) {
      await BillingClient.findByIdAndUpdate(
        oldFather,
        {
          $pull: {
            subBillingClients: updated._id
          }
        }
      );
    }

    // Sigue siendo subcliente pero cambió de padre
    else if (oldType === 'subClient' && newType === 'subClient' && oldFather !== newFather) {
      if (oldFather) {
        await BillingClient.findByIdAndUpdate(
          oldFather,
          {
            $pull: {
              subBillingClients: updated._id
            }
          }
        );
      }

      if (newFather) {
        await BillingClient.findByIdAndUpdate(
          newFather,
          {
            $addToSet: {
              subBillingClients: updated._id
            }
          }
        );
      }
    }

    // Antes no era subcliente y ahora sí
    else if (oldType !== 'subClient' && newType === 'subClient' && newFather) {
      await BillingClient.findByIdAndUpdate(
        newFather,
        {
          $addToSet: {
            subBillingClients: updated._id
          }
        }
      );
    }

    await logEvent({
      req,
      identifier: updated.billingName,
      collectionName: 'Clientes de cobranza',
      operation: 'Actualización',
      document: updated
    });

    return res.status(200).json({ message: 'Cliente de facturación actualizado correctamente', data: updated });

  } catch (error) {
    const dup = translateDupKeyError(error);

    if (dup) {
      return res.status(400).json({ error: dup });
    }

    return res.status(400).json({ error: error.message || 'Error al actualizar el cliente de cobranza' });
  }
};

exports.deleteBillingClient = async (req, res) => {
  try {
    const { newParentId, deleteChildren } = req.body;

    const billingClient = await BillingClient.findById(req.params.id);

    if (!billingClient) {
      return res.status(404).json({ error: 'Cliente de cobranza no encontrado' });
    }

    if (billingClient.type === 'client' && billingClient.subBillingClients.length) {

      if (deleteChildren) {
        await BillingClient.deleteMany({
          _id: { $in: billingClient.subBillingClients }
        });
      } else {

        if (!newParentId) {
          return res.status(400).json({
            requiresNewParent: true,
            error: 'Debe seleccionar un nuevo cliente.'
          });
        }

        const childrenIds = billingClient.subBillingClients.map(id => id.toString());

        if (!childrenIds.includes(newParentId)) {
          return res.status(400).json({
            error: 'El nuevo cliente debe ser uno de los subclientes asociados.'
          });
        }

        const remainingChildren = childrenIds.filter(id => id !== newParentId);

        await BillingClient.findByIdAndUpdate(newParentId, {
          type: 'client',
          userId: billingClient.userId,
          billingClientFather: null,
          subBillingClients: remainingChildren
        });

        if (remainingChildren.length) {
          await BillingClient.updateMany(
            { _id: { $in: remainingChildren } },
            { billingClientFather: newParentId }
          );
        }
      }
    }

    if (billingClient.type === 'subClient' && billingClient.billingClientFather) {
      await BillingClient.findByIdAndUpdate(
        billingClient.billingClientFather,
        {
          $pull: {
            subBillingClients: billingClient._id
          }
        }
      );
    }

    await BillingClient.findByIdAndDelete(req.params.id);

    await logEvent({
      req,
      identifier: billingClient.billingName,
      collectionName: 'Clientes de cobranza',
      operation: 'Eliminación',
      document: billingClient
    });

    return res.status(200).json({
      message: 'Cliente de cobranza eliminado correctamente',
      billingClientId: billingClient._id
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Error al eliminar el cliente de cobranza'
    });
  }
};
