const Transaction = require('../models/transaction.model');
const Category = require('../models/category.model');
const mongoose = require('mongoose');

// Общая информация для дашборда
exports.getDashboardData = async (req, res) => {
  try {
    // Получаем интервал дат (текущий месяц по умолчанию)
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    
    const { startDate = startOfMonth, endDate = endOfMonth } = req.query;
    
    // Получаем сводку доходов и расходов
    const summary = await Transaction.aggregate([
      { $match: { 
          user: new mongoose.Types.ObjectId(req.user._id),
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      { $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
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
    
    // Получаем топ категорий расходов
    const topExpenseCategories = await Transaction.aggregate([
      { $match: { 
          user: new mongoose.Types.ObjectId(req.user._id),
          type: 'expense',
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
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
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);
    
    // Получаем последние транзакции
    const recentTransactions = await Transaction.find({
      user: req.user._id,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    })
    .populate('category', 'name color icon')
    .sort({ date: -1 })
    .limit(5);
    
    // Получаем ежедневные суммы
    const dailyTotals = await Transaction.aggregate([
      { $match: { 
          user: new mongoose.Types.ObjectId(req.user._id),
          date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      { $group: {
          _id: { 
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
    
    // Форматируем ежедневные данные для графика
    const dailyData = {};
    
    dailyTotals.forEach(item => {
      const date = item._id.date;
      if (!dailyData[date]) {
        dailyData[date] = { income: 0, expense: 0 };
      }
      dailyData[date][item._id.type] = item.total;
    });
    
    const dailyChartData = Object.keys(dailyData).map(date => ({
      date,
      income: dailyData[date].income,
      expense: dailyData[date].expense,
      balance: dailyData[date].income - dailyData[date].expense
    }));
    
    res.json({
      success: true,
      summary: {
        income: summaryResult.income,
        expense: summaryResult.expense,
        balance
      },
      topExpenseCategories,
      recentTransactions,
      dailyChartData
    });
  } catch (error) {
    console.error('Ошибка получения данных дашборда:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении данных дашборда' });
  }
}; 