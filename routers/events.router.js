const express = require('express');
const router = express.Router();

const auth = require('../utils/auth.middleware');
const eventsCtrl = require('../controllers/events.controller');

/** Lectura */
router.get('/', auth.authenticateToken, eventsCtrl.listEvents);
router.get('/:id', auth.authenticateToken, eventsCtrl.getEventById);

/** Eliminación */
router.delete('/', auth.authenticateToken, auth.requireAdmin, eventsCtrl.bulkDelete);
router.delete('/:id', auth.authenticateToken, auth.requireAdmin, eventsCtrl.deleteEventById);

/** Bloqueo de mutaciones manuales */
router.post('/', auth.authenticateToken, eventsCtrl.methodNotAllowed);
router.put('/:id', auth.authenticateToken, eventsCtrl.methodNotAllowed);
router.patch('/:id', auth.authenticateToken, eventsCtrl.methodNotAllowed);

module.exports = router;
