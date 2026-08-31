# AMS SEO Monitor

Приватный SEO-кабинет АМС для нескольких проектов и сайтов.

## Что делает система

AMS SEO Monitor собирает read-only данные из Яндекс.Вебмастера, Яндекс.Метрики и опционально Topvisor, сохраняет нормализованную историю в PostgreSQL и показывает директорский отчёт через Next.js App Router.

Browser получает только готовый `SiteReportSnapshot`. Provider APIs и бизнес-расчёты не живут во frontend.

## Product hierarchy

```text
Все проекты
→ Проект
  → Сайты
    → Единый отчёт
```

Внутренние `clientSlug` и маршруты `/c/*` сохраняются как действующий URL/data contract.

## Current architecture

```text
Browser
→ Nginx
→ Next.js server runtime
→ Application services
→ Repository contracts
→ Prisma repositories
→ PostgreSQL

systemd timer
→ Worker
→ Provider adapters
→ normalization
→ PostgreSQL
→ ReportSnapshot / SiteReportSnapshot
```

## What is preserved from V1

- `SiteReportSnapshot` как browser-safe DTO;
- роли `SEO_ANALYST` и `CLIENT_VIEWER`;
- периоды `week`, `month`, `quarter`, `halfYear`;
- `month` по умолчанию;
- `partial`, `stale`, `null` и честные source states;
- separation между ranking, Webmaster и Metrica semantics.

## Current status in this branch

Реализовано:

- Next.js 16.3.3 standalone runtime;
- PostgreSQL 18 foundation на AMS Main Server;
- Prisma 7.10 schema, migrations и seed;
- Better Auth 1.7.2 foundation;
- application services и Prisma repositories;
- database-backed worker sync;
- database-backed dashboard routes;
- auth-protected analyst/client access;
- health endpoints `/api/health/live` и `/api/health/ready`;
- reverse-proxy/systemd release scaffolding.

Открытый внешний blocker:

- offsite S3-compatible backup для PostgreSQL ещё не настроен в доступном Doppler scope.

## Stack

Фактические версии закреплены в `package.json` и `docs/TECH_STACK.md`:

- Next.js 16.3.3;
- React 19.2.8;
- TypeScript 6.0.3;
- Prisma 7.10.0;
- PostgreSQL 18.x;
- Better Auth 1.7.2;
- Zod 4.5.4;
- pnpm 11.5.1.

## Main commands

```bash
pnpm prisma:generate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm build:collector
pnpm worker:sync:REDACTED_CLIENT_DATA
pnpm db:seed
pnpm db:restore-smoke
```

Auth admin scripts:

```bash
doppler secrets get AMS_SEO_MONITOR_ANALYST_PASSWORD --plain | pnpm user:create -- --email ... --name ... --system-role SEO_ANALYST
pnpm user:add-to-organization -- --email ... --organization REDACTED_CLIENT_DATA
```

## Canon

Стартовать с:

- `AGENTS.md`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `SECURITY.md`
- `docs/MASTER_PLAN.md`

Детальнее по слоям:

- `docs/TECH_STACK.md`
- `docs/DATABASE.md`
- `docs/AUTH.md`
- `docs/WORKER.md`
- `docs/DEPLOYMENT.md`

## Important constraints

- public signup выключён;
- provider mutations запрещены;
- browser не вызывает provider APIs;
- Prisma и SQL не импортируются в UI;
- production deploy и merge в `main` не выполняются автоматически;
- filesystem больше не является runtime source of truth.