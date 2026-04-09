const express = require('express');
const router = express.Router();

const auth = require('../utils/auth.middleware');
const clientsCtrl = require('../controllers/clients.controller');

router.get('/config', auth.authenticateToken, clientsCtrl.getClientConfig);

router.put('/config/active', auth.authenticateToken, clientsCtrl.updateActiveClients);

router.put('/config/excluded', auth.authenticateToken, clientsCtrl.updateExcludedAccounts);

router.get('/full-data', auth.authenticateToken, clientsCtrl.getFullClientsData);

// /** Lectura */
// router.get('/', auth.authenticateToken, eventsCtrl.listEvents);
// router.get('/:id', auth.authenticateToken, eventsCtrl.getEventById);

// /** Eliminación */
// router.delete('/', auth.authenticateToken, auth.requireAdmin, eventsCtrl.bulkDelete);
// router.delete('/:id', auth.authenticateToken, auth.requireAdmin, eventsCtrl.deleteEventById);

// /** Bloqueo de mutaciones manuales */
// router.post('/', auth.authenticateToken, eventsCtrl.methodNotAllowed);
// router.put('/:id', auth.authenticateToken, eventsCtrl.methodNotAllowed);
// router.patch('/:id', auth.authenticateToken, eventsCtrl.methodNotAllowed);

module.exports = router;
