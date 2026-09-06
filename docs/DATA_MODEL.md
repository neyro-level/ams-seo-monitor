# DATA MODEL

## Источники истины

- `prisma/schema.prisma` — фактическая структура PostgreSQL;
- `prisma/migrations/*` — immutable история изменений schema;
- `src/shared/schemas/*` — runtime DTO validation;
- этот документ — назначение, связи, lifecycle и invariants;
- operator configuration — private external input для explicit `config:sync`, не production runtime store;
- `config/examples/**` и test fixtures содержат только synthetic data; verifier запрещает private operator paths и известные client signatures в tracked tree.

PostgreSQL — единственный runtime source of truth.

## DateTime contract

Audit date: `2026-09-06`. Prisma version: `7.10.0`. В schema найдено 90 полей `DateTime`; migrations подтверждают, что каждое из них сейчас хранится как PostgreSQL `timestamp(3)` (`timestamp without time zone`). Prisma default mapping для PostgreSQL также задаёт `DateTime → timestamp(3)`; явный timezone-aware mapping — `@db.Timestamptz(3)`.

Нормативные источники: [Prisma PostgreSQL type mapping](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql), [Prisma 7 native database types](https://docs.prisma.io/docs/orm/v7/prisma-migrate/workflows/native-database-types), [PostgreSQL 18 date/time types](https://www.postgresql.org/docs/18/datatype-datetime.html).

PostgreSQL не сохраняет timezone в `timestamp without time zone` и игнорирует offset при приведении входа к этому типу. `timestamptz` хранит instant в UTC, но преобразование старого `timestamp` использует session `TimeZone`, если зона не указана явно. Поэтому 12B может применять только явную семантику `USING <column> AT TIME ZONE 'UTC'` и только к полям с доказанным UTC-origin; слепое изменение native type запрещено.

Статусы:

- `CANDIDATE_12B` — все известные writers передают JS `Date` либо ISO/RFC3339 instant с `Z`/offset; после проверки копии production backup поле можно отдельно перевести в `@db.Timestamptz(3)` с явным `AT TIME ZONE 'UTC'`;
- `KEEP_TIMESTAMP` — значение является civil date, а не instant; timezone задаёт provider/site contract, поэтому автоматический переход на `timestamptz` изменит смысл;
- `REQUIRES_CHECK` — старые production-значения или все writers не доказаны; migration запрещена до read-only проверки database/session timezone и выборки данных.

| Model.fields | Бизнес-смысл | Источник timezone / UTC proof | Стратегия | Статус |
|---|---|---|---|---|
| `User.disabledAt` | момент административной блокировки | admin CLI передаёт `new Date()` | explicit UTC conversion в 12B после backup-copy proof | CANDIDATE_12B |
| `User.createdAt`, `User.updatedAt` | создание/последнее изменение identity | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять; проверить production timezone и samples | REQUIRES_CHECK |
| `UserSetupToken.expiresAt`, `UserSetupToken.usedAt`, `UserSetupToken.revokedAt` | expiry/consumption/revocation одноразовой capability | CLI/setup flow использует JS `Date` и UTC duration arithmetic | explicit UTC conversion в 12B после backup-copy proof | CANDIDATE_12B |
| `UserSetupToken.createdAt`, `UserSetupToken.updatedAt` | создание/изменение token record | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `Session.expiresAt`, `Session.createdAt`, `Session.updatedAt` | Better Auth session lifecycle | Better Auth-owned writer; historical adapter/session timezone не доказан | не менять; сверить production rows и Better Auth adapter | REQUIRES_CHECK |
| `Account.accessTokenExpiresAt`, `Account.refreshTokenExpiresAt`, `Account.createdAt`, `Account.updatedAt` | Better Auth account/token lifecycle | Better Auth-owned writer; provider offsets и historical rows не доказаны | не менять; сверить provider/adapter writers | REQUIRES_CHECK |
| `TwoFactor.lockedUntil` | Better Auth 2FA lockout deadline | Better Auth plugin-owned writer; production rows не доказаны | не менять; проверить plugin writer и samples | REQUIRES_CHECK |
| `Verification.expiresAt`, `Verification.createdAt`, `Verification.updatedAt` | Better Auth verification lifecycle | Better Auth-owned writer; historical rows не доказаны | не менять; проверить adapter и samples | REQUIRES_CHECK |
| `Organization.createdAt`, `Organization.updatedAt` | tenant record audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `Member.createdAt`, `Member.updatedAt` | membership audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `Invitation.createdAt`, `Invitation.updatedAt`, `Invitation.expiresAt` | deprecated Better Auth compatibility lifecycle | runtime не владеет flow; provenance старых строк не доказан | не менять в 12B; stage 9 может удалить после zero-use proof | REQUIRES_CHECK |
| `ThresholdProfile.createdAt`, `ThresholdProfile.updatedAt` | threshold profile audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `QueryClusterProfile.createdAt`, `QueryClusterProfile.updatedAt` | cluster profile audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `QueryClusterGroup.createdAt`, `QueryClusterGroup.updatedAt` | cluster group audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `Project.createdAt`, `Project.updatedAt` | project audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `Site.createdAt`, `Site.updatedAt` | site audit time | DB `now()` / Prisma `@updatedAt`; `Site.timezone` is business configuration, not proof for these instants | не менять до production proof | REQUIRES_CHECK |
| `ProviderConnection.createdAt`, `ProviderConnection.updatedAt` | provider mapping audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `GoalDefinition.createdAt`, `GoalDefinition.updatedAt` | goal configuration audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `TrackedQuerySet.createdAt`, `TrackedQuerySet.updatedAt` | query-set audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `TrackedQuery.createdAt`, `TrackedQuery.updatedAt` | tracked-query audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `SyncRun.startedAt`, `SyncRun.finishedAt` | фактические границы полного sync | worker injects `new Date().toISOString()`; repository constructs JS `Date` | explicit UTC conversion in 12B after backup-copy proof | CANDIDATE_12B |
| `SyncRun.createdAt`, `SyncRun.updatedAt` | sync record audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `SourceRun.startedAt`, `SourceRun.finishedAt` | фактические границы provider execution | worker ISO instant with `Z`; repository constructs JS `Date` | explicit UTC conversion in 12B after backup-copy proof | CANDIDATE_12B |
| `SourceRun.createdAt`, `SourceRun.updatedAt` | source-run audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `WebmasterDailyMetric.date`, `WebmasterQueryDailyMetric.date`, `MetrikaDailyMetric.date`, `LandingPageDailyMetric.date`, `MetrikaDeviceDailyMetric.date`, `MetrikaGoalDailyMetric.date` | provider civil day / period key | provider date plus site/provider timezone; persisted as `YYYY-MM-DDT00:00:00.000Z` solely for stable storage | сохранить `timestamp(3)`; `timestamptz` запрещён без отдельного semantic redesign | KEEP_TIMESTAMP |
| `WebmasterDailyMetric.createdAt`, `WebmasterQueryDailyMetric.createdAt`, `MetrikaDailyMetric.createdAt`, `LandingPageDailyMetric.createdAt`, `MetrikaDeviceDailyMetric.createdAt`, `MetrikaGoalDailyMetric.createdAt` | ingestion row audit time | DB `now()`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `RankingCapture.capturedAt` | instant получения/владельческого снимка позиции | provider RFC3339 instant или explicit `T00:00:00.000Z`; repository constructs JS `Date` | explicit UTC conversion in 12B after backup-copy proof | CANDIDATE_12B |
| `RankingCapture.createdAt` | capture row creation time | DB `now()`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `TechnicalSnapshot.capturedAt` | instant provider fetch represented by snapshot | validated provider `fetchedAt` with offset; repository constructs JS `Date` | explicit UTC conversion in 12B after backup-copy proof | CANDIDATE_12B |
| `TechnicalSnapshot.createdAt` | snapshot row creation time | DB `now()`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `ReportSnapshot.generatedAt` | report compilation instant | worker-generated ISO instant with `Z`; repository constructs JS `Date` | explicit UTC conversion in 12B after backup-copy proof | CANDIDATE_12B |
| `ReportSnapshot.createdAt` | report row creation time | DB `now()`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `AuditEvent.createdAt` | audit marker creation time | DB `now()`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `IdempotencyKey.expiresAt` | idempotency retention deadline | reliability service derives ISO instant from injected JS `Date` | explicit UTC conversion in 12B after backup-copy proof | CANDIDATE_12B |
| `IdempotencyKey.createdAt`, `IdempotencyKey.updatedAt` | idempotency record audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `OutboxEvent.lockedAt`, `OutboxEvent.processedAt` | lease acquisition and terminal processing instants | repository uses injected ISO instant converted to JS `Date` | explicit UTC conversion in 12B after backup-copy proof | CANDIDATE_12B |
| `OutboxEvent.occurredAt`, `OutboxEvent.availableAt` | business occurrence / earliest dispatch instant | application normally supplies UTC ISO, but DB defaults and migration backfill remain valid writers | не менять до production default/backfill proof | REQUIRES_CHECK |
| `OutboxEvent.createdAt`, `OutboxEvent.updatedAt` | outbox row audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `JobRun.startedAt`, `JobRun.finishedAt` | queue attempt boundaries | repository uses injected UTC ISO/JS `Date` | explicit UTC conversion in 12B after backup-copy proof | CANDIDATE_12B |
| `JobRun.createdAt` | attempt row creation time | DB `now()`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `RuntimeHeartbeat.startedAt`, `RuntimeHeartbeat.heartbeatAt` | worker identity start and latest heartbeat instants | runtime passes JS `Date`; all arithmetic uses epoch milliseconds | explicit UTC conversion in 12B after backup-copy proof | CANDIDATE_12B |
| `RuntimeHeartbeat.createdAt`, `RuntimeHeartbeat.updatedAt` | heartbeat row audit time | DB `now()` / Prisma `@updatedAt`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |
| `RetentionRun.startedAt`, `RetentionRun.finishedAt` | retention execution boundaries | runtime passes one injected JS `Date` | explicit UTC conversion in 12B after backup-copy proof | CANDIDATE_12B |
| `RetentionRun.createdAt` | retention row creation time | DB `now()`; historical session timezone не доказан | не менять до production proof | REQUIRES_CHECK |

Coverage: `20 CANDIDATE_12B + 6 KEEP_TIMESTAMP + 64 REQUIRES_CHECK = 90 DateTime fields`. 12B создаёт migration только для полного списка `CANDIDATE_12B`, только если проверка копии production backup подтверждает stored-value assumption и приемлемый lock/rewrite impact. Остальные поля остаются без schema change.

## Identity и access

### User

Better Auth identity with project `systemRole`, immutable optional `username`, `disabledAt`, `mustChangePassword` and `twoFactorEnabled`.

- `username` and `email` are unique;
- `PLATFORM_ADMIN` maps to non-tenant `platform-admin`;
- `SEO_ANALYST` maps to non-tenant project-specific `platform-analyst`;
- client access is created only through `Member.tenantRole`;
- `mustChangePassword=true` blocks cabinet access until audited completion;
- `disabledAt` blocks principal creation;
- additive migration does not change existing system roles or lock existing users.

### TwoFactor

Better Auth 2FA record, unique by `userId`. Stores the plugin-managed secret, encrypted backup codes, verification state and lockout counters. These fields never enter DTO, logs, AuditEvent markers or browser payload.

### UserSetupToken

One-time operator-issued first-access capability. The table stores only a 64-character SHA-256 `tokenHash`, owner `userId`, expiry, optional used/revoked timestamps and nonsecret `createdBy` operator identity.

- raw token is 32 random bytes and never enters PostgreSQL, logs, audit or documentation;
- `expiresAt`, `usedAt`, `revokedAt`, `createdAt` and `updatedAt` are application/database UTC instants currently mapped to PostgreSQL `timestamp(3)` consistently with the existing schema; native-type conversion remains governed by the project-wide DateTime audit;
- successful setup creates the Better Auth credential account, consumes the token, clears `mustChangePassword` and creates a safe AuditEvent atomically;
- expiry, revocation, replay, disabled user or an existing credential leave business state unchanged;
- deleting a User cascades its setup tokens; normal operations revoke or expire tokens rather than physically deleting them.

### Session, Account, Verification

Better Auth-owned authentication state. Session token, IP and user-agent are not DTO. `Session.activeOrganizationId` is a deprecated server-side preference: it is never trusted directly and is validated against fresh AMS Membership before principal creation.

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
- deprecated `Member.role` remains in schema but is not a business permission source;
- membership removal removes tenant principal scope on the next authorization read.

### Invitation

Deprecated compatibility schema. Runtime Organization Plugin is not registered; Invitation receives no product flow.

### PrincipalContext

Not a database record. A server factory creates a discriminated principal from fresh User, Membership, validated active-organization preference and server correlation ID. Platform principals never receive fake `organizationId`; tenant reads use only the selected fresh Membership organization.

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

Status `PENDING → PROCESSING → PROCESSED` or `DEAD_LETTER`; stores topic, JSON payload, `schemaVersion`, `occurredAt`, attempts, availability, lease owner/time, safe error, correlation and processed timestamp.

### JobRun

One row per attempt, unique `(outboxEventId, attempt)`. Stores worker, RUNNING/SUCCESS/FAILED, timing and safe error code.

### RuntimeHeartbeat

One row per unique `(runtime, workerId)`. `startedAt` records the first observed start for that identity; `heartbeatAt` is refreshed at most once per minute and is the only worker-liveness source used by readiness.

### RetentionRun

Retention execution marker: RUNNING/SUCCESS/FAILED, started/finished timestamps and deleted outbox/job-run counts.

Invariants:

- enqueue transaction atomically creates idempotency marker, event and audit;
- same key + same hash returns the original event;
- same key + different hash is rejected;
- pg-boss transports claimed outbox work, but business retry/dead-letter truth remains in OutboxEvent and JobRun;
- queue payload carries a wrapper `schemaVersion` and one authoritative claimed event in `job.data.event`;
- queue dispatch uses `singletonKey = outboxEventId`; a duplicate/null send is not a business failure;
- only lease owner completes/fails;
- retry uses bounded exponential backoff;
- permanent/exhausted failures become dead-letter;
- retention removes only old processed/dead-letter outbox detail;
- payload/audit/error fields never contain secrets or raw PII.

## Delete и retention

- auth child records cascade вместе с User/Organization по schema rules;
- Project/Site core relations используют `Restrict` там, где удаление потеряло бы business history;
- physical delete project/site/history требует отдельной destructive operation и backup/rollback plan;
- ReportSnapshot и historical retention автоматически не удаляются текущим application code;
- release rollback не откатывает PostgreSQL schema/data автоматически.

## Backup

Production contract: local custom-format `pg_dump`, checksum, обязательная private offsite copy с HEAD confirmation, retention tiers и restore smoke во временную БД. Детали: `docs/DATABASE.md` и `docs/ops/RECOVERY.md`.
