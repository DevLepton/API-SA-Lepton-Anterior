const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No se proporcionó un token de acceso' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      // console.log(error);

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

exports.requireAdmin = (req, res, next) => {
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
