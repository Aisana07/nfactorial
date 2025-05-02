const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Защита всех маршрутов с помощью middleware аутентификации
router.use(authenticate);

// Получение данных для дашборда
router.get('/', dashboardController.getDashboardData);

module.exports = router; 