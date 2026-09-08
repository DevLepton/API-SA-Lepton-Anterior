const mongoose = require('mongoose');
const Product = require('../models/products.model');
const { logEvent } = require('../utils/events.logger');

const TYPE_ENUM = ['GPS', 'Accesorio', 'Servicio', 'Plan'];

const DURATION_ENUM = ['1 mes', '3 meses', '6 meses', '1 año'];

function validateType(type) {
  if (!type) throw new Error('El campo "type" es requerido');
  if (!TYPE_ENUM.includes(type)) {
    throw new Error(`"type" invalido. Valores permitidos: ${TYPE_ENUM.join(', ')}`);
  }
}

function toNumber(value, field, options = {}) {
  const { required = false, defaultValue = null } = options;

  if (value === null || value === undefined || value === '') {
    if (required) throw new Error(`El campo "${field}" es requerido`);
    return defaultValue;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`El campo "${field}" debe ser numerico`);

  return n;
}

function translateDupKeyError(err) {
  if (err && err.code === 11000 && err.keyValue) {
    const field = Object.keys(err.keyValue)[0];
    return `Ya existe un producto con el mismo valor en "${field}": ${err.keyValue[field]}`;
  }
  return null;
}

function validateDuration(type, duration) {
  if (type !== 'Plan') return;

  if (!duration) {
    throw new Error('El campo "duration" es requerido para productos de tipo "Plan"');
  }

  if (!DURATION_ENUM.includes(duration)) {
    throw new Error(`"duration" inválido. Valores permitidos: ${DURATION_ENUM.join(', ')}`);
  }
}

function buildPayload(body, isUpdate = false) {
  const {
    type,
    name,
    concept,
    description,
    price,
    priceIVA,
    discount,
    duration,
    comments,
    createdAt
  } = body;

  if (!isUpdate || type !== undefined) {
    validateType(type);
    validateDuration(type, duration);
  };
  if (!isUpdate && !name) throw new Error('El campo "name" es requerido');

  return {
    type,
    name: String(name ?? '').trim(),
    concept: String(concept ?? '').trim(),
    description: String(description ?? '').trim() || null,
    price: toNumber(price, 'price', { required: true }),
    priceIVA: toNumber(priceIVA, 'priceIVA', { required: true }),
    discount: toNumber(discount, 'discount', { defaultValue: 0 }),
    duration: type === 'Plan' ? duration : undefined,
    comments: String(comments ?? '').trim() || null,
    createdAt: createdAt ? new Date(createdAt) : undefined
  };
}

exports.createProduct = async (req, res) => {
  try {
    const payload = buildPayload(req.body, false);
    const product = await Product.create(payload);

    await logEvent({
      req,
      identifier: product.name,
      collectionName: 'Productos',
      operation: 'Creación',
      document: product
    });

    return res.status(201).json({
      message: 'Producto creado correctamente',
      data: product
    });
  } catch (error) {
    const dup = translateDupKeyError(error);
    if (dup) return res.status(400).json({ error: dup });
    return res.status(400).json({ error: error.message || 'Error al crear el producto' });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const { type, q } = req.query;
    const filters = {};

    if (type && TYPE_ENUM.includes(type)) filters.type = type;

    if (q) {
      const safe = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(safe, 'i');
      filters.$or = [{ name: rx }, { concept: rx }, { description: rx }, { comments: rx }];
    }

    const items = await Product.find(filters);

    return res.status(200).json({
      message: 'Productos obtenidos con exito',
      filters,
      total: items.length,
      data: items
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al consultar productos',
      error: error.message
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    return res.status(200).json({
      message: 'Producto obtenido con exito',
      data: product
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar el producto' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });

    const payload = buildPayload({ ...existing.toObject(), ...req.body }, true);
    if (!payload.createdAt) delete payload.createdAt;
    
    const updated = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    await logEvent({
      req,
      identifier: updated.name,
      collectionName: 'Productos',
      operation: 'Actualización',
      document: updated
    });

    return res.status(200).json({
      message: 'Producto actualizado correctamente',
      data: updated
    });
  } catch (error) {
    const dup = translateDupKeyError(error);
    if (dup) return res.status(400).json({ error: dup });
    return res.status(400).json({ error: error.message || 'Error al actualizar el producto' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Producto no encontrado' });

    await logEvent({
      req,
      identifier: deleted.name,
      collectionName: 'Productos',
      operation: 'Eliminación',
      document: deleted
    });

    return res.status(200).json({
      message: 'Producto eliminado correctamente',
      productId: deleted._id
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar el producto' });
  }
};

exports.deleteProducts = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Debes proporcionar al menos un producto para eliminar' });
        }

        const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));

        if (invalidIds.length) {
            return res.status(400).json({ error: 'Uno o más IDs de producto no son válidos' });
        }

        const products = await Product.find({ _id: { $in: ids } });

        if (!products.length) {
            return res.status(404).json({ error: 'No se encontraron los productos seleccionados' });
        }

        await Product.deleteMany({ _id: { $in: ids } });

        for (const product of products) {
            await logEvent({
                req,
                identifier: product.name,
                collectionName: 'Productos',
                operation: 'Eliminación',
                document: product
            });
        }

        return res.status(200).json({
            message: `${products.length} producto${products.length === 1 ? '' : 's'} eliminado${products.length === 1 ? '' : 's'} correctamente`,
            deletedCount: products.length,
            productIds: products.map(product => product._id)
        });
    } catch (error) {
        console.error('Error al eliminar productos:', error);
        return res.status(500).json({ error: 'Error al eliminar los productos' });
    }
};