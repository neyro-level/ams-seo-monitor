# DATA MODEL

Этот документ - единственный data/lifecycle source of truth. Фактическую структуру определяют `prisma/schema.prisma` и immutable `prisma/migrations/*`.

## Schema Policy

- Applied migration never changes.
- Production uses `prisma migrate deploy`; `db push` is forbidden.
- Queryable ownership and authorization fields stay relational.
- Cross-product generic foreign keys are prohibited.
- Runtime, worker, migrator and backup DB identities are separate.
- Current single-schema SEO model migrates incrementally without data loss.

## Platform Identity

Better Auth owns `User`, `Session`, `Account`, `Verification`. AMS owns authorization records and AuditEvent.

Target system roles:

- `PLATFORM_ADMIN`;
- `ANALYST`;
- `CLIENT`.

`PrincipalContext` is not persisted. It contains fresh identity/system role/correlation data and never chooses the first membership as active tenant.

## Product Access

Each product owns typed access tables:

```text
SeoMembership   -> SeoProjectAccess
LeadsMembership -> LeadsProjectAccess
ToolsMembership -> ToolsProjectAccess
```

Common invariants:

- one active membership per user/organization/product;
- one explicit grant per membership/project;
- project belongs to the same product organization as membership;
- membership without project grant cannot read project data;
- no wildcard for future projects in v1;
- revoking membership cascades or disables its project grants atomically;
- grants have version and timestamps for optimistic concurrency/audit.

Product roles: `VIEWER`, `OPERATOR`, `ANALYST`. Role-to-permission mapping is code-owned and versioned, not editable arbitrary JSON.

## Product Ownership

### SEO Monitor

```text
SeoOrganization
-> SeoProject
-> Site
-> Provider configuration/evidence
-> ReportSnapshot
```

Existing `Organization`, `Member`, `Project`, `Site` are migrated behind SEO facades. Existing client visibility is converted to grants for exactly the projects previously visible.

### AMS Leads

```text
LeadsOrganization
-> LeadsProject
-> Funnel
-> Lead
```

Leads data model is reserved, not implemented in Research cycle.

Retention target: active leads remain; contact PII is removed six months after closure/last activity; aggregates remain 24 months. Exact lifecycle is finalized with Leads module.

### Tools

```text
ToolsOrganization
-> ToolsProject
-> Research / Contract / Invoice / Presentation / SiteClone
```

All internal tools reference `ToolsProject`. They do not create parallel organization/project tables.

## Research Ownership

### Research

- `id`, `toolsOrganizationId`, `toolsProjectId`;
- name, type, status, author, version;
- created/updated/archived timestamps.

### ResearchQuery

- original and normalized text;
- stable order;
- unique normalized query within Research.

### ResearchRun

- immutable input snapshot;
- provider/adapter/rate-card versions;
- estimated and approved maximum amount;
- confirmation actor/time/hash/expiry;
- lifecycle counters, actual calculated amount and correlation ID.

### ResearchQueryRun

- one query execution within a run;
- operation key, attempts, billable units, safe error code and timestamps;
- ambiguous paid dispatch ends in `ACTION_REQUIRED`.

### Evidence And Output

- `SerpResult`, `SerpAd`, `KeywordMetric`, `ResearchSuggestion`;
- `CompetitorProjection` - deterministic aggregate;
- `ResearchInsight` - optional future AI interpretation;
- `ResearchExport` - status, format, checksum and private storage reference.

Raw provider XML/HTML and credentials are not stored by default.

## Research Lifecycle

```text
DRAFT -> QUEUED -> RUNNING -> SUCCESS | PARTIAL | FAILED | ACTION_REQUIRED
DRAFT | QUEUED -> CANCELLED before paid dispatch
```

- `PARTIAL != SUCCESS`, `null != 0`.
- Completed run input is immutable.
- Retry creates/updates attempt state but never duplicates operation key.
- Same idempotency key with different request hash is conflict.
- Successful query evidence survives neighboring query failure.
- Re-run creates a new ResearchRun.

## Budget

- maximum 20 queries per ResearchRun in pilot;
- daily approved ceiling 500 RUB;
- monthly approved ceiling 3000 RUB;
- paid execution requires current permission and unexpired exact confirmation;
- rate card snapshot is stored with run;
- actual provider invoice is not claimed unless provider exposes verifiable billing evidence.

## Tenant And Database Invariants

- Every tenant record carries product-local organization/project ownership.
- Composite foreign keys reject cross-organization parent relations.
- Resource lookup includes authorized product/project scope.
- RLS is fail-closed when transaction context is absent.
- Platform Admin does not receive a fake tenant record.
- IDs from browser/API/MCP do not establish ownership.
- Foreign resource returns not-found semantics without existence disclosure.

## Operations

Outbox, idempotency, JobRun, RuntimeHeartbeat and pg-boss continue as platform-owned reliability records. Product job payloads are bounded, versioned and carry explicit product/organization/project identifiers.

Research queue topic: `research.run.v1`, concurrency `1`, finite retry and dead-letter behavior.

## DateTime Policy

- proven UTC instants use `timestamptz(3)`;
- civil/business period keys use explicit `timestamp(3)` semantics;
- every new DateTime field declares its category;
- blind timezone conversion is prohibited.

## Backup And Retention

- Managed PostgreSQL physical backups: daily, at least 7 copies.
- Independent custom-format logical dump to private S3.
- Restore smoke before risky production migration.
- Backup identity must produce complete data despite runtime RLS.
- Old self-managed database remains read-only for 14 days after cutover.
- Research/contracts/presentations retain history until explicit owner deletion policy.
