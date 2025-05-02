const Category = require('../models/category.model');
const Transaction = require('../models/transaction.model');

// Создание новой категории
exports.createCategory = async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;
    
    // Проверка на дубликат категории
    const existingCategory = await Category.findOne({
      name,
      type,
      user: req.user._id
    });
    
    if (existingCategory) {
      return res.status(400).json({ message: 'Категория с таким названием уже существует' });
    }
    
    const category = new Category({
      name,
      type,
      color,
      icon,
      user: req.user._id
    });
    
    await category.save();
    
    res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Ошибка создания категории:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании категории' });
  }
};

// Получение всех категорий пользователя
exports.getCategories = async (req, res) => {
  try {
    const { type } = req.query;
    const query = { user: req.user._id };
    
    // Фильтрация по типу
    if (type) query.type = type;
    
    const categories = await Category.find(query).sort({ name: 1 });
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Ошибка получения категорий:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении категорий' });
  }
};

// Получение категории по ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Категория не найдена' });
    }
    
    res.json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Ошибка получения категории:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении категории' });
  }
};

// Обновление категории
exports.updateCategory = async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    
    // Проверка на дубликат имени
    if (name) {
      const existingCategory = await Category.findOne({
        name,
        type: req.body.type || undefined,
        user: req.user._id,
        _id: { $ne: req.params.id }
      });
      
      if (existingCategory) {
        return res.status(400).json({ message: 'Категория с таким названием уже существует' });
      }
    }
    
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({ message: 'Категория не найдена' });
    }
    
    res.json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Ошибка обновления категории:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении категории' });
  }
};

// Удаление категории
exports.deleteCategory = async (req, res) => {
  try {
    // Проверяем, используется ли категория в транзакциях
    const hasTransactions = await Transaction.findOne({
      category: req.params.id,
      user: req.user._id
    });
    
    if (hasTransactions) {
      return res.status(400).json({ 
        message: 'Нельзя удалить категорию, которая используется в транзакциях',
        tip: 'Сначала удалите или измените все транзакции с этой категорией'
      });
    }
    
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Категория не найдена' });
    }
    
    res.json({
      success: true,
      message: 'Категория успешно удалена'
    });
  } catch (error) {
    console.error('Ошибка удаления категории:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении категории' });
  }
};

// Получение статистики по категориям
exports.getCategoryStats = async (req, res) => {
  try {
    const { startDate, endDate, type = 'expense' } = req.query;
    
    const matchStage = { 
      user: req.user._id,
      type
    };
    
    // Фильтрация по дате
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }
    
    const stats = await Transaction.aggregate([
      { $match: matchStage },
      { $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      { $project: {
          _id: 1,
          total: 1,
          count: 1,
          name: '$category.name',
          color: '$category.color',
          icon: '$category.icon'
        }
      },
      { $sort: { total: -1 } }
    ]);
    
    // Рассчитываем общую сумму для процентов
    const total = stats.reduce((sum, stat) => sum + stat.total, 0);
    
    // Добавляем проценты в каждую категорию
    const result = stats.map(stat => ({
      ...stat,
      percentage: total ? (stat.total / total) * 100 : 0
    }));
    
    res.json({
      success: true,
      stats: result,
      total
    });
  } catch (error) {
    console.error('Ошибка получения статистики категорий:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении статистики категорий' });
  }
}; 