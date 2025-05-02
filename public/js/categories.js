// Реализация логики для страницы управления категориями

$(document).ready(function() {
    console.log('categories.js загружен');

    const categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
    const $categoryForm = $('#category-form');
    const $categoryId = $('#category-id');
    const $categoryTypeExpense = $('#category-type-expense');
    const $categoryTypeIncome = $('#category-type-income');
    const $categoryName = $('#category-name');
    const $categoryColor = $('#category-color');
    const $categoryIconInput = $('#category-icon'); // Скрытое поле
    const $iconPickerGrid = $('#icon-picker-grid');
    const $selectedIconPreview = $('#selected-icon-preview i'); // Обращаемся к <i> внутри span
    const $saveCategoryBtn = $('#save-category');

    const $expenseList = $('#expense-category-list');
    const $incomeList = $('#income-category-list');
    const $expenseLoading = $('#expense-loading');
    const $incomeLoading = $('#income-loading');
    const $noExpenseCategories = $('#no-expense-categories');
    const $noIncomeCategories = $('#no-income-categories');

    // Набор иконок для выбора
    const availableIcons = [
        'fas fa-tag', 'fas fa-utensils', 'fas fa-shopping-cart', 'fas fa-car', 'fas fa-bus',
        'fas fa-house', 'fas fa-bolt', 'fas fa-file-invoice-dollar', 'fas fa-money-bill-wave',
        'fas fa-gift', 'fas fa-film', 'fas fa-gamepad', 'fas fa-plane', 'fas fa-heart', 'fas fa-briefcase',
        'fas fa-graduation-cap', 'fas fa-wrench', 'fas fa-pills', 'fas fa-dog', 'fas fa-question',
        'fas fa-sack-dollar', 'fas fa-coins', 'fas fa-piggy-bank', 'fas fa-chart-line', 'fas fa-landmark'
        // Добавьте или измените иконки по необходимости
    ];
    const defaultIcon = 'fas fa-tag';

    // Функция для отображения сетки выбора иконок
    function renderIconPicker(selectedIconClass = defaultIcon) {
        $iconPickerGrid.empty(); // Очищаем предыдущие иконки
        availableIcons.forEach(iconClass => {
            const isSelected = iconClass === selectedIconClass;
            const $iconOption = $('<span>')
                .addClass('icon-option')
                .attr('data-icon-class', iconClass)
                .attr('title', iconClass.replace('fas fa-', '')) // Всплывающая подсказка
                .html(`<i class="${iconClass}"></i>`);

            if (isSelected) {
                $iconOption.addClass('selected');
            }
            $iconPickerGrid.append($iconOption);
        });
        // Устанавливаем начальное значение скрытого поля и предпросмотра
        updateSelectedIcon(selectedIconClass);
    }

    // Функция для обновления выбранной иконки
    function updateSelectedIcon(iconClass) {
        $categoryIconInput.val(iconClass); // Обновляем скрытое поле
        $selectedIconPreview.attr('class', iconClass || defaultIcon); // Обновляем предпросмотр
        // Обновляем выделение в сетке
        $iconPickerGrid.find('.icon-option').removeClass('selected');
        $iconPickerGrid.find(`.icon-option[data-icon-class="${iconClass}"]`).addClass('selected');
    }

    // Обработчик клика по иконке в сетке (делегирование)
    $iconPickerGrid.on('click', '.icon-option', function() {
        const selectedClass = $(this).data('icon-class');
        updateSelectedIcon(selectedClass);
    });

    // Функция для отображения одного элемента категории
    function renderCategoryItem(category) {
        return `
            <div class="category-item list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                 data-id="${category._id}"
                 data-name="${category.name}"
                 data-type="${category.type}"
                 data-color="${category.color}"
                 data-icon="${category.icon || defaultIcon}">
                <div>
                    <span class="category-icon" style="color: ${category.color};">
                        <i class="${category.icon || defaultIcon} me-2"></i>
                    </span>
                    ${category.name}
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-primary me-1 edit-category-btn" title="Редактировать">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-category-btn" title="Удалить">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Функция для загрузки и отображения категорий
    async function loadCategories() {
        $expenseLoading.show();
        $incomeLoading.show();
        $noExpenseCategories.hide();
        $noIncomeCategories.hide();
        $expenseList.find('.category-item').remove(); // Очищаем старые элементы
        $incomeList.find('.category-item').remove();  // Очищаем старые элементы

        try {
            const response = await window.apiHelper.get('/categories'); // Получаем объект ответа
            const categories = response.categories || []; // Извлекаем массив!
            let hasExpenses = false;
            let hasIncome = false;

            categories.forEach(category => {
                const itemHtml = renderCategoryItem(category);
                if (category.type === 'expense') {
                    $expenseList.append(itemHtml);
                    hasExpenses = true;
                } else if (category.type === 'income') {
                    $incomeList.append(itemHtml);
                    hasIncome = true;
                }
            });

            if (!hasExpenses) $noExpenseCategories.show();
            if (!hasIncome) $noIncomeCategories.show();

        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
            // Можно добавить отображение ошибки пользователю
            $noExpenseCategories.show().text('Ошибка загрузки.');
            $noIncomeCategories.show().text('Ошибка загрузки.');
        } finally {
            $expenseLoading.hide();
            $incomeLoading.hide();
        }
    }

    // Открытие модального окна для добавления
    function openAddModal() {
        $categoryForm[0].reset(); // Сброс формы
        $categoryId.val(''); // Очистка ID
        $('#categoryModalTitle').text('Добавить категорию');
        $categoryTypeExpense.prop('checked', true); // По умолчанию расход
        $categoryColor.val('#3498db'); // Цвет по умолчанию
        renderIconPicker(defaultIcon); // Рендерим сетку иконок с дефолтной выбранной
        categoryModal.show();
    }

    // Открытие модального окна для редактирования
    function openEditModal(categoryData) {
        $categoryForm[0].reset();
        $categoryId.val(categoryData.id);
        $('#categoryModalTitle').text('Редактировать категорию');
        $categoryName.val(categoryData.name);
        $categoryColor.val(categoryData.color || '#3498db');
        if (categoryData.type === 'income') {
            $categoryTypeIncome.prop('checked', true);
        } else {
            $categoryTypeExpense.prop('checked', true);
        }
        renderIconPicker(categoryData.icon || defaultIcon); // Рендерим сетку с выбранной иконкой категории
        categoryModal.show();
    }

    // Сохранение категории (добавление или обновление)
    async function saveCategory() {
        const id = $categoryId.val();
        const type = $('input[name="category-type"]:checked').val();
        const name = $categoryName.val().trim();
        const color = $categoryColor.val();
        const icon = $categoryIconInput.val(); // Получаем значение из скрытого поля

        if (!name || !type) {
            // Простая валидация
            alert('Пожалуйста, укажите название и тип категории.');
            return;
        }

        const categoryData = { name, type, color, icon };
        $saveCategoryBtn.prop('disabled', true); // Блокируем кнопку на время запроса

        try {
            if (id) {
                // Обновление существующей категории
                await apiHelper.put(`/categories/${id}`, categoryData);
            } else {
                // Создание новой категории
                await apiHelper.post('/categories', categoryData);
            }
            categoryModal.hide();
            await loadCategories(); // Обновляем список
        } catch (error) {
            console.error('Ошибка сохранения категории:', error);
            alert(`Ошибка сохранения: ${error.responseJSON?.message || error.message || 'Неизвестная ошибка'}`);
        } finally {
             $saveCategoryBtn.prop('disabled', false); // Разблокируем кнопку
        }
    }

    // Удаление категории
    async function deleteCategory(id) {
        if (!confirm('Вы уверены, что хотите удалить эту категорию?')) {
            return;
        }

        try {
            await apiHelper.delete(`/categories/${id}`);
            await loadCategories(); // Обновляем список
        } catch (error) {
            console.error('Ошибка удаления категории:', error);
             alert(`Ошибка удаления: ${error.message || 'Неизвестная ошибка'}`);
        }
    }

    // --- Обработчики событий ---

    // Кнопки "Добавить категорию"
    $('#add-category-btn, #add-category-header-btn').on('click', openAddModal);

    // Кнопка "Сохранить" в модальном окне
    $saveCategoryBtn.on('click', saveCategory);

    // Нажатие Enter в полях формы модального окна (кроме выбора иконок)
    $categoryForm.on('submit', function(e) {
        e.preventDefault();
        // Проверяем, был ли фокус на элементах, которые могут вызвать submit (не на иконках)
        if (!$(document.activeElement).closest('#icon-picker-grid').length) {
             saveCategory();
        }
    });

    // Кнопки "Редактировать" (делегирование событий)
    $expenseList.add($incomeList).on('click', '.edit-category-btn', function() {
        const item = $(this).closest('.category-item');
        const categoryData = {
             id: item.data('id'),
             name: item.data('name'),
             type: item.data('type'),
             color: item.data('color'),
             icon: item.data('icon')
        }; // Собираем данные явно
        openEditModal(categoryData);
    });

    // Кнопки "Удалить" (делегирование событий)
    $expenseList.add($incomeList).on('click', '.delete-category-btn', function() {
        const item = $(this).closest('.category-item');
        const id = item.data('id');
        deleteCategory(id);
    });


    // Первоначальная загрузка категорий
    loadCategories();

    // Обновляем категории в модальном окне транзакций при открытии (если оно есть на странице)
    // Это улучшение UX, чтобы новые/измененные категории сразу были доступны
    const transactionModalElement = document.getElementById('transactionModal');
    if (transactionModalElement) {
        transactionModalElement.addEventListener('show.bs.modal', async event => {
             console.log('Обновление категорий в модальном окне транзакции...');
             // Предполагаем, что функция populateCategoryOptions существует в app.js
             if (typeof populateCategoryOptions === 'function') {
                 // Передаем тип транзакции, выбранный по умолчанию (обычно расход)
                 const defaultType = $('#transactionModal input[name="type"]:checked').val() || 'expense';
                 await populateCategoryOptions(defaultType);
             } else {
                 console.warn('Функция populateCategoryOptions не найдена.');
             }
        });
    }
});

// TODO:
// 1. Load income and expense categories separately
// 2. Display categories in respective lists (#income-category-list, #expense-category-list)
// 3. Implement add/edit category modal logic
// 4. Implement delete category logic (with confirmation) 