# Инструкция по миграции на ProxyAPI

## Быстрая миграция (5 минут)

### Шаг 1: Регистрация на ProxyAPI

1. Перейдите на https://proxyapi.ru
2. Зарегистрируйтесь (требуется только email, без иностранного телефона)
3. Получите API ключ в личном кабинете
4. Пополните баланс (оплата в рублях)

### Шаг 2: Обновление переменных окружения

#### Для локальной разработки:

Откройте файл `.env.local` и обновите следующие переменные:

```env
# Замена OpenRouter на ProxyAPI через OpenRouter интеграцию
# ⚠️ ВАЖНО: ProxyAPI больше не поддерживает прямой доступ к DeepSeek
# Используйте интеграцию с OpenRouter через ProxyAPI
TRANSLATION_PROVIDER_URL=https://api.proxyapi.ru/openrouter/v1/chat/completions
TRANSLATION_API_KEY=ваш_ключ_от_proxyapi
TRANSLATION_MODEL=deepseek/deepseek-chat

# Hugging Face остается без изменений
IMAGE_PROVIDER_URL=https://router.huggingface.co/hf-inference/models/
IMAGE_MODEL=stabilityai/stable-diffusion-xl-base-1.0
IMAGE_API_KEY=ваш_ключ_huggingface
```

#### Для Vercel (продакшн):

1. Откройте настройки проекта на Vercel
2. Перейдите в **Settings** → **Environment Variables**
3. Обновите переменные:
   - `TRANSLATION_PROVIDER_URL` = `https://api.proxyapi.ru/openrouter/v1/chat/completions`
   - `TRANSLATION_API_KEY` = ваш ключ от ProxyAPI
4. Пересоберите проект (Redeploy)

### Шаг 3: Проверка работы

1. Перезапустите сервер разработки (если локально):
   ```powershell
   npm run dev
   ```

2. Проверьте работу функций:
   - Перевод текста
   - AI-обработка статей (краткое содержание, тезисы, пост для Telegram)
   - Генерация изображений

3. Проверьте валидность ключа через интерфейс приложения

## Важные замечания

### ⚠️ Важно: ProxyAPI через OpenRouter интеграцию

**Проблема:** ProxyAPI больше не поддерживает прямой доступ к DeepSeek через их OpenAI-совместимый API.

**Решение:** Используйте интеграцию ProxyAPI с OpenRouter:

```env
TRANSLATION_PROVIDER_URL=https://api.proxyapi.ru/openrouter/v1/chat/completions
TRANSLATION_MODEL=deepseek/deepseek-chat
```

Этот формат должен работать, так как ProxyAPI перенаправляет запросы к OpenRouter, который поддерживает DeepSeek.

Если возникают проблемы, проверьте:
1. Правильность URL: `https://api.proxyapi.ru/openrouter/v1/chat/completions`
2. Валидность API ключа от ProxyAPI
3. Баланс на счету ProxyAPI

### Возврат к прямому OpenRouter

Если нужно вернуться к прямому OpenRouter (без ProxyAPI), просто измените переменные обратно:

```env
TRANSLATION_PROVIDER_URL=https://openrouter.ai/api/v1/chat/completions
TRANSLATION_API_KEY=ваш_ключ_от_openrouter
```

**Примечание:** ProxyAPI через OpenRouter интеграцию (`https://api.proxyapi.ru/openrouter/v1/chat/completions`) предоставляет те же возможности, что и прямой OpenRouter, но с оплатой в рублях и без необходимости VPN.

## Проверка совместимости

### Тестовый запрос

Можно проверить работу ProxyAPI через curl или PowerShell:

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer ваш_ключ_от_proxyapi"
}

$body = @{
    model = "deepseek/deepseek-chat"
    messages = @(
        @{
            role = "user"
            content = "Привет, это тест"
        }
    )
    max_tokens = 50
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.proxyapi.ru/openrouter/v1/chat/completions" -Method Post -Headers $headers -Body $body
```

Если запрос успешен, миграция должна пройти без проблем.

## Поддержка

При возникновении проблем:
1. Проверьте баланс на ProxyAPI
2. Проверьте правильность API ключа
3. Проверьте формат модели
4. Обратитесь в поддержку ProxyAPI: https://proxyapi.ru/contact

## Преимущества после миграции

✅ Оплата в рублях без иностранной карты  
✅ Без необходимости VPN  
✅ Без региональных блокировок  
✅ Российская компания с соблюдением законодательства РФ  
✅ Простое переключение обратно на OpenRouter при необходимости

