const express = require('express');
const router = express.Router();
const foreignTechniciansController = require('../controllers/foreignTechnicians.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', authMiddleware.authenticateToken, foreignTechniciansController.createForeignTechnician);

router.get('/', authMiddleware.authenticateToken, foreignTechniciansController.getForeignTechnicians);
router.get('/:id', authMiddleware.authenticateToken, foreignTechniciansController.getForeignTechnicianById);

router.put('/:id', authMiddleware.authenticateToken, foreignTechniciansController.updateForeignTechnician);

router.delete('/:id', authMiddleware.authenticateToken, foreignTechniciansController.deleteForeignTechnician);

module.exports = router;
