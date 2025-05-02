// Реализация логики для страницы настроек пользователя

$(document).ready(function() {
    console.log('settings.js загружен');

    // Форма профиля
    const $profileForm = $('#profile-settings-form');
    const $usernameInput = $('#settings-username');
    const $emailInput = $('#settings-email');
    const $saveProfileBtn = $profileForm.find('button[type="submit"]');

    // Форма смены пароля
    const $passwordForm = $('#password-settings-form');
    const $currentPasswordInput = $('#current-password');
    const $newPasswordInput = $('#new-password');
    const $confirmPasswordInput = $('#confirm-new-password');
    const $changePasswordBtn = $passwordForm.find('button[type="submit"]');

    // Кнопка удаления аккаунта
    const $deleteAccountBtn = $('#delete-account-btn');

    // Вспомогательная функция для отображения уведомлений (можно улучшить)
    function showNotification(message, type = 'success') {
        // Простая реализация с alert, можно заменить на более красивый компонент
        const prefix = type === 'success' ? 'Успех:' : 'Ошибка:';
        alert(`${prefix} ${message}`);
    }

    // Функция для загрузки профиля пользователя
    async function loadUserProfile() {
        try {
            // Предполагаем, что apiHelper и эндпоинт /users/me существуют
            const user = await apiHelper.get('/users/me');
            $usernameInput.val(user.username);
            $emailInput.val(user.email);
        } catch (error) {
            console.error("Ошибка загрузки профиля:", error);
            showNotification("Не удалось загрузить данные профиля.", 'danger');
            // Возможно, стоит заблокировать формы, если профиль не загружен
             $saveProfileBtn.prop('disabled', true);
             $changePasswordBtn.prop('disabled', true);
        }
    }

    // Обработчик сохранения профиля
    $profileForm.on('submit', async function(e) {
        e.preventDefault();
        const newUsername = $usernameInput.val().trim();
        const newEmail = $emailInput.val().trim();

        if (!newUsername || !newEmail) {
            showNotification('Имя пользователя и Email не могут быть пустыми.', 'danger');
            return;
        }

        $saveProfileBtn.prop('disabled', true);
        try {
            await apiHelper.put('/users/me', { username: newUsername, email: newEmail });
            showNotification('Профиль успешно обновлен.');
            // Обновляем имя пользователя в шапке (если оно там есть)
            $('#username').text(newUsername);
        } catch (error) {
            console.error("Ошибка обновления профиля:", error);
            const message = error.responseJSON?.message || "Не удалось обновить профиль.";
            showNotification(message, 'danger');
        } finally {
            $saveProfileBtn.prop('disabled', false);
        }
    });

    // Обработчик смены пароля
    $passwordForm.on('submit', async function(e) {
        e.preventDefault();
        const currentPassword = $currentPasswordInput.val();
        const newPassword = $newPasswordInput.val();
        const confirmPassword = $confirmPasswordInput.val();

        if (!currentPassword || !newPassword || !confirmPassword) {
            showNotification('Пожалуйста, заполните все поля для смены пароля.', 'danger');
            return;
        }

        if (newPassword.length < 6) {
             showNotification('Новый пароль должен быть не менее 6 символов.', 'danger');
             return;
        }

        if (newPassword !== confirmPassword) {
            showNotification('Новый пароль и подтверждение не совпадают.', 'danger');
            return;
        }

        $changePasswordBtn.prop('disabled', true);
        try {
            // Предполагаем эндпоинт /auth/change-password
            await apiHelper.put('/auth/change-password', { currentPassword, newPassword });
            showNotification('Пароль успешно изменен.');
            $passwordForm[0].reset(); // Очищаем форму
        } catch (error) {
            console.error("Ошибка смены пароля:", error);
            const message = error.responseJSON?.message || "Не удалось сменить пароль. Проверьте текущий пароль.";
            showNotification(message, 'danger');
        } finally {
            $changePasswordBtn.prop('disabled', false);
        }
    });

    // Обработчик удаления аккаунта
    $deleteAccountBtn.on('click', async function() {
        if (!confirm('Вы уверены, что хотите удалить свой аккаунт? Это действие необратимо!')) {
            return;
        }
         if (!confirm('ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ: Все ваши данные будут удалены навсегда. Продолжить?')) {
            return;
        }

        $deleteAccountBtn.prop('disabled', true).text('Удаление...');
        try {
             await apiHelper.delete('/users/me');
             // Очищаем токен и перенаправляем на логин
             localStorage.removeItem('token');
             sessionStorage.removeItem('token');
             showNotification('Аккаунт успешно удален.');
             window.location.href = '/login';
        } catch (error) {
            console.error("Ошибка удаления аккаунта:", error);
             const message = error.responseJSON?.message || "Не удалось удалить аккаунт.";
             showNotification(message, 'danger');
             $deleteAccountBtn.prop('disabled', false).text('Удалить аккаунт');
        }
    });

    // Инициализация
    loadUserProfile();

}); 