$(document).ready(function() {
    // Получаем API URL из метатегов или используем значение по умолчанию
    const API_URL = $('meta[name="api-url"]').attr('content') || '/api';
    
    // Показать/скрыть пароль
    $('#toggle-password, #toggle-register-password').on('click', function() {
        const passwordField = $(this).closest('.input-group').find('input');
        const passwordIcon = $(this).find('i');
        
        if (passwordField.attr('type') === 'password') {
            passwordField.attr('type', 'text');
            passwordIcon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            passwordField.attr('type', 'password');
            passwordIcon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    });
    
    // Форма входа
    $('#login-form').on('submit', function(e) {
        e.preventDefault();
        
        const username = $('#username').val().trim();
        const password = $('#password').val();
        const rememberMe = $('#remember-me').is(':checked');
        
        // Валидация
        if (!username || !password) {
            showError('login-error', 'Пожалуйста, заполните все поля');
            return;
        }
        
        // Показываем spinner
        const submitBtn = $(this).find('button[type="submit"]');
        const spinner = submitBtn.find('.spinner-border');
        submitBtn.prop('disabled', true);
        spinner.show();
        
        // Отправляем запрос на сервер
        $.ajax({
            url: `${API_URL}/auth/login`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username, password }),
            success: function(response) {
                if (response.success) {
                    // Сохраняем токен в localStorage или sessionStorage
                    const storage = rememberMe ? localStorage : sessionStorage;
                    storage.setItem('token', response.token);
                    storage.setItem('user', JSON.stringify({
                        id: response.user.id,
                        username: response.user.username,
                        email: response.user.email
                    }));
                    
                    // Перенаправляем на главную страницу
                    window.location.href = '/';
                } else {
                    showError('login-error', response.message || 'Неверные учетные данные');
                }
            },
            error: function(xhr) {
                let message = 'Произошла ошибка при входе';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    message = xhr.responseJSON.message;
                }
                showError('login-error', message);
            },
            complete: function() {
                submitBtn.prop('disabled', false);
                spinner.hide();
            }
        });
    });
    
    // Форма регистрации
    $('#register-form').on('submit', function(e) {
        e.preventDefault();
        
        const username = $('#register-username').val().trim();
        const email = $('#register-email').val().trim();
        const password = $('#register-password').val();
        const confirmPassword = $('#confirm-password').val();
        
        // Валидация
        if (!username || !email || !password || !confirmPassword) {
            showError('register-error', 'Пожалуйста, заполните все поля');
            return;
        }
        
        if (username.length < 3) {
            showError('register-error', 'Имя пользователя должно содержать минимум 3 символа');
            return;
        }
        
        if (password.length < 6) {
            showError('register-error', 'Пароль должен содержать минимум 6 символов');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('register-error', 'Пароли не совпадают');
            return;
        }
        
        // Показываем spinner
        const submitBtn = $(this).find('button[type="submit"]');
        const spinner = submitBtn.find('.spinner-border');
        submitBtn.prop('disabled', true);
        spinner.show();
        
        // Отправляем запрос на сервер
        $.ajax({
            url: `${API_URL}/auth/register`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username, email, password }),
            success: function(response) {
                if (response.success) {
                    // Сохраняем токен в sessionStorage
                    sessionStorage.setItem('token', response.token);
                    sessionStorage.setItem('user', JSON.stringify({
                        id: response.user.id,
                        username: response.user.username,
                        email: response.user.email
                    }));
                    
                    // Перенаправляем на главную страницу
                    window.location.href = '/';
                } else {
                    showError('register-error', response.message || 'Ошибка регистрации');
                }
            },
            error: function(xhr) {
                let message = 'Произошла ошибка при регистрации';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    message = xhr.responseJSON.message;
                }
                showError('register-error', message);
            },
            complete: function() {
                submitBtn.prop('disabled', false);
                spinner.hide();
            }
        });
    });
    
    // Кнопка выхода
    $('#logout-btn').on('click', function() {
        // Удаляем данные из хранилища
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        
        // Перенаправляем на страницу входа
        window.location.href = '/login';
    });
    
    // Проверка авторизации на защищенных страницах
    function checkAuth() {
        // Получаем токен из localStorage или sessionStorage
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        // Если страница не login или register и нет токена, перенаправляем на страницу входа
        const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
        
        if (!isAuthPage && !token) {
            window.location.href = '/login';
            return false;
        }
        
        // Если есть токен и текущая страница - login или register, перенаправляем на главную
        if (token && isAuthPage) {
            window.location.href = '/';
            return false;
        }
        
        return true;
    }
    
    // Обновление данных пользователя в интерфейсе
    function updateUserInfo() {
        const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        
        if (user.username) {
            $('#username').text(user.username);
        }
    }
    
    // Отображение ошибки
    function showError(elementId, message) {
        const errorElement = $(`#${elementId}`);
        errorElement.text(message).show();
        
        // Скрываем сообщение через 5 секунд
        setTimeout(function() {
            errorElement.hide();
        }, 5000);
    }
    
    // Проверяем авторизацию при загрузке страницы
    if (checkAuth()) {
        updateUserInfo();
    }
}); 