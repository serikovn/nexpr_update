#!/bin/bash

# Скрипт обновления бота с GitHub

echo "🔄 Начинаю обновление бота..."

# Скачиваем последнюю версию index.js с GitHub
echo "📥 Загружаю последнюю версию с GitHub..."
curl -o index.js https://raw.githubusercontent.com/serikovn/nexpr_update/main/index.js

if [ $? -eq 0 ]; then
    echo "✅ Файл успешно обновлен"
    
    # Проверяем, используется ли PM2
    if command -v pm2 &> /dev/null; then
        echo "🔄 Перезапускаю бота через PM2..."
        pm2 restart nochnoy-express
        echo "✅ Бот перезапущен"
    else
        echo "⚠️  PM2 не найден. Перезапустите бота вручную"
    fi
else
    echo "❌ Ошибка при загрузке файла"
    exit 1
fi

echo "🎉 Обновление завершено!"