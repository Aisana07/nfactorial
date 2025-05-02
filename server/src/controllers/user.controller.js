const User = require('../models/user.model');   
const mongoose = require('mongoose');

// @desc    Получить профиль текущего пользователя
// @route   GET /api/users/me
// @access  Private
exports.getUserProfile = async (req, res) => {
    try {
        // req.user добавляется middleware authenticate
        // Выбираем только нужные поля, исключая пароль
        const userProfile = {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            // Добавьте другие поля, если нужно, например, createdAt
            createdAt: req.user.createdAt 
        };
        res.status(200).json(userProfile);
    } catch (error) {
        console.error('Ошибка при получении профиля пользователя:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении профиля.' });
    }
};

// @desc    Обновить профиль текущего пользователя
// @route   PUT /api/users/me
// @access  Private
exports.updateUserProfile = async (req, res) => {
    const { username, email } = req.body;
    
    if (!username || !email) {
        return res.status(400).json({ message: 'Имя пользователя и email обязательны.' });
    }

    try {
        const userId = req.user._id;
        
        // Проверка, не занят ли новый email или username другим пользователем
        const existingUser = await User.findOne({
             $or: [{ email: email }, { username: username }], 
             _id: { $ne: userId } // Исключаем текущего пользователя из проверки
            });

        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(400).json({ message: 'Этот email уже используется.' });
            }
            if (existingUser.username === username) {
                 return res.status(400).json({ message: 'Это имя пользователя уже занято.' });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { username: username, email: email } },
            { new: true, runValidators: true, context: 'query' } // runValidators для проверки email
        ).select('-password'); // Исключаем пароль из результата

        if (!updatedUser) {
            return res.status(404).json({ message: 'Пользователь не найден.' });
        }

        res.status(200).json({
            id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email
        });

    } catch (error) {
        console.error('Ошибка при обновлении профиля:', error);
         if (error.name === 'ValidationError') {
            return res.status(400).json({ message: `Ошибка валидации: ${error.message}` });
        }
        res.status(500).json({ message: 'Ошибка сервера при обновлении профиля.' });
    }
};

// @desc    Удалить аккаунт текущего пользователя
// @route   DELETE /api/users/me
// @access  Private
exports.deleteUserAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // TODO: Перед удалением пользователя, возможно, стоит удалить связанные с ним данные?
        // Например, транзакции, категории? Или сделать их анонимными?
        // Это зависит от требований приложения. Пока просто удаляем пользователя.
        
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ message: 'Пользователь не найден.' });
        }
        
        // Можно добавить логику для очистки JWT токена на клиенте (хотя это задача клиента)

        res.status(200).json({ message: 'Аккаунт успешно удален.' });

    } catch (error) {
         console.error('Ошибка при удалении аккаунта:', error);
         res.status(500).json({ message: 'Ошибка сервера при удалении аккаунта.' });
    }
};
