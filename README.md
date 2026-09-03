# AMS IMPULSE

AMS IMPULSE — публичная страница SEO-продукта АМС и приватный кабинет SEO-отчётности по нескольким проектам и сайтам.

## Что делает система

- публично представляет предложение по SEO-продвижению и принимает заявки через отдельный AMS Leads API;
- по расписанию получает read-only данные Яндекс.Вебмастера, Яндекс.Метрики и опционально Topvisor;
- сохраняет нормализованную историю и отчёты в PostgreSQL;
- показывает аналитику и клиенту единый директорский отчёт по сайту;
- не изменяет клиентские сайты и не выполняет provider mutations.

Продуктовая иерархия:

```text
Все проекты
→ Проект
  → Сайты
    → Единый отчёт
```

Внутренние `clientSlug` и маршруты `/c/*` остаются действующим URL/data contract.

## Архитектура

```text
Browser
→ Nginx
→ Next.js standalone
→ application services
→ repository contracts
→ Prisma repositories
→ PostgreSQL

systemd timer
→ worker oneshot
→ provider adapters
→ normalization и domain analytics
→ PostgreSQL
→ ReportSnapshot / SiteReportSnapshot
```

Главные инварианты:

- `SiteReportSnapshot` — единственный browser-safe DTO отчёта;
- Better Auth создаёт session; server ActorContext, capabilities и fresh memberships защищают приватные маршруты;
- browser не обращается к provider APIs и не получает provider credentials;
- UI не импортирует Prisma и не рассчитывает provider semantics;
- PostgreSQL — runtime source of truth; `config/*` используется как проверяемый seed/input;
- worker отделён от web runtime;
- reliability foundation атомарно связывает idempotency, audit, outbox и JobRun;
- outbox worker uses leases, bounded retry/backoff and dead-letter;
- `partial`, `stale` и `null` не маскируются как `success`, `current` или `0`.

## Реализованные поверхности

Публичные:

- `/` — лендинг AMS IMPULSE;
- `/politika/`, `/soglasie/`, `/cookies/`, `/terms/` — правовые страницы;
- `/robots.txt`, `/sitemap.xml`;
- `/api/health/live` — безопасная liveness-проверка с correlation ID и release SHA.

Приватные:

- `/dashboard/` — входная точка кабинета;
- `/analyst/` — все доступные аналитику проекты;
- `/c/{clientSlug}/` — сайты проекта;
- `/c/{clientSlug}/{siteSlug}/?period=week|month|quarter|halfYear` — отчёт сайта;
- `/demo/` — авторизованный fixture-отчёт;
- `/api/health/ready` — внутренняя readiness-проверка PostgreSQL + auth + outbox counts с тем же release SHA.

## Стек

Фактические версии закреплены в `package.json` и `pnpm-lock.yaml`:

- Node.js engine `>=24.20.0 <25` (release `24.20.0`), pnpm `11.5.1`;
- Next.js `16.3.3`, React `19.2.8`;
- TypeScript `6.0.3`, Zod `4.5.4`;
- Prisma `7.10.0`, PostgreSQL `18.x`;
- Better Auth `1.7.2`;
- Tailwind CSS `4.3.3`, Recharts `3.10.1`;
- Vitest, Playwright и Dependency Cruiser.

## Локальная подготовка

```bash
pnpm install --frozen-lockfile
pnpm playwright:install
```

Создайте ignored `.env.local` по `.env.example`, затем:

```bash
pnpm dev:db:start
pnpm dev:db:migrate
pnpm dev:db:seed
pnpm dev
```

Docker PostgreSQL слушает только `127.0.0.1`, использует отдельные `seo_monitor_dev` и `seo_monitor_test` и сохраняет named volume между перезапусками. Production DB/credentials запрещены. Полный порядок: [`docs/ops/LOCAL_DEVELOPMENT.md`](docs/ops/LOCAL_DEVELOPMENT.md).

Operator provisioning поддерживает `PLATFORM_ADMIN`, `SEO_ANALYST` и `CLIENT_VIEWER`:

```bash
<secret-provider> | pnpm user:create -- --username <name> --name <display-name> --system-role PLATFORM_ADMIN
pnpm user:set-system-role -- --username <name> --system-role SEO_ANALYST
```

Passwords остаются bounded-stdin only.

## Проверки

```bash
pnpm architecture:check
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm verify:fast
pnpm verify:heavy
```

`test:integration` fail-closed без безопасного `*_test` database, сам применяет migrations и seed. `test:e2e` строит standalone runtime и проверяет public UI/auth boundary на 375/768/1280/1440.

Production web env отдельно проверяется общей Zod boundary:

```bash
pnpm verify:web-environment
```

Restore smoke production backup выполняется отдельно:

```bash
pnpm db:restore-smoke
```

Provider preflight и worker sync требуют разрешённого scope и server-side secrets:

```bash
pnpm collector:webmaster:preflight
pnpm collector:metrica:preflight
pnpm worker:sync:REDACTED_CLIENT_DATA
pnpm worker:outbox:drain
```

## Release

Release собирается только из clean reviewed canonical `main`. Linux target устанавливает зависимости из lockfile, строит standalone web и worker, применяет reviewed Prisma migrations, выполняет seed, обязательный backup/restore smoke и только затем переключает immutable release.

Merge и production deploy выполняются только отдельной командой владельца. Подробности: [`docs/ops/DEPLOY_RUNBOOK.md`](docs/ops/DEPLOY_RUNBOOK.md).

## Документация

Начальная точка — [`AGENTS.md`](AGENTS.md).

Активное ядро:

- [`docs/PRODUCT.md`](docs/PRODUCT.md);
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md);
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md);
- [`SECURITY.md`](SECURITY.md);
- [`docs/MASTER_PLAN.md`](docs/MASTER_PLAN.md);
- [`docs/PLATFORM_CONFORMANCE.md`](docs/PLATFORM_CONFORMANCE.md) — project mapping универсального platform standard.

Профильные документы:

- [`docs/TECH_STACK.md`](docs/TECH_STACK.md);
- [`docs/DATABASE.md`](docs/DATABASE.md);
- [`docs/AUTH.md`](docs/AUTH.md);
- [`docs/WORKER.md`](docs/WORKER.md);
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md);
- [`docs/SITE_REPORT_IA.md`](docs/SITE_REPORT_IA.md);
- [`docs/EXTERNAL_SITE_DESIGN_SYSTEM.md`](docs/EXTERNAL_SITE_DESIGN_SYSTEM.md);
- [`docs/INTERNAL_DASHBOARD_DESIGN_SYSTEM.md`](docs/INTERNAL_DASHBOARD_DESIGN_SYSTEM.md);
- [`docs/adr/ADR-001-adopt-application-platform-standard.md`](docs/adr/ADR-001-adopt-application-platform-standard.md);
- [`docs/adr/ADR-002-actor-context-and-capabilities.md`](docs/adr/ADR-002-actor-context-and-capabilities.md);
- [`docs/modules/MODULE_PLATFORM_RELIABILITY.md`](docs/modules/MODULE_PLATFORM_RELIABILITY.md);
- [`docs/modules/MODULE_IDENTITY_ACCESS.md`](docs/modules/MODULE_IDENTITY_ACCESS.md);
- [`docs/ops/LOCAL_DEVELOPMENT.md`](docs/ops/LOCAL_DEVELOPMENT.md);
- [`docs/modules/`](docs/modules/);
- [`docs/ops/`](docs/ops/).

Устаревшие migration-планы находятся в `docs/archive/` и не являются source of truth.
