const Transaction = require('../models/transaction.model');
const Category = require('../models/category.model');
const mongoose = require('mongoose');

// Создание новой транзакции
exports.createTransaction = async (req, res) => {
  try {
    const { amount, description, category, type, date } = req.body;
    
    // Проверка категории
    const categoryExists = await Category.findOne({ 
      _id: category,
      user: req.user._id,
      type
    });
    
    if (!categoryExists) {
      return res.status(400).json({ message: 'Категория не найдена или не соответствует типу транзакции' });
    }
    
    const transaction = new Transaction({
      amount,
      description,
      category,
      type,
      date: date || new Date(),
      user: req.user._id
    });
    
    await transaction.save();
    
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('category', 'name color icon');
    
    res.status(201).json({ 
      success: true,
      transaction: populatedTransaction
    });
  } catch (error) {
    console.error('Ошибка создания транзакции:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании транзакции' });
  }
};

// Получение всех транзакций пользователя с фильтрацией
exports.getTransactions = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      type,
      category,
      minAmount,
      maxAmount,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;
    
    const query = { user: req.user._id };
    
    // Фильтрация по дате
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Фильтрация по типу
    if (type) query.type = type;
    
    // Фильтрация по категории
    if (category) query.category = category;
    
    // Фильтрация по сумме
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = Number(minAmount);
      if (maxAmount) query.amount.$lte = Number(maxAmount);
    }
    
    // Сортировка
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Пагинация
    const skip = (Number(page) - 1) * Number(limit);
    
    const transactions = await Transaction.find(query)
      .populate('category', 'name color icon')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      transactions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Ошибка получения транзакций:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении транзакций' });
  }
};

// Получение деталей транзакции
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('category', 'name color icon');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Транзакция не найдена' });
    }
    
    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Ошибка получения транзакции:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении транзакции' });
  }
};

// Обновление транзакции
exports.updateTransaction = async (req, res) => {
  try {
    const { amount, description, category, type, date } = req.body;
    
    // Проверка категории если она меняется
    if (category && type) {
      const categoryExists = await Category.findOne({ 
        _id: category,
        user: req.user._id,
        type
      });
      
      if (!categoryExists) {
        return res.status(400).json({ message: 'Категория не найдена или не соответствует типу транзакции' });
      }
    }
    
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { 
        amount,
        description,
        category,
        type,
        date: date || undefined
      },
      { new: true, runValidators: true }
    ).populate('category', 'name color icon');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Транзакция не найдена' });
    }
    
    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Ошибка обновления транзакции:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении транзакции' });
  }
};

// Удаление транзакции
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Транзакция не найдена' });
    }
    
    res.json({
      success: true,
      message: 'Транзакция успешно удалена'
    });
  } catch (error) {
    console.error('Ошибка удаления транзакции:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении транзакции' });
  }
};

// Получение суммы транзакций по типу
exports.getTransactionSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = { user: mongoose.Types.ObjectId(req.user._id) };
    
    // Фильтрация по дате
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }
    
    const summary = await Transaction.aggregate([
      { $match: matchStage },
      { $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Преобразуем массив в объект для более удобного использования
    const result = {
      income: { total: 0, count: 0 },
      expense: { total: 0, count: 0 }
    };
    
    summary.forEach(item => {
      result[item._id] = {
        total: item.total,
        count: item.count
      };
    });
    
    // Добавляем баланс
    const income = result.income.total || 0;
    const expense = result.expense.total || 0;
    const balance = income - expense;
    
    res.json({
      success: true,
      summary: {
        income: result.income,
        expense: result.expense,
        balance
      }
    });
  } catch (error) {
    console.error('Ошибка получения сводки транзакций:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении сводки транзакций' });
  }
}; 