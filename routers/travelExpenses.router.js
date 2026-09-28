const express = require('express');
const router = express.Router();

const travelExpensesController = require('../controllers/travelExpenses.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', authMiddleware.authenticateToken, authMiddleware.requireRole('admin', 'soporte', 'inventario'), travelExpensesController.createTravelExpense);

router.get('/', authMiddleware.authenticateToken, travelExpensesController.getTravelExpenses);

router.get('/:id', authMiddleware.authenticateToken, travelExpensesController.getTravelExpenseById);

router.put('/:id', authMiddleware.authenticateToken, authMiddleware.requireRole('admin', 'soporte', 'inventario'), travelExpensesController.updateTravelExpense);

router.delete('/:id', authMiddleware.authenticateToken, authMiddleware.requireRole('admin', 'soporte', 'inventario'), travelExpensesController.deleteTravelExpense);

module.exports = router;