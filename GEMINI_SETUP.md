# Настройка генерации изображений через Google Gemini (ProxyAPI)

## Обзор

Генерация изображений теперь использует Google Gemini через ProxyAPI вместо Hugging Face. Это обеспечивает:
- ✅ Оплату в рублях
- ✅ Без необходимости VPN
- ✅ Без региональных блокировок
- ✅ Высокое качество генерации изображений

## Необходимые переменные окружения

### Обязательные:

```env
# API ключ для Gemini через ProxyAPI
GEMINI_API_KEY=ваш_ключ_от_proxyapi_для_gemini
```

### Опциональные (со значениями по умолчанию):

```env
# Endpoint ProxyAPI для Gemini (по умолчанию)
# ProxyAPI использует /google для Gemini API
GEMINI_API_ENDPOINT=https://api.proxyapi.ru/google

# Модель Gemini для генерации изображений (по умолчанию)
GEMINI_MODEL=gemini-3-pro-image-preview

# Соотношение сторон изображения (по умолчанию: 16:9)
# Доступные значения: 16:9, 1:1, 9:16
GEMINI_ASPECT_RATIO=16:9

# Размер изображения (по умолчанию: 2K)
# Доступные значения: 1K, 2K
GEMINI_IMAGE_SIZE=2K
```

### Обратная совместимость:

Если у вас уже настроен `IMAGE_API_KEY` для Hugging Face, он будет использован как `GEMINI_API_KEY` (если `GEMINI_API_KEY` не задан).

## Настройка для локальной разработки

1. Откройте файл `.env.local`
2. Добавьте переменные:

```env
# Для переводов и AI-обработки (через ProxyAPI OpenRouter)
TRANSLATION_PROVIDER_URL=https://api.proxyapi.ru/openrouter/v1/chat/completions
TRANSLATION_API_KEY=ваш_ключ_от_proxyapi
TRANSLATION_MODEL=deepseek/deepseek-chat

# Для генерации изображений (через ProxyAPI Gemini)
IMAGE_PROVIDER_URL=https://api.proxyapi.ru/google
IMAGE_MODEL=gemini-3-pro-image-preview
IMAGE_API_KEY=ваш_ключ_от_proxyapi_для_gemini
GEMINI_ASPECT_RATIO=16:9
GEMINI_IMAGE_SIZE=2K
```

3. Перезапустите сервер разработки:
   ```powershell
   pnpm dev
   ```

## Настройка для Vercel

1. Откройте настройки проекта на Vercel
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте переменные:
   - `GEMINI_API_KEY` - ваш API ключ от ProxyAPI для Gemini
   - Опционально: `GEMINI_API_ENDPOINT`, `GEMINI_MODEL`, `GEMINI_ASPECT_RATIO`, `GEMINI_IMAGE_SIZE`
4. Пересоберите проект (Redeploy)

## Получение API ключа

1. Зарегистрируйтесь на https://proxyapi.ru
2. Получите API ключ в личном кабинете
3. Убедитесь, что у вас есть доступ к Gemini API через ProxyAPI
4. Пополните баланс (оплата в рублях)

## Параметры генерации

### Соотношение сторон (aspectRatio):
- `16:9` - широкоформатное (по умолчанию)
- `1:1` - квадратное
- `9:16` - вертикальное

### Размер изображения (imageSize):
- `1K` - 1024x1024 (или соответствующее соотношению сторон)
- `2K` - 2048x2048 (или соответствующее соотношению сторон, по умолчанию)

## Как это работает

1. **Генерация промпта**: Статья анализируется через ProxyAPI (OpenRouter) для создания детального промпта для генерации изображения
2. **Генерация изображения**: Промпт отправляется в Google Gemini через ProxyAPI для генерации изображения
3. **Возврат результата**: Изображение возвращается в формате base64 data URL

## Устранение неполадок

### Ошибка: "GEMINI_API_KEY не настроен"
- Убедитесь, что переменная `GEMINI_API_KEY` задана в `.env.local` или настройках Vercel
- Проверьте правильность написания имени переменной

### Ошибка: "Ошибка при генерации изображения через Gemini"
- Проверьте баланс на счету ProxyAPI
- Убедитесь, что API ключ валиден
- Проверьте, что модель `gemini-3-pro-image-preview` доступна через ProxyAPI

### Изображение не генерируется
- Проверьте логи сервера для детальной информации об ошибке
- Убедитесь, что промпт был успешно создан на первом этапе
- Попробуйте изменить параметры `GEMINI_ASPECT_RATIO` или `GEMINI_IMAGE_SIZE`

## Миграция с Hugging Face

Если вы ранее использовали Hugging Face для генерации изображений:

1. **Удалите старые переменные** (опционально, для очистки):
   ```env
   # Можно удалить, больше не используются
   IMAGE_PROVIDER_URL=https://router.huggingface.co/hf-inference/models/
   IMAGE_MODEL=stabilityai/stable-diffusion-xl-base-1.0
   ```

2. **Добавьте новые переменные**:
   ```env
   GEMINI_API_KEY=ваш_ключ_от_proxyapi
   ```

3. **Перезапустите сервер**

Старый `IMAGE_API_KEY` будет использован как `GEMINI_API_KEY` для обратной совместимости, но рекомендуется использовать `GEMINI_API_KEY` явно.

