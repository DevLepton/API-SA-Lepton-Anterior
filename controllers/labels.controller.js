const mongoose = require('mongoose');
const Label = require('../models/labels.model');
const { logEvent } = require('../utils/events.logger');

function buildPayload(body, isUpdate = false) {
    const { name, color, createdAt } = body;

    if (!isUpdate || name !== undefined) {
        if (!name || !String(name).trim()) {
            throw new Error('El campo "name" es requerido');
        }
    }

    let validatedColor = color;

    if (!isUpdate || color !== undefined) {
        validatedColor = validateColor(color);
    }

    return {
        name: String(name ?? '').trim(),
        color: validatedColor,
        createdAt: createdAt ? new Date(createdAt) : undefined
    };
}

function translateDupKeyError(err) {
    if (err && err.code === 11000 && err.keyValue) {
        const field = Object.keys(err.keyValue)[0];
        return `Ya existe una etiqueta con el mismo valor en "${field}": ${err.keyValue[field]}`;
    }

    return null;
}

function validateColor(color) {
    if (!color || !String(color).trim()) {
        throw new Error('El campo "color" es requerido');
    }

    const value = String(color).trim();

    if (!/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(value)) {
        throw new Error('El campo "color" debe ser un color hexadecimal válido');
    }

    return value;
}

// CREAR UNA O MÁS ETIQUETAS
exports.createLabel = async (req, res) => {
    try {
        const labels = req.body;

        if (!Array.isArray(labels) || labels.length === 0) {
            return res.status(400).json({
                error: 'Debes proporcionar al menos una etiqueta'
            });
        }

        const payloads = labels.map(label => buildPayload(label, false));

        const createdLabels = await Label.insertMany(payloads, { ordered: true });

        for (const label of createdLabels) {
            await logEvent({
                req,
                identifier: label.name,
                collectionName: 'Etiquetas',
                operation: 'Creación',
                document: label
            });
        }

        return res.status(201).json({
            message: `${createdLabels.length} etiqueta${createdLabels.length === 1 ? '' : 's'} creada${createdLabels.length === 1 ? '' : 's'} correctamente`,
            total: createdLabels.length,
            data: createdLabels
        });

    } catch (error) {
        const dup = translateDupKeyError(error);

        if (dup) {
            return res.status(400).json({
                error: dup
            });
        }

        return res.status(400).json({
            error: error.message || 'Error al crear las etiquetas'
        });
    }
};

// OBTENER TODAS LAS ETIQUETAS
exports.getLabels = async (req, res) => {
    try {
        const { q } = req.query;
        const filters = {};

        if (q) {
            const safe = String(q)
                .trim()
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            const rx = new RegExp(safe, 'i');

            filters.$or = [
                { name: rx },
                { color: rx }
            ];
        }

        const items = await Label.find(filters);

        return res.status(200).json({
            message: 'Etiquetas obtenidas con éxito',
            filters,
            total: items.length,
            data: items
        });

    } catch (error) {
        return res.status(500).json({
            message: 'Error al consultar etiquetas',
            error: error.message
        });
    }
};

// OBTENER ETIQUETA POR ID
exports.getLabelById = async (req, res) => {
    try {
        const label = await Label.findById(req.params.id);

        if (!label) {
            return res.status(404).json({
                error: 'Etiqueta no encontrada'
            });
        }

        return res.status(200).json({
            message: 'Etiqueta obtenida con éxito',
            data: label
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Error al consultar la etiqueta'
        });
    }
};

// ACTUALIZAR ETIQUETA
exports.updateLabel = async (req, res) => {
    try {
        const existing = await Label.findById(req.params.id);

        if (!existing) {
            return res.status(404).json({
                error: 'Etiqueta no encontrada'
            });
        }

        const payload = buildPayload(
            { ...existing.toObject(), ...req.body },
            true
        );

        if (!payload.createdAt) {
            delete payload.createdAt;
        }

        const updated = await Label.findByIdAndUpdate(
            req.params.id,
            payload,
            {
                new: true,
                runValidators: true
            }
        );

        await logEvent({
            req,
            identifier: updated.name,
            collectionName: 'Etiquetas',
            operation: 'Actualización',
            document: updated
        });

        return res.status(200).json({
            message: 'Etiqueta actualizada correctamente',
            data: updated
        });

    } catch (error) {
        const dup = translateDupKeyError(error);

        if (dup) {
            return res.status(400).json({
                error: dup
            });
        }

        return res.status(400).json({
            error: error.message || 'Error al actualizar la etiqueta'
        });
    }
};

// ELIMINAR UNA ETIQUETA
exports.deleteLabel = async (req, res) => {
    try {
        const deleted = await Label.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                error: 'Etiqueta no encontrada'
            });
        }

        await logEvent({
            req,
            identifier: deleted.name,
            collectionName: 'Etiquetas',
            operation: 'Eliminación',
            document: deleted
        });

        return res.status(200).json({
            message: 'Etiqueta eliminada correctamente',
            labelId: deleted._id
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Error al eliminar la etiqueta'
        });
    }
};

// ELIMINAR UNA O MÁS ETIQUETAS
exports.deleteLabels = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                error: 'Debes proporcionar al menos una etiqueta para eliminar'
            });
        }

        const invalidIds = ids.filter(
            id => !mongoose.Types.ObjectId.isValid(id)
        );

        if (invalidIds.length) {
            return res.status(400).json({
                error: 'Uno o más IDs de etiqueta no son válidos'
            });
        }

        const labels = await Label.find({
            _id: { $in: ids }
        });

        if (!labels.length) {
            return res.status(404).json({
                error: 'No se encontraron las etiquetas seleccionadas'
            });
        }

        await Label.deleteMany({
            _id: { $in: ids }
        });

        for (const label of labels) {
            await logEvent({
                req,
                identifier: label.name,
                collectionName: 'Etiquetas',
                operation: 'Eliminación',
                document: label
            });
        }

        return res.status(200).json({
            message: `${labels.length} etiqueta${labels.length === 1 ? '' : 's'} eliminada${labels.length === 1 ? '' : 's'} correctamente`,
            deletedCount: labels.length,
            labelIds: labels.map(label => label._id)
        });

    } catch (error) {
        console.error('Error al eliminar etiquetas:', error);

        return res.status(500).json({
            error: 'Error al eliminar las etiquetas'
        });
    }
};