# DATA MODEL

> Migration status: `20260903180000_expand_tenant_ownership` backfills nullable ownership fields; `20260903183000_contract_tenant_ownership` validates every ownership chain, makes those fields `NOT NULL` and adds composite tenant foreign keys. The contract migration deliberately stops on any unknown or cross-tenant row. No legacy field/table is removed in the first Standard 3.0 release train.

## Источники истины

- `prisma/schema.prisma` — фактическая структура PostgreSQL;
- `prisma/migrations/*` — immutable история изменений schema;
- `src/shared/schemas/*` — runtime DTO validation;
- этот документ — назначение, связи, lifecycle и invariants;
- `config/*` — reviewed nonsecret seed/input, не production runtime store.

PostgreSQL — единственный runtime source of truth.

## Identity и access

### User

Better Auth identity with legacy `systemRole`, immutable optional `username`, `disabledAt`, `mustChangePassword` and `twoFactorEnabled`.

- `username` and `email` are unique;
- `PLATFORM_ADMIN` maps to non-tenant `platform-admin`;
- `SEO_ANALYST` maps to non-tenant project-specific `platform-analyst`;
- client access is created only through `Member.tenantRole`;
- `mustChangePassword=true` blocks cabinet access until audited completion;
- `disabledAt` blocks principal creation;
- additive migration does not change existing system roles or lock existing users.

### TwoFactor

Better Auth 2FA record, unique by `userId`. Stores the plugin-managed secret, encrypted backup codes, verification state and lockout counters. These fields never enter DTO, logs, AuditEvent markers or browser payload.

### Session, Account, Verification

Better Auth-owned authentication state. Session token, IP and user-agent are not DTO. `Session.activeOrganizationId` remains compatibility data only; server validates it against fresh AMS Membership before principal creation.

### Organization and Member

```text
User/Auth Identity
      ↓
Member (tenantRole)
      ↓
Organization
      ↓
Project
```

- membership is unique by `(organizationId, userId)`;
- `tenantRole` is `ORG_OWNER | ORG_MEMBER | VIEWER`, default `VIEWER`;
- legacy `Member.role` remains through the compatibility period and is not a business permission source;
- membership removal removes tenant principal scope on the next authorization read.

### Invitation

Legacy Better Auth Organization Plugin compatibility schema. It is not used by new tenancy behavior and receives no new product flow.

### PrincipalContext

Not a database record. A server factory creates a discriminated principal from fresh User, Membership, validated compatibility selection and server correlation ID. Platform principals never receive fake `organizationId`. Legacy `ActorContext` is a temporary facade for unrevised modules only.

## Project registry

### Project

Принадлежит одной `Organization`, ссылается на `ThresholdProfile` и `QueryClusterProfile`.

- `slug` уникален глобально;
- status: `ACTIVE`, `PLANNED`, `DISABLED`;
- `version` — positive optimistic concurrency token, initial value `1`;
- successful status/settings mutation increments `version` exactly once;
- stale expected version rejects the mutation and its AuditEvent in the same transaction;
- physical delete production project не является обычной операцией.

### Tenant ownership

`Project` is the ownership root. Every registry, configuration, query, run, metric and report record stores its own required `organizationId`; it is not inferred from a browser route or a mutable session field.

- direct `organizationId → Organization` foreign keys preserve a valid owner;
- composite foreign keys make the owner agree with every parent relation: Site→Project, configuration/query records→their parent, SourceRun→SyncRun/Site, metrics/technical snapshots→Site/SourceRun, RankingCapture→TrackedQuery/optional SourceRun and ReportSnapshot→Site;
- `SyncRun` has an explicit owner even before a SourceRun exists;
- `pnpm verify:tenant-ownership` is a read-only preflight that emits only check names and counts. Its every count must be zero before the contract migration reaches production.

### Site

Принадлежит одному Project и той же Organization.

- `(projectId, slug)` уникален;
- `(organizationId, projectId)` must reference the same Project ownership;
- хранит display name, URL, timezone и `enabled`;
- владеет provider connections, tracked queries, runs, metrics и reports;
- отключение не удаляет историю.

### ProviderConnection

Одна запись на `(siteId, provider)` для Webmaster, Metrika или Topvisor.

- хранит nonsecret external mapping и validated settings JSON;
- credentials остаются в server environment;
- `enabled=false` запрещает provider call.

## Profiles

### ThresholdProfile

Детерминированные пороги alerts/opportunities. Project ссылается на профиль; изменение влияет на будущую compilation.

### QueryClusterProfile и QueryClusterGroup

Классификация запросов по утверждённым группам. `(profileId, slug)` уникален.

### GoalDefinition и GoalDefinitionSite

Project-level allowlist целей Metrika и optional site scope.

- `(projectId, externalGoalId)` уникален;
- `includeInSeoConversion` определяет участие цели в unique target visits;
- category/direction сохраняют business semantics, а не display-only labels.

### TrackedQuerySet и TrackedQuery

Один set на site. Query уникален по `(trackedQuerySetId, normalizedQuery)`.

- содержит source, baseline label и expected count;
- позиции nullable;
- `enabled=false` сохраняет историю, но исключает query из активного core.

## Project command lifecycle

- Project create/status/settings use canonical Zod input and `PrincipalContext`;
- existing Project ownership and requested `organizationId` are checked inside the transaction;
- Project mutation and safe `AuditEvent` commit atomically;
- Project `slug` and `organizationId` are immutable after creation in this slice;
- status/settings changes require the current `version`;
- no Project command physically deletes a Project or its history.

## Platform Admin command lifecycle

- Platform Admin lists read PostgreSQL through owner module queries with allowlisted search/sort/page and browser-safe DTOs;
- typed Server Actions rebuild fresh `PrincipalContext`; browser state does not authorize mutations;
- every mutable aggregate uses positive `version` with optimistic concurrency;
- resource loaders derive target organization from explicit organization input or validated parent ownership;
- Organization, Member, Site, ProviderConnection, GoalDefinition, TrackedQuerySet, ThresholdProfile and QueryClusterProfile commit mutation + safe `AuditEvent` atomically;
- membership removal is explicit and versioned, not implicit overwrite;
- provider settings contain only nonsecret mapping; sensitive keys are rejected before persistence;
- tracked query replacement disables missing queries instead of deleting history.

## Sync lifecycle

### SyncRun

Один запуск worker:

- trigger: `DAILY`, `MANUAL`, `PREFLIGHT`, `BACKFILL`;
- status: `RUNNING`, `SUCCESS`, `PARTIAL`, `FAILED`;
- `startedAt`, фактический `finishedAt`, число обработанных sites и safe error code.

### SourceRun

Provider execution внутри SyncRun и Site.

- status сохраняет `SUCCESS`, `PARTIAL`, `FAILED`, `NOT_CONFIGURED`, `ACCESS_DENIED`, `QUOTA_LIMITED`, `STALE`;
- `durationMs`, row count и safe error metadata не содержат raw response body;
- unexpected worker error закрывает оставшиеся open runs как failed.

PostgreSQL advisory lock запрещает concurrent full sync. Lock session-scoped и освобождается в `finally` или PostgreSQL при разрыве соединения.

## Historical metrics

### Webmaster

- `WebmasterDailyMetric` — daily all-query shows/clicks/CTR/average position, unique `(siteId, date)`;
- `WebmasterQueryDailyMetric` — period/query/device/order detail, unique по site + period + date + normalized query + device + order;
- total KPI не вычисляется суммой ограниченного popular-query pool.

### Metrika

- `MetrikaDailyMetric` — daily organic/all-traffic and target metrics, unique `(siteId, date)`;
- `LandingPageDailyMetric` — period landing aggregates;
- `MetrikaDeviceDailyMetric` — period device aggregates;
- `MetrikaGoalDailyMetric` — period goal aggregates.

Upsert обновляет актуальное значение того же natural key и связывает его с последним SourceRun.

### RankingCapture

Exact/owner position на момент `capturedAt`, unique `(trackedQueryId, capturedAt, source)`.

### TechnicalSnapshot

Validated JSONB для сложных technical structures Webmaster/Metrika. Raw HTTP body, authorization header и credentials не сохраняются.

## ReportSnapshot

Materialized validated report:

- `siteId`, `periodKey`, `schemaVersion`, `generatedAt`, `freshness`;
- `payload` соответствует `SiteReportSnapshot`;
- records append-only; `ReportRepository` выбирает последний по `generatedAt`;
- report payload — browser DTO, не raw source of truth.

Periods:

| Key | Длина | UI |
|---|---:|---|
| `week` | 7 дней | Неделя |
| `month` | 28 дней | Месяц |
| `quarter` | 90 дней | 3 месяца |
| `halfYear` | 180 дней | Полгода |

`month` — default. Previous period непосредственно предшествует current и имеет ту же длину.

## Metric invariants

- `partial` не становится `success`;
- `stale` не становится `current`;
- неизвестное значение не становится `0`;
- technical endpoint failure сохраняется в partial/error metadata;
- source error одного периода не переносится в успешный другой период;
- Webmaster average position — средняя позиция показов, не exact rank;
- Top-3 является подмножеством Top-10;
- меньшая позиция лучше;
- ranking denominator — всё утверждённое ядро, включая unmeasured queries;
- director conversion = unique target visits / Yandex organic visits;
- direct query-to-lead attribution запрещена;
- данные разных projects/sites/periods не смешиваются.

## Reliability records

### AuditEvent

Safe append-only marker: optional organization, actor type/id, action, entity, before/after markers, source, correlation ID and timestamp. Organization deletion sets relation null without deleting platform audit history.

### IdempotencyKey

Unique `(scope, organizationScope, key)`. Stores SHA-256 request hash, lifecycle status, response marker, expiry and optional OutboxEvent link. `organizationScope` is always explicit: organization ID or `platform`.

### OutboxEvent

Status `PENDING → PROCESSING → PROCESSED` or `DEAD_LETTER`; stores topic, JSON payload, attempts, availability, lease owner/time, safe error, correlation and processed timestamp.

### JobRun

One row per attempt, unique `(outboxEventId, attempt)`. Stores worker, RUNNING/SUCCESS/FAILED, timing and safe error code.

Invariants:

- enqueue transaction atomically creates idempotency marker, event and audit;
- same key + same hash returns the original event;
- same key + different hash is rejected;
- claim uses conditional lease ownership;
- only lease owner completes/fails;
- retry uses bounded exponential backoff;
- permanent/exhausted failures become dead-letter;
- payload/audit/error fields never contain secrets or raw PII;
- `RetentionRun` is not added until a concrete retention policy exists.

## Delete и retention

- auth child records cascade вместе с User/Organization по schema rules;
- Project/Site core relations используют `Restrict` там, где удаление потеряло бы business history;
- physical delete project/site/history требует отдельной destructive operation и backup/rollback plan;
- ReportSnapshot и historical retention автоматически не удаляются текущим application code;
- release rollback не откатывает PostgreSQL schema/data автоматически.

## Backup

Production contract: local custom-format `pg_dump`, checksum, обязательная private offsite copy с HEAD confirmation, retention tiers и restore smoke во временную БД. Детали: `docs/DATABASE.md` и `docs/ops/RECOVERY.md`.
