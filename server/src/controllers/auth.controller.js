const mongoose = require('mongoose');
const User = mongoose.models.User || require('../models/user.model');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Регистрация нового пользователя
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Проверка на существующего пользователя
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'Пользователь с таким email или именем уже существует' 
      });
    }

    // Создание нового пользователя
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Генерация токена
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ message: 'Ошибка сервера при регистрации' });
  }
};

// Вход пользователя
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Поиск пользователя по имени
    const user = await User.findOne({ 
      $or: [{ email: username }, { username }] 
    });

    if (!user) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    // Проверка пароля
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    // Генерация токена
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ message: 'Ошибка сервера при входе' });
  }
};

// Получение данных о текущем пользователе
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении профиля' });
  }
};

// Обновление профиля
exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    
    // Проверка на существующий email или username, исключая текущего пользователя
    if (username || email) {
      const existingUser = await User.findOne({
        $and: [
          { _id: { $ne: req.user._id } },
          { $or: [
            { username: username || '' },
            { email: email || '' }
          ]}
        ]
      });

      if (existingUser) {
        return res.status(400).json({ 
          message: 'Этот email или имя пользователя уже используется' 
        });
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении профиля' });
  }
}; 