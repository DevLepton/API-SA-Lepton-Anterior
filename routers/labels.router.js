const express = require('express');
const router = express.Router();
const labelsController = require('../controllers/labels.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', authMiddleware.authenticateToken, labelsController.createLabel);

router.get('/', authMiddleware.authenticateToken, labelsController.getLabels);
router.get('/:id', authMiddleware.authenticateToken, labelsController.getLabelById);

router.put('/:id', authMiddleware.authenticateToken, labelsController.updateLabel);

router.delete('/', authMiddleware.authenticateToken, labelsController.deleteLabels);
router.delete('/:id', authMiddleware.authenticateToken, labelsController.deleteLabel);

module.exports = router;