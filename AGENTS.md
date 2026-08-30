# AMS SEO Monitor — project router

## Язык и формат

- Отвечать по-русски.
- Сначала итог, затем изменения, проверки, риски и следующий шаг.
- Не выдумывать credentials, host IDs, counter IDs, exact deployed SHA и live production claims.

## Проект

AMS SEO Monitor — отдельный приватный AMS-продукт для SEO-отчётности по нескольким проектам и сайтам. Это не модуль Бастиона и не public marketing site.

## Что читать первым

1. `README.md`
2. `AGENTS.md`
3. профильный документ текущего scope.

Core canon:

- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `SECURITY.md`
- `docs/MASTER_PLAN.md`

Detail canon:

- `docs/TECH_STACK.md`
- `docs/DATABASE.md`
- `docs/AUTH.md`
- `docs/WORKER.md`
- `docs/DEPLOYMENT.md`
- `docs/modules/*`
- `docs/ops/*`

## Product invariants

- hierarchy `Все проекты → Проект → Сайты → Единый отчёт`;
- роли `SEO_ANALYST` и `CLIENT_VIEWER`;
- browser-safe DTO = `SiteReportSnapshot`;
- `month` default, periods `week/month/quarter/halfYear`;
- `partial` ≠ `success`;
- `stale` ≠ `current`;
- `null` ≠ `0`;
- Webmaster average position не заменяет exact ranking;
- direct query → lead attribution запрещена.

## Architecture invariants

- Next.js работает как server application with standalone output;
- PostgreSQL — runtime source of truth;
- Better Auth — application auth boundary;
- Nginx — TLS/reverse proxy/hardening, не Basic Auth layer;
- worker синхронизирует providers отдельно от web requests;
- UI → Service → Repository Contract → Prisma Repository → PostgreSQL;
- Prisma не импортируется в UI;
- provider APIs не вызываются из browser;
- filesystem не используется как runtime database.

## Git and release

- canonical primary = SourceCraft `origin/main`;
- один поток = одна branch = один PR;
- production deploy только после review/merge command;
- server mutation без production deploy допустима только для isolated verification или DB foundation в рамках явной backend задачи;
- exact production rollout, Nginx activation и release switch не выполнять без отдельного owner command.

## Checks

Для code/runtime scope обязательны:

```bash
pnpm build:collector
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Для DB/integration scope дополнительно:

```bash
pnpm db:restore-smoke
```

Для auth/runtime smoke использовать реальный surface:

- `/api/health/live`
- `/api/health/ready`
- login flow
- analyst/client route access
- worker sync smoke

## Done

Изменение считается готовым, когда:

- новая архитектура реально работает, не только описана в docs;
- affected docs синхронизированы;
- direct Prisma import в UI отсутствует;
- relevant tests и smoke checks пройдены;
- legacy path удалён, если он больше не нужен;
- production deploy остаётся отдельным явным действием.
