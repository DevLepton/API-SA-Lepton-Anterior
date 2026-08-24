const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', authMiddleware.authenticateToken, productsController.createProduct);

router.get('/', authMiddleware.authenticateToken, productsController.getProducts);
router.get('/:id', authMiddleware.authenticateToken, productsController.getProductById);

router.put('/:id', authMiddleware.authenticateToken, productsController.updateProduct);

router.delete('/', authMiddleware.authenticateToken, productsController.deleteProducts);
router.delete('/:id', authMiddleware.authenticateToken, productsController.deleteProduct);

module.exports = router;
