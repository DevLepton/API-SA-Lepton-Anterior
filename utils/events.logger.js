const Event = require('../models/event.model');
const User = require('../models/user.model');  // opcional, como ya lo tienes

function sanitizeFinalValues(document) {
    // Convierte a objeto plano si es un doc de Mongoose
    const obj = document?.toObject ? document.toObject() : (document || {});
    if (obj && typeof obj === 'object' && '__v' in obj) {
        delete obj.__v;              // ⬅️ eliminar la clave __v
    }
    return obj;
}

async function buildUserSnapshot(req) {
    const { userId, userRole } = req || {};
    if (!userId) return {};
    try {
        const found = await User.findById(userId).select('_id email userName role').lean();
        return found || { _id: userId, role: userRole };
    } catch {
        return { _id: userId, role: userRole };
    }
}

async function logEvent({ req, identifier, collectionName, operation, document }) {
    try {
        // Obtén el id ANTES de sanear por si acaso
        const raw = document?.toObject ? document.toObject() : (document || {});

        const finalValues = sanitizeFinalValues(document);
        const user = await buildUserSnapshot(req);
        const request = {
            method: req?.method,
            path: req?.originalUrl || req?.url,
            ip: req?.ip,
        };

        await Event.create({
            identifier,
            collectionName,
            operation,
            finalValues,
            user,
            request,
        });
    } catch (err) {
        console.error('[events.logger] error saving event:', err?.message || err);
    }
}

module.exports = { logEvent };
