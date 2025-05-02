// Placeholder for analytics page JavaScript

$(document).ready(function() {
    console.log('analytics.js загружен');

    // Переменные для хранения экземпляров диаграмм
    let categoryExpensesChart = null;
    let monthlyTrendChart = null;

    const $categoryChartCanvas = $('#categoryExpensesChart');
    const $monthlyChartCanvas = $('#monthlyTrendChart');
    const $categoryExpensesTotal = $('#categoryExpensesTotal');
    const $periodComparisonData = $('#period-comparison-data'); // Placeholder

    // Локаль и валюта для форматирования
    const locale = 'ru-KZ'; // Используем Казахстан для тенге
    const currency = 'KZT';

    // --- Инициализация диаграмм --- //

    // Диаграмма расходов по категориям (Pie)
    function initCategoryChart(labels = [], data = [], colors = []) {
        const ctx = $categoryChartCanvas[0]?.getContext('2d');
        if (!ctx) return;

        if (categoryExpensesChart) {
            categoryExpensesChart.destroy(); // Уничтожаем старую диаграмму перед созданием новой
        }

        if (labels.length === 0) {
             // Отображаем сообщение, если данных нет
            ctx.clearRect(0, 0, $categoryChartCanvas[0].width, $categoryChartCanvas[0].height);
             ctx.font = "16px Arial";
             ctx.fillStyle = "#6c757d";
             ctx.textAlign = "center";
             ctx.fillText("Нет данных о расходах для отображения", $categoryChartCanvas[0].width / 2, $categoryChartCanvas[0].height / 2);
             $categoryExpensesTotal.text('Общие расходы: 0.00 ₸');
             return;
        }

        categoryExpensesChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Расходы',
                    data: data,
                    backgroundColor: colors.length === data.length ? colors : generateRandomColors(data.length), // Генерируем цвета, если не пришли с API
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });

        // Отображение общей суммы расходов
        const totalExpenses = data.reduce((sum, value) => sum + value, 0);
        $categoryExpensesTotal.text(`Общие расходы: ${new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(totalExpenses)}`);
    }

    // Диаграмма динамики по месяцам (Line)
    function initMonthlyChart(labels = [], incomeData = [], expenseData = []) {
        const ctx = $monthlyChartCanvas[0]?.getContext('2d');
         if (!ctx) return;

        if (monthlyTrendChart) {
            monthlyTrendChart.destroy();
        }

         if (labels.length === 0) {
            ctx.clearRect(0, 0, $monthlyChartCanvas[0].width, $monthlyChartCanvas[0].height);
             ctx.font = "16px Arial";
             ctx.fillStyle = "#6c757d";
             ctx.textAlign = "center";
             ctx.fillText("Нет данных для отображения динамики", $monthlyChartCanvas[0].width / 2, $monthlyChartCanvas[0].height / 2);
            return;
        }

        monthlyTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Доходы',
                        data: incomeData,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        tension: 0.1
                    },
                    {
                        label: 'Расходы',
                        data: expenseData,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                         ticks: { // Форматирование оси Y как валюты
                            callback: function(value, index, values) {
                                return new Intl.NumberFormat(locale, { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(value);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                     tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Загрузка данных --- //

    async function loadAnalyticsData(filters = {}) {
        // Показываем индикаторы загрузки (если они есть для графиков)
        // TODO: Добавить индикаторы загрузки для графиков, если нужно
        initCategoryChart([],[],[]); // Очищаем перед загрузкой
        initMonthlyChart([],[],[]); // Очищаем перед загрузкой
        $periodComparisonData.html('<p class="text-muted text-center">Загрузка данных...</p>');

        const queryParams = new URLSearchParams(filters).toString();

        try {
            // Запрашиваем данные для обоих графиков (или используем один эндпоинт, если он возвращает все)
            // Предположим, есть два эндпоинта
            const categoryDataPromise = apiHelper.get(`/analytics/categories?${queryParams}`);
            const monthlyDataPromise = apiHelper.get(`/analytics/time?${queryParams}`);
            // const comparisonDataPromise = apiHelper.get(`/analytics/comparison?${queryParams}`); // Для сравнения периодов

            const [categoryResponse, monthlyResponse] = await Promise.all([categoryDataPromise, monthlyDataPromise]);
            
            console.log('Ответ от /api/analytics/categories:', categoryResponse); // <-- ОТЛАДКА

            // Обработка данных для графика категорий
            if (categoryResponse && categoryResponse.categoryStats && categoryResponse.categoryStats.length > 0) {
                const stats = categoryResponse.categoryStats; // Используем правильное поле
                const labels = stats.map(item => item.name); // Используем item.name
                const data = stats.map(item => item.total); // Используем item.total
                const colors = stats.map(item => item.color || generateRandomColor()); // Используем item.color
                initCategoryChart(labels, data, colors);
            } else {
                initCategoryChart(); // Показать сообщение "Нет данных"
            }

            // Обработка данных для графика по месяцам
            if (monthlyResponse && monthlyResponse.timeStats && monthlyResponse.timeStats.length > 0) {
                // Преобразуем данные из timeStats в нужный формат
                const labels = monthlyResponse.timeStats.map(item => item.name);
                const incomeData = monthlyResponse.timeStats.map(item => item.income);
                const expenseData = monthlyResponse.timeStats.map(item => item.expense);
                
                initMonthlyChart(labels, incomeData, expenseData);
            } else {
                 initMonthlyChart(); // Показать сообщение "Нет данных"
            }

            // Обработка данных для сравнения периодов (placeholder)
            // const comparisonData = await comparisonDataPromise;
            // renderComparisonData(comparisonData);
            $periodComparisonData.html('<p class="text-muted text-center">Функционал сравнения периодов в разработке.</p>');

        } catch (error) {
            console.error("Ошибка загрузки аналитических данных:", error);
            // Показываем ошибки на графиках
            initCategoryChart();
            initMonthlyChart();
            $periodComparisonData.html('<p class="text-danger text-center">Ошибка загрузки данных для сравнения.</p>');
        }
    }

    // Вспомогательная функция для генерации случайных цветов
    function generateRandomColor() {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgb(${r}, ${g}, ${b})`;
    }
    function generateRandomColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(generateRandomColor());
        }
        return colors;
    }

    // --- Обработчики событий --- //

    // TODO: Добавить обработчики для фильтров (даты, тип и т.д.), если они будут добавлены в HTML.
    // Пример:
    // $('#analytics-filter-form').on('submit', function(e) {
    //     e.preventDefault();
    //     const filters = { /* собрать значения фильтров */ };
    //     loadAnalyticsData(filters);
    // });

    // --- Инициализация --- //
    loadAnalyticsData(); // Загружаем данные при загрузке страницы

}); 