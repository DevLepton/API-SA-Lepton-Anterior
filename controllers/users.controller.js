const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { logEvent } = require('../utils/events.logger');

// Helpers
const ACCESS_EXPIRES_IN = '8h';   // en dev puedes usar '8h'; en prod 15m es más seguro
const REFRESH_EXPIRES_IN = '7d';

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}
function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

exports.registerUser = async (req, res) => {
  try {
    const { userName, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'El usuario ya existe' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ userName, email, password: hashedPassword, role });
    await newUser.save();

    await logEvent({
      req,
      identifier: newUser._id,
      collectionName: 'Usuarios',
      operation: 'Creación',
      document: newUser
    });

    return res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (error) {
    console.error("Error al registrar el usuario:", error);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    return res.status(200).json({ message: 'Usuarios obtenidos con éxito', data: users });
  } catch (error) {
    return res.status(500).json({ message: 'Error al consultar usuarios', data: error });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { userName, email, password } = req.body;

    const user = await User.findOne({
      $or: [
        userName ? { userName } : null,
        email ? { email } : null
      ].filter(Boolean)
    });
    
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: 'Credenciales inválidas' });

    const payload = { userId: user._id, userName: user.userName, role: user.role };

    // Access corto + Refresh largo (cookie HttpOnly)
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // (Opcional) Guarda refresh en BD para poder revocarlo luego
    // await RefreshToken.create({ userId: user._id, token: refreshToken });

    const formatUser = { _id: user._id, userName: user.userName, email: user.email, role: user.role };

    return res
      .cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/auth', // limita el alcance de la cookie
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      .status(200)
      .json({
        user: formatUser,
        token: accessToken, // <-- el access para Authorization: Bearer
        message: 'Inicio de sesión exitoso'
      });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// ===== Nuevo: emitir nuevo access con refresh válido =====
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ code: 'NO_REFRESH', error: 'Falta refresh token' });

    // (Opcional) verifica en BD que ese refresh esté vigente
    // const exists = await RefreshToken.findOne({ token });
    // if (!exists) return res.status(401).json({ code: 'REFRESH_REVOKED', error: 'Refresh revocado' });

    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, user) => {
      if (err) return res.status(401).json({ code: 'REFRESH_INVALID', error: 'Refresh inválido' });

      const payload = { userId: user.userId, userName: user.userName, role: user.role };
      const newAccess = signAccessToken(payload);

      // (Opcional: rotación de refresh)
      // const newRefresh = signRefreshToken(payload);
      // await RefreshToken.deleteOne({ token });
      // await RefreshToken.create({ userId: user.userId, token: newRefresh });
      // res.cookie('refresh_token', newRefresh, { ...mismas opciones... });

      return res.json({ token: newAccess });
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al refrescar token' });
  }
};

// ===== Nuevo: logout (revoca refresh y limpia cookie) =====
exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      // (Opcional) borrar de BD si lo guardaste
      // await RefreshToken.deleteOne({ token });
    }
    res.clearCookie('refresh_token', { path: '/auth' });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { userName, email, role, password, currentPassword } = req.body;

    if (req.userId !== userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'No tienes permisos para actualizar este usuario' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const updateData = {};

    if (userName !== undefined) updateData.userName = userName;
    if (email !== undefined) updateData.email = email;

    if (req.userRole === 'admin' && role !== undefined) {
      updateData.role = role;
    }

    if (password && password.trim() !== '') {

      // Validar contraseña actual (solo si NO es admin)
      if (req.userRole !== 'admin') {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Debes proporcionar la contraseña actual' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ error: 'Contraseña actual incorrecta' });
        }
      }

      // Hashear nueva contraseña
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
    if (!updatedUser) return res.status(404).json({ error: 'Usuario no encontrado' });

    await logEvent({
      req,
      identifier: updatedUser._id,
      collectionName: 'Usuarios',
      operation: 'Actualización',
      document: updatedUser
    });

    return res.status(200).json({
      message: 'Usuario actualizado correctamente',
      user: { _id: updatedUser._id, userName: updatedUser.userName, email: updatedUser.email, role: updatedUser.role }
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.userId !== userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este usuario' });
    }

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) return res.status(404).json({ error: 'Usuario no encontrado' });

    await logEvent({
      req,
      identifier: deletedUser._id,
      collectionName: 'Usuarios',
      operation: 'Eliminación',
      document: deletedUser
    });
    
    return res.status(200).json({ message: 'Usuario eliminado correctamente', userId: deletedUser._id });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
};
