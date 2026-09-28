const express = require('express');
const router = express.Router();
const bankAccountsController = require('../controllers/bankAccounts.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', authMiddleware.authenticateToken, authMiddleware.requireRole('admin', 'soporte', 'cobranza'), bankAccountsController.createBankAccount);

router.get('/', authMiddleware.authenticateToken, bankAccountsController.getBankAccounts);

router.get('/:id', authMiddleware.authenticateToken, bankAccountsController.getBankAccountById);

router.put('/:id', authMiddleware.authenticateToken, authMiddleware.requireRole('admin', 'soporte', 'cobranza'), bankAccountsController.updateBankAccount);

router.delete('/', authMiddleware.authenticateToken, authMiddleware.requireRole('admin', 'soporte', 'cobranza'), bankAccountsController.deleteBankAccounts);

router.delete('/:id', authMiddleware.authenticateToken, authMiddleware.requireRole('admin', 'soporte', 'cobranza'), bankAccountsController.deleteBankAccount);

module.exports = router;