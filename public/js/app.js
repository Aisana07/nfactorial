// Глобальные переменные и хелперы
const API_URL = $('meta[name="api-url"]').attr('content') || '/api';

// Helper function to get JWT token (глобальная видимость не обязательна, но пусть будет здесь)
function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// Helper function for API requests (основа для apiHelper)
function _apiRequest(endpoint, method, data) {
    const token = getToken();
    return $.ajax({
        url: `${API_URL}${endpoint}`,
        method: method,
        contentType: 'application/json',
        data: data ? JSON.stringify(data) : null,
        headers: {
            'Authorization': `Bearer ${token}`
        },
        // Упрощенная обработка ошибок, основная логика будет в вызывающем коде
        // Можно добавить более детальную обработку 401/403 здесь при необходимости
        error: function(xhr) {
            console.error(`API Error (${method} ${endpoint}):`, xhr.status, xhr.responseText);
            if (xhr.status === 401 && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                console.warn('Unauthorized access detected. Redirecting to login.');
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                window.location.href = '/login?sessionExpired=true'; // Добавляем параметр для возможного сообщения
            }
            // Пробрасываем ошибку дальше, чтобы её можно было поймать в .catch()
            // throw new Error(xhr.responseJSON?.message || `API request failed with status ${xhr.status}`);
        }
    });
}

// Глобальный объект для удобных API вызовов
window.apiHelper = {
    get: function(endpoint, queryParams = null) {
        let url = endpoint;
        if (queryParams) {
            // Убедимся, что queryParams это объект, прежде чем создавать URLSearchParams
            if (typeof queryParams === 'object' && queryParams !== null) {
                 const params = new URLSearchParams(queryParams);
                 const queryString = params.toString();
                 if (queryString) {
                     url += `?${queryString}`;
                 }
            } else if (typeof queryParams === 'string') {
                 // Если queryParams уже строка, используем её
                 url += `?${queryParams}`;
            }
        }
        return _apiRequest(url, 'GET');
    },
    post: function(endpoint, data) {
        return _apiRequest(endpoint, 'POST', data);
    },
    put: function(endpoint, data) {
        return _apiRequest(endpoint, 'PUT', data);
    },
    delete: function(endpoint) {
        return _apiRequest(endpoint, 'DELETE');
    }
};

// Код, который должен выполняться после загрузки DOM
$(document).ready(function() {
    console.log('app.js: DOM готов');

    let transactionModal;

    // --- Инициализация и общие обработчики --- //

    // Sidebar toggle for mobile
    $('#sidebar-toggle').on('click', function() {
        $('#sidebar').addClass('active');
    });

    $('#close-sidebar').on('click', function() {
        $('#sidebar').removeClass('active');
    });

    // Set active state for current page link in sidebar
    const currentPath = window.location.pathname;
    $('.sidebar-nav .nav-link').each(function() {
        const linkPath = $(this).attr('href');
        // Добавляем .active если пути совпадают ИЛИ если текущий путь '/' и ссылка ведет на '/'
        if (linkPath === currentPath || (currentPath === '/' && linkPath === '/')) {
             // Удаляем active у всех перед добавлением к нужному
             $('.sidebar-nav .nav-link.active').removeClass('active');
             $(this).addClass('active');
        } else {
            $(this).removeClass('active'); // Убираем active у остальных
        }
    });

    // Logout button
    $('#logout-btn').on('click', function() {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        window.location.href = '/login';
    });

    // Update username in header (if element exists)
    async function updateUsernameInHeader() {
        const $usernameSpan = $('#username');
        if ($usernameSpan.length) {
            try {
                // Используем новый apiHelper
                const user = await window.apiHelper.get('/users/me');
                $usernameSpan.text(user.username || 'Пользователь');
            } catch (error) {
                console.error('Failed to fetch username for header:', error);
                // Можно оставить дефолтное имя или показать ошибку
                 $usernameSpan.text('Пользователь');
            }
        }
    }
    // Вызываем при загрузке страницы, если токен есть
    if (getToken()) {
        updateUsernameInHeader();
    }

    // --- Логика, связанная с модальным окном транзакций --- //

    // Initialize Transaction Modal (если элемент есть на странице)
    const transactionModalElement = document.getElementById('transactionModal');
    if (transactionModalElement) {
        transactionModal = new bootstrap.Modal(transactionModalElement);
    }

    // Open Add Transaction Modal
    // Используем делегирование на body, чтобы работало на всех страницах
    $('body').on('click', '#add-transaction-btn', function() {
        if (!transactionModal) return;
        resetTransactionForm();
        $('#transactionModalTitle').text('Добавить транзакцию');
        populateCategoryOptions('expense'); // Загружаем категории расходов по умолчанию
        transactionModal.show();
    });

    // Reset Transaction Form
    function resetTransactionForm() {
        const $form = $('#transaction-form');
        if($form.length) {
            $form[0].reset();
            $('#transaction-id').val('');
            $('#type-expense').prop('checked', true); // Default to expense
            // Устанавливаем сегодняшнюю дату
            const today = new Date().toISOString().split('T')[0];
            $('#date').val(today);
        }
    }

    // Load categories based on selected transaction type in modal
    // Добавляем проверку на существование элементов формы
    const $typeRadios = $('#transactionModal input[name="type"]');
    if ($typeRadios.length) {
        $typeRadios.on('change', function() {
            populateCategoryOptions($(this).val());
        });
    }

    // Глобальная функция для загрузки категорий в селектор (для модалки и фильтров)
    window.populateCategoryOptions = async function(type = null, selector = '#category') {
        const $categorySelect = $(selector);
        if (!$categorySelect.length) return; // Выходим, если селектор не найден

        $categorySelect.empty().prop('disabled', true).html('<option value="">Загрузка...</option>');

        try {
            let endpoint = '/categories';
            if (type) {
                endpoint += `?type=${type}`;
            }
            const response = await window.apiHelper.get(endpoint); // Получаем весь объект
            const categories = response.categories || []; // Извлекаем массив

            $categorySelect.empty(); // Очищаем перед заполнением

            if (!type) { // Если тип не указан (для фильтров), добавляем опцию "Все"
                 $categorySelect.append('<option value="">Все категории</option>');
                 const expenseGroup = $('<optgroup label="Расходы"></optgroup>');
                 const incomeGroup = $('<optgroup label="Доходы"></optgroup>');
                 categories.forEach(cat => {
                    const option = `<option value="${cat._id}">${cat.name}</option>`;
                    if (cat.type === 'expense') expenseGroup.append(option);
                    else incomeGroup.append(option);
                 });
                 if (expenseGroup.children().length > 0) $categorySelect.append(expenseGroup);
                 if (incomeGroup.children().length > 0) $categorySelect.append(incomeGroup);
            } else { // Если тип указан (для модального окна)
                $categorySelect.append('<option value="" disabled selected>Выберите категорию</option>');
                 if (categories.length > 0) {
                    categories.forEach(category => {
                        $categorySelect.append(`<option value="${category._id}">${category.name}</option>`);
                    });
                } else {
                    $categorySelect.append('<option value="" disabled>Нет категорий для типа ' + (type === 'expense' ? 'расход' : 'доход') + '</option>');
                }
            }

            if ($categorySelect.children().length === 0 || ($categorySelect.children().length === 1 && $categorySelect.children().first().val() === '')) {
                // Если после загрузки все еще пусто (или только "Все категории")
                $categorySelect.append('<option value="" disabled>Категории не найдены</option>');
            }

        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
            $categorySelect.html('<option value="" disabled>Ошибка загрузки</option>');
        } finally {
             $categorySelect.prop('disabled', false);
        }
    }

    // Save Transaction (Create or Update)
    const $saveTransactionBtn = $('#save-transaction');
    if ($saveTransactionBtn.length) {
        $saveTransactionBtn.on('click', async function() {
            const $button = $(this);
            const transactionData = {
                amount: parseFloat($('#amount').val()),
                description: $('#description').val().trim(),
                category: $('#category').val(),
                type: $('input[name="type"]:checked', '#transactionModal').val(), // Уточняем контекст
                date: $('#date').val(),
            };
            const transactionId = $('#transaction-id').val();

            // Basic Validation
            if (!transactionData.amount || isNaN(transactionData.amount) || transactionData.amount <= 0) {
                alert('Пожалуйста, введите корректную сумму.');
                return;
            }
            if (!transactionData.category) {
                alert('Пожалуйста, выберите категорию.');
                return;
            }
            if (!transactionData.date) {
                alert('Пожалуйста, выберите дату.');
                return;
            }

            const requestMethod = transactionId ? 'PUT' : 'POST';
            const requestUrl = transactionId ? `/transactions/${transactionId}` : '/transactions';

            $button.prop('disabled', true);

            try {
                await window.apiHelper[requestMethod.toLowerCase()](requestUrl, transactionData);
                transactionModal.hide();
                alert(`Транзакция ${transactionId ? 'обновлена' : 'добавлена'} успешно!`);

                // Обновляем данные на текущей странице
                if (typeof loadDashboardData === 'function') {
                    loadDashboardData();
                } else if (typeof loadTransactions === 'function') {
                    loadTransactions(window.currentFilters || {}); // Предполагаем, что transactions.js установит currentFilters в window
                }
                // Можно добавить обновление для других страниц (аналитика и т.д.) при необходимости

            } catch (error) {
                 console.error("Ошибка сохранения транзакции:", error);
                 alert('Ошибка при сохранении транзакции: ' + (error.responseJSON?.message || 'Проверьте введенные данные'));
            } finally {
                 $button.prop('disabled', false);
            }
        });
    }

    // Глобальная функция для открытия модального окна редактирования транзакции
    window.openTransactionModalForEdit = async function(transactionId) {
         if (!transactionModal) return;

        try {
            const transaction = await window.apiHelper.get(`/transactions/${transactionId}`);
            resetTransactionForm(); // Сброс формы перед заполнением

            $('#transactionModalTitle').text('Редактировать транзакцию');
            $('#transaction-id').val(transaction._id);
            $('#amount').val(transaction.amount);
            $('#description').val(transaction.description);
            $(`#transactionModal input[name="type"][value="${transaction.type}"]`).prop('checked', true);
            $('#date').val(new Date(transaction.date).toISOString().split('T')[0]);

            // Загружаем категории для нужного типа и *затем* выбираем нужную
            await populateCategoryOptions(transaction.type); // Ждем завершения загрузки
            $('#category').val(transaction.category._id || transaction.category); // Обработка случая, когда category приходит как строка ID

            transactionModal.show();

        } catch (error) {
             console.error('Ошибка загрузки транзакции для редактирования:', error);
             alert('Не удалось загрузить данные транзакции.');
        }
    }

    // Глобальная функция для удаления транзакции
    window.deleteTransaction = async function(transactionId) {
        if (!confirm('Вы уверены, что хотите удалить эту транзакцию?')) {
            return;
        }
        try {
            await window.apiHelper.delete(`/transactions/${transactionId}`);
            alert('Транзакция удалена.');

            // Удаляем элемент из DOM, если он виден
            $(`.transaction-item[data-id="${transactionId}"]`).fadeOut(300, function() { $(this).remove(); });

            // Обновляем данные на текущей странице
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            } else if (typeof loadTransactions === 'function') {
                 loadTransactions(window.currentFilters || {});
            }
             // Можно добавить обновление для других страниц (аналитика и т.д.) при необходимости

        } catch (error) {
             console.error('Ошибка удаления транзакции:', error);
             alert('Ошибка при удалении транзакции: ' + (error.responseJSON?.message || 'Попробуйте еще раз'));
        }
    }

    // --- Делегирование событий для динамически созданных элементов --- //

    // Кнопки редактирования/удаления транзакций
    $('body').on('click', '.edit-transaction', function(e) {
        e.preventDefault();
        const id = $(this).data('id');
        if(id) window.openTransactionModalForEdit(id);
    });

    $('body').on('click', '.delete-transaction', function(e) {
        e.preventDefault();
        const id = $(this).data('id');
        if(id) window.deleteTransaction(id);
    });

     // Другие глобальные инициализации или функции могут быть добавлены здесь

}); 