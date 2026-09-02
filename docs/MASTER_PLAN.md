# MASTER PLAN

## Назначение

Только текущий state, открытые ограничения и ближайшие product steps. История завершённых waves и migration-планы находятся в Git и `docs/archive/`.

## Текущий repository state

### Product

- AMS IMPULSE объединяет public landing и private SEO cabinet.
- Hierarchy: `Все проекты → Проект → Сайты → Единый отчёт`.
- Public routes: `/`, legal pages, robots и sitemap.
- Private routes: `/dashboard/`, `/analyst/`, `/c/*`, `/demo/`.
- Contact form использует отдельный AMS Leads API и не пишет lead PII в PostgreSQL AMS IMPULSE.

### Runtime

- Next.js `output: "standalone"` behind Nginx.
- PostgreSQL/Prisma — runtime source of truth.
- Better Auth username/password; public signup disabled.
- `SEO_ANALYST` и organization-scoped `CLIENT_VIEWER` проверяются server-side.
- Worker oneshot отделён от web runtime и защищён PostgreSQL advisory lock.
- Release artifact строится из reviewed source/lockfile на Linux target.
- `pnpm build` собирает standalone `public/` и `.next/static/`, поэтому direct standalone assets не теряются.

### Data pipeline

- Yandex Webmaster и Metrika adapters read-only.
- Topvisor — optional read-only history; paid checks/import/mutations запрещены.
- Worker сохраняет SyncRun/SourceRun, historical metrics, technical snapshots, ranking captures и четыре ReportSnapshot на site.
- `SiteReportSnapshot` остаётся единственным browser-safe report contract.
- Current/previous periods равны по длине: 7, 28, 90 и 180 дней.
- Technical endpoint failures остаются `partial`; ошибка одного периода не переносится в другой.
- Source/sync `finishedAt` фиксирует фактическое время завершения, а snapshot `generatedAt` — единый момент сборки.
- Только цели с `includeInSeoConversion=true` входят в unique SEO conversion; остальные могут оставаться detail goals.

### Operations

- Repository содержит Nginx, web/worker/backup systemd units, migration/seed, immutable deploy, backup и restore-smoke tooling.
- Production contract требует private offsite backup с HEAD confirmation до retention prune.
- Code release rollback переключает immutable `current`; PostgreSQL rollback/restore является отдельной операцией.

## Проверено 2026-09-02

Local repository proof:

- locked dependencies установлены;
- `pnpm build:collector` — pass;
- `pnpm typecheck` — pass;
- `pnpm lint` — pass;
- `pnpm test` — 63 passed, 19 skipped без `TEST_DATABASE_*`;
- `pnpm build` — pass, включая standalone asset assembly;
- source-state, technical baseline и Metrika conversion regressions — pass.

External public proof:

- `https://impulse.ams24.ru/` отдаёт AMS IMPULSE landing;
- `https://seo-monitor.ams24.ru/` перенаправляет на canonical domain;
- `/api/health/live` возвращает 200;
- внешний `/api/health/ready` получает 403, как требует Nginx boundary.

Не перепроверено в этом проходе из-за отсутствия isolated `TEST_DATABASE_*` и production credentials:

- DB-backed integration suites;
- authenticated analyst/client matrix на live;
- live worker sync;
- production backup object и restore smoke;
- exact deployed SHA.

Эти пункты не считаются сломанными; их live-state требует отдельного безопасного operational proof.

## Ближайший обязательный gate

Перед merge/release текущих исправлений:

1. выполнить полный project profile повторно;
2. при доступной isolated test DB выполнить 19 DB/auth/worker integration tests;
3. проверить standalone public/static asset smoke;
4. провести HEAVY review, потому что затронуты worker semantics и release assembly;
5. deploy выполнять только отдельной owner-командой из reviewed canonical `main`.

## Product backlog

### SZ REDACTED_CLIENT_DATA onboarding

Нужны подтверждённые site URL, Webmaster host access, Metrika counter/goals, timezone и client membership delivery. Acceptance: seed/config valid, provider preflight pass, four periods compiled, tenant isolation pass.

### Analyst detail views

Дать аналитику доступ к normalized historical/technical data через отдельный analyst-only DTO. Raw responses, credentials и client leakage запрещены.

### Explicit Topvisor activation

Только после credentials и owner decision. Разрешены read-only history endpoints; checker/import/mutations запрещены.

### Availability monitoring

Authenticated external probe для public availability, private login path и report freshness без response body/secret leakage.

### Dashboard design-system normalization

Перевести оставшиеся hard-coded chart/status/Tailwind colors на зарегистрированные CRM tokens и выполнить visual proof приватных routes на 375/768/1280/1440. Это presentation-only scope; report order, semantics и auth boundary не менять.

### Local development bootstrap

Добавить безопасные `dev:status`, `dev:start`, `dev:bootstrap-admin`, `dev:stop` с isolated `_dev`/`_test` PostgreSQL. Не использовать production DB и не добавлять auth bypass.

## Не делать без отдельного решения

- production migration, deploy или rollback;
- destructive DB cleanup/restore;
- public reports или public signup;
- provider mutations/paid rank checks;
- dependency major upgrade;
- direct push/merge в `main`;
- возврат filesystem/static-export/Basic-Auth architecture.
