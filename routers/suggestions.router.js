const express = require('express');
const router = express.Router();

const suggestionsController = require('../controllers/suggestions.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', authMiddleware.authenticateToken, suggestionsController.createSuggestion);

router.get('/', authMiddleware.authenticateToken, suggestionsController.getSuggestions);

router.get('/:id', authMiddleware.authenticateToken, suggestionsController.getSuggestionById);

router.put('/:id', authMiddleware.authenticateToken, suggestionsController.updateSuggestion);

router.delete('/:id', authMiddleware.authenticateToken, suggestionsController.deleteSuggestion);

module.exports = router;