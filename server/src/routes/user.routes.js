const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware'); // Middleware для проверки JWT

// @route   GET /api/users/me
// @desc    Получить профиль текущего пользователя
// @access  Private
router.get('/me', authenticate, userController.getUserProfile);

// @route   PUT /api/users/me
// @desc    Обновить профиль текущего пользователя (имя, email)
// @access  Private
router.put('/me', authenticate, userController.updateUserProfile);

// @route   DELETE /api/users/me
// @desc    Удалить аккаунт текущего пользователя
// @access  Private
router.delete('/me', authenticate, userController.deleteUserAccount);


module.exports = router; 