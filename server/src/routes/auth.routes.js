const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Регистрация нового пользователя
router.post('/register', authController.register);

// Вход пользователя
router.post('/login', authController.login);

// Получение профиля текущего пользователя
router.get('/profile', authenticate, authController.getProfile);

// Обновление профиля
router.put('/profile', authenticate, authController.updateProfile);

module.exports = router; 