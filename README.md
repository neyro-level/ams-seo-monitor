# AMS SEO Monitor

Централизованный приватный SEO-отчёт АМС для нескольких клиентов и сайтов.

## Что это

AMS SEO Monitor — отдельный самостоятельный продукт АМС. Он собирает read-only данные из Яндекс.Вебмастера и Яндекс.Метрики, сохраняет versioned JSON snapshots и отдаёт клиентам статические приватные отчёты.

MVP принципиально:

- без PostgreSQL, Prisma и SQLite;
- без постоянного Next.js runtime;
- без `next start` в production;
- без application auth;
- с Nginx Basic Auth по защищённым путям;
- с compiled Node collector по timer.

## Стек MVP

- Next.js 16 App Router, `output: "export"`
- React 19
- TypeScript strict
- Tailwind CSS v4
- Recharts
- Zod
- Node.js 24 collector
- versioned JSON snapshots
- Nginx Basic Auth
- systemd oneshot + timers

## Режим текущего репозитория

Сейчас реализуется **Wave 1 Foundation**:

- core canon проекта;
- static dashboard shell;
- registry клиентов и сайтов;
- static routes;
- snapshot DTO и local storage engine на fixtures.

Live OAuth, server release и production onboarding пока вне scope.

## Структура

```text
src/            Next.js static UI
collector/      compiled Node collector and storage engine
config/         nonsecret client/site/goal/cluster config
docs/           core canon
scripts/        local verification scripts
tests/          foundation tests
```

## Команды

```bash
pnpm install
pnpm verify:config
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`pnpm build` должен создавать `out/`.

## Source of truth

Сначала читать:

1. `AGENTS.md`
2. `docs/PRODUCT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATA_MODEL.md`
5. `SECURITY.md`
6. `docs/MASTER_PLAN.md`

## Ограничения

- Секреты не хранятся в Git.
- Browser не ходит в Yandex API напрямую.
- Static routes строятся из checked-in nonsecret registry.
- Snapshot schema — единственный data contract для report DTO.
