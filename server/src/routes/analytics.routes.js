const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Защита всех маршрутов с помощью middleware аутентификации
router.use(authenticate);

// Аналитика по категориям
router.get('/categories', analyticsController.getCategoryAnalytics);

// Аналитика по времени (месяцам)
router.get('/time', analyticsController.getTimeAnalytics);

// Сравнение периодов
router.get('/comparison', analyticsController.getComparisonAnalytics);

module.exports = router; 