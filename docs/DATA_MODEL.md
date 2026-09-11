# DATA MODEL

Этот документ — единственный data/lifecycle source of truth. Фактическую структуру определяют `prisma/schema.prisma` and immutable `prisma/migrations/*`.

## Sources Of Truth

- `prisma/schema.prisma` — tables, relations, indexes, enums.
- `prisma/migrations/*` — immutable schema history.
- `src/shared/schemas/*` — browser/API DTO validation.
- PostgreSQL — only runtime data store.
- Operator configuration — explicit private-path import, not runtime source and not deploy input.

## Schema Policy

- Applied migration is never edited.
- Schema change requires a new migration.
- Production uses only `prisma migrate deploy`; `db push` is forbidden.
- Destructive data/schema action requires backup, compatibility plan and explicit owner approval.
- Prisma access is allowed only in database/platform and module infrastructure repositories.
- JSONB is allowed for validated complex snapshots; queryable ownership/security fields stay relational.
- Runtime, migrator, test and backup database identities are separate.

## Core Ownership

### Identity And Access

- `User`, `Session`, `Account`, `Verification` are Better Auth-owned identity/session records plus AMS `systemRole`.
- `Organization` and `Member` are AMS tenant access records.
- `PrincipalContext` is not a DB record; server builds it from fresh User and Membership.

### Project Registry

Owns:

- `Project`, `Site`;
- `ProviderConnection`, `SearchTarget`, `ProviderOperation`;
- `GoalDefinition`, `GoalDefinitionSite`;
- `TrackedQuerySet`, `TrackedQuery`;
- `ThresholdProfile`, `QueryClusterProfile`, `QueryClusterGroup`.

`Project` is the tenant ownership root. `Site` and every configuration/history row carry explicit `organizationId`. Composite foreign keys protect parent ownership.

### Data Ingestion

Owns:

- `SyncRun`, `SourceRun`;
- Webmaster/Metrika metric tables;
- `RankingCapture`, `CompetitorSnapshot`, `TechnicalSnapshot`;
- provider operation state used by Topvisor paid/bounded actions.

Natural keys protect repeatable upserts. Provider raw HTTP bodies, credentials and authorization headers are never stored.

### Reporting

Owns `ReportSnapshot`: append-only, validated report payload for one site and period. Repository reads the latest snapshot by `generatedAt`.

### Notifications

Owns `Notification` and `NotificationRead`. These are safe user-facing projections, not audit logs.

### Platform Operations

Owns `AuditEvent`, `IdempotencyKey`, `OutboxEvent`, `JobRun`, `RuntimeHeartbeat`, `RetentionRun`.

Outbox and JobRun are the business delivery truth; pg-boss is transport.

## Tenant Invariants

- Every tenant-owned row stores `organizationId`.
- Browser route, URL slug, hidden form field or client state never establish tenant scope.
- Resource authorization and database ownership constraints are both required.
- Platform Admin uses explicit target organization; it never receives fake tenant scope.
- Tenant reads use only fresh Membership.
- Foreign tenant access returns denial/not-found without existence disclosure.

## Principal And Roles

Effective principals:

- `platform-admin` — global management with explicit target organization.
- `platform-analyst` — global read/report/sync visibility.
- `tenant-user` — fresh Membership with `ORG_OWNER`, `ORG_MEMBER` or `VIEWER`.
- `job` — server-owned organization scope for worker handlers.
- `api-client` — reserved, not active public API.

## Project Lifecycle

- Project statuses: `PLANNED`, `ACTIVE`, `DISABLED`.
- Site/provider/query disable preserves history.
- Mutable aggregates use positive `version`; stale writes fail with no mutation and no AuditEvent.
- Physical delete of project/site/history is outside ordinary commands.
- Operator config sync disables removed tracked queries/sites when safe; it does not blindly delete history.

## Provider Lifecycle

`ProviderConnection` states: `PENDING`, `CONNECTING`, `CONNECTED`, `ACTION_REQUIRED`, `FAILED`.

- `enabled=false` forbids provider call.
- Yandex providers are read-only.
- Metrika is connected only after required goals are confirmed.
- Topvisor requires four search targets: Yandex/Google × desktop/mobile.
- Paid checker requires price-check and unique `ProviderOperation.operationKey`.
- `DISPATCHING` or ambiguous paid result is not retried automatically.

## Sync And Report Lifecycle

`SyncRun`: `RUNNING → SUCCESS | PARTIAL | FAILED`.

`SourceRun`: `SUCCESS | PARTIAL | FAILED | NOT_CONFIGURED | ACCESS_DENIED | QUOTA_LIMITED | STALE`.

One full sync is protected by PostgreSQL advisory lock. Unexpected worker error closes open SourceRuns/SyncRun best-effort.

Periods:

| Key | Days |
|---|---:|
| `week` | 7 |
| `month` | 28 |
| `quarter` | 90 |
| `halfYear` | 180 |

Previous period immediately precedes current and has the same length.

## Metric Invariants

- `partial` does not become `success`.
- `stale` does not become `current`.
- Unknown value does not become `0`.
- One provider/period failure does not contaminate another successful period.
- Webmaster average show position is not exact rank.
- Top-3 is a subset of Top-10.
- Lower rank position is better.
- Ranking denominator is the full approved enabled query core.
- Director conversion = unique target visits / Yandex organic visits.
- Direct query-to-lead attribution is prohibited.
- Sites, projects and periods are never mixed.

## Reliability Invariants

- Enqueue transaction atomically creates idempotency marker, event and audit.
- Same idempotency key + same hash returns original event.
- Same idempotency key + different hash is conflict.
- Outbox event payloads are bounded and versioned.
- pg-boss job carries authoritative `job.data.event`.
- `singletonKey = outboxEventId`.
- Only lease owner completes/fails.
- Retry is bounded exponential backoff.
- Permanent/exhausted failures become `DEAD_LETTER`.
- RuntimeHeartbeat is the worker liveness source for readiness.
- Retention removes only old terminal delivery detail.

## DateTime Policy

DateTime mapping was audited on `2026-09-07` for Prisma `7.10.0`.

Rules:

- proven UTC instants use `timestamptz(3)`;
- provider civil day/period keys stay `timestamp(3)`;
- historical DB/default timestamps remain unchanged until production timezone and sample proof exists;
- blind conversion from `timestamp` to `timestamptz` is forbidden;
- any new DateTime field must explicitly declare whether it is an instant or civil/business timestamp.

The archived detailed field table is in `docs/archive/2026-09-11-docs-normalization/DATA_MODEL_DETAILED_2026-09-07.md` only for archaeology; active decisions must be checked against current Prisma schema before migration.

## Backup And Retention

Production backup contract:

- custom-format `pg_dump`;
- checksum;
- private offsite copy;
- remote HEAD confirmation before retention;
- isolated restore smoke;
- retention baseline: 7 daily, 8 weekly, 6 monthly.

Release rollback does not roll back schema/data. DB restore is a separate owner-approved recovery operation.
