// routes/auth.routes.js
const express = require('express');
const ctrl = require('../controllers/users.controller');
const router = express.Router();

router.post('/login', ctrl.loginUser);
router.post('/refresh', ctrl.refreshToken);
router.post('/logout', ctrl.logout);

module.exports = router;
