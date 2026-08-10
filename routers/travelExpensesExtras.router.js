const express = require('express');
const router = express.Router();

const travelExpensesExtrasController = require('../controllers/travelExpensesExtras.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', authMiddleware.authenticateToken, travelExpensesExtrasController.createTravelExpenseExtra);

router.get('/', authMiddleware.authenticateToken, travelExpensesExtrasController.getTravelExpenseExtras);

router.get('/:id', authMiddleware.authenticateToken, travelExpensesExtrasController.getTravelExpenseExtraById);

router.put('/:id', authMiddleware.authenticateToken, travelExpensesExtrasController.updateTravelExpenseExtra);

router.delete('/:id', authMiddleware.authenticateToken, travelExpensesExtrasController.deleteTravelExpenseExtra);

module.exports = router;