// models/event.model.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    identifier: { type: String, required: true },
    collectionName: { type: String, required: true },
    operation: { type: String, enum: ['Creación', 'Actualización', 'Eliminación'], required: true },
    // documentId: { type: mongoose.Schema.Types.ObjectId, required: true },

    // estado final del documento (o snapshot al borrar)
    finalValues: { type: mongoose.Schema.Types.Mixed, required: true },

    // snapshot del usuario que ejecutó la acción
    user: {
        _id: { type: mongoose.Schema.Types.ObjectId },
        email: String,
        userName: String,
        role: String,
    },

    request: {
        method: String,
        path: String,
        ip: String,
    },

    createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

module.exports = mongoose.model('Event', eventSchema, 'events');
