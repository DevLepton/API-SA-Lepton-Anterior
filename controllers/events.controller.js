// controllers/events.controller.js
const Event = require('../models/event.model');

/**
 * GET /events
 * Query params:
 *  - collectionName: string
 *  - operation: 'create' | 'update' | 'delete'
 *  - userId: string  (match con event.user._id)
 *  - q: string       (busca en collectionName, operation, user.userName, user.email, request.path)
 *  - from, to: ISO date para rango de createdAt
 *  - page (1), limit (20), sort ('createdAt'), order ('desc'|'asc')
 */
exports.listEvents = async (req, res) => {
    try {
        const {
            identifier,
            collectionName,
            operation,
            userId,
            q,
            from,
            to,
            page = '1',
            limit = '20',
            sort = 'createdAt',
            order = 'desc',
        } = req.query;

        const where = {};

        if (identifier) where.identifier = identifier;
        if (collectionName) where.collectionName = collectionName;
        if (operation) where.operation = operation;
        if (userId) where['user._id'] = userId;

        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.$gte = new Date(from);
            if (to) where.createdAt.$lte = new Date(to);
        }

        if (q) {
            const safe = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const rx = new RegExp(safe, 'i');
            where.$or = [
                { identifier: rx },
                { collectionName: rx },
                { operation: rx },
                { 'user.userName': rx },
                { 'user.email': rx },
                { 'request.path': rx },
            ];
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const sortDir = order === 'asc' ? 1 : -1;
        const sortObj = { [sort]: sortDir };

        const [items, total] = await Promise.all([
            Event.find(where).select('-__v').sort(sortObj).skip(skip).limit(limitNum).lean(),
            Event.countDocuments(where),
        ]);

        return res.status(200).json({
            message: 'Eventos obtenidos con éxito',
            data: items,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.max(1, Math.ceil(total / limitNum)),
            },
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error al listar eventos', detail: error?.message });
    }
};

/** GET /events/:id */
exports.getEventById = async (req, res) => {
    try {
        const ev = await Event.findById(req.params.id).select('-__v').lean();
        if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });
        return res.status(200).json({ message: 'Evento obtenido', data: ev });
    } catch (error) {
        return res.status(500).json({ error: 'Error al consultar el evento', detail: error?.message });
    }
};

/** DELETE /events/:id (solo admin) */
exports.deleteEventById = async (req, res) => {
    try {
        const deleted = await Event.findByIdAndDelete(req.params.id).select('-__v').lean();
        if (!deleted) return res.status(404).json({ error: 'Evento no encontrado' });
        return res.status(200).json({ message: 'Evento eliminado', data: deleted });
    } catch (error) {
        return res.status(500).json({ error: 'Error al eliminar el evento', detail: error?.message });
    }
};

/**
 * DELETE /events  (eliminación masiva; mismos filtros que listEvents)
 * Ej: /events?to=2025-01-01T00:00:00.000Z
 */
exports.bulkDelete = async (req, res) => {
    try {
        const { identifier, collectionName, operation, userId, q, from, to } = req.query;

        const where = {};
        if (identifier) where.identifier = identifier;
        if (collectionName) where.collectionName = collectionName;
        if (operation) where.operation = operation;
        if (userId) where['user._id'] = userId;

        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.$gte = new Date(from);
            if (to) where.createdAt.$lte = new Date(to);
        }

        if (q) {
            const safe = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const rx = new RegExp(safe, 'i');
            where.$or = [
                { identifier: rx },
                { collectionName: rx },
                { operation: rx },
                { 'user.userName': rx },
                { 'user.email': rx },
                { 'request.path': rx },
            ];
        }

        const result = await Event.deleteMany(where);
        return res.status(200).json({
            message: 'Eventos eliminados',
            deletedCount: result?.deletedCount || 0,
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error en eliminación masiva', detail: error?.message });
    }
};

/** 405 para crear/editar manualmente */
exports.methodNotAllowed = (_req, res) => {
    return res.status(405).json({ error: 'Operación no permitida sobre events (solo lectura y eliminación)' });
};
