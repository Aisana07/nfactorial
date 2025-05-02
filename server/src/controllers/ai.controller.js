const Transaction = require('../models/transaction.model');
const Category = require('../models/category.model');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Инициализация клиента Gemini AI
// Убедитесь, что GEMINI_API_KEY установлен в .env
let genAI;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
    console.warn("GEMINI_API_KEY не найден в .env. Функционал AI будет ограничен.");
}

// Функция для получения данных о транзакциях пользователя
const getUserTransactionData = async (userId, startDate, endDate) => {
  // Формируем условие поиска
  const matchStage = { user: new mongoose.Types.ObjectId(userId) };
  
  // Фильтрация по дате
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = new Date(startDate);
    if (endDate) matchStage.date.$lte = new Date(endDate);
  }
  
  // Получаем сводку доходов и расходов
  const summary = await Transaction.aggregate([
    { $match: matchStage },
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
  
  // Получаем статистику по категориям
  const categoryStats = await Transaction.aggregate([
    { $match: { ...matchStage, type: 'expense' } },
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
        type: '$category.type'
      }
    },
    { $sort: { total: -1 } }
  ]);
  
  // Получаем последние транзакции
  const recentTransactions = await Transaction.find(matchStage)
    .populate('category', 'name')
    .sort({ date: -1 })
    .limit(30)
    .lean();
  
  return {
    summary: summaryResult,
    balance,
    categoryStats,
    recentTransactions
  };
};

// Функция для генерации бюджетного анализа и советов
const generateBudgetAnalysis = (data) => {
  // Определяем основные финансовые показатели
  const { summary, balance, categoryStats } = data;
  const income = summary.income.total || 0;
  const expense = summary.expense.total || 0;
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  
  // Анализ финансового состояния
  let financialStatus = '';
  
  if (balance < 0) {
    financialStatus = 'Ваши расходы превышают доходы. Рекомендуется пересмотреть бюджет и сократить необязательные расходы.';
  } else if (savingsRate < 10) {
    financialStatus = 'Вы тратите почти столько же, сколько зарабатываете. Рекомендуется увеличить сбережения до 10-20% от дохода.';
  } else if (savingsRate < 20) {
    financialStatus = 'У вас приемлемый уровень сбережений, но есть потенциал для улучшения финансового положения.';
  } else {
    financialStatus = 'У вас хороший уровень сбережений. Вы эффективно управляете своими финансами.';
  }
  
  // Анализ категорий расходов
  let categoryAnalysis = '';
  
  if (categoryStats.length > 0) {
    const topCategory = categoryStats[0];
    const topCategoryPercentage = expense > 0 ? (topCategory.total / expense) * 100 : 0;
    
    categoryAnalysis = `Ваша самая большая категория расходов - "${topCategory.name}" (${topCategory.total.toFixed(2)} руб., ${topCategoryPercentage.toFixed(1)}% от всех расходов).`;
    
    if (topCategoryPercentage > 30) {
      categoryAnalysis += ' Это значительная доля ваших расходов. Рассмотрите возможности оптимизации в этой категории.';
    }
  }
  
  // Рекомендации по оптимизации бюджета
  const recommendations = [];
  
  if (balance < 0) {
    recommendations.push('Сократите необязательные расходы, такие как развлечения и питание вне дома.');
    recommendations.push('Пересмотрите свои подписки и регулярные платежи, отмените ненужные.');
  }
  
  if (savingsRate < 20) {
    recommendations.push('Создайте бюджет с четким планом сбережений, откладывайте деньги в начале месяца, а не в конце.');
    recommendations.push('Стремитесь к сбережению 20% вашего дохода для финансовой стабильности.');
  }
  
  // Добавляем общие рекомендации
  recommendations.push('Создайте резервный фонд на случай непредвиденных ситуаций в размере 3-6 месячных расходов.');
  recommendations.push('Инвестируйте свободные средства для защиты от инфляции и получения пассивного дохода.');
  
  // Формируем общий анализ
  const analysis = {
    summary: `Доход: ${income.toFixed(2)} руб., Расходы: ${expense.toFixed(2)} руб., Баланс: ${balance.toFixed(2)} руб.`,
    savingsRate: `Норма сбережений: ${savingsRate.toFixed(1)}%`,
    financialStatus,
    categoryAnalysis,
    recommendations
  };
  
  return analysis;
};

// Получение персонализированного финансового анализа
exports.getBudgetAnalysis = async (req, res) => {
    if (!genAI) {
        return res.status(503).json({ message: 'Сервис AI временно недоступен (ключ API не настроен).' });
    }

    try {
        const { startDate, endDate } = req.query;
        const defaultStartDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const defaultEndDate = new Date();

        // Получаем данные пользователя
        const userData = await getUserTransactionData(
            req.user._id,
            startDate || defaultStartDate,
            endDate || defaultEndDate
        );

        if (!userData || (!userData.summary.income.total && !userData.summary.expense.total)) {
             return res.json({ 
                success: true, 
                analysisText: "Недостаточно данных для анализа. Пожалуйста, добавьте транзакции."
            });
        }

        // Формируем промпт для Gemini
        const prompt = `
Ты - финансовый помощник BudgetBuddy. Проанализируй следующие финансовые данные пользователя за период с ${startDate ? new Date(startDate).toLocaleDateString('ru-RU') : new Date(defaultStartDate).toLocaleDateString('ru-RU')} по ${endDate ? new Date(endDate).toLocaleDateString('ru-RU') : new Date(defaultEndDate).toLocaleDateString('ru-RU')}:

*   Общий доход: ${userData.summary.income.total.toFixed(2)} руб.
*   Общие расходы: ${userData.summary.expense.total.toFixed(2)} руб.
*   Баланс (Доход - Расход): ${userData.balance.toFixed(2)} руб.
*   Статистика по категориям расходов (топ 3): 
    ${userData.categoryStats.slice(0, 3).map(c => `- ${c.name}: ${c.total.toFixed(2)} руб.`).join('\n    ') || '- Нет расходов'}

Дай краткий (2-3 абзаца) финансовый анализ и 2-3 практических совета по улучшению финансового положения пользователя на основе этих данных. Будь позитивным и ободряющим. Не используй markdown.
`;

        // Вызываем модель Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro"});
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const analysisText = await response.text();

        res.json({
            success: true,
            analysisText: analysisText || "Не удалось сгенерировать анализ. Попробуйте позже."
        });

    } catch (error) {
        console.error('Ошибка при вызове Gemini API для анализа:', error);
        // Возвращаем ошибку или стандартное сообщение
        res.status(500).json({ message: 'Ошибка сервера при генерации AI анализа.', error: error.message });
    }
};

// Ответ на вопрос пользователя о финансах
exports.askFinanceQuestion = async (req, res) => {
    if (!genAI) {
        return res.status(503).json({ message: 'Сервис AI временно недоступен (ключ API не настроен).' });
    }

    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ message: 'Необходимо указать вопрос' });
        }

        // Получаем данные пользователя за последние 3 месяца (для контекста)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const userData = await getUserTransactionData(req.user._id, threeMonthsAgo, new Date());

        // Формируем промпт для Gemini
         const contextPrompt = `
Контекст: Финансовые данные пользователя за последние 3 месяца:
*   Доход: ${userData.summary.income.total.toFixed(2)} руб.
*   Расходы: ${userData.summary.expense.total.toFixed(2)} руб.
*   Баланс: ${userData.balance.toFixed(2)} руб.
*   Топ категория расходов: ${userData.categoryStats.length > 0 ? `${userData.categoryStats[0].name} (${userData.categoryStats[0].total.toFixed(2)} руб.)` : 'Нет данных'}

Вопрос пользователя: ${question}

Инструкция: Ты - финансовый помощник BudgetBuddy. Ответь на вопрос пользователя кратко и по существу, основываясь на предоставленном финансовом контексте. Если вопрос не связан с финансами или предоставленными данными, вежливо откажись отвечать на него. Не используй markdown.
`;
        
        console.log("AI Controller: Отправка запроса к Gemini...");

        // Вызываем модель Gemini (используем flash для скорости)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await model.generateContent(contextPrompt);
        
        console.log("AI Controller: Получен результат от Gemini.");
        
        const response = await result.response;
        
        console.log("AI Controller: Полный ответ от Gemini:", JSON.stringify(response, null, 2));
        
        const answer = await response.text();
        
        console.log("AI Controller: Извлеченный текст ответа:", answer);

        console.log("AI Controller: Отправка ответа клиенту...");
        
        res.json({
            success: true,
            question,
            answer: answer || "Извините, не могу сейчас ответить на ваш вопрос."
        });

    } catch (error) {
        console.error('Ошибка при вызове Gemini API для ответа на вопрос:', error);
        res.status(500).json({ message: 'Ошибка сервера при обработке AI вопроса.', error: error.message });
    }
}; 