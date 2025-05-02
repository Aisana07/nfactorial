const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = mongoose.models.User || require('../models/user.model');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Требуется аутентификация' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Ошибка аутентификации:', error);
    res.status(401).json({ message: 'Пожалуйста, авторизуйтесь' });
  }
};

const checkAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Доступ запрещен' });
  }
  next();
};

module.exports = { authenticate, checkAdmin }; 