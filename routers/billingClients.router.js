const express = require('express');
const router = express.Router();
const billingClientsController = require('../controllers/billingClients.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', authMiddleware.authenticateToken, billingClientsController.createBillingClient);

router.get('/', authMiddleware.authenticateToken, billingClientsController.getBillingClients);
router.get('/:id', authMiddleware.authenticateToken, billingClientsController.getBillingClientById);

router.put('/:id', authMiddleware.authenticateToken, billingClientsController.updateBillingClient);

router.delete('/:id', authMiddleware.authenticateToken, billingClientsController.deleteBillingClient);

module.exports = router;
