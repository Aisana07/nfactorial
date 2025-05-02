$(document).ready(function() {
    const API_URL = $('meta[name="api-url"]').attr('content') || '/api';
    let cashFlowChart = null;
    let expenseStructureChart = null;

    // Вспомогательная функция для получения JWT токена
    function getToken() {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    }
    
    // Вспомогательная функция для API запросов
    function apiRequest(endpoint, method, data) {
        const token = getToken();
        return $.ajax({
            url: `${API_URL}${endpoint}`,
            method: method,
            contentType: 'application/json',
            data: data ? JSON.stringify(data) : null,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            error: function(xhr) {
                console.error(`API Error (${method} ${endpoint}):`, xhr.status, xhr.responseText);
                if (xhr.status === 401 && window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        });
    }

    // Функция для форматирования валюты
    function formatCurrency(amount) {
        return parseFloat(amount).toLocaleString('ru-RU', { style: 'currency', currency: 'KZT', minimumFractionDigits: 2 });
    }

    // Функция для создания HTML-элемента списка транзакций (на основе partial)
    function createTransactionListItem(transaction) {
        const descriptionHtml = transaction.description 
            ? `<p class="transaction-description">${transaction.description}</p>` 
            : '';
        const amountClass = transaction.type === 'income' ? 'positive' : 'negative';
        const amountPrefix = transaction.type === 'income' ? '+' : '-';
        
        return `
            <div class="transaction-item" data-id="${transaction._id}">
                <div class="transaction-icon" style="background-color: ${transaction.category.color || '#3498db'}">
                    <i class="fas ${transaction.category.icon || 'fa-tag'}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-primary">
                        <h5 class="transaction-category">${transaction.category.name || 'Без категории'}</h5>
                        <span class="transaction-amount ${amountClass}">
                            ${amountPrefix} ${formatCurrency(transaction.amount)}
                        </span>
                    </div>
                    <div class="transaction-secondary">
                        ${descriptionHtml}
                        <span class="transaction-date">${new Date(transaction.date).toLocaleDateString('ru-RU')}</span>
                    </div>
                </div>
                <div class="transaction-actions dropdown">
                    <button class="btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item edit-transaction" href="#" data-id="${transaction._id}">Редактировать</a></li>
                        <li><a class="dropdown-item delete-transaction" href="#" data-id="${transaction._id}">Удалить</a></li>
                    </ul>
                </div>
            </div>
        `;
    }

    // Загрузка данных для дашборда
    window.loadDashboardData = function(period = 'month') { 
        $('#transactions-loading').show();
        $('#recent-transactions-list').empty(); 
        $('#no-transactions').hide();
        
        // Рассчитываем диапазон дат на основе периода
        let startDate, endDate;
        const today = new Date();
        endDate = new Date(today); 

        if (period === 'today') {
            startDate = new Date(today.setHours(0, 0, 0, 0));
        } else if (period === 'year') {
            startDate = new Date(today.getFullYear(), 0, 1);
        } else if (period === 'month') { 
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        } else {
            // Обработка произвольного периода
            startDate = new Date(today.getFullYear(), today.getMonth(), 1); 
        }
        
        // Форматируем даты для API запроса (ГГГГ-ММ-ДД)
        const queryStartDate = startDate.toISOString().split('T')[0];
        const queryEndDate = endDate.toISOString().split('T')[0];

        apiRequest(`/dashboard?startDate=${queryStartDate}&endDate=${queryEndDate}`, 'GET')
            .done(function(response) {
                if (response.success) {
                    const data = response;
                    
                    // Обновление сводных карточек
                    $('#balance-amount').text(formatCurrency(data.summary.balance));
                    $('#income-amount').text(formatCurrency(data.summary.income.total));
                    $('#expense-amount').text(formatCurrency(data.summary.expense.total));
                    
                    // Обновление последних транзакций
                    const listElement = $('#recent-transactions-list');
                    if (data.recentTransactions && data.recentTransactions.length > 0) {
                        data.recentTransactions.forEach(tx => {
                            listElement.append(createTransactionListItem(tx));
                        });
                        $('#no-transactions').hide();
                    } else {
                        $('#no-transactions').show();
                    }
                    
                    // Обновление графиков
                    updateCashFlowChart(data.dailyChartData || []);
                    updateExpenseStructureChart(data.topExpenseCategories || []);
                } else {
                    console.error('Failed to load dashboard data:', response.message);
                    $('#no-transactions').text('Не удалось загрузить данные').show();
                }
            })
            .fail(function() {
                console.error('API request failed');
                 $('#no-transactions').text('Ошибка при загрузке данных').show();
            })
            .always(function(){
                $('#transactions-loading').hide();
            });
    }

    // Инициализация графика движения средств
    function updateCashFlowChart(dailyData) {
        const ctx = document.getElementById('cashFlowChart')?.getContext('2d');
        if (!ctx) return;

        const labels = dailyData.map(d => new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
        const incomeData = dailyData.map(d => d.income);
        const expenseData = dailyData.map(d => d.expense);

        if (cashFlowChart) {
            cashFlowChart.data.labels = labels;
            cashFlowChart.data.datasets[0].data = incomeData;
            cashFlowChart.data.datasets[1].data = expenseData;
            cashFlowChart.update();
        } else {
            cashFlowChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Доходы',
                            data: incomeData,
                            borderColor: '#2ecc71', 
                            backgroundColor: 'rgba(46, 204, 113, 0.1)',
                            fill: true,
                            tension: 0.1
                        },
                        {
                            label: 'Расходы',
                            data: expenseData,
                            borderColor: '#e74c3c',
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                            fill: true,
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatCurrency(value).replace(/[,.]00\s*₸/, '').replace(/\s*₸/, '');
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += formatCurrency(context.parsed.y);
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // Инициализация графика структуры расходов
    function updateExpenseStructureChart(categoryData) {
        const ctx = document.getElementById('expenseStructureChart')?.getContext('2d');
        if (!ctx) return;

        const labels = categoryData.map(c => c.name);
        const data = categoryData.map(c => c.total);
        const backgroundColors = categoryData.map(c => c.color || '#' + Math.floor(Math.random()*16777215).toString(16)); // Используем предоставленный цвет или случайный

        if (expenseStructureChart) {
            expenseStructureChart.data.labels = labels;
            expenseStructureChart.data.datasets[0].data = data;
            expenseStructureChart.data.datasets[0].backgroundColor = backgroundColors;
            expenseStructureChart.update();
        } else {
            expenseStructureChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Расходы по категориям',
                        data: data,
                        backgroundColor: backgroundColors,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        },
                        tooltip: {
                             callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += formatCurrency(context.parsed);
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // Обработчик редактирования транзакции (с делегированием событий)
    $('#recent-transactions-list').on('click', '.edit-transaction', function(e) {
        e.preventDefault();
        const transactionId = $(this).data('id');
        
        // Получаем данные транзакции для заполнения формы
        apiRequest(`/transactions/${transactionId}`, 'GET')
            .done(function(tx) {
                $('#description').val(tx.description);
                $('#date').val(new Date(tx.date).toISOString().split('T')[0]);
                
                // Загружаем и выбираем нужную категорию
                populateCategoryOptions(tx.type).then(() => {
                   $('#category').val(tx.category._id || tx.category); // Учитываем, что category может быть ID или объектом
                });
                
                $('#transactionModalTitle').text('Редактировать транзакцию');
                const transactionModalInstance = bootstrap.Modal.getInstance(document.getElementById('transactionModal'));
                if (transactionModalInstance) {
                    transactionModalInstance.show();
                } else {
                    // Fallback, если экземпляр не найден
                     new bootstrap.Modal(document.getElementById('transactionModal')).show();
                }
            })
            .fail(function() {
                console.error('API request failed');
            });
    });

    // Обработчик удаления транзакции (с делегированием событий)
    $('#recent-transactions-list').on('click', '.delete-transaction', function(e) {
        e.preventDefault();
        const transactionId = $(this).data('id');
        
        // Подтверждаем удаление
        if (confirm('Вы уверены, что хотите удалить эту транзакцию?')) {
            apiRequest(`/transactions/${transactionId}`, 'DELETE')
                .done(function() {
                    // Удаляем элемент из списка
                    $(`[data-id="${transactionId}"]`).remove();
                    $('#no-transactions').hide();
                })
                .fail(function() {
                    console.error('API request failed');
                });
        }
    });

    // Первичная загрузка данных
    loadDashboardData('month'); // Загружаем данные за текущий месяц по умолчанию

    // Кнопки фильтра периода
    $('.date-filter button').on('click', function() {
        const period = $(this).data('period');
        // Обработка активного состояния
        $('.date-filter button').removeClass('active');
        $(this).addClass('active');
        
        if (period === 'custom') {
            // Реализация выбора произвольного диапазона дат
            alert('Custom date range not implemented yet.');
        } else {
            loadDashboardData(period);
        }
    });
}); 