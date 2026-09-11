# AMS IMPULSE

AMS IMPULSE — продукт АМС для SEO-продвижения и клиентской SEO-отчётности. В одном repository живут публичный сайт услуги, приватный кабинет, Platform Admin, worker-сбор данных и production release tooling.

Главный вход в документацию: [`AGENTS.md`](AGENTS.md).

## Быстрый Контекст

- Project class: `AMS Application Platform Core 3.4 — Solo Minimal`.
- Profile: `TENANCY = multi-tenant`, `ASYNC = outbox-plus-queue`, `DATA = pii`, `DELIVERY = own-saas`, `PLATFORM_ADMIN = enabled`.
- Database: approved exception `self-managed-postgresql`; PostgreSQL 18 остаётся production contract, Managed PostgreSQL не является backlog.
- Primary Git: SourceCraft `origin/main`.
- Production: reviewed `main` → immutable OCI image → Docker Compose → host Nginx → protected env → self-managed PostgreSQL.
- Runtime source of truth: code, `package.json`, `pnpm-lock.yaml`, Prisma schema/migrations and protected runtime env.

## Что Делает Система

Публичная часть:

- показывает предложение AMS IMPULSE;
- открывает вход в кабинет через modal;
- отправляет заявку во внешний AMS Leads API;
- не сохраняет lead PII в PostgreSQL AMS IMPULSE.

Приватная часть:

- ведёт organizations, projects, sites, users and memberships;
- собирает read-only данные Яндекс.Вебмастера и Яндекс.Метрики;
- управляет Topvisor только через idempotent worker с price-check перед платной операцией;
- хранит нормализованную историю в PostgreSQL;
- показывает директорский отчёт по каждому сайту за `week`, `month`, `quarter`, `halfYear`;
- не изменяет клиентские сайты.

Продуктовая иерархия:

```text
Все проекты
→ Проект
  → Сайты
    → Единый отчёт
```

URL contract `clientSlug/siteSlug` and routes `/c/*` сохраняются.

## Активный Канон Документов

Обязательное ядро:

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — пользователи, сценарии, продуктовые ограничения.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — platform profile, stack, boundaries, web/worker/release topology.
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — Prisma/PostgreSQL ownership, lifecycle, invariants, DateTime policy.
- [`docs/SECURITY.md`](docs/SECURITY.md) — auth, tenancy, PII, secrets, provider trust boundaries.
- [`docs/MASTER_PLAN.md`](docs/MASTER_PLAN.md) — только незавершённая работа.
- [`docs/RUNBOOK_DEPLOY.md`](docs/RUNBOOK_DEPLOY.md) — production build/deploy/recovery gate.

Профильные документы:

- [`docs/modules/`](docs/modules/) — contracts значимых модулей.
- [`docs/INTERNAL_DASHBOARD_DESIGN_SYSTEM.md`](docs/INTERNAL_DASHBOARD_DESIGN_SYSTEM.md) — приватный UI.
- [`docs/EXTERNAL_SITE_DESIGN_SYSTEM.md`](docs/EXTERNAL_SITE_DESIGN_SYSTEM.md) — публичный UI.
- [`docs/ops/LOCAL_DEVELOPMENT.md`](docs/ops/LOCAL_DEVELOPMENT.md) — локальный Windows-native запуск.
- [`docs/ops/CLIENT_ONBOARDING.md`](docs/ops/CLIENT_ONBOARDING.md) — подключение клиента/проекта.
- [`docs/ops/RECOVERY.md`](docs/ops/RECOVERY.md) — code rollback and DB recovery.
- [`docs/ops/TOKEN_ROTATION.md`](docs/ops/TOKEN_ROTATION.md) — ротация credentials.
- [`docs/adr/ADR-001-application-platform-profile.md`](docs/adr/ADR-001-application-platform-profile.md) — принятое верхнеуровневое решение.

Архив не является источником истины: [`docs/archive/`](docs/archive/).

## Фактический Стек

Точные версии закреплены в `package.json`, `pnpm-lock.yaml` и `.node-version`:

| Слой | Версия |
|---|---:|
| Node.js | `24.20.0`, engine `>=24.20.0 <25` |
| pnpm | `11.5.1` |
| Next.js | `16.3.3` |
| React / React DOM | `19.2.8` |
| TypeScript | `6.0.3` |
| Prisma / Client / pg adapter | `7.10.0` |
| PostgreSQL | `18.x`; local/test `18.6` |
| Better Auth | `1.7.2` |
| Tailwind CSS | `4.3.3` |
| Base UI / TanStack Table / Recharts | `1.8.0` / `9.2.4` / `3.10.1` |

Version-sensitive изменения требуют проверки свежей официальной документации и отдельного решения, если затрагивают major/minor compatibility.

## Маршруты

Публичные:

- `/`
- `/politika/`, `/soglasie/`, `/cookies/`, `/terms/`
- `/robots.txt`, `/sitemap.xml`
- `/api/health/live`

Приватные:

- `/dashboard/`
- `/analyst/`
- `/admin/*`
- `/notifications/` for Platform Admin and SEO Analyst
- `/c/{clientSlug}/`
- `/c/{clientSlug}/{siteSlug}/?period=week|month|quarter|halfYear`
- `/demo/`
- loopback-only `/api/health/ready`

## Локальный Запуск

Канон: [`docs/ops/LOCAL_DEVELOPMENT.md`](docs/ops/LOCAL_DEVELOPMENT.md).

```bash
pnpm install --frozen-lockfile
pnpm playwright:install
pnpm dev:status
pnpm dev:start
```

Local database: Windows-native PostgreSQL `18.6`, `127.0.0.1:5435`, separate `seo_monitor_dev` and `seo_monitor_test`. Docker/WSL не используются для обычной разработки.

Canonical local URL: `http://127.0.0.1:3001`.

## Проверки

```bash
pnpm verify:quick
pnpm verify:risky
pnpm verify:daily
pnpm verify:release
```

Выбор проверки зависит от риска:

- docs/UI/client read logic: обычно достаточно scope/diff proof;
- auth/tenant/PII/schema/worker/provider/release: `RISKY` и профильные проверки;
- production: только отдельная owner-команда и deploy runbook.

Локальный PASS не заменяет SourceCraft exact-head gate перед merge.

## Release

Release не начинается из feature branch. Путь:

```text
SourceCraft PR
→ review + STANDARD/RISKY exact-head gate
→ merge в canonical main
→ owner-команда production
→ immutable artifact
→ backup + restore smoke
→ migration
→ cutover + live smoke
```

Production proof хранится вне source docs; документы описывают контракт, а не текущее live-состояние.
