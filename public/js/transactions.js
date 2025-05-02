// Placeholder for transactions page JavaScript

$(document).ready(function() {
    console.log('transactions.js загружен');
    
    const $filterSection = $('#filter-section');
    const $filterToggleBtn = $('#filter-toggle-btn');
    const $filterForm = $('#filter-form');
    const $filterType = $('#filter-type');
    const $filterCategory = $('#filter-category');
    const $filterStartDate = $('#filter-start-date');
    const $filterEndDate = $('#filter-end-date');
    const $resetFiltersBtn = $('#reset-filters-btn');

    const $transactionList = $('#all-transactions-list');
    const $loadingIndicator = $('#transactions-loading-full');
    const $noTransactionsMessage = $('#no-transactions-full');
    // const $paginationNav = $('#pagination-nav'); // Для будущей пагинации
    // const $paginationList = $('#pagination-list');

    let currentFilters = {}; // Хранение текущих фильтров

    // Локальная функция форматирования валюты для тенге
    function formatCurrencyLocal(amount) {
        // Используем ru-KZ для правильного формата тенге
        return parseFloat(amount).toLocaleString('ru-KZ', { style: 'currency', currency: 'KZT', minimumFractionDigits: 2 });
    }

    // Функция для отображения одного элемента транзакции
    // Адаптировано из dashboard.js, добавлена информация о дате и кнопки
    function renderTransactionItem(transaction) {
        const isExpense = transaction.type === 'expense';
        const amountClass = isExpense ? 'text-danger' : 'text-success';
        const amountSign = isExpense ? '-' : '+';
        const category = transaction.category || { name: 'Без категории', icon: 'fa-question-circle', color: '#888' };
        const formattedDate = new Date(transaction.date).toLocaleDateString('ru-RU');

        return `
            <div class="list-group-item transaction-item" data-id="${transaction._id}">
                <div class="row align-items-center">
                    <div class="col-auto">
                        <span class="transaction-icon" style="color: ${category.color || '#888'};">
                            <i class="${category.icon || 'fas fa-tag'} fa-lg"></i>
                        </span>
                    </div>
                    <div class="col">
                        <div class="d-flex w-100 justify-content-between mb-1">
                            <h6 class="mb-0 transaction-category">${category.name}</h6>
                            <small class="text-muted transaction-date">${formattedDate}</small>
                        </div>
                        <p class="mb-1 transaction-description">${transaction.description || ''}</p>
                    </div>
                    <div class="col-auto text-end">
                        <span class="fw-bold transaction-amount ${amountClass}">${amountSign}${formatCurrencyLocal(transaction.amount)}</span>
                        <div class="transaction-actions mt-1">
                             <button class="btn btn-sm btn-outline-primary edit-transaction" data-id="${transaction._id}" title="Редактировать">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                             <button class="btn btn-sm btn-outline-danger delete-transaction" data-id="${transaction._id}" title="Удалить">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Функция для загрузки всех категорий в фильтр
    async function loadAllCategoriesForFilter() {
        $filterCategory.empty().append('<option value="">Все категории</option>');
        try {
            // Используем существующий apiHelper из app.js
            const response = await window.apiHelper.get('/categories'); // Получаем весь объект ответа

            console.log('Ответ от /api/categories для фильтра:', response);
            const categories = response.categories || []; // Извлекаем массив категорий

            const expenseGroup = $('<optgroup label="Расходы"></optgroup>');
            const incomeGroup = $('<optgroup label="Доходы"></optgroup>');

            categories.forEach(cat => {
                const option = `<option value="${cat._id}">${cat.name}</option>`;
                if (cat.type === 'expense') {
                    expenseGroup.append(option);
                } else {
                    incomeGroup.append(option);
                }
            });

            if (expenseGroup.children().length > 0) {
                $filterCategory.append(expenseGroup);
            }
            if (incomeGroup.children().length > 0) {
                $filterCategory.append(incomeGroup);
            }

        } catch (error) {
            console.error('Ошибка загрузки категорий для фильтра:', error);
            $filterCategory.append('<option value="" disabled>Ошибка загрузки</option>');
        }
    }

    // Функция для загрузки и отображения транзакций
    async function loadTransactions(filters = {}) {
        $loadingIndicator.show();
        $noTransactionsMessage.hide();
        $transactionList.empty(); // Очищаем список перед загрузкой
        // $paginationNav.hide(); // Скрываем пагинацию

        currentFilters = filters; // Сохраняем текущие фильтры

        // Подготовка параметров запроса
        const queryParams = new URLSearchParams();
        if (filters.type) queryParams.append('type', filters.type);
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);
        // Добавить параметры пагинации, если нужно: page, limit
        // queryParams.append('limit', 10); // Пример

        try {
            // Используем существующий apiHelper из app.js
            const response = await apiHelper.get(`/transactions?${queryParams.toString()}`);
            // Предполагаем, что API возвращает массив транзакций напрямую или в response.transactions
            const transactions = Array.isArray(response) ? response : (response.transactions || []);

            if (transactions.length > 0) {
                transactions.forEach(tx => {
                    $transactionList.append(renderTransactionItem(tx));
                });
                // Показать и настроить пагинацию, если нужно
                // setupPagination(response.page, response.totalPages);
            } else {
                $noTransactionsMessage.show();
            }
        } catch (error) {
            console.error('Ошибка загрузки транзакций:', error);
            $noTransactionsMessage.show().find('p').text('Произошла ошибка при загрузке транзакций.');
        } finally {
            $loadingIndicator.hide();
        }
    }

    // Настройка пагинации (примерная реализация)
    /*
    function setupPagination(currentPage, totalPages) {
        $paginationList.empty();
        if (totalPages <= 1) {
            $paginationNav.hide();
            return;
        }

        for (let i = 1; i <= totalPages; i++) {
            const liClass = (i === currentPage) ? 'page-item active' : 'page-item';
            const li = `<li class="${liClass}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
            $paginationList.append(li);
        }
        $paginationNav.show();
    }
    */

    // --- Обработчики событий ---

    // Переключение видимости фильтров
    $filterToggleBtn.on('click', () => {
        $filterSection.slideToggle();
    });

    // Применение фильтров
    $filterForm.on('submit', (e) => {
        e.preventDefault();
        const filters = {
            type: $filterType.val(),
            category: $filterCategory.val(),
            startDate: $filterStartDate.val(),
            endDate: $filterEndDate.val(),
        };
        // Удаляем пустые значения
        Object.keys(filters).forEach(key => {
            if (!filters[key]) {
                delete filters[key];
            }
        });
        loadTransactions(filters);
    });

    // Сброс фильтров
    $resetFiltersBtn.on('click', () => {
        $filterForm[0].reset();
        loadTransactions({}); // Загружаем без фильтров
    });

    // Обработка кликов пагинации (делегирование)
    /*
    $paginationList.on('click', '.page-link', function(e) {
        e.preventDefault();
        const page = $(this).data('page');
        if (page) {
            currentFilters.page = page; // Добавляем страницу к текущим фильтрам
            loadTransactions(currentFilters);
        }
    });
    */

    // Обработчики для кнопок редактирования/удаления уже должны быть в app.js (через делегирование на body)
    // Убедимся, что renderTransactionItem добавляет классы .edit-transaction и .delete-transaction

    // Инициализация при загрузке страницы
    loadAllCategoriesForFilter(); // Загружаем категории в фильтр
    loadTransactions(); // Загружаем транзакции (без фильтров по умолчанию)

}); 