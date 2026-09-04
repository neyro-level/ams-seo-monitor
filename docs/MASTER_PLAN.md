# MASTER PLAN

## Статус и основание

Этот документ — активный roadmap приведения AMS IMPULSE к `AMS Application Platform Core Standard 3.0` от 2026-09-03.

План адаптирован к действующему продукту. Он не переносит в AMS IMPULSE CRM, contacts, pipeline, kanban, billing, public signup, files, realtime или универсальный CMS-конструктор.

Исходный reviewed baseline:

- canonical repository: SourceCraft `origin/main`;
- baseline SHA: `a1898c1c13f84ca0e92bd4505f17a9910bf9d0b3`;
- runtime: Node 24, Next.js 16, React 19, TypeScript strict, Prisma 7, PostgreSQL 18, Better Auth;
- публичный AMS IMPULSE landing и директорский SEO-отчёт работают и сохраняются;
- предыдущий незавершённый observability workstream удалён без переноса в новый план;
- production не изменяется до отдельного общего Merge Gate и release intent владельца.

Фактическое состояние определяют код, migrations, runtime config и проверяемый production. Этот план определяет только последовательность изменений.

## Что сохраняется

Без продуктового redesign сохраняются:

- публичный landing, legal routes, lead/login dialogs и `ch-*` visual language;
- URL contract `/c/{clientSlug}/{siteSlug}` и четыре report periods;
- `SiteReportSnapshot` как единственный browser-safe report DTO;
- read-only Yandex Webmaster, Yandex Metrika и optional Topvisor semantics;
- PostgreSQL как единственный runtime source of truth;
- modular monolith и существующие бизнес-модули;
- server-first Next.js и отдельный worker process из одного codebase;
- audit, idempotency, outbox, JobRun, real PostgreSQL tests и Playwright baseline;
- CUID как заранее утверждённый opaque ID для существующих business records — массового re-key не будет;
- `SyncRun`/`SourceRun` как проектный эквивалент import lifecycle; generic CRM `ImportRun` не добавляется.

## Принципиальные изменения Standard 3.0

### Identity и tenancy

Текущий `ActorContext` заменяется discriminated `PrincipalContext`.

Project mapping:

- `platform-admin` — внутренний `PLATFORM_ADMIN`, без фиктивного `organizationId`;
- `platform-analyst` — project-specific principal для текущего `SEO_ANALYST`, с явными read/sync permissions и без tenant impersonation;
- `tenant-user` — клиентский пользователь с одной server-validated active Membership и tenant role `ORG_OWNER | ORG_MEMBER | VIEWER`;
- `job` — worker principal с обязательным `organizationId`;
- `api-client` не создаётся, пока у продукта нет внешнего `/api/v1` contract.

Better Auth отвечает только за identity/password/session/2FA. Better Auth Organization Plugin удаляется из runtime. `Organization`, `Membership`, tenant roles, permissions и resource visibility принадлежат AMS.

До нового production обязательны:

- `mustChangePassword` onboarding flow;
- отзыв остальных sessions после смены временного пароля;
- audit смены onboarding state;
- 2FA для `PLATFORM_ADMIN`;
- отсутствие Better Auth cookie cache.

### Tenant data

Текущего application-фильтра по memberships недостаточно. Требуются независимые барьеры:

1. tenant-owned models registry;
2. `scopedDb`/transaction-bound database context;
3. module-owned resource loaders;
4. `organizationId` на tenant-owned сущностях;
5. composite tenant foreign keys;
6. запрет nested tenant writes;
7. cross-tenant integration matrix.

Tenant-owned минимум:

- Project, Site;
- ProviderConnection;
- GoalDefinition и site scope;
- TrackedQuerySet, TrackedQuery, RankingCapture;
- SyncRun, SourceRun;
- Webmaster/Metrika historical metrics;
- TechnicalSnapshot, ReportSnapshot;
- tenant-scoped AuditEvent, IdempotencyKey, OutboxEvent и JobRun.

Threshold/cluster profiles остаются platform-owned только если ими управляет `platform-admin` и их reuse между tenants является явным контрактом. Иначе они мигрируют в tenant ownership.

### Mutations

Текущие service methods и единый `executeAdminCommand` не являются canonical command path.

Новый единственный путь:

```text
Form / API / worker adapter
→ defineAction или typed job adapter
→ PrincipalContext
→ defineCommand
→ canonical Zod input
→ permission + resource authorization
→ business transaction
→ transaction-bound repositories
→ business data + AuditEvent + optional OutboxEvent
→ typed result
```

Transport не открывает transaction и не содержит business rules. Каждая значимая mutable entity получает explicit concurrency policy (`version`, expected state или `updatedAt` precondition). Silent overwrite запрещён.

### UI

Private platform UI переходит на канонические patterns:

- shadcn/ui primitives;
- TanStack Table + shadcn Data Table;
- nuqs для page/sort/filter/search state;
- React Hook Form для complex forms;
- Zod на client UX и повторно на server command boundary;
- loading/empty/error/forbidden/stale states.

Refine удаляется: Standard 3.0 запрещает его без ADR, а текущее использование не оправдывает отдельный framework. `Admin CMS` переименовывается в `Platform Admin`/`Admin Console`; это защищённая product surface, не generic CMS.

### Jobs и integrations

Текущий direct outbox dispatcher заменяется canonical flow:

```text
business transaction + OutboxEvent
→ outbox drain
→ pg-boss
→ idempotent job handler
→ external/provider side effect
```

pg-boss получает отдельные pool, schema lifecycle и migration step. Runtime worker не выполняет auto-DDL. Outbox payload получает `schemaVersion`, `occurredAt`, size limit и Zod contract.

`SyncRun`/`SourceRun` расширяются обязательными organization/project ownership, correlation и проверяемой статистикой. Provider contracts и report semantics не переписываются.

### Observability и production

- logs: pino JSON, единая redaction policy;
- correlation ID проходит request → principal → command → audit/outbox/job → provider call;
- Sentry включается только после compliance-решения, DSN/token provisioning и подтверждённого controlled event;
- health включает liveness, readiness, DB, worker heartbeat, queue failure и integration freshness;
- production artifact меняется со сборки на host на immutable OCI image;
- один image запускает web, worker, migration и maintenance commands;
- production topology: host Nginx → Docker Compose web/worker → private Timeweb Managed PostgreSQL;
- production host не выполняет `pnpm install`, dependency resolution или build.

## Ограничение миграции

Все PR можно подготовить заранее и слить одной управляемой серией, но несовместимый database contract нельзя безопасно «схлопнуть» в destructive one-shot migration.

Поэтому текущая программа содержит только compatibility-first expand/backfill/validate/cutover. Legacy columns/tables не удаляются в общем release. Contract/drop выполняется отдельным будущим release после production stabilization и доказанного rollback/forward-fix path.

## Stacked Git workflow до общего Merge Gate

Последовательные workstreams образуют stack:

1. первый branch создаётся от актуального `origin/main`;
2. после завершения workstream выполняются scoped checks, commit, push и PR;
3. PR не merge-ится;
4. следующий branch создаётся от HEAD предыдущего branch;
5. его PR target — предыдущий branch, поэтому каждый PR показывает только собственный diff;
6. в description фиксируется `Depends on PR #...`;
7. после подготовки всего stack разработка останавливается для общего owner review.

Общий вывод в `main` выполняется отдельной командой владельца:

1. freeze stack и проверить отсутствие drift;
2. начать с нижнего PR;
3. выполнить соответствующий FAST/HEAVY Gate;
4. merge нижний PR в `main`;
5. retarget следующий PR на обновлённый `main`;
6. подтвердить, что diff содержит только его scope;
7. повторить gate и merge последовательно;
8. после последнего merge выполнить final HEAVY на exact `main` SHA;
9. production остаётся отдельной командой после green final gate.

Force-push, merge старых stale branches и параллельное изменение одного migration chain запрещены.

## Workstream 0 — Canonical adoption

Branch: `work/core-standard-v3-plan`
Base: `origin/main`
Gate: docs review + `git diff --check`

Deliverables:

- заменить старый completed roadmap этим активным plan;
- обновить project `AGENTS.md` hard rules и stacked workflow;
- заменить v1 conformance map на Standard 3.0 gap register;
- зафиксировать ADR-003 о Standard 3.0, PrincipalContext, CUID policy, pg-boss, Refine removal и Docker topology;
- нормализовать canonical docs без дублей: один SECURITY source и один deploy runbook;
- зафиксировать exact version table в README.

Done:

- active canon не утверждает соответствие v1;
- hard rules видимы до любой правки;
- CRM/template backlog удалён из platform rewrite;
- branch/PR stack contract однозначен.

## Workstream 1 — Runtime and architecture foundation

Branch: `work/v3-runtime-foundation`
Base: Workstream 0 HEAD
Gate: HEAVY — dependencies/runtime/architecture

Scope:

- canonical `src/platform/{auth,authorization,commands,actions,database,jobs,observability,security,config}` boundaries;
- Prisma 7 `prisma-client` generator, explicit generated output и ESM-compatible imports;
- global Prisma access только внутри `platform/database` и explicit infrastructure composition;
- `server-only` на privileged dependency roots;
- `defineCommand` и `defineAction` foundation без product commands;
- tenant-owned models registry + static guard;
- guards для unsafe raw SQL, deep imports, global Prisma imports и server/client leakage;
- удалить `$queryRawUnsafe("select 1")`;
- exact package versions и README version table.

Non-goals:

- tenant schema migration;
- auth behavior cutover;
- UI redesign;
- pg-boss runtime.

Done:

- existing public/report behavior unchanged;
- build fails on illegal server/client or Prisma boundary;
- platform primitives имеют unit/architecture tests, но не являются generic meta-framework.

## Workstream 2 — Principal and Better Auth cutover

Branch: `work/v3-principal-auth`
Base: Workstream 1 HEAD
Gate: HEAVY — auth/permissions/schema/E2E

Scope:

- PrincipalContext discriminated union и server-only factories;
- project-specific `platform-analyst` principal;
- tenant roles `ORG_OWNER | ORG_MEMBER | VIEWER`;
- AMS-owned Membership authorization;
- удалить Better Auth Organization Plugin из runtime;
- сохранить legacy plugin columns/tables только для compatibility period;
- server-owned active organization selection;
- `mustChangePassword` lifecycle;
- Better Auth 2FA для Platform Admin;
- login/logout/password-change/session-revocation tests;
- обновить AUTH/SECURITY/module contract.

Done:

- client payload не создаёт principal;
- platform principals не получают fake tenant;
- tenant principal всегда имеет validated Membership;
- Platform Admin без 2FA не проходит production policy;
- public signup остаётся выключен.

## Workstream 3 — Tenant schema, scopedDb and constraints

Branch: `work/v3-tenant-database`
Base: Workstream 2 HEAD
Gate: HEAVY — additive migrations/tenant isolation

Migration strategy:

1. добавить nullable `organizationId`/project ownership и `version` fields;
2. backfill через deterministic parent relations;
3. проверить orphan/mismatch counts;
4. добавить composite unique/FK/indexes;
5. сделать поля NOT NULL только после proof;
6. не удалять legacy fields в этом release train.

Scope:

- tenant ownership для registry, configuration, tracked queries, sync, metrics, reports и reliability records;
- `Membership` application model без competing Better Auth tenancy;
- scoped database context для tenant-user/job/API paths;
- separate explicit platform-admin database path;
- запрет nested tenant writes;
- transaction-bound repositories;
- raw analytics boundary с explicit organizationId;
- production-like migration timing и SQL review.

Done:

- A читает/изменяет A по permission;
- A не читает/не изменяет B;
- Job A не изменяет B;
- user without Membership не создаёт tenant record;
- cross-tenant relation rejected PostgreSQL constraint;
- scopedDb работает внутри business transaction.

## Workstream 4 — Project Registry reference slice

Branch: `work/v3-project-slice`
Base: Workstream 3 HEAD
Gate: HEAVY — reference business slice
Status: implemented and verified in the local worktree; checkpoint, push and PR are not requested yet.


Project становится эталонной entity:

- domain lifecycle и errors;
- explicit queries `getProject`, `listProjects`, `getProjectSummary`;
- commands `createProject`, `changeProjectStatus`, `updateProjectSettings`;
- module-owned `requireProjectForAction`;
- permission + resource authorization;
- optimistic concurrency через `version`;
- scoped transaction-bound repository;
- audit и optional outbox;
- Server Component read path;
- separate `defineAction` adapters;
- shadcn Data Table + nuqs URL state;
- RHF/Zod form и stale conflict UI;
- integration + E2E tenant matrix.

Done:

```text
DB → scoped repository → query/command → action → UI → audit/tests
```

проходит end-to-end и становится единственным template для следующих modules.

## Workstream 5 — Platform Admin and remaining application patterns

Branch: `work/v3-application-patterns`
Base: Workstream 4 HEAD
Gate: HEAVY — mutations/authorization/UI
Status: implemented and verified in the local worktree; checkpoint, push and PR are the remaining delivery steps.


Scope:

- удалить Refine и generic `executeAdminCommand` dispatcher;
- переименовать Admin CMS в Platform Admin/Admin Console;
- перенести organizations/memberships/sites/providers/goals/tracked queries/profiles на отдельные commands/actions/queries;
- immutable/server-owned fields убрать из browser input;
- module-owned resource loaders для каждой mutation;
- optimistic concurrency для mutable configuration;
- TanStack Table, nuqs, shared client-safe list contracts;
- loading/empty/error/forbidden/stale states;
- tenant-aware cache policy; persistent PII cache не добавлять;
- public AMS IMPULSE UI оставить неизменным.

Done:

- transport не содержит transaction/business rules;
- нет arbitrary Prisma CRUD;
- list filter/sort/page выполняются server-side с allowlists;
- Admin cross-tenant command всегда получает explicit target organization и AuditEvent.

## Workstream 6 — Data ingestion, outbox and pg-boss

Branch: `work/v3-integrations-jobs`
Base: Workstream 5 HEAD
Gate: HEAVY — integrations/jobs/dependencies/schema
Status: implemented and verified in the local worktree; checkpoint, push and PR are the remaining delivery steps.


Scope:

- добавить pg-boss как отдельный database subsystem;
- отдельный pg-boss pool и connection budget;
- reviewed install/upgrade step, runtime `migrate:false/createSchema:false`;
- outbox drain публикует versioned events в pg-boss;
- job handlers используют JobPrincipal и scopedDb;
- payload Zod, size limit, timeout, retry classification, idempotency и dead-letter;
- добавить `schemaVersion` и `occurredAt` в OutboxEvent;
- привести SyncRun/SourceRun к organization/project/correlation/stats contract;
- retention policy и `RetentionRun` для completed jobs/outbox detail;
- provider clients сохраняют current read-only semantics, timeouts, validation и safe errors.

Done:

- business commit не теряет future job;
- consumer idempotent under at-least-once delivery;
- runtime worker не выполняет pg-boss DDL;
- retry/permanent/duplicate/dead-letter tests green;
- worker и web собираются из одного codebase.

## Workstream 7 — Observability, testing and CI

Branch: `work/v3-observability-ci`
Base: Workstream 6 HEAD
Gate: HEAVY — security/PII/CI
Status: implemented and verified in the local worktree; checkpoint, push and PR are the remaining delivery steps.


Scope:

- pino JSON для web/worker/integration logs;
- redaction passwords, cookies, authorization, tokens, DB URL и PII;
- correlation propagation through principal/command/audit/outbox/job/provider;
- worker heartbeat, queue failure и critical integration freshness health;
- Sentry compliance decision в SECURITY;
- при разрешении Sentry: server/client/worker adapters, scrub, release SHA, controlled event + flush + external confirmation;
- при запрете/отсутствии prerequisites: Sentry остаётся явно disabled без fake success;
- complete tenant isolation/scopedDb/command/integration E2E matrices;
- SourceCraft PR checks с real required profile; skipped DB suites не считаются proof;
- architecture/custom guards становятся blocking.

Done:

- 81–85 Standard 3.0 contracts покрыты фактическими tests;
- CI и local canonical scripts совпадают по смыслу;
- confirmed bug всегда имеет regression test;
- observability не выводит secrets/PII.

## Workstream 8 — Docker production foundation

Branch: `work/v3-docker-production`
Base: Workstream 7 HEAD
Gate: HEAVY — infrastructure/release/migrations

Prerequisites requiring factual proof:

- Timeweb Managed PostgreSQL instance, private network и region;
- connection capacity and role model;
- SourceCraft image registry/build capability;
- pg-boss schema migration permissions;
- RPO/RTO and backup geography;
- rollback coexistence with current systemd release.

Scope:

- multi-stage pinned Dockerfile;
- one immutable image with web/worker/migration/maintenance commands;
- `docker-compose.production.yml` for web + worker;
- host Nginx remains TLS reverse proxy;
- image built/published outside production host;
- exact SHA + image digest release metadata;
- separate runtime/migration/pg-boss credentials where provider allows;
- migration and pg-boss schema steps require explicit release intent;
- blue/green or equivalent cutover with previous known-good rollback;
- backup/restore proof and live smoke contract.

Done:

- production host не выполняет install/build;
- web/worker use exact same image digest;
- database is private or exception explicitly stopped for owner decision;
- deploy dry-run and rollback rehearsal green;
- no production deployment occurs in this workstream PR.

## Final integration and release

Не создаётся заранее как обычный feature PR. Выполняется только по отдельной команде владельца после подготовки Workstreams 0–8.

Merge train:

- sequentially merge stacked PRs into current `main`;
- after each merge verify exact scope and required gate;
- final `origin/main` gets one full HEAVY, migration-chain review and image build;
- no legacy contract/drop migration enters this release;
- owner separately issues production intent;
- deploy exact main image digest;
- prove SHA/digest, liveness, readiness, main route, login/2FA, tenant isolation, report, Platform Admin critical command, worker heartbeat, pg-boss queue, provider freshness, backup and rollback readiness.

## Не входит в rewrite

Без отдельного product trigger и ADR не добавляются:

- CRM Contact, pipeline, kanban, tasks;
- billing/payments;
- public signup или public client reports;
- user files/object storage;
- realtime;
- Redis;
- separate search engine;
- GraphQL/tRPC;
- NestJS или отдельный backend;
- microservices;
- RLS;
- external `/api/v1`, ApiClient и OpenAPI;
- generic template repository;
- runtime-editable schema/plugins.

RLS остаётся growth trigger: сначала scopedDb + composite constraints + isolation proof. Template extraction не является продуктовой задачей AMS IMPULSE.

## Product work после platform rewrite

Отдельными независимыми streams:

- SZ REDACTED_CLIENT_DATA onboarding;
- analyst detail views;
- explicit Topvisor activation;
- external availability/freshness monitoring;
- dashboard token normalization.

Эти задачи не смешиваются с Standard 3.0 migration.
