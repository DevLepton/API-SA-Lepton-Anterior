const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/devices.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', /*authMiddleware.authenticateToken, */deviceController.createDevice);

router.get('/', authMiddleware.authenticateToken, deviceController.getDevices);
router.get('/:id', authMiddleware.authenticateToken, deviceController.getDeviceById);

router.put('/:id', authMiddleware.authenticateToken, deviceController.updateDevice);

router.delete('/:id', authMiddleware.authenticateToken, deviceController.deleteDevice);

module.exports = router;