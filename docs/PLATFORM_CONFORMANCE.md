# PLATFORM CONFORMANCE

## Назначение

Проектная карта соответствия `AMS Application Platform Core Standard` v1.0. Она переводит универсальные требования стандарта в конкретные решения AMS IMPULSE и не копирует стандарт целиком.

Фактическое состояние определяют `package.json`, Prisma schema, migrations, код и tests. Roadmap хранится в `docs/MASTER_PLAN.md`.

## Целевой профиль

- до 50 клиентских организаций;
- несколько проектов и сайтов на организацию;
- публичный AMS IMPULSE landing сохраняется визуально и функционально;
- приватный кабинет развивается в code-first mini CMS;
- один modular monolith, один Next.js runtime, одна PostgreSQL;
- отдельный worker process, но не отдельный backend;
- tenant isolation, audit и repeatable operations важнее скорости добавления произвольного CRUD.

## Решение по универсальному стандарту

### Обязательно для AMS IMPULSE

- Next.js App Router, strict TypeScript, Tailwind, Zod, Prisma, PostgreSQL, pnpm;
- Better Auth через isolated adapter boundary;
- modular monolith и публичные module entrypoints;
- server-side authorization, tenant scope и explicit DTO;
- business commands/queries вместо arbitrary model updates;
- transaction + audit для значимых mutations;
- idempotency для retryable external/inbound operations;
- PostgreSQL-backed jobs/outbox для deferred side effects;
- Vitest unit + real PostgreSQL integration + Playwright golden paths;
- Dependency Cruiser import boundaries;
- Sentry и structured logs с correlation ID и PII scrubbing;
- automatic backup, restore proof и exact-main release;
- code-first CMS resources, versioned roles/permissions и safe configuration.

### Внедряется только вместе с реальным CMS-модулем

- Refine Core;
- shadcn/ui primitives;
- React Hook Form;
- server pagination/filter/sort contracts;
- resource data/auth/access providers;
- saved views и configurable safe fields.

Эти зависимости не добавляются пустыми. Они входят в этап Admin CMS и используются сразу.

### Не относится к текущему продукту

- `Contact`, CRM pipeline, kanban и Big Data contact import;
- payment-like flows;
- публичная partner API;
- user-defined production schema;
- plugin marketplace.

Добавлять эти сущности только после отдельного product contract. SEO Monitor не должен превращаться в generic CRM.

### Отложено до доказанной необходимости

- PostgreSQL RLS — после ActorContext/transaction contract и integration matrix;
- Redis — только при измеренной нехватке PostgreSQL jobs/locks;
- NestJS/отдельный backend — текущий modular monolith достаточен;
- object storage — только при пользовательских файлах;
- отдельный search engine — сначала PostgreSQL;
- микросервисы, Nx/Turborepo, второй ORM/auth/backend — запрещены без ADR.

## Матрица соответствия

| Область стандарта | Текущее состояние | Gap | Решение |
|---|---|---|---|
| Runtime | Next.js standalone + exact `.node-version` | соответствует | сохранить |
| TypeScript | strict app/collector/tests | соответствует | сохранить |
| Tailwind | v4 | соответствует | токенизировать остаточный dashboard drift |
| Zod | DTO/provider/env/error/health + Admin command schemas | соответствует Phase 5 boundaries | расширять вместе с real commands |
| Prisma/PostgreSQL | production source of truth + additive platform/reliability migrations | соответствует Phase 3 foundation | расширять только real module schema |
| Better Auth | session adapter → fresh ActorContext, permissions, memberships, correlation | соответствует Phase 2 | сохранить adapter boundary |
| Tenant isolation | capability + ActorContext memberships → repository scope | соответствует application layer | расширять integration matrix |
| Modular monolith | seven vertical modules with public root entrypoints | соответствует Phase 4–5; internals protected by executable rules | preserve boundaries |
| Public UI | готовый AMS IMPULSE landing | переносить в generic cabinet нельзя | freeze external composition; configurable brand only later |
| Private UI | existing dashboard + protected Refine resource registry, shadcn-style primitives, RHF/Zod forms | соответствует Phase 5 | не переносить stack в public UI |
| Commands/queries | bounded resource queries + fixed named audited commands | соответствует Phase 5 | arbitrary Prisma CRUD запрещён |
| DTO | `SiteReportSnapshot`, service DTO, standard error/health envelopes | соответствует Phase 2 | extend per module |
| Audit | resource mutations and deferred enqueue are atomic with AuditEvent | соответствует Phase 3/5 | сохранить safe markers |
| Outbox/jobs | leases, JobRun, retry/backoff, dead-letter, five-minute worker | соответствует Phase 3 foundation | add only registered handlers |
| Idempotency | tenant-scoped key + canonical payload hash + unique constraint | соответствует Phase 3 | apply to commands/webhooks |
| Observability | JSON sync logs + correlation/release health + outbox counts | нет Sentry и worker freshness threshold | Phase 6 |
| Unit tests | 77 Vitest tests, isolated from DB suites | соответствует Phase 5, включая build-safe lazy adapter | expand with observable contracts |
| Integration tests | 25 tests on isolated PostgreSQL 18 with migrations/seed | соответствует Phase 5, включая Admin rollback/ownership/history | expand per module |
| E2E | 13 Playwright setup/public/auth/Admin checks on 375/768/1280/1440 | соответствует Phase 5 | preserve golden paths |
| Architecture QA | Dependency Cruiser: 149 modules / 325 dependencies | соответствует Phase 5 module boundaries | extend rules with each new module |
| Local development | Docker PostgreSQL 18.6, separate dev/test DB, fail-closed guards, loopback-only E2E admin seed | соответствует Phase 5 | сохранить |
| Release | exact-main immutable deploy + SHA health/env rollback contract | соответствует Phase 2 | verify on next production release |
| Backup | local + mandatory offsite + restore smoke | соответствует | сохранить |
| Documentation | core/module/ops canon + conformance + ADR | соответствует | синхронизировать по фазам |

## Целевые бизнес-модули AMS IMPULSE

### Identity and Access

Users, sessions, organizations, memberships, roles, permissions, invitations и ActorContext. Better Auth остаётся adapter, а не domain API.

### Project Registry

Organizations, projects, sites, provider connections, thresholds, clusters, goals и tracked query sets. Это основа mini CMS.

### Reporting

`SiteReportSnapshot`, report reads, director dashboard и analyst detail DTO. Provider/raw data не попадает в client DTO.

### Ranking Analytics

Tracked queries, owner baseline, Topvisor captures и ranking calculations.

### Data Ingestion

SyncRun/SourceRun, provider adapters, normalization, persistence и report compilation.

### Platform Operations

AuditEvent, IdempotencyKey, OutboxEvent, JobRun, RetentionRun, health, Sentry, structured logs и release markers.

### Admin CMS

Protected internal UI for platform operators. Управляет только разрешёнными project/config/access operations. Не позволяет менять Prisma schema или выполнять arbitrary updates.

## Roadmap principles

1. Сначала executable guardrails и repeatable test environment.
2. Затем ActorContext, errors, audit/outbox schema.
3. После этого vertical module migration без одновременного UI redesign.
4. Только затем Refine/shadcn/RHF Admin CMS на стабильных commands/queries.
5. Provider sync и report semantics сохраняются при migration.
6. Публичный landing и legal UI не переводятся на Refine и не меняются визуально.
7. Каждый schema/auth/module этап — отдельная branch/PR и HEAVY Gate.
8. Template repository извлекается только после стабилизации минимум двух реальных module implementations; в текущем scope template не создаётся.

## Scale assumptions

50 организаций не требуют микросервисов, Redis или отдельного search engine. Требуются:

- composite tenant indexes;
- server pagination/filter allowlists;
- bounded queries;
- background sync/job concurrency limits;
- per-tenant authorization tests;
- worker freshness/failed-job visibility;
- measured query plans перед оптимизацией.

## External UI preservation

Публичная поверхность `/`, lead/login dialogs, legal routes, visual tokens и composition являются проектным asset AMS IMPULSE. В platformization разрешено:

- вынести brand/contact/legal values в typed config;
- улучшить accessibility, loading и error behavior;
- добавить regression E2E/screenshots.

Запрещено без отдельного UI scope:

- переносить landing на Refine/shadcn;
- менять композицию, типографику, CTA или визуальный язык;
- смешивать public `ch-*` tokens с private `crm-*` tokens;
- превращать проектный landing в универсальную CMS-тему.
