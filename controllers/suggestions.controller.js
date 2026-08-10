const mongoose = require('mongoose');
const Suggestion = require('../models/suggestions.model');
const { logEvent } = require('../utils/events.logger');

function translateDupKeyError(err) {
    if (err && err.code === 11000 && err.keyValue) {
        const field = Object.keys(err.keyValue)[0];
        return `Ya existe un registro con el mismo valor en "${field}": ${err.keyValue[field]}`;
    }

    return null;
}

function validateObjectId(value, field) {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`El campo "${field}" no es un ObjectId válido`);
    }

    return value;
}

function buildPayload(body) {
    const {
        description,
        productId,
        action,
        response,
        createdAt
    } = body;

    if (!description) {
        throw new Error('El campo "description" es requerido');
    }

    if (!productId) {
        throw new Error('El campo "productId" es requerido');
    }

    if (!action) {
        throw new Error('El campo "action" es requerido');
    }

    if (!['add', 'remove'].includes(action)) {
        throw new Error('El campo "action" debe ser "Agregar" o "Quitar"');
    }

    const parsedResponse = Array.isArray(response)
        ? response.map(item => {
            if (!['add', 'remove'].includes(item.action)) {
                throw new Error('response.action debe ser "add" o "remove"');
            }

            return {
                action: item.action,
                productId: validateObjectId(item.productId, 'response.productId')
            };
        })
        : [];

    return {
        description: String(description).trim(),
        productId: validateObjectId(productId, 'productId'),
        action,
        response: parsedResponse,
        createdAt: createdAt ? new Date(createdAt) : undefined
    };
}

exports.createSuggestion = async (req, res) => {
    try {
        const payload = buildPayload(req.body);
        const suggestion = await Suggestion.create(payload);

        await logEvent({
            req,
            identifier: suggestion.description,
            collectionName: 'Sugerencias',
            operation: 'Creación',
            document: suggestion
        });

        return res.status(201).json({
            message: 'Sugerencia creada correctamente',
            data: suggestion
        });
    } catch (error) {
        const dup = translateDupKeyError(error);

        if (dup) {
            return res.status(400).json({ error: dup });
        }

        return res.status(400).json({
            error: error.message || 'Error al crear la sugerencia'
        });
    }
};

exports.getSuggestions = async (req, res) => {
    try {
        const { q } = req.query;
        const filters = {};

        if (q) {
            const safe = String(q)
                .trim()
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            const rx = new RegExp(safe, 'i');

            filters.$or = [
                { description: rx },
                { action: rx }
            ];
        }

        const items = await Suggestion
            .find(filters)
            .populate('productId')
            .populate('response.productId');

        return res.status(200).json({
            message: 'Sugerencias obtenidas con éxito',
            filters,
            total: items.length,
            data: items
        });

    } catch (error) {
        return res.status(500).json({
            message: 'Error al consultar las sugerencias',
            error: error.message
        });
    }
};

exports.getSuggestionById = async (req, res) => {
    try {
        const item = await Suggestion
            .findById(req.params.id)
            .populate('productId')
            .populate('response.productId');

        if (!item) {
            return res.status(404).json({
                error: 'Sugerencia no encontrada'
            });
        }

        return res.status(200).json({
            message: 'Sugerencia obtenida con éxito',
            data: item
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Error al consultar la sugerencia'
        });
    }
};

exports.updateSuggestion = async (req, res) => {
    try {
        const existing = await Suggestion.findById(req.params.id);

        if (!existing) {
            return res.status(404).json({
                error: 'Sugerencia no encontrada'
            });
        }

        const payload = buildPayload({
            ...existing.toObject(),
            ...req.body
        });

        if (!payload.createdAt) {
            delete payload.createdAt;
        }

        const updated = await Suggestion.findByIdAndUpdate(
            req.params.id,
            payload,
            {
                new: true,
                runValidators: true
            }
        )
        .populate('productId')
        .populate('response.productId');

        await logEvent({
            req,
            identifier: updated.description,
            collectionName: 'Sugerencias',
            operation: 'Actualización',
            document: updated
        });

        return res.status(200).json({
            message: 'Sugerencia actualizada correctamente',
            data: updated
        });

    } catch (error) {
        const dup = translateDupKeyError(error);

        if (dup) {
            return res.status(400).json({ error: dup });
        }

        return res.status(400).json({
            error: error.message || 'Error al actualizar la sugerencia'
        });
    }
};

exports.deleteSuggestion = async (req, res) => {
    try {
        const deleted = await Suggestion.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                error: 'Sugerencia no encontrada'
            });
        }

        await logEvent({
            req,
            identifier: deleted.description,
            collectionName: 'Sugerencias',
            operation: 'Eliminación',
            document: deleted
        });

        return res.status(200).json({
            message: 'Sugerencia eliminada correctamente',
            suggestionId: deleted._id
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Error al eliminar la sugerencia'
        });
    }
};