# Referent

Я изучаю Next.js

## Запуск проекта

Установите зависимости:

```powershell
pnpm install
```

Запустите dev-сервер:

```powershell
pnpm dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Доступные команды

- `pnpm dev` - запуск dev-сервера
- `pnpm build` - сборка для production
- `pnpm start` - запуск production сервера
- `pnpm lint` - проверка кода линтером

## Решение проблем

### Проблема: `pnpm install` зависает или не запускается

**Возможные решения:**

1. **Очистите кэш pnpm:**
```powershell
pnpm store prune
```

2. **Проверьте подключение к интернету и настройки прокси** (если используется корпоративная сеть)

3. **Попробуйте установить с флагом для более подробного вывода:**
```powershell
pnpm install --loglevel debug
```

4. **Удалите lockfile (если существует) и попробуйте снова:**
```powershell
Remove-Item pnpm-lock.yaml -ErrorAction SilentlyContinue
pnpm install
```

5. **Проверьте, не блокирует ли антивирус или фаервол доступ к сети**

6. **Альтернатива: используйте npm вместо pnpm:**
```powershell
npm install
```