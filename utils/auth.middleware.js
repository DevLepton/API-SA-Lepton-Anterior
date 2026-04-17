const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.authenticateToken = (req, res, next) => {

  let token = null;

  // 🔹 1. Header (caso normal)
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 🔹 2. Query (SSE fallback)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'No se proporcionó un token de acceso' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {

    if (error) {

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
      }

      return res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID' });
    }

    req.userId = decoded.userId;
    req.userRole = decoded.role;

    next();
  });
};

exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const role = (req.userRole || '').toString().trim().toLowerCase();

      // normaliza roles permitidos
      const allowed = allowedRoles.map(r => (r || '').toString().trim().toLowerCase());

      if (!role) {
        return res.status(403).json({ error: 'Acceso denegado: rol no disponible' });
      }

      if (!allowed.includes(role)) {
        return res.status(403).json({
          error: `Acceso denegado: se requiere rol ${allowedRoles.join(' o ')}`
        });
      }

      next();
    } catch {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
  };
};

exports.requireAdmin = (req, res, next) =>
  exports.requireRole('admin')(req, res, next);

exports.requireInventory = (req, res, next) =>
  exports.requireRole('inventario')(req, res, next);

