// Placeholder for AI Assistant page JavaScript

$(document).ready(function() {
    console.log('ai-assistant.js загружен');

    const $reportArea = $('#ai-analysis-report');
    const $reportLoading = $('#analysis-loading');
    const $refreshAnalysisBtn = $('#refresh-analysis-btn');

    const $chatArea = $('#ai-chat-area');
    const $questionForm = $('#ai-question-form');
    const $questionInput = $('#ai-question-input');
    const $askBtn = $('#ai-ask-btn');
    const $askBtnSpinner = $askBtn.find('.spinner-border');

    // Функция для добавления сообщения в чат
    function addChatMessage(sender, message, isHtml = false) {
        // Удаляем начальное сообщение "Начните диалог...", если оно есть
        $chatArea.find('.text-muted:contains("Начните диалог")').remove();

        const senderClass = sender === 'user' ? 'text-end' : 'text-start';
        const messageClass = sender === 'user' ? 'bg-primary text-white' : 'bg-light';
        const alignmentClass = sender === 'user' ? 'ms-auto' : 'me-auto';

        // Создаем элемент сообщения
        const $messageDiv = $('<div>').addClass(`chat-message-wrapper mb-2 ${senderClass}`);
        const $messageBubble = $('<div>').addClass(`chat-message d-inline-block p-2 rounded ${messageClass} ${alignmentClass}`).css('max-width', '80%');

        if (isHtml) {
            $messageBubble.html(message); // Вставляем HTML, если разрешено
        } else {
            $messageBubble.text(message); // Вставляем как текст по умолчанию
        }

        $messageDiv.append($messageBubble);
        $chatArea.append($messageDiv);

        // Прокрутка чата вниз
        $chatArea.scrollTop($chatArea[0].scrollHeight);

        return $messageBubble; // Возвращаем созданный элемент пузыря
    }

    // Функция для загрузки финансового анализа от AI
    async function loadAiAnalysis() {
        $reportLoading.show();
        $reportArea.find('.ai-report-content').remove(); // Удаляем старый контент
        $refreshAnalysisBtn.prop('disabled', true);

        try {
            // Используем apiHelper из app.js
            const response = await window.apiHelper.get('/ai/analysis');
            // Предполагаем, что ответ приходит в response.analysisText
            // TODO: Обработать Markdown, если API его возвращает
            // Проверяем, что analysisText существует и не пуст
            const reportText = response?.analysisText;
            const reportHtml = `<div class="ai-report-content">${reportText ? reportText.replace(/\n/g, '<br>') : 'Не удалось сгенерировать отчет.'}</div>`;
            $reportArea.append(reportHtml);
        } catch (error) {
            console.error("Ошибка загрузки AI анализа:", error);
            $reportArea.append('<div class="ai-report-content text-danger">Ошибка загрузки отчета.</div>');
        } finally {
            $reportLoading.hide();
            $refreshAnalysisBtn.prop('disabled', false);
        }
    }

    // Обработчик нажатия кнопки "Обновить отчет"
    $refreshAnalysisBtn.on('click', loadAiAnalysis);

    // Обработчик отправки вопроса AI
    $questionForm.on('submit', async function(e) {
        e.preventDefault();
        const question = $questionInput.val().trim();

        if (!question) return;

        // Отображаем вопрос пользователя
        addChatMessage('user', question);
        $questionInput.val(''); // Очищаем поле ввода

        // Показываем индикатор загрузки и блокируем кнопку
        $askBtn.prop('disabled', true);
        $askBtnSpinner.show();

        // Добавляем сообщение о загрузке ответа AI и сохраняем ссылку на него
        const thinkingMessage = 'AI думает...';
        const $thinkingBubble = addChatMessage('ai', thinkingMessage); // Сохраняем результат вызова

        try {
            console.log("AI Assistant: Отправка запроса на /api/ai/ask...");
            const response = await window.apiHelper.post('/ai/ask', { question });
            
            console.log("AI Assistant: Получен ответ от /api/ai/ask:", response);
            
            // Предполагаем, что ответ приходит в response.answer
            const answer = response.answer || 'Не удалось получить ответ.'; 
            console.log("AI Assistant: Извлеченный ответ:", answer);
            
            // Обновляем текст в сохраненном элементе "AI думает..."
            console.log("AI Assistant: Обновляем текст в сохраненном bubble.");
            $thinkingBubble.text(answer); // Обновляем текст напрямую
            $thinkingBubble.removeClass('bg-light').addClass('bg-white'); // Меняем стиль, чтобы показать финальный ответ

            // TODO: Обработать Markdown, если API его возвращает
            // $thinkingBubble.html(marked.parse(answer)); // Пример с библиотекой marked

        } catch (error) {
            console.error("Ошибка при запросе к AI:", error);
             const errorMessage = 'Извините, произошла ошибка при обработке вашего вопроса.';
             // Обновляем текст в сохраненном элементе при ошибке
             console.log("AI Assistant: Обновляем текст в сохраненном bubble (ошибка).");
             $thinkingBubble.text(errorMessage).removeClass('bg-light').addClass('bg-warning');
        } finally {
            // Скрываем индикатор загрузки и разблокируем кнопку
            $askBtn.prop('disabled', false);
            $askBtnSpinner.hide();
             // Прокрутка чата вниз еще раз после получения ответа
             $chatArea.scrollTop($chatArea[0].scrollHeight);
        }
    });

    // --- Инициализация --- //
    loadAiAnalysis(); // Загружаем начальный отчет

}); 