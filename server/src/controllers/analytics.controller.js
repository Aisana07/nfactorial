const Transaction = require('../models/transaction.model');
const Category = require('../models/category.model');
const mongoose = require('mongoose');

// Получение статистики по категориям
exports.getCategoryAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, type = 'expense' } = req.query;
    
    // Формируем условие поиска
    const matchStage = { 
      user: new mongoose.Types.ObjectId(req.user._id),
      type
    };
    
    // Фильтрация по дате
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }
    
    // Получаем статистику по категориям
    const categoryStats = await Transaction.aggregate([
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
    const total = categoryStats.reduce((sum, stat) => sum + stat.total, 0);
    
    // Добавляем проценты
    const result = categoryStats.map(stat => ({
      ...stat,
      percentage: total ? (stat.total / total) * 100 : 0
    }));
    
    res.json({
      success: true,
      categoryStats: result,
      total
    });
  } catch (error) {
    console.error('Ошибка получения аналитики по категориям:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении аналитики по категориям' });
  }
};

// Получение статистики по времени (месяцам)
exports.getTimeAnalytics = async (req, res) => {
  try {
    const { period = 'month', type, year = new Date().getFullYear() } = req.query;
    
    const matchStage = { user: new mongoose.Types.ObjectId(req.user._id) };
    
    // Фильтрация по типу транзакции
    if (type) matchStage.type = type;
    
    // Фильтрация по году
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    matchStage.date = { $gte: startDate, $lte: endDate };
    
    // Группировка по периоду
    let groupStage;
    if (period === 'month') {
      groupStage = {
        _id: { 
          month: { $month: '$date' },
          type: '$type'
        },
        total: { $sum: '$amount' }
      };
    } else if (period === 'quarter') {
      groupStage = {
        _id: { 
          quarter: { 
            $concat: [
              'Q', 
              { $toString: { $ceil: { $divide: [{ $month: '$date' }, 3] } } }
            ]
          },
          type: '$type'
        },
        total: { $sum: '$amount' }
      };
    } else if (period === 'week') {
      groupStage = {
        _id: { 
          week: { $week: '$date' },
          type: '$type'
        },
        total: { $sum: '$amount' }
      };
    }
    
    const timeStats = await Transaction.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { '_id.month': 1 } }
    ]);
    
    // Форматируем результаты
    const formattedResult = {};
    
    // Создаем массив периодов
    let periods = [];
    if (period === 'month') {
      periods = Array.from({ length: 12 }, (_, i) => ({
        index: i + 1,
        name: new Date(2000, i, 1).toLocaleString('default', { month: 'long' })
      }));
    } else if (period === 'quarter') {
      periods = [
        { index: 'Q1', name: 'Квартал 1' },
        { index: 'Q2', name: 'Квартал 2' },
        { index: 'Q3', name: 'Квартал 3' },
        { index: 'Q4', name: 'Квартал 4' }
      ];
    } else if (period === 'week') {
      // Создаем 52 недели
      periods = Array.from({ length: 52 }, (_, i) => ({
        index: i,
        name: `Неделя ${i + 1}`
      }));
    }
    
    // Инициализируем результаты
    periods.forEach(p => {
      formattedResult[p.index] = {
        name: p.name,
        income: 0,
        expense: 0,
        balance: 0
      };
    });
    
    // Заполняем данными
    timeStats.forEach(stat => {
      const periodKey = period === 'month' ? stat._id.month : stat._id[period];
      const type = stat._id.type;
      
      if (formattedResult[periodKey]) {
        formattedResult[periodKey][type] = stat.total;
        formattedResult[periodKey].balance = 
          formattedResult[periodKey].income - formattedResult[periodKey].expense;
      }
    });
    
    // Конвертируем в массив
    const chartData = Object.keys(formattedResult).map(key => ({
      period: key,
      name: formattedResult[key].name,
      income: formattedResult[key].income,
      expense: formattedResult[key].expense,
      balance: formattedResult[key].balance
    }));
    
    res.json({
      success: true,
      timeStats: chartData,
      year
    });
  } catch (error) {
    console.error('Ошибка получения аналитики по времени:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении аналитики по времени' });
  }
};

// Получение статистики сравнения периодов
exports.getComparisonAnalytics = async (req, res) => {
  try {
    const { 
      period1Start, 
      period1End, 
      period2Start, 
      period2End,
      type
    } = req.query;
    
    if (!period1Start || !period1End || !period2Start || !period2End) {
      return res.status(400).json({ message: 'Необходимо указать начало и конец обоих периодов' });
    }
    
    // Общая функция для получения статистики периода
    const getPeriodStats = async (start, end) => {
      const matchStage = { 
        user: new mongoose.Types.ObjectId(req.user._id),
        date: { $gte: new Date(start), $lte: new Date(end) }
      };
      
      // Фильтрация по типу транзакции
      if (type) matchStage.type = type;
      
      const summary = await Transaction.aggregate([
        { $match: matchStage },
        { $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Группировка по категориям
      const categoryStats = await Transaction.aggregate([
        { $match: matchStage },
        { $group: {
            _id: '$category',
            total: { $sum: '$amount' }
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
            total: 1,
            name: '$category.name',
            type: '$category.type'
          }
        },
        { $sort: { total: -1 } }
      ]);
      
      // Форматируем результат
      const summaryResult = {
        income: { total: 0, count: 0 },
        expense: { total: 0, count: 0 }
      };
      
      summary.forEach(item => {
        summaryResult[item._id] = {
          total: item.total,
          count: item.count
        };
      });
      
      // Рассчитываем баланс
      const income = summaryResult.income.total || 0;
      const expense = summaryResult.expense.total || 0;
      const balance = income - expense;
      
      return {
        summary: summaryResult,
        balance,
        categoryStats,
        period: { start, end }
      };
    };
    
    // Получаем статистику для обоих периодов
    const period1 = await getPeriodStats(period1Start, period1End);
    const period2 = await getPeriodStats(period2Start, period2End);
    
    // Рассчитываем разницу и процент изменения
    const calculateChange = (value1, value2) => {
      const difference = value2 - value1;
      const percentChange = value1 === 0 
        ? (value2 === 0 ? 0 : 100) 
        : (difference / Math.abs(value1)) * 100;
      
      return {
        value1,
        value2,
        difference,
        percentChange
      };
    };
    
    const comparison = {
      income: calculateChange(
        period1.summary.income.total || 0, 
        period2.summary.income.total || 0
      ),
      expense: calculateChange(
        period1.summary.expense.total || 0, 
        period2.summary.expense.total || 0
      ),
      balance: calculateChange(period1.balance, period2.balance)
    };
    
    res.json({
      success: true,
      period1,
      period2,
      comparison
    });
  } catch (error) {
    console.error('Ошибка получения сравнительной аналитики:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении сравнительной аналитики' });
  }
}; 