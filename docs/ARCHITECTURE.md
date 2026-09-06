# ARCHITECTURE

Project Profile: `TENANCY = multi-tenant`, `ASYNC = outbox-plus-queue`, `DATA = pii`.

## System context

```text
Public/private browser
→ host Nginx
→ Next.js App Router standalone web
→ session + server authorization
→ module application query/command
→ repository port
→ Prisma adapter
→ PostgreSQL

scheduled project sync
→ compiled worker command
→ read-only provider adapters
→ normalized evidence
→ PostgreSQL history
→ Reporting compiler
→ ReportSnapshot

business command requiring deferred work
→ transaction: business data + AuditEvent + IdempotencyKey + OutboxEvent
→ persistent outbox worker
→ pg-boss
→ idempotent JobPrincipal handler
```

Next.js не является static export. PostgreSQL — единственный runtime data store. Web и worker собираются из одного repository и одного immutable OCI image.

## Module and layer boundaries

Vertical modules содержат `domain / application / infrastructure / presentation` по фактической необходимости. Внешние consumers импортируют только root entrypoints:

- `index.ts` — framework-neutral API;
- `server.ts` — server-only composition/adapters;
- `client.ts` — browser-safe presentation;
- `presentation.ts` — server-rendered presentation;
- `worker.ts` — worker API.

`dependency-cruiser.config.cjs` запрещает циклы, deep imports другого module, Prisma/SQL в presentation, production-to-tests и server dependency в client chain.

## Platform

- `src/platform/auth` — Better Auth adapters, principal session, onboarding и 2FA policy;
- `src/platform/authorization` — discriminated `PrincipalContext`, permissions и factories;
- `src/platform/database` — Prisma client/pool, transaction, scopedDb и tenant registry;
- `src/platform/commands` — business transaction boundary `defineCommand`;
- `src/platform/actions` — transport-only `defineAction`;
- `src/platform/config` — server environment validation;
- `src/platform/http` — correlation, stable error envelope и health DTO;
- `src/platform/observability` — redacted pino logger.

`src/infrastructure/service-container.ts` и `worker-service-container.ts` являются текущими composition roots. Они не владеют business rules.

## Business modules

### Identity Access

Better Auth владеет identity/password/session/2FA. AMS владеет Organization, Membership, permissions, resource authorization и onboarding state.

Новые и мигрированные paths используют `PrincipalContext`. Оставшиеся `ActorContext` reads существуют только в project/report/navigation paths, перечислены в `docs/MASTER_PLAN.md` и не расширяются.

### Project Registry

Владеет Organization → Project → Site, provider mappings, goals, tracked query sets, threshold/cluster profiles, configuration readiness и typed Platform Admin commands.

### Reporting

Владеет report reads, periods и единственным compiler: `src/modules/reporting/domain/report-compiler.ts`. Browser получает только validated `SiteReportSnapshot`.

### Ranking Analytics

Владеет deterministic query merge, exact/owner position semantics, Top-3/Top-10 и movements. Не зависит от React, Prisma или HTTP.

### Data Ingestion

Владеет `SyncService`, provider ports, sync lifecycle и persistence. Реальные read-only clients находятся в `collector/sources`.

### Platform Operations

Владеет AuditEvent, idempotency, transactional outbox, pg-boss transport, JobRun, leases, bounded retry/dead-letter, retention и readiness.

### Platform Admin

`/admin/*` агрегирует typed queries/commands владельцев данных. Generic dispatcher, Refine registry и arbitrary Prisma CRUD отсутствуют.

## Canonical data paths

Read:

```text
Server Component
→ server-generated principal
→ module query + resource authorization
→ tenant-aware repository
→ DTO
→ JSX
```

Mutation:

```text
form / Server Action
→ fresh PrincipalContext
→ defineCommand
→ permission + resource authorization
→ transaction-bound repositories
→ business mutation + AuditEvent + optional OutboxEvent
→ typed result
```

Worker:

```text
timer/operator/outbox
→ worker entrypoint
→ module worker API
→ provider/repository adapters
→ PostgreSQL
```

External HTTP, provider calls, email и storage запрещены внутри business transaction.

## Tenancy and authorization

- browser/URL/form `organizationId` не доказывает доступ;
- tenant user создаётся server-side из fresh User + active AMS Membership;
- platform-admin/platform-analyst не получают fake organization;
- permission и module-owned resource authorization обязательны одновременно;
- every tenant-owned record carries `organizationId`;
- composite foreign keys отклоняют cross-tenant parent relations;
- cacheable tenant read принимает organization scope явно;
- `Session.activeOrganizationId` используется только как revalidated server-side compatibility preference.

## Reporting and provider invariants

- periods: `week`, `month`, `quarter`, `halfYear`; default `month`;
- `partial != success`, `stale != current`, `null != 0`;
- Webmaster average show position не заменяет exact ranking;
- Top-3 является подмножеством Top-10;
- direct query-to-lead attribution запрещена;
- browser не вызывает Yandex/Topvisor APIs и не получает credentials;
- provider operations только read-only.

## Runtime and release

Repository assets определяют текущий release contract:

- multi-stage non-root `Dockerfile`;
- `docker-compose.production.yml`: persistent web + outbox worker, manual migrate/maintenance;
- host Nginx → loopback web `127.0.0.1:3000`;
- daily project-sync и outbox-retention systemd timers;
- exact image tag/digest и `RELEASE_SHA` в root-owned release env;
- migration container выполняет Prisma deploy и pg-boss schema migration;
- pre-migration backup + offsite confirmation + isolated restore smoke;
- automatic code/assets rollback после failed cutover.

Текущие deploy assets используют host networking и host-local PostgreSQL operations. Переход на private Timeweb Managed PostgreSQL остаётся отдельным HEAVY этапом; live provider/network/DB state без server proof не утверждается.

## Executable proof

- `pnpm architecture:check` — import/static boundaries;
- `pnpm test:unit` — domain/contracts;
- `pnpm test:integration` — fail-closed real PostgreSQL;
- `pnpm test:e2e` — standalone/browser flows;
- `pnpm verify:fast` — local FAST;
- `pnpm verify:heavy` — integration/build/E2E;
- SourceCraft `merge-fast` и `merge-heavy` проверяют exact requested SHA; heavy поднимает PostgreSQL 18 и выполняет `verify:heavy`.

Локальный PASS не заменяет SourceCraft exact-head gate. Production release требует отдельного live proof по `docs/RUNBOOK_DEPLOY.md`.
