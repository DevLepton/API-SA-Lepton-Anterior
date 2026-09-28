const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', authMiddleware.authenticateToken, authMiddleware.requireRole('admin', 'soporte', 'inventario'), productsController.createProduct);

router.get('/', authMiddleware.authenticateToken, productsController.getProducts);
router.get('/:id', authMiddleware.authenticateToken, productsController.getProductById);

router.put('/:id', authMiddleware.authenticateToken, authMiddleware.requireRole('admin', 'soporte', 'inventario'), productsController.updateProduct);

router.delete('/', authMiddleware.authenticateToken, authMiddleware.requireRole('admin', 'soporte', 'inventario'), productsController.deleteProducts);
router.delete('/:id', authMiddleware.authenticateToken, authMiddleware.requireRole('admin', 'soporte', 'inventario'), productsController.deleteProduct);

module.exports = router;
