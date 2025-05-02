const express = require('express');
const aiController = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Защита всех маршрутов с помощью middleware аутентификации
router.use(authenticate);

// Получение персонализированного финансового анализа
router.get('/analysis', aiController.getBudgetAnalysis);

// Ответ на вопрос пользователя о финансах
router.post('/ask', aiController.askFinanceQuestion);

module.exports = router; 