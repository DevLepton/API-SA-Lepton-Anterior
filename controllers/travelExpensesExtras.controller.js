const TravelExpenseExtra = require('../models/travelExpensesExtras.model');
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
        kmRate,
        lodging,
        breakfast,
        lunch,
        dinner,
        createdAt
    } = body;

    return {
        kmRate: toNumber(kmRate, 'kmRate', { required: true }),
        lodging: toNumber(lodging, 'lodging', { required: true }),
        breakfast: toNumber(breakfast, 'breakfast', { required: true }),
        lunch: toNumber(lunch, 'lunch', { required: true }),
        dinner: toNumber(dinner, 'dinner', { required: true }),
        createdAt: createdAt ? new Date(createdAt) : undefined
    };
}

exports.createTravelExpenseExtra = async (req, res) => {
    try {
        const payload = buildPayload(req.body);
        const item = await TravelExpenseExtra.create(payload);

        await logEvent({
            req,
            identifier: `KM ${item.kmRate}`,
            collectionName: 'Extras de viáticos',
            operation: 'Creación',
            document: item
        });

        return res.status(201).json({
            message: 'Registro creado correctamente',
            data: item
        });

    } catch (error) {
        const dup = translateDupKeyError(error);

        if (dup) {
            return res.status(400).json({ error: dup });
        }

        return res.status(400).json({
            error: error.message || 'Error al crear el registro'
        });
    }
};

exports.getTravelExpenseExtras = async (req, res) => {
    try {
        let item = await TravelExpenseExtra.findOne();

        if (!item) {
            item = await TravelExpenseExtra.create({
                kmRate: 0,
                lodging: 0,
                breakfast: 0,
                lunch: 0,
                dinner: 0
            });
        }

        return res.status(200).json({
            message: 'Registro obtenido con éxito',
            data: item
        });

    } catch (error) {
        return res.status(500).json({
            message: 'Error al consultar el registro',
            error: error.message
        });
    }
};

exports.getTravelExpenseExtraById = async (req, res) => {
    try {
        const item = await TravelExpenseExtra.findById(req.params.id);

        if (!item) {
            return res.status(404).json({
                error: 'Registro no encontrado'
            });
        }

        return res.status(200).json({
            message: 'Registro obtenido con éxito',
            data: item
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Error al consultar el registro'
        });
    }
};

exports.updateTravelExpenseExtra = async (req, res) => {
    try {
        const existing = await TravelExpenseExtra.findById(req.params.id);

        if (!existing) {
            return res.status(404).json({
                error: 'Registro no encontrado'
            });
        }

        const payload = buildPayload({
            ...existing.toObject(),
            ...req.body
        });

        if (!payload.createdAt) {
            delete payload.createdAt;
        }

        //Detectar si cambió cualquiera de los valores de Extras.
        const extrasChanged =
            Number(payload.kmRate) !== Number(existing.kmRate) ||
            Number(payload.lodging) !== Number(existing.lodging) ||
            Number(payload.breakfast) !== Number(existing.breakfast) ||
            Number(payload.lunch) !== Number(existing.lunch) ||
            Number(payload.dinner) !== Number(existing.dinner);

        const changeLog = String(req.body.changeLog ?? '').trim();

        //Si cambió cualquiera de los valores de Extras, el registro del cambio es obligatorio.
        if (extrasChanged && !changeLog) {
            return res.status(400).json({
                error: 'Debes indicar el motivo del cambio de extras'
            });
        }

        // Si se mandó un registro, se agrega al historial.
        if (changeLog) {
            payload.changeLog = [
                ...(existing.changeLog || []),
                {
                    log: changeLog,
                    date: new Date(),
                    userName: String(req.userName ?? '').trim()
                }
            ];
        } else {
            // Mantener el historial existente.
            payload.changeLog = existing.changeLog || [];
        }

        const updated = await TravelExpenseExtra.findByIdAndUpdate(
            req.params.id,
            payload,
            {
                new: true,
                runValidators: true
            }
        );

        await logEvent({
            req,
            identifier: `KM ${updated.kmRate}`,
            collectionName: 'Extras de viáticos',
            operation: 'Actualización',
            document: updated
        });

        return res.status(200).json({
            message: 'Registro actualizado correctamente',
            data: updated
        });

    } catch (error) {
        const dup = translateDupKeyError(error);

        if (dup) {
            return res.status(400).json({ error: dup });
        }

        return res.status(400).json({
            error: error.message || 'Error al actualizar el registro'
        });
    }
};

exports.deleteTravelExpenseExtra = async (req, res) => {
    try {
        const deleted = await TravelExpenseExtra.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                error: 'Registro no encontrado'
            });
        }

        await logEvent({
            req,
            identifier: `KM ${deleted.kmRate}`,
            collectionName: 'Extras de viáticos',
            operation: 'Eliminación',
            document: deleted
        });

        return res.status(200).json({
            message: 'Registro eliminado correctamente',
            travelExpenseExtraId: deleted._id
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Error al eliminar el registro'
        });
    }
};