# TG Bot + Telegram Mini App (MVP)

Монорепо:
- `apps/bot` — Telegram bot (grammy)
- `apps/api` — backend API (Fastify + Prisma + PostgreSQL)
- `apps/miniapp` — Telegram Mini App (Vite + React + TS)
- `packages/shared` — общие типы/контент

## Быстрый старт (локально)

1) Скопируй переменные окружения:
- создай файл `.env` в корне по примеру из `env.example`

2) Подними Postgres:
```bash
docker compose up -d
```

3) Установи зависимости:
```bash
npm install
```

4) Запусти по отдельности:
```bash
npm run dev          # bot
npm run api:dev      # api
npm run miniapp:dev  # miniapp
```

