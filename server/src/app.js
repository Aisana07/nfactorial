const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://code.jquery.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'] 
    }
  }
}));

// Статические файлы
app.use(express.static(path.join(__dirname, '../../public')));

// Импорт маршрутов API
const authRoutes = require('./routes/auth.routes');
const transactionRoutes = require('./routes/transaction.routes');
const categoryRoutes = require('./routes/category.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const aiRoutes = require('./routes/ai.routes');
const userRoutes = require('./routes/user.routes');

// Использование маршрутов API
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);

// Обслуживание HTML файлов для маршрутов фронтенда
const publicPath = path.join(__dirname, '../../public');

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(publicPath, 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(publicPath, 'register.html'));
});

// Обслуживание других страниц фронтенда
app.get('/transactions', (req, res) => {
  res.sendFile(path.join(publicPath, 'transactions.html'));
});
app.get('/categories', (req, res) => {
  res.sendFile(path.join(publicPath, 'categories.html'));
});
app.get('/analytics', (req, res) => {
  res.sendFile(path.join(publicPath, 'analytics.html'));
});
app.get('/ai-assistant', (req, res) => {
  res.sendFile(path.join(publicPath, 'ai-assistant.html'));
});
app.get('/settings', (req, res) => {
  res.sendFile(path.join(publicPath, 'settings.html'));
});

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB database');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Middleware для обработки ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Проверяем, ожидает ли запрос HTML или JSON
  if (req.accepts('html')) {
      // Отправляем общую HTML страницу ошибки или делаем редирект
      res.status(err.status || 500).send('Internal Server Error'); 
  } else {
      res.status(err.status || 500).json({
        message: err.message || 'Внутренняя ошибка сервера'
      });
  }
});

module.exports = app; 