$(document).ready(function() {
    const API_URL = $('meta[name="api-url"]').attr('content') || '/api';
    let cashFlowChart = null;
    let expenseStructureChart = null;

    // Helper function to get JWT token (assuming it's in app.js or similar)
    function getToken() {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    }
    
    // Helper for API requests (assuming it's in app.js or similar)
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

    // Function to format currency
    function formatCurrency(amount) {
        return parseFloat(amount).toLocaleString('ru-RU', { style: 'currency', currency: 'KZT', minimumFractionDigits: 2 });
    }

    // Function to generate transaction list item HTML (based on partial)
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

    // Load Dashboard Data
    window.loadDashboardData = function(period = 'month') { // Made global for app.js access
        $('#transactions-loading').show();
        $('#recent-transactions-list').empty(); // Clear previous list items
        $('#no-transactions').hide();
        
        // Calculate date range based on period
        let startDate, endDate;
        const today = new Date();
        endDate = new Date(today); // Use today as end date

        if (period === 'today') {
            startDate = new Date(today.setHours(0, 0, 0, 0));
        } else if (period === 'year') {
            startDate = new Date(today.getFullYear(), 0, 1);
        } else if (period === 'month') { // Default to month
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        } else {
            // Handle custom period if implemented
            startDate = new Date(today.getFullYear(), today.getMonth(), 1); // Default to month
        }
        
        // Format dates for API query (YYYY-MM-DD)
        const queryStartDate = startDate.toISOString().split('T')[0];
        const queryEndDate = endDate.toISOString().split('T')[0];

        apiRequest(`/dashboard?startDate=${queryStartDate}&endDate=${queryEndDate}`, 'GET')
            .done(function(response) {
                if (response.success) {
                    const data = response;
                    
                    // Update Summary Cards
                    $('#balance-amount').text(formatCurrency(data.summary.balance));
                    $('#income-amount').text(formatCurrency(data.summary.income.total));
                    $('#expense-amount').text(formatCurrency(data.summary.expense.total));
                    
                    // Update Recent Transactions
                    const listElement = $('#recent-transactions-list');
                    if (data.recentTransactions && data.recentTransactions.length > 0) {
                        data.recentTransactions.forEach(tx => {
                            listElement.append(createTransactionListItem(tx));
                        });
                        $('#no-transactions').hide();
                    } else {
                        $('#no-transactions').show();
                    }
                    
                    // Update Charts
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

    // Initialize Cash Flow Chart
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

    // Initialize Expense Structure Chart
    function updateExpenseStructureChart(categoryData) {
        const ctx = document.getElementById('expenseStructureChart')?.getContext('2d');
        if (!ctx) return;

        const labels = categoryData.map(c => c.name);
        const data = categoryData.map(c => c.total);
        const backgroundColors = categoryData.map(c => c.color || '#' + Math.floor(Math.random()*16777215).toString(16)); // Use provided color or random

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

    // Date Filter Logic
    $('.date-filter .btn').on('click', function() {
        // Handle active state
        $('.date-filter .btn').removeClass('active');
        $(this).addClass('active');
        
        const period = $(this).data('period');
        
        if (period === 'custom') {
            // Implement custom date range picker if needed
            alert('Custom date range not implemented yet.');
        } else {
            loadDashboardData(period);
        }
    });

    // Initial Load
    loadDashboardData('month'); // Load default month view

}); 