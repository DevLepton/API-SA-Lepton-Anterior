const express = require('express');
const router = express.Router();
const userController = require('../controllers/users.controller');
const authMiddleware = require('../utils/auth.middleware');

function requireAdmin(req, res, next) {
  try {
    const role = req.userRole; // viene de authenticateToken
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: se requiere rol admin' });
    }
    next();
  } catch {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
}

router.post('/', authMiddleware.authenticateToken, requireAdmin, userController.registerUser); //bloqueado para crear usuario

router.get('/', authMiddleware.authenticateToken, requireAdmin, userController.getUsers);

router.post('/login', userController.loginUser);

router.put('/:id', authMiddleware.authenticateToken, userController.updateUser);

router.delete('/:id', authMiddleware.authenticateToken, requireAdmin, userController.deleteUser);

module.exports = router;