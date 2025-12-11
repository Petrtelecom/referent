# Referent
Референт - переводчик с ИИ-обработкой
PROJECT.md - описание проекта

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
1. Очистите кэш pnpm: `pnpm store prune`
2. Удалите lockfile и попробуйте снова: `Remove-Item pnpm-lock.yaml -ErrorAction SilentlyContinue && pnpm install`
3. Альтернатива: используйте `npm install` вместо pnpm