const express = require('express');
const categoryController = require('../controllers/category.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Защита всех маршрутов с помощью middleware аутентификации
router.use(authenticate);

// Создание новой категории
router.post('/', categoryController.createCategory);

// Получение всех категорий с фильтрацией
router.get('/', categoryController.getCategories);

// Получение статистики по категориям
router.get('/stats', categoryController.getCategoryStats);

// Получение, обновление и удаление конкретной категории
router.get('/:id', categoryController.getCategoryById);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router; 