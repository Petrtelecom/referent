# Настройка переменных окружения на Vercel

Для работы приложения на Vercel необходимо добавить переменные окружения:
- `TRANSLATION_API_KEY` - API ключ для переводов и AI-обработки (ProxyAPI через OpenRouter)
- `GEMINI_API_KEY` - API ключ для генерации изображений через Google Gemini (ProxyAPI) (опционально)
- `IMAGE_API_KEY` - Альтернативное имя для `GEMINI_API_KEY` (для обратной совместимости)

## Инструкция:

1. **Зайдите в настройки проекта на Vercel:**
   - Откройте https://vercel.com
   - Выберите ваш проект `referent`
   - Перейдите в раздел **Settings**

2. **Добавьте переменные окружения:**
   - В меню слева выберите **Environment Variables**
   - Нажмите кнопку **Add New**
   - Добавьте переменные:
     - **Name:** `TRANSLATION_API_KEY`
     - **Value:** ваш API ключ от ProxyAPI (для переводов и AI-обработки через OpenRouter)
     - **Environments:** выберите все окружения (Production, Preview, Development) или только Production
   - Добавьте `GEMINI_API_KEY`:
     - **Name:** `GEMINI_API_KEY`
     - **Value:** ваш API ключ от ProxyAPI (для генерации изображений через Google Gemini)
     - **Environments:** выберите все окружения или только Production
   - Примечание: `IMAGE_API_KEY` можно использовать как альтернативное имя для `GEMINI_API_KEY` (для обратной совместимости)

3. **Пересоберите проект:**
   - После добавления переменных перейдите в раздел **Deployments**
   - Найдите последний deployment и нажмите на три точки (⋯)
   - Выберите **Redeploy** или создайте новый deployment

## Альтернативный способ через Vercel CLI:

```powershell
vercel env add TRANSLATION_API_KEY production
# Введите значение ключа при запросе
vercel env add GEMINI_API_KEY production
# Введите значение ключа при запросе (для генерации изображений через Gemini)
```

После этого пересоберите проект через интерфейс или командой:
```powershell
vercel --prod
```

## Проверка:

После пересборки откройте приложение на Vercel и проверьте, что функция перевода работает без ошибок.







