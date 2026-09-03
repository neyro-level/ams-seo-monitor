# MASTER PLAN

## Назначение

Текущий verified state и последовательный roadmap превращения AMS IMPULSE в надёжную code-first платформу для обслуживания до 50 клиентских организаций. Universal requirements mapped in `docs/PLATFORM_CONFORMANCE.md`; architecture decision — `docs/adr/ADR-001-adopt-application-platform-standard.md`.

## Стабильный baseline

Реализовано и работает:

- публичный AMS IMPULSE landing и legal routes;
- Next.js standalone behind Nginx;
- Prisma/PostgreSQL runtime source of truth;
- Better Auth username/session/organization foundation;
- server-side analyst/client tenant isolation;
- read-only Webmaster/Metrika/Topvisor adapters;
- DB-backed worker, historical metrics и `SiteReportSnapshot`;
- structured sync logs, health routes, advisory sync lock;
- immutable exact-main release;
- local + mandatory offsite PostgreSQL backup и restore smoke.

External UI является сохраняемым project asset. Его composition, typography, CTA и public `ch-*` tokens не меняются в platformization scope.

## Phase 1 — Platform guardrails

Статус: implemented; local HEAVY proof green.

Цель: сделать архитектурные и test-инварианты исполняемыми до module/CMS migration.

Scope:

1. exact Node version file;
2. Dependency Cruiser и current/target boundary rules;
3. отдельные unit/integration test entrypoints;
4. isolated Docker PostgreSQL contract для Windows local/test;
5. safe test DB preflight;
6. Playwright production-like golden paths для public UI, auth redirect, favicon и responsive overflow;
7. canonical `architecture:check`, `verify:fast`, `verify:heavy` scripts;
8. SourceCraft gates используют те же commands без скрытых skipped integration guarantees.

Done:

- обычный unit run не содержит DB skips;
- integration command fail-closed без безопасной test DB;
- local DB config не содержит credentials в Git;
- architecture violations блокируются;
- public UI проходит 375/768/1280/1440 browser checks;
- production code behavior не меняется.

Verified proof:

- `verify:fast` blocks config/type/lint/import/unit failures;
- 63 unit tests pass without skipped DB suites;
- isolated PostgreSQL `18.6` starts on loopback and dev migrations/seed pass;
- 14 integration tests pass after automatic test migrations/seed;
- Dependency Cruiser checks 105 modules / 212 dependencies with zero violations;
- production-like Next build passes;
- 8 Playwright golden paths pass at 375, 768, 1280 and 1440;
- local pinned Node 24.20/PostgreSQL 18.6 integration image/harness pass;
- SourceCraft devcontainer build оказался нестабильным на cloud worker и удалён; exact-head cloud gate оставлен deterministic Node-only, а real DB/E2E являются обязательным operator evidence;
- `verify:heavy` passes end-to-end.

## Phase 2 — Platform request and access context

Статус: implemented; local HEAVY proof green.

Реализовано:

- `PLATFORM_ADMIN` additive enum migration без изменения existing users;
- `ActorContext`: fresh user, memberships, validated active organization, permissions, correlation ID;
- code-versioned capability matrix для platform/project/report/sync/settings;
- ProjectService tenant scope больше не делает скрытый membership lookup;
- ReportService отдельно требует report-read capability;
- analyst/navigation/dashboard используют capability, не role equality;
- central DB/Auth/Leads/release environment validation;
- standard public error envelope;
- correlation headers для auth/health;
- release-aware live/ready DTO с exact SHA;
- deploy-generated root-owned `shared/release.env` и rollback SHA synchronization;
- production web env preflight до build.

Verified proof:

- migration clean path: 4 migrations applied to isolated PostgreSQL 18.6;
- 76 unit tests pass;
- 18 real-PostgreSQL integration tests pass;
- 8 responsive Playwright E2E pass;
- Dependency Cruiser: 111 modules / 232 dependencies, zero violations;
- `verify:fast` and `verify:heavy` pass;
- deploy remote shell syntax passes;
- public AMS IMPULSE composition remains unchanged.

Остаётся для следующих phases:

- Sentry и correlation propagation в full structured logs;
- authenticated Admin CMS E2E;
- production release SHA contract проверяется только после отдельного reviewed deploy.

## Phase 3 — Audit, idempotency and jobs foundation

Статус: implemented; local HEAVY proof green.

Реализовано:

- AuditEvent, IdempotencyKey, OutboxEvent and JobRun models;
- generated migration также устраняет накопленный Prisma schema/index/default drift;
- atomic enqueue transaction: idempotency + outbox + audit;
- canonical JSON SHA-256 request binding;
- same key/same hash duplicate return and different-hash rejection;
- conditional PostgreSQL lease ownership;
- JobRun per attempt;
- retryable bounded exponential backoff;
- permanent/exhausted dead-letter;
- registered `project.sync.requested` handler outside transaction;
- unknown/invalid topic permanent failure;
- bounded `outbox-drain` worker;
- five-minute systemd outbox timer with compatible rollback;
- readiness outbox counts.

Proof:

- clean five-migration path on PostgreSQL 18.6;
- 21 integration tests pass, including atomicity/idempotency/lease/retry/dead-letter;
- 76 unit tests pass;
- Dependency Cruiser: 115 modules / 244 dependencies, zero violations;
- compiled outbox worker idle smoke passes;
- `verify:heavy` and responsive Playwright pass;
- outbox systemd units pass `systemd-analyze verify` on the production host without activation;
- deploy remote shell passes `bash -n`.

`RetentionRun` intentionally remains absent until Phase 7 defines a real retention policy.

## Phase 4 — Vertical module boundaries — completed

Clean cutover завершён для шести доменов:

1. Identity and Access;
2. Project Registry;
3. Reporting;
4. Ranking Analytics;
5. Data Ingestion;
6. Platform Operations.

Каждый domain владеет внутренними `domain/application/infrastructure/presentation` слоями по фактической потребности и публикует root entrypoints. Все callers переведены, старые global implementation paths удалены. Dependency Cruiser запрещает cross-module imports внутренних слоёв.

Phase proof:

- typecheck/lint/build and collector build pass;
- 76 unit tests and 21 real PostgreSQL integration tests pass;
- Dependency Cruiser: 129 modules / 275 dependencies, zero violations;
- 8 Playwright checks pass on 375/768/1280/1440;
- public AMS IMPULSE surface and private login boundary remain unchanged.

## Phase 5 — Admin CMS — completed

Internal code-first mini CMS реализована для PLATFORM_ADMIN:

- Refine Core resource registry;
- local shadcn-style source components;
- React Hook Form + Zod command forms;
- protected `/admin/*` route group;
- organizations, memberships, projects, sites, provider connections, goals, tracked query sets, thresholds/clusters, sync runs and job status;
- allowlisted search/sort and bounded server pagination;
- fixed named commands with fresh server authorization;
- resource mutation + safe AuditEvent in one Prisma transaction;
- nonsecret provider settings validation and lifecycle-preserving tracked query replacement;
- idempotent project sync enqueue through existing reliability foundation.

Public AMS IMPULSE landing не импортирует Refine и визуально не меняется.

Phase proof:

- typecheck/lint/build and collector build pass;
- 77 unit tests and 25 real PostgreSQL integration tests pass;
- Admin integration proves atomic audit, rollback, immutable ownership, membership revocation and query-history preservation;
- Dependency Cruiser: 149 modules / 325 dependencies, zero violations;
- 13 Playwright setup/public/auth/Admin checks pass on 375/768/1280/1440.

## Phase 6 — Observability and security hardening

- Sentry server/client/worker adapters с PII scrubbing и release markers;
- correlation-aware structured logs;
- worker sync freshness и failed-job health;
- public/write rate limits по реальному surface;
- CSP staged через Report-Only;
- explicit CORS для external contracts;
- secret/env startup validation;
- authenticated E2E tenant matrix;
- RLS decision после DB-session prototype и integration proof.

## Phase 7 — Scale and operations proof

Для 50 организаций:

- measured query plans и composite tenant indexes;
- server pagination/filter/sort allowlists;
- bounded exports;
- worker concurrency/backpressure;
- backup volume/restore timing;
- retention/privacy rules;
- load sample на representative data;
- availability and stale-report monitoring.

Redis, separate search engine и separate backend добавляются только при измеренном blocker и отдельном ADR.

## Phase 8 — Template readiness

Template repository сейчас не создаётся.

Сначала AMS IMPULSE должен доказать:

- два или более vertical modules с одинаковым public contract pattern;
- working ActorContext/audit/jobs foundation;
- repeatable local/CI PostgreSQL;
- Refine admin resources без project-specific leakage;
- configurable brand/legal/navigation boundaries;
- documented extraction list platform vs project code.

Только после этого reusable core копируется в отдельный repository. AMS IMPULSE landing остаётся project-specific reference asset и переносится в template как opt-in example, а не как обязательный universal theme.

## Product work after platform foundation

- SZ REDACTED_CLIENT_DATA onboarding;
- analyst detail views;
- explicit Topvisor activation;
- external availability/freshness monitoring;
- dashboard CRM-token normalization.

Эти задачи выполняются через новые module boundaries по мере их готовности.

## Не внедрять без отдельного product/architecture решения

- CRM contacts, pipeline или kanban;
- public signup/reports;
- provider mutations или paid checks;
- runtime-editable DB schema;
- plugin marketplace;
- Redis, NestJS, microservices, second ORM/auth/backend;
- object storage без user files;
- RLS без ActorContext transaction contract;
- отдельный search engine без measured PostgreSQL limit.

## Gates

- Phase 1: dependency/tooling impact, HEAVY.
- Phases 2–7: auth/data/runtime impact, HEAVY.
- Public UI preservation: browser proof 375/768/1280/1440.
- Production deploy всегда отдельная owner-команда после reviewed canonical main.
