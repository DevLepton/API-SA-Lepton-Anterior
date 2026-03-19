const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requests.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', authMiddleware.authenticateToken, requestController.createRequest);

router.get('/', authMiddleware.authenticateToken, requestController.getRequests);
router.get('/:id', authMiddleware.authenticateToken, requestController.getRequestById);

router.put('/:id', authMiddleware.authenticateToken, requestController.updateRequest);

router.delete('/:id', authMiddleware.authenticateToken, requestController.deleteRequest);

module.exports = router;