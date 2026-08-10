const express = require('express');
const router = express.Router();

const travelExpensesController = require('../controllers/travelExpenses.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', authMiddleware.authenticateToken, travelExpensesController.createTravelExpense);

router.get('/', authMiddleware.authenticateToken, travelExpensesController.getTravelExpenses);

router.get('/:id', authMiddleware.authenticateToken, travelExpensesController.getTravelExpenseById);

router.put('/:id', authMiddleware.authenticateToken, travelExpensesController.updateTravelExpense);

router.delete('/:id', authMiddleware.authenticateToken, travelExpensesController.deleteTravelExpense);

module.exports = router;