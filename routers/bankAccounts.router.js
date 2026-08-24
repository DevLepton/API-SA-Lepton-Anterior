const express = require('express');
const router = express.Router();
const bankAccountsController = require('../controllers/bankAccounts.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', authMiddleware.authenticateToken, bankAccountsController.createBankAccount);

router.get('/', authMiddleware.authenticateToken, bankAccountsController.getBankAccounts);

router.get('/:id', authMiddleware.authenticateToken, bankAccountsController.getBankAccountById);

router.put('/:id', authMiddleware.authenticateToken, bankAccountsController.updateBankAccount);

router.delete('/', authMiddleware.authenticateToken, bankAccountsController.deleteBankAccounts);

router.delete('/:id', authMiddleware.authenticateToken, bankAccountsController.deleteBankAccount);

module.exports = router;