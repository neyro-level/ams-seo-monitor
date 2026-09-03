# AMS IMPULSE — project router

## Язык и формат

- Отвечать по-русски.
- Сначала итог, затем изменения, проверки, риски и следующий шаг.
- Не выдумывать credentials, provider IDs, deployed SHA, migration state или live production state.

## Проект

AMS IMPULSE — отдельный продукт АМС: публичный лендинг SEO-продвижения и приватный кабинет отчётности по нескольким проектам и сайтам. Это не модуль Бастиона; нельзя использовать runtime-код, БД или application auth других проектов.

## Минимальный порядок чтения

Для любой задачи:

1. `README.md`;
2. `AGENTS.md`;
3. один профильный документ текущего scope.

Активное ядро:

- продукт и роли — `docs/PRODUCT.md`;
- архитектура и ownership — `docs/ARCHITECTURE.md`;
- schema, lifecycle и data invariants — `docs/DATA_MODEL.md`;
- auth, secrets, PII и trust boundaries — `SECURITY.md`;
- verified state и backlog — `docs/MASTER_PLAN.md`.

Профильные документы:

- stack — `docs/TECH_STACK.md`;
- PostgreSQL и backup — `docs/DATABASE.md`;
- Better Auth и access — `docs/AUTH.md`;
- worker/data collection — `docs/WORKER.md`;
- release/runtime — `docs/DEPLOYMENT.md` и `docs/ops/*`;
- report UI — `docs/SITE_REPORT_IA.md` и `docs/INTERNAL_DASHBOARD_DESIGN_SYSTEM.md`;
- public UI — `docs/EXTERNAL_SITE_DESIGN_SYSTEM.md`;
- бизнес-модули — `docs/modules/*`;
- platform conformance/roadmap — `docs/PLATFORM_CONFORMANCE.md` и `docs/MASTER_PLAN.md`;
- local development — `docs/ops/LOCAL_DEVELOPMENT.md`;
- architecture decisions — `docs/adr/*`.

`docs/archive/*` — история решений, не активный canon.

## Product invariants

- hierarchy: `Все проекты → Проект → Сайты → Единый отчёт`;
- роли: `PLATFORM_ADMIN`, `SEO_ANALYST`, `CLIENT_VIEWER`;
- browser-safe report contract: `SiteReportSnapshot`;
- periods: `week`, `month`, `quarter`, `halfYear`; default — `month`;
- `partial` ≠ `success`, `stale` ≠ `current`, `null` ≠ `0`;
- Webmaster average position не заменяет exact ranking;
- Top-3 является подмножеством Top-10;
- direct query-to-lead attribution запрещена;
- provider mutations и paid rank checks запрещены.

## Architecture invariants

- Next.js работает как standalone server application, не static export;
- PostgreSQL — единственный runtime source of truth;
- `ActorContext` создаётся server-side из fresh User + Member records;
- authorization использует versioned capabilities, а не scattered role checks;
- active organization принимается только из ActorContext memberships;
- `config/*` — checked-in nonsecret seed/input, не runtime registry;
- Better Auth — application authentication boundary;
- authorization проверяется server-side на каждом private read;
- Nginx отвечает за TLS, reverse proxy и hardening, но не заменяет application auth;
- worker синхронизирует providers отдельно от web requests;
- направление: `UI → Service → Repository Contract → Prisma Repository → PostgreSQL`;
- Prisma и SQL не импортируются в UI;
- browser не вызывает Yandex/Topvisor API;
- web process не получает provider tokens;
- filesystem не используется как runtime database;
- `src/modules/reporting/domain/report-compiler.ts` владеет report semantics; второй compiler запрещён;
- public AMS IMPULSE landing, dialogs, legal routes и `ch-*` visual language сохраняются; Refine/shadcn не переносятся в public UI;
- vertical modules публикуют только root entrypoints (`index.ts`, а при необходимости `server.ts`, `client.ts`, `worker.ts`); cross-module imports внутренних слоёв запрещены;
- executable import rules принадлежат `dependency-cruiser.config.cjs`;
- `src/platform` владеет neutral env, correlation, error и health contracts;
- значимый deferred side effect начинается atomic enqueue: IdempotencyKey + AuditEvent + OutboxEvent;
- external handler выполняется вне transaction;
- outbox complete/fail требует lease owner; retries bounded, exhausted → dead-letter;
- новый topic требует schema, handler и success/retry/permanent tests.

## Архитектурные зоны

- `src/app` — routes, layouts, metadata, health/auth handlers;
- `src/components` — presentation и client interaction;
- `src/modules/identity-access` — ActorContext, capabilities и Better Auth adapters;
- `src/modules/project-registry` — tenant-scoped projects/sites, monitoring registry и overview;
- `src/modules/reporting` — report reads, periods, compiler и browser-safe presentation;
- `src/modules/ranking-analytics` — deterministic ranking/query analytics;
- `src/modules/data-ingestion` — sync lifecycle, ports, persistence и worker orchestration;
- `src/modules/platform-operations` — audit/idempotency/outbox/job lifecycle;
- `src/infrastructure` — shared Prisma context и web/worker composition roots;
- `src/worker` — compiled worker entrypoint;
- `collector/sources` — read-only provider adapters;
- `src/shared/schemas` — Zod contracts;
- `prisma` — schema и immutable migrations;
- `config` — reviewed nonsecret seed inputs;
- `ops` — reviewed production assets;
- `scripts` — verification, admin, backup/release boundaries.

## Data и migrations

- `prisma/schema.prisma` — source of truth для структуры БД.
- Уже применённые migrations не редактировать; schema change требует новой migration.
- Production применяет только `prisma migrate deploy`; `db push` запрещён.
- Destructive data operations, production migrations и restore требуют отдельного owner decision.
- Test/dev DB не должна указывать на production.

## Security

- `PLATFORM_ADMIN` — internal role; browser mutations разрешаются только как named audited commands после появления соответствующего Admin CMS resource.
- Private reads требуют capability + tenant scope; navigation visibility не является защитой.
- Public errors используют stable envelope и correlation ID.
- Production web env валидируется до build; release SHA materialize-ит deploy, не browser.
- Public signup выключен.
- Provider credentials, DB URLs, Better Auth secret, backup credentials и delivery tokens не попадают в Git, docs, browser или logs.
- Public Leads API site key не считается секретом; bot/delivery credentials остаются во внешнем Leads API.
- User passwords принимаются admin CLI через bounded stdin, не argv.
- Private routes и DTO проверяются по session + role/membership, не по navigation visibility.
- Sensitive access/runtime changes требуют HEAVY review.

## Git и release

- canonical primary: SourceCraft `origin/main`;
- один независимый поток = одна branch = один PR;
- не работать напрямую в `main` и не накладывать stale branch поверх актуального runtime;
- commit/push, PR, merge и production — только по отдельной команде владельца;
- deploy — только из reviewed canonical `main` по `docs/ops/DEPLOY_RUNBOOK.md`;
- без deploy-команды не менять live Nginx/systemd, не применять production migrations и не materialize secrets.

## Проверки

Code/runtime scope:

```bash
pnpm architecture:check
pnpm test:unit
pnpm verify:fast
```

DB/auth/worker scope:

```bash
pnpm dev:db:start
pnpm test:integration
```

UI/browser scope:

```bash
pnpm playwright:install
pnpm test:e2e
```

HEAVY candidate:

```bash
pnpm verify:heavy
```

Production/release scope дополнительно:

```bash
pnpm verify:web-environment
```

Integration runner обязан fail-closed без isolated `*_test` database. UI scope требует browser proof на `375 / 768 / 1280 / 1440`. Backup scope — `pnpm db:restore-smoke` только на временной БД.

## Обновление документации

- роль/product boundary → `docs/PRODUCT.md`;
- module ownership/runtime flow → `docs/ARCHITECTURE.md` и профильный module doc;
- schema/lifecycle/invariants → `docs/DATA_MODEL.md`;
- auth/secrets/PII/trust boundary → `SECURITY.md` и `docs/AUTH.md`;
- stack/dependency policy → `docs/TECH_STACK.md`;
- DB/backup → `docs/DATABASE.md`;
- release/recovery/onboarding → профильный `docs/ops/*`;
- platform requirement mapping → `docs/PLATFORM_CONFORMANCE.md`;
- завершённый этап → очистить `docs/MASTER_PLAN.md`, не хранить выполненный план как active backlog.

## Done

Изменение готово, когда поведение завершено end-to-end, affected callsites и docs синхронизированы, релевантные проверки пройдены, legacy path удалён или архивирован, а production остаётся отдельным явным действием.
