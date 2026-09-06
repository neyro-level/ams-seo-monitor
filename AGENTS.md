# AMS IMPULSE — project router

## Язык и формат

- Отвечать по-русски.
- Сначала итог, затем изменения, проверки, риски и следующий шаг.
- Не выдумывать credentials, provider IDs, deployed SHA, migration state или live production state.

## Проект

AMS IMPULSE — отдельный продукт АМС: публичный лендинг SEO-продвижения и приватный кабинет отчётности по нескольким проектам и сайтам. Это не модуль Бастиона; нельзя использовать runtime-код, БД или application auth других проектов.

## Hard Rules — AMS Application Platform Core 3.1

Для проекта действует `AMS Application Platform Core 3.1`. Оставшиеся compatibility paths являются явным technical debt в `docs/MASTER_PLAN.md`, а не разрешённым precedent.

Project Profile:

- `TENANCY = multi-tenant`;
- `ASYNC = outbox-plus-queue`;
- `DATA = pii` — ограниченные account и operational PII без CRM-хранилища заявок.

### Security и tenancy

1. `organizationId` из browser, URL, form или external payload не доказывает доступ.
2. Tenant определяется только server-generated `PrincipalContext`.
3. Каждая новая/мигрируемая tenant-owned entity имеет `organizationId`.
4. Критичные tenant relations защищаются composite PostgreSQL constraints.
5. Nested writes между tenant-owned models запрещены.
6. Platform Admin не маскируется под tenant user и не получает fake organization.
7. Authentication не заменяет authorization.
8. Hidden UI control не является permission.

### Data access

9. Prisma запрещён в Client Components, presentation и domain.
10. Application API не возвращает Prisma records.
11. Global Prisma client разрешён только в `platform/database` и approved infrastructure composition.
12. `$queryRawUnsafe` и `$executeRawUnsafe` запрещены без ADR.
13. Raw SQL живёт только в explicit infrastructure analytics/maintenance boundary.
14. Tenant raw SQL всегда параметризован, принимает explicit `organizationId`, возвращает DTO и имеет cross-tenant integration test.

### Mutations

15. Каждая новая/мигрируемая business mutation проходит canonical business command.
16. `defineCommand` — единственный владелец business transaction.
17. `defineAction` — только Next adapter.
18. UI, API и worker не дублируют business rules.
19. Transport не открывает transaction вокруг command.
20. External HTTP, email, AI и storage запрещены внутри DB transaction.

### Database

21. Applied migration никогда не переписывается.
22. `prisma db push` в production запрещён.
23. Destructive migration требует impact review, backup/restore consideration и rollback/forward-fix strategy.
24. Destructive SQL без подтверждённого target/scope запрещён.

### Authentication

25. Public signup выключен.
26. Better Auth Organization Plugin запрещён; existing integration мигрирует clean-cutover plan.
27. Better Auth roles не являются AMS business permissions.
28. Собственная password/session implementation запрещена.
29. Better Auth cookie cache не включается без ADR.
30. `PLATFORM_ADMIN` до нового production обязан использовать 2FA.

### AI и delivery

31. Major dependency не обновляется внутри product task.
32. `latest` не устанавливается вместо canonical version line.
33. Падающая проверка не скрывается и не ослабляется.
34. Работа не считается завершённой без фактического proof.
35. Независимые задачи не смешиваются в одном diff.
36. Production не выполняет `pnpm install`, build или random checkout; release привязан к exact SHA и immutable image.

## Иерархия источников истины

При конфликте:

1. фактически проверенный production runtime;
2. `package.json`, lockfile, `.node-version`, Prisma schema/migrations и runtime config;
3. этот `AGENTS.md`;
4. профильные project docs;
5. AMS Application Platform Core 3.1;
6. global AMS skills как execution workflow;
7. старые планы, чаты и заметки.

Production drift не узаконивается молча: он устраняется или фиксируется ADR.

## Минимальный порядок чтения

Для любой задачи:

1. `README.md`;
2. `AGENTS.md`;
3. один профильный документ текущего scope.

Активное ядро:

- продукт и роли — `docs/PRODUCT.md`;
- архитектура и ownership — `docs/ARCHITECTURE.md`;
- schema, lifecycle и data invariants — `docs/DATA_MODEL.md`;
- auth, secrets, PII и trust boundaries — `docs/SECURITY.md`;
- verified state и backlog — `docs/MASTER_PLAN.md`.

Профильные документы:

- stack — `docs/TECH_STACK.md`;
- PostgreSQL и backup — `docs/DATABASE.md`;
- Better Auth и access — `docs/AUTH.md`;
- worker/data collection — `docs/WORKER.md`;
- release/runtime — `docs/RUNBOOK_DEPLOY.md` и `docs/ops/*`;
- report UI — `docs/SITE_REPORT_IA.md` и `docs/INTERNAL_DASHBOARD_DESIGN_SYSTEM.md`;
- public UI — `docs/EXTERNAL_SITE_DESIGN_SYSTEM.md`;
- бизнес-модули — `docs/modules/*`;
- verified state и product roadmap — `docs/MASTER_PLAN.md`;
- local development — `docs/ops/LOCAL_DEVELOPMENT.md`;
- architecture decisions — `docs/adr/*`.

## Product invariants

- hierarchy: `Все проекты → Проект → Сайты → Единый отчёт`;
- current identity mapping: `PLATFORM_ADMIN` → platform-admin, `SEO_ANALYST` → platform-analyst, client membership → tenant-user через server-generated `PrincipalContext`; deprecated `ActorContext` остаётся только на явно отмеченных compatibility reads;
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
- canonical identity contract — discriminated `PrincipalContext`; новый code не расширяет deprecated `ActorContext`;
- `platform-admin`/`platform-analyst` не получают fake organization;
- tenant principal создаётся server-side только из fresh User + AMS Membership + active organization;
- permissions и module-owned resource authorization обязательны одновременно;
- Better Auth владеет только identity/password/session/2FA; Organization Plugin не зарегистрирован в runtime;
- authorization проверяется server-side на каждом private read;
- Nginx отвечает за TLS, reverse proxy и hardening, но не заменяет application auth;
- worker синхронизирует providers отдельно от web requests;
- canonical mutation path: `defineAction/job adapter → defineCommand → transaction-bound repositories → PostgreSQL`;
- Prisma и SQL не импортируются в UI;
- browser не вызывает Yandex/Topvisor API;
- web process не получает provider tokens;
- filesystem не используется как runtime database;
- `src/modules/reporting/domain/report-compiler.ts` владеет report semantics; второй compiler запрещён;
- public AMS IMPULSE landing, dialogs, legal routes и `ch-*` visual language сохраняются; Refine/shadcn не переносятся в public UI;
- vertical modules публикуют только root entrypoints (`index.ts`, а при необходимости `server.ts`, `client.ts`, `worker.ts`); cross-module imports внутренних слоёв запрещены;
- `/admin/*` использует typed Platform Admin queries/commands без Refine и generic command dispatcher;
- каждая migrated mutation владеется `defineCommand`; business data + AuditEvent + optional OutboxEvent атомарны;
- browser никогда не принимает/показывает provider secrets; settings JSON отклоняет sensitive keys;
- executable import rules принадлежат `dependency-cruiser.config.cjs`;
- `src/platform` владеет neutral env, correlation, error и health contracts;
- значимый deferred side effect начинается atomic enqueue: IdempotencyKey + AuditEvent + versioned OutboxEvent;
- canonical delivery: outbox drain → pg-boss → idempotent job handler;
- runtime pg-boss auto-DDL запрещён; retries bounded, exhausted → dead-letter;
- новый topic требует schema version, payload limit, handler и success/retry/permanent tests.

## Архитектурные зоны

- `src/app` — routes, layouts, metadata, health/auth handlers;
- `src/components` — presentation и client interaction;
- `src/modules/identity-access` — AMS Membership и Better Auth-only identity adapter; deprecated ActorContext facade разрешён только для перечисленных compatibility reads;
- `src/modules/project-registry` — tenant-scoped projects/sites, monitoring registry и overview;
- `src/modules/reporting` — report reads, periods, compiler и browser-safe presentation;
- `src/modules/ranking-analytics` — deterministic ranking/query analytics;
- `src/modules/data-ingestion` — sync lifecycle, ports, persistence и worker orchestration;
- `src/modules/platform-operations` — audit/idempotency/outbox/job lifecycle с pg-boss queue adapter;
- `src/modules/platform-admin` — Platform Admin composition и presentation contracts;
- `src/infrastructure` — transitional compatibility composition; новые shared runtime boundaries принадлежат `src/platform/*`;
- `src/worker` — compiled worker entrypoint;
- `collector/sources` — read-only provider adapters;
- `src/shared/schemas` — Zod contracts;
- `prisma` — schema и immutable migrations;
- `config` — временные legacy inputs до этапа public-data cleanup; runtime import принимает только explicit private path;
- `ops` — reviewed production assets;
- `scripts` — verification, admin, backup/release boundaries.

## Data и migrations

- `prisma/schema.prisma` — source of truth для структуры БД.
- Уже применённые migrations не редактировать; schema change требует новой migration.
- Production применяет только `prisma migrate deploy`; `db push` запрещён.
- Destructive data operations, production migrations и restore требуют отдельного owner decision.
- Test/dev DB не должна указывать на production.

## Security

- `PLATFORM_ADMIN` — отдельный non-tenant principal; до нового production обязательна 2FA.
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
- каждый новый независимый поток создаётся отдельной branch/worktree от свежего `origin/main`;
- завершённый поток: scoped checks → commit → push → PR в `main`;
- перед `main` обязательны review и risk-based exact-head FAST/HEAVY gate;
- production не следует автоматически за merge train и требует отдельного release intent;
- deploy target — exact reviewed `main` OCI image digest; host build/install запрещён;
- до отдельного deploy-scope не менять live Nginx/systemd/Compose, production DB и secrets.

## Проверки

Code/runtime scope:

```bash
pnpm architecture:check
pnpm test:unit
pnpm verify:quick
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

Risky candidate:

```bash
pnpm verify:risky
```

Production/release scope дополнительно:

```bash
pnpm verify:web-environment
pnpm verify:release
```

Integration runner обязан fail-closed без isolated `*_test` database. UI scope требует browser proof на `375 / 768 / 1280 / 1440`. Backup scope — `pnpm db:restore-smoke` только на временной БД.

## Обновление документации

- роль/product boundary → `docs/PRODUCT.md`;
- module ownership/runtime flow → `docs/ARCHITECTURE.md` и профильный module doc;
- schema/lifecycle/invariants → `docs/DATA_MODEL.md`;
- auth/secrets/PII/trust boundary → `docs/SECURITY.md` и `docs/AUTH.md`;
- stack/dependency policy → `docs/TECH_STACK.md`;
- DB/backup → `docs/DATABASE.md`;
- release → `docs/RUNBOOK_DEPLOY.md`; recovery/onboarding → профильный `docs/ops/*`;
- завершённый этап → очистить `docs/MASTER_PLAN.md`, не хранить выполненный план как active backlog.

## Done

Изменение готово, когда поведение завершено end-to-end, affected callsites и docs синхронизированы, релевантные проверки пройдены, deprecated path удалён, а production остаётся отдельным явным действием.
