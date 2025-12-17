# Исправление ошибки 410 при использовании ProxyAPI

## Проблема

При попытке использовать ProxyAPI возникает ошибка:
```
APIError: DeepseekException - Отдельный API для DeepSeek больше не поддерживается. 
Модели DeepSeek и многие другие теперь доступны через интеграцию с OpenRouter: 
https://proxyapi.ru/openrouter
```

## Причина

ProxyAPI больше не поддерживает прямой доступ к DeepSeek через их OpenAI-совместимый API (`https://openai.api.proxyapi.ru/v1/chat/completions`).

## Решение

Используйте интеграцию ProxyAPI с OpenRouter вместо прямого OpenAI API.

### Исправление конфигурации

Обновите файл `.env.local`:

**Было (неправильно):**
```env
TRANSLATION_PROVIDER_URL=https://openai.api.proxyapi.ru/v1/chat/completions
```

**Должно быть:**
```env
TRANSLATION_PROVIDER_URL=https://api.proxyapi.ru/openrouter/v1/chat/completions
```

### Полная конфигурация

```env
# ProxyAPI через OpenRouter интеграцию (для DeepSeek)
TRANSLATION_PROVIDER_URL=https://api.proxyapi.ru/openrouter/v1/chat/completions
TRANSLATION_MODEL=deepseek/deepseek-chat
TRANSLATION_API_KEY=ваш_ключ_от_proxyapi

# Hugging Face остается без изменений
IMAGE_PROVIDER_URL=https://router.huggingface.co/hf-inference/models/
IMAGE_MODEL=stabilityai/stable-diffusion-xl-base-1.0
IMAGE_API_KEY=ваш_ключ_huggingface
```

### После исправления

1. Сохраните файл `.env.local`
2. Перезапустите сервер разработки:
   ```powershell
   # Остановите текущий процесс (Ctrl+C)
   # Затем запустите снова:
   pnpm dev
   ```
3. Проверьте работу функций

**⚠️ Важно:** Убедитесь, что используете правильный URL:
- ✅ Правильно: `https://api.proxyapi.ru/openrouter/v1/chat/completions`
- ❌ Неправильно: `https://openrouter.api.proxyapi.ru/api/v1/chat/completions` (вызовет ошибку "fetch failed")

## Объяснение

- **Старый URL:** `https://openai.api.proxyapi.ru/v1/chat/completions` - прямой OpenAI-совместимый API (DeepSeek недоступен)
- **Новый URL:** `https://api.proxyapi.ru/openrouter/v1/chat/completions` - ProxyAPI через OpenRouter интеграцию (DeepSeek доступен)

ProxyAPI теперь работает как прокси для OpenRouter, предоставляя:
- ✅ Доступ к DeepSeek и другим моделям OpenRouter
- ✅ Оплату в рублях
- ✅ Без необходимости VPN
- ✅ Без региональных блокировок

## Проверка

После исправления ошибка 410 должна исчезнуть, и запросы к DeepSeek будут работать через ProxyAPI → OpenRouter.

