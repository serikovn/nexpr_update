require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs').promises;
const path = require('path');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const ADMINS = [1355294435];

const PROBLEMS_FILE = path.join(__dirname, 'problems.json');

const adminStates = {};

async function loadProblems() {
    try {
        const data = await fs.readFile(PROBLEMS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await saveProblems([]);
            return [];
        }
        throw error;
    }
}

async function saveProblems(problems) {
    await fs.writeFile(PROBLEMS_FILE, JSON.stringify(problems, null, 2));
}

function formatDate(date = new Date()) {
    const moscowDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const options = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Moscow'
    };
    return moscowDate.toLocaleDateString('ru-RU', options);
}

function isAdmin(userId) {
    return ADMINS.includes(userId);
}

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const problems = await loadProblems();
    const currentDate = formatDate();

    if (problems.length === 0) {
        await bot.sendMessage(chatId, `На ${currentDate} Ночной Экспресс двигается в штатном режиме.`);
    } else {
        const keyboard = {
            inline_keyboard: problems.map(problem => [{
                text: problem.name,
                callback_data: `direction_${problem.name}`
            }])
        };

        await bot.sendMessage(
            chatId,
            `На ${currentDate} задержки в перевозках Ночного Экспресса зафиксированы на следующих направлениях.\n\nВыберите направление, чтобы узнать подробности:`,
            { reply_markup: keyboard }
        );
    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('direction_')) {
        const directionName = data.replace('direction_', '');
        const problems = await loadProblems();
        const problem = problems.find(p => p.name === directionName);

        if (problem) {
            if (problem.media && problem.media.length > 0) {
                try {
                    const mediaGroup = problem.media.map(item => {
                        if (item.type === 'photo') {
                            return {
                                type: 'photo',
                                media: item.file,
                                parse_mode: 'HTML'
                            };
                        } else if (item.type === 'video') {
                            return {
                                type: 'video',
                                media: item.file,
                                parse_mode: 'HTML'
                            };
                        }
                    }).filter(Boolean);

                    if (mediaGroup.length > 0) {
                        await bot.sendMediaGroup(chatId, mediaGroup);
                    }
                } catch (error) {
                    console.error('Error sending media group:', error);
                }
            }

            const formattedEta = problem.eta;
            const description = `${problem.name}: ${problem.description}, прогноз устранения — ${formattedEta}.`;
            await bot.sendMessage(chatId, description);
        }

        await bot.answerCallbackQuery(query.id);
    }
});

bot.onText(/\/add/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        return bot.sendMessage(chatId, 'У вас нет прав для выполнения этой команды.');
    }

    adminStates[userId] = { command: 'add', step: 'name' };
    await bot.sendMessage(chatId, 'Введите название направления:');
});

bot.onText(/\/remove/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        return bot.sendMessage(chatId, 'У вас нет прав для выполнения этой команды.');
    }

    const problems = await loadProblems();
    if (problems.length === 0) {
        return bot.sendMessage(chatId, 'Нет проблем для удаления.');
    }

    const keyboard = {
        inline_keyboard: problems.map(problem => [{
            text: `Удалить: ${problem.name}`,
            callback_data: `remove_${problem.name}`
        }])
    };

    await bot.sendMessage(chatId, 'Выберите проблему для удаления:', { reply_markup: keyboard });
});

bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        return bot.sendMessage(chatId, 'У вас нет прав для выполнения этой команды.');
    }

    const problems = await loadProblems();
    if (problems.length === 0) {
        return bot.sendMessage(chatId, 'Список проблем пуст.');
    }

    let message = '📋 Текущие проблемы:\n\n';
    problems.forEach((problem, index) => {
        message += `${index + 1}. ${problem.name}\n`;
        message += `   Описание: ${problem.description}\n`;
        message += `   Прогноз: ${problem.eta}\n`;
        message += `   Медиа: ${problem.media ? problem.media.length : 0} файлов\n\n`;
    });

    await bot.sendMessage(chatId, message);
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (data.startsWith('remove_') && isAdmin(userId)) {
        const directionName = data.replace('remove_', '');
        const problems = await loadProblems();
        const filteredProblems = problems.filter(p => p.name !== directionName);
        
        if (filteredProblems.length < problems.length) {
            await saveProblems(filteredProblems);
            await bot.sendMessage(chatId, `✅ Проблема "${directionName}" удалена.`);
        } else {
            await bot.sendMessage(chatId, `❌ Проблема "${directionName}" не найдена.`);
        }
        
        await bot.answerCallbackQuery(query.id);
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (!adminStates[userId] || !isAdmin(userId)) return;
    if (text && text.startsWith('/')) return;

    const state = adminStates[userId];

    if (state.command === 'add') {
        switch (state.step) {
            case 'name':
                adminStates[userId].problem = { name: text, media: [] };
                adminStates[userId].step = 'description';
                await bot.sendMessage(chatId, 'Введите описание проблемы:');
                break;

            case 'description':
                adminStates[userId].problem.description = text;
                adminStates[userId].step = 'eta';
                await bot.sendMessage(chatId, 'Введите прогноз устранения (например: 7 сентября, 15:00):');
                break;

            case 'eta':
                adminStates[userId].problem.eta = text;
                adminStates[userId].step = 'media';
                await bot.sendMessage(chatId, 
                    'Отправьте медиафайлы (фото/видео) или ссылки на них.\n' +
                    'Можно отправить несколько файлов.\n' +
                    'Когда закончите, напишите "готово" или "done".'
                );
                break;

            case 'media':
                if (text && (text.toLowerCase() === 'готово' || text.toLowerCase() === 'done')) {
                    const problems = await loadProblems();
                    problems.push(adminStates[userId].problem);
                    await saveProblems(problems);
                    await bot.sendMessage(chatId, `✅ Проблема "${adminStates[userId].problem.name}" добавлена.`);
                    delete adminStates[userId];
                } else if (text) {
                    if (text.startsWith('http://') || text.startsWith('https://')) {
                        const type = text.match(/\.(jpg|jpeg|png|gif)$/i) ? 'photo' : 'video';
                        adminStates[userId].problem.media.push({ type, file: text });
                        await bot.sendMessage(chatId, `✅ Добавлена ссылка (${type}). Продолжайте или напишите "готово".`);
                    } else {
                        await bot.sendMessage(chatId, 'Отправьте файл или корректную ссылку.');
                    }
                }
                break;
        }
    }
});

bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!adminStates[userId] || !isAdmin(userId)) return;
    
    const state = adminStates[userId];
    if (state.command === 'add' && state.step === 'media') {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        adminStates[userId].problem.media.push({ type: 'photo', file: fileId });
        await bot.sendMessage(chatId, '✅ Фото добавлено. Продолжайте или напишите "готово".');
    }
});

bot.on('video', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!adminStates[userId] || !isAdmin(userId)) return;
    
    const state = adminStates[userId];
    if (state.command === 'add' && state.step === 'media') {
        const fileId = msg.video.file_id;
        adminStates[userId].problem.media.push({ type: 'video', file: fileId });
        await bot.sendMessage(chatId, '✅ Видео добавлено. Продолжайте или напишите "готово".');
    }
});

console.log('🚀 Бот Ночной Экспресс запущен!');
console.log('⚠️  Не забудьте добавить токен в файл .env');
console.log('⚠️  Не забудьте добавить Telegram ID админов в массив ADMINS');