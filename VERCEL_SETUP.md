# Настройка переменных окружения на Vercel

Для работы приложения на Vercel необходимо добавить переменную окружения `OPENROUTER_API_KEY`.

## Инструкция:

1. **Зайдите в настройки проекта на Vercel:**
   - Откройте https://vercel.com
   - Выберите ваш проект `referent`
   - Перейдите в раздел **Settings**

2. **Добавьте переменную окружения:**
   - В меню слева выберите **Environment Variables**
   - Нажмите кнопку **Add New**
   - Введите:
     - **Name:** `OPENROUTER_API_KEY`
     - **Value:** ваш API ключ от OpenRouter (например: `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`)
     - **Environments:** выберите все окружения (Production, Preview, Development) или только Production

3. **Пересоберите проект:**
   - После добавления переменной перейдите в раздел **Deployments**
   - Найдите последний deployment и нажмите на три точки (⋯)
   - Выберите **Redeploy** или создайте новый deployment

## Альтернативный способ через Vercel CLI:

```powershell
vercel env add OPENROUTER_API_KEY production
# Введите значение ключа при запросе
```

После этого пересоберите проект через интерфейс или командой:
```powershell
vercel --prod
```

## Проверка:

После пересборки откройте приложение на Vercel и проверьте, что функция перевода работает без ошибок.






