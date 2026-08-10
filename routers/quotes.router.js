const express = require('express');
const router = express.Router();
const quotesController = require('../controllers/quotes.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', authMiddleware.authenticateToken, quotesController.createQuote);

router.get('/', authMiddleware.authenticateToken, quotesController.getQuotes);
router.get('/:id', authMiddleware.authenticateToken, quotesController.getQuoteById);

router.put('/:id', authMiddleware.authenticateToken, authMiddleware.requireAdmin, quotesController.updateQuote);

router.delete('/:id', authMiddleware.authenticateToken, authMiddleware.requireAdmin, quotesController.deleteQuote);

module.exports = router;