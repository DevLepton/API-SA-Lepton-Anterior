const express = require('express');
const router = express.Router();
const userController = require('../controllers/users.controller');
const authMiddleware = require('../utils/auth.middleware');

router.post('/', /*authMiddleware.authenticateToken, */userController.registerUser); //bloqueado para crear usuario

router.get('/', authMiddleware.authenticateToken, userController.getUsers);

router.post('/login', userController.loginUser);

router.put('/:id', authMiddleware.authenticateToken, userController.updateUser);

router.delete('/:id', authMiddleware.authenticateToken, userController.deleteUser);

module.exports = router;