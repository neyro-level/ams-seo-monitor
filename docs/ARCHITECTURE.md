# ARCHITECTURE

AMS IMPULSE follows `AMS Application Platform Core 3.4 — Solo Minimal`.

```text
TENANCY = multi-tenant
ASYNC = outbox-plus-queue
DATA = pii
DELIVERY = own-saas
PLATFORM_ADMIN = enabled
DATABASE = self-managed-postgresql
```

Self-managed PostgreSQL 18 and TypeScript `6.0.3` are approved project exceptions recorded in [`adr/ADR-001-application-platform-profile.md`](adr/ADR-001-application-platform-profile.md).

## Runtime Stack

Exact versions are defined by `package.json`, `pnpm-lock.yaml` and `.node-version`.

| Layer | Current |
|---|---:|
| Node.js | `24.20.0` |
| pnpm | `11.5.1` |
| Next.js | `16.3.3` |
| React / React DOM | `19.2.8` |
| TypeScript | `6.0.3` |
| Prisma / Client / adapter | `7.10.0` |
| PostgreSQL | `18.x` |
| Better Auth | `1.7.2` |
| Tailwind / Base UI / TanStack Table / Recharts | `4.3.3` / `1.8.0` / `9.2.4` / `3.10.1` |

`next.config.ts` uses standalone output. Web and worker are built from one repository and one immutable image.

## System Context

```text
Public/private browser
→ host Nginx
→ Next.js App Router standalone web
→ Better Auth session + PrincipalContext
→ module query/command
→ repository port
→ Prisma adapter
→ PostgreSQL
```

```text
systemd timer / operator command / outbox handler
→ worker entrypoint
→ provider adapters
→ normalized evidence
→ PostgreSQL history
→ report compiler
→ ReportSnapshot
```

```text
business command
→ transaction: data + AuditEvent + IdempotencyKey + OutboxEvent
→ outbox daemon
→ pg-boss singleton job
→ idempotent JobPrincipal handler
```

PostgreSQL is the only runtime source of truth. Operator config is imported only by explicit private-path command and never by deploy.

## Layers And Boundaries

Vertical modules use only needed parts of:

```text
domain / application / infrastructure / presentation
```

Allowed module entrypoints:

- `index.ts` — framework-neutral API;
- `server.ts` — server-only composition;
- `client.ts` — browser-safe presentation contracts;
- `presentation.ts` — server-rendered presentation;
- `worker.ts` — worker API.

External consumers must not deep-import another module. `dependency-cruiser.config.cjs` and `scripts/verify-architecture.mjs` guard cycles, test imports, client/server leakage, Prisma in presentation and forbidden compatibility paths.

## Platform Layer

- `src/platform/auth` — Better Auth adapter and fresh principal session.
- `src/platform/authorization` — `PrincipalContext`, permissions and factories.
- `src/platform/database` — Prisma/pg context, transactions, tenant-aware repositories.
- `src/platform/actions` — transport-only Server Action boundary.
- `src/platform/commands` — business transaction boundary.
- `src/platform/config` — safe env validation.
- `src/platform/http` — correlation and safe envelopes.
- `src/platform/observability` — redacted structured logging.

Composition roots: `src/infrastructure/service-container.ts` and `src/infrastructure/worker-service-container.ts`. They wire dependencies but do not own business rules.

## Business Modules

- Identity Access — Better Auth lifecycle, users, memberships, `PrincipalContext`.
- Project Registry — organizations, projects, sites, provider mappings, goals, query sets and configuration readiness.
- Reporting — report reads, period semantics, `SiteReportSnapshot` compiler and director analytics projections.
- Ranking Analytics — pure ranking calculations and Top-3/Top-10 semantics.
- Data Ingestion — Yandex/Topvisor orchestration, SyncRun/SourceRun and normalized history.
- Notifications — safe lifecycle notification feed and unread state.
- Platform Operations — AuditEvent, idempotency, outbox, pg-boss, JobRun, RuntimeHeartbeat, retention and readiness.
- Platform Admin — protected `/admin/*` composition over owner-module APIs.

Each significant new module must receive a matching `docs/modules/MODULE_<NAME>.md` contract.

## Data Paths

Read:

```text
Server Component
→ fresh principal
→ module query
→ resource authorization
→ tenant-aware repository
→ DTO
→ JSX
```

Mutation:

```text
form/API/worker adapter
→ defineAction or worker adapter
→ defineCommand
→ permission + resource authorization
→ transaction-bound repositories
→ mutation + AuditEvent + optional OutboxEvent
→ typed result
```

External HTTP, provider calls, email and storage are forbidden inside business transactions.

## UI Architecture

```text
tokens
→ shadcn/Base UI primitives
→ shared application components
→ module presentation
→ route composition
```

Private UI uses `theme-app`, PT Root UI, semantic tokens and the internal design system. Public UI uses isolated `theme-public`, Manrope and `ch-*` tokens. Do not mix public and private token layers.

Mobile is part of the web application contract: private routes use topbar/drawer on small widths, tables render as cards, controls stay touch-friendly, and visual proof targets `375 / 768 / 1280 / 1440`.

Installable/PWA behavior is not yet active. If added later, manifest/icons are a small STANDARD UI/runtime addition; service worker/offline caching is RISKY because private PII/report data must not be cached accidentally.

## Worker And Providers

Worker commands live behind `src/worker/main.ts` and compiled collector output. Providers:

- Yandex Webmaster: read-only host, query and technical evidence.
- Yandex Metrika: read-only traffic, goals, phrases, devices and geography.
- Topvisor: bounded project/search target/query/checker/competitor operations.

Topvisor paid checker requires durable `ProviderOperation` reservation and price-check. Ambiguous dispatch becomes `ACTION_REQUIRED`, not an automatic retry.

## Release Topology

Production release unit:

```text
reviewed main SHA
→ immutable OCI image
→ Docker Compose
→ host Nginx
→ protected web/worker/migrator/backup env
→ self-managed PostgreSQL 18
```

Release requires backup, offsite confirmation, restore smoke, migration, cutover and live smoke. Merge is not release. Details: [`RUNBOOK_DEPLOY.md`](RUNBOOK_DEPLOY.md).

## Verification

Main scripts:

```bash
pnpm architecture:check
pnpm verify:quick
pnpm verify:risky
pnpm verify:daily
pnpm verify:release
```

Use minimum proof in WORK. SourceCraft exact-head gate is required before `main`. Production proof is only part of release.
