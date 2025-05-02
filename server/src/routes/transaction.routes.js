const express = require('express');
const transactionController = require('../controllers/transaction.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Защита всех маршрутов с помощью middleware аутентификации
router.use(authenticate);

// Создание новой транзакции
router.post('/', transactionController.createTransaction);

// Получение всех транзакций с фильтрацией
router.get('/', transactionController.getTransactions);

// Получение сводки транзакций
router.get('/summary', transactionController.getTransactionSummary);

// Получение, обновление и удаление конкретной транзакции
router.get('/:id', transactionController.getTransactionById);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router; 