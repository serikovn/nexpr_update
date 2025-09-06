# Инструкция по развертыванию бота на сервере

## Требования
- Ubuntu 20.04+ или другой Linux сервер
- Node.js 18+ и npm
- Git
- PM2 для управления процессами

## Шаг 1: Подготовка сервера

```bash
# Обновление пакетов
sudo apt update && sudo apt upgrade -y

# Установка Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка Git
sudo apt install git -y

# Установка PM2 глобально
sudo npm install -g pm2
```

## Шаг 2: Клонирование проекта

```bash
# Создание директории для бота
mkdir -p ~/bots
cd ~/bots

# Клонирование репозитория (замените на ваш URL)
git clone https://github.com/your-username/nochnoy-express-bot.git
cd nochnoy-express-bot
```

## Шаг 3: Настройка бота

```bash
# Установка зависимостей
npm install

# Создание файла .env
nano .env
```

Добавьте в файл .env:
```
BOT_TOKEN=ваш_токен_от_BotFather
```

Сохраните файл (Ctrl+X, затем Y, затем Enter)

## Шаг 4: Настройка администраторов

```bash
# Редактирование файла config.js
nano config.js
```

Найдите массив ADMINS и добавьте ваш Telegram ID:
```javascript
const ADMINS = [123456789]; // Замените на ваш ID
```

## Шаг 5: Запуск бота с PM2

```bash
# Запуск бота
pm2 start index.js --name "nochnoy-express-bot"

# Сохранение конфигурации PM2
pm2 save

# Настройка автозапуска при перезагрузке сервера
pm2 startup
# Выполните команду, которую выдаст PM2
```

## Шаг 6: Управление ботом

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs nochnoy-express-bot

# Перезапуск бота
pm2 restart nochnoy-express-bot

# Остановка бота
pm2 stop nochnoy-express-bot

# Удаление из PM2
pm2 delete nochnoy-express-bot
```

## Шаг 7: Обновление бота

```bash
cd ~/bots/nochnoy-express-bot

# Получение обновлений из репозитория
git pull

# Установка новых зависимостей (если есть)
npm install

# Перезапуск бота
pm2 restart nochnoy-express-bot
```

## Дополнительная безопасность

### Использование системного сервиса (альтернатива PM2)

Создайте файл сервиса:
```bash
sudo nano /etc/systemd/system/nochnoy-express-bot.service
```

Содержимое файла:
```ini
[Unit]
Description=Nochnoy Express Telegram Bot
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/bots/nochnoy-express-bot
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=nochnoy-express-bot

[Install]
WantedBy=multi-user.target
```

Активация сервиса:
```bash
sudo systemctl daemon-reload
sudo systemctl enable nochnoy-express-bot
sudo systemctl start nochnoy-express-bot
sudo systemctl status nochnoy-express-bot
```

### Настройка файрвола

```bash
# Разрешить только необходимые порты
sudo ufw allow ssh
sudo ufw allow 443/tcp  # Для HTTPS (Telegram API)
sudo ufw enable
```

## Мониторинг

Для просмотра использования ресурсов:
```bash
# С PM2
pm2 monit

# Системные логи (если используете systemd)
sudo journalctl -u nochnoy-express-bot -f
```

## Решение проблем

### Бот не запускается
1. Проверьте правильность токена в .env
2. Проверьте подключение к интернету: `ping api.telegram.org`
3. Проверьте логи: `pm2 logs nochnoy-express-bot --lines 50`

### Ошибки с правами доступа
```bash
# Убедитесь, что у пользователя есть права на директорию
chmod -R 755 ~/bots/nochnoy-express-bot
```

### Проблемы с сетью
Если сервер находится в стране с ограничениями Telegram, используйте прокси или VPN.

## Рекомендации для продакшена

1. **Используйте переменные окружения** для всех чувствительных данных
2. **Настройте резервное копирование** базы данных (если используется)
3. **Настройте мониторинг** с уведомлениями о падении бота
4. **Используйте HTTPS** если бот работает с webhook
5. **Регулярно обновляйте** зависимости: `npm update`
6. **Логируйте ошибки** в файл для последующего анализа

## Быстрый запуск (копировать и вставить)

```bash
# Для Ubuntu/Debian сервера
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && \
sudo apt-get install -y nodejs git && \
sudo npm install -g pm2 && \
git clone [ВАШ_РЕПОЗИТОРИЙ] && \
cd nochnoy-express-bot && \
npm install && \
echo "BOT_TOKEN=ВАШ_ТОКЕН" > .env && \
pm2 start index.js --name "nochnoy-express-bot" && \
pm2 save && \
pm2 startup
```

Замените `[ВАШ_РЕПОЗИТОРИЙ]` и `ВАШ_ТОКЕН` на реальные значения.