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
- pinned Node 24.20/PostgreSQL 18.6 CI devcontainer builds, and its integration harness passes without runtime apt installation;
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

- AuditEvent/idempotency/outbox before browser mutations;
- Sentry и correlation propagation в full structured logs;
- authenticated Admin CMS E2E;
- production release SHA contract проверяется только после отдельного reviewed deploy.

## Phase 3 — Audit, idempotency and jobs foundation

Цель: подготовить безопасные CMS mutations и повторяемые операции.

Schema migration:

- `AuditEvent`;
- `IdempotencyKey`;
- `OutboxEvent`;
- `JobRun`;
- `RetentionRun` только вместе с первой retention policy.

Runtime:

- transaction = business change + audit + outbox/idempotency marker;
- PostgreSQL claim/lease/backoff/dead-letter;
- no external HTTP inside transaction;
- worker heartbeat/failed-job visibility;
- manual bounded retry с audit.

## Phase 4 — Vertical module boundaries

Мигрировать по одному домену, каждый отдельным clean-cutover PR:

1. Identity and Access;
2. Project Registry;
3. Reporting;
4. Ranking Analytics;
5. Data Ingestion;
6. Platform Operations.

Каждый module получает `domain/application/infrastructure/presentation/index.ts`. Другие modules импортируют только public entrypoint. После переноса старый global path удаляется. Dependency Cruiser rules ужесточаются после каждого cutover.

## Phase 5 — Admin CMS

Цель: internal code-first mini CMS для 50 клиентов.

Stack добавляется только здесь и используется сразу:

- Refine Core;
- shadcn/ui source components;
- React Hook Form + Zod;
- protected admin route group.

Первый resource set:

- organizations/memberships;
- projects/sites;
- provider connections без secret values;
- goal definitions и conversion inclusion;
- tracked query sets;
- thresholds/clusters;
- sync runs/job status.

Каждая mutation — named command, server authorization, tenant scope, transaction и AuditEvent. Arbitrary Prisma CRUD запрещён. Public landing не использует Refine.

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
