const TravelExpense = require('../models/travelExpenses.model');
const { logEvent } = require('../utils/events.logger');

function toNumber(value, field, options = {}) {
    const { required = false, defaultValue = null } = options;

    if (value === null || value === undefined || value === '') {
        if (required) throw new Error(`El campo "${field}" es requerido`);
        return defaultValue;
    }

    const n = Number(value);

    if (!Number.isFinite(n)) {
        throw new Error(`El campo "${field}" debe ser numerico`);
    }

    return n;
}

function translateDupKeyError(err) {
    if (err && err.code === 11000 && err.keyValue) {
        const field = Object.keys(err.keyValue)[0];
        return `Ya existe un registro con el mismo valor en "${field}": ${err.keyValue[field]}`;
    }

    return null;
}

function buildPayload(body) {
    const {
        place,
        km,
        booths,
        createdAt
    } = body;

    if (!place) {
        throw new Error('El campo "place" es requerido');
    }

    const parsedBooths = Array.isArray(booths)
        ? booths.map(item => ({
            name: String(item.name ?? '').trim(),
            cost: toNumber(item.cost, 'booth.cost', { required: true })
        }))
        : [];

    return {
        place: String(place).trim(),
        km: toNumber(km, 'km', { required: true }),
        booths: parsedBooths,
        createdAt: createdAt ? new Date(createdAt) : undefined
    };
}

exports.createTravelExpense = async (req, res) => {
    try {
        const payload = buildPayload(req.body);
        const travelExpense = await TravelExpense.create(payload);

        await logEvent({
            req,
            identifier: travelExpense.place,
            collectionName: 'Gastos de viaje',
            operation: 'Creación',
            document: travelExpense
        });

        return res.status(201).json({
            message: 'Gasto de viaje creado correctamente',
            data: travelExpense
        });

    } catch (error) {
        const dup = translateDupKeyError(error);

        if (dup) {
            return res.status(400).json({ error: dup });
        }

        return res.status(400).json({
            error: error.message || 'Error al crear el gasto de viaje'
        });
    }
};

exports.getTravelExpenses = async (req, res) => {
    try {
        const { q } = req.query;
        const filters = {};

        if (q) {
            const safe = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const rx = new RegExp(safe, 'i');

            filters.$or = [
                { place: rx },
                { 'booths.name': rx }
            ];
        }

        const items = await TravelExpense.find(filters);

        return res.status(200).json({
            message: 'Gastos de viaje obtenidos con éxito',
            filters,
            total: items.length,
            data: items
        });

    } catch (error) {
        return res.status(500).json({
            message: 'Error al consultar los gastos de viaje',
            error: error.message
        });
    }
};

exports.getTravelExpenseById = async (req, res) => {
    try {
        const item = await TravelExpense.findById(req.params.id);

        if (!item) {
            return res.status(404).json({
                error: 'Gasto de viaje no encontrado'
            });
        }

        return res.status(200).json({
            message: 'Gasto de viaje obtenido con éxito',
            data: item
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Error al consultar el gasto de viaje'
        });
    }
};

exports.updateTravelExpense = async (req, res) => {
    try {
        const existing = await TravelExpense.findById(req.params.id);

        if (!existing) {
            return res.status(404).json({
                error: 'Gasto de viaje no encontrado'
            });
        }

        const payload = buildPayload({
            ...existing.toObject(),
            ...req.body
        });

        if (!payload.createdAt) {
            delete payload.createdAt;
        }

        const updated = await TravelExpense.findByIdAndUpdate(
            req.params.id,
            payload,
            {
                new: true,
                runValidators: true
            }
        );

        await logEvent({
            req,
            identifier: updated.place,
            collectionName: 'Gastos de viaje',
            operation: 'Actualización',
            document: updated
        });

        return res.status(200).json({
            message: 'Gasto de viaje actualizado correctamente',
            data: updated
        });

    } catch (error) {
        const dup = translateDupKeyError(error);

        if (dup) {
            return res.status(400).json({ error: dup });
        }

        return res.status(400).json({
            error: error.message || 'Error al actualizar el gasto de viaje'
        });
    }
};

exports.deleteTravelExpense = async (req, res) => {
    try {
        const deleted = await TravelExpense.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                error: 'Gasto de viaje no encontrado'
            });
        }

        await logEvent({
            req,
            identifier: deleted.place,
            collectionName: 'Gastos de viaje',
            operation: 'Eliminación',
            document: deleted
        });

        return res.status(200).json({
            message: 'Gasto de viaje eliminado correctamente',
            travelExpenseId: deleted._id
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Error al eliminar el gasto de viaje'
        });
    }
};