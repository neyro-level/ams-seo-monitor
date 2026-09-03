# DATA MODEL

## Источники истины

- `prisma/schema.prisma` — фактическая структура PostgreSQL;
- `prisma/migrations/*` — immutable история изменений schema;
- `src/shared/schemas/*` — runtime DTO validation;
- этот документ — назначение, связи, lifecycle и invariants;
- `config/*` — reviewed nonsecret seed/input, не production runtime store.

PostgreSQL — единственный runtime source of truth.

## Identity и access

### User

Better Auth user с `systemRole`, optional immutable `username` и `disabledAt`.

- `username` и `email` уникальны;
- `PLATFORM_ADMIN` — internal global platform capabilities;
- `SEO_ANALYST` — global project/report/sync read capabilities;
- `CLIENT_VIEWER` получает organization scope только через `Member`;
- disabled user не проходит authorization;
- additive enum migration не меняет роли existing users автоматически.

### Session, Account, Verification

Better Auth-owned authentication state. Session хранит token и request metadata. Эти записи не являются browser DTO и не публикуются в report payload.

### Organization и Member

```text
User ← Member → Organization → Project
```

- membership уникален по `(organizationId, userId)`;
- client access вычисляется из memberships на сервере;
- удаление membership немедленно убирает tenant scope при следующем authorization read.

### Invitation

Schema совместимости Better Auth organization plugin. Public signup и self-service invitation flow не являются активным product scope.

### ActorContext

Не хранится как DB record. На каждый private request собирается из fresh User, memberships, active organization, code-versioned permissions и server correlation ID. Session/client values не заменяют DB membership check.

## Project registry

### Project

Принадлежит одной `Organization`, ссылается на `ThresholdProfile` и `QueryClusterProfile`.

- `slug` уникален глобально;
- status: `ACTIVE`, `PLANNED`, `DISABLED`;
- physical delete production project не является обычной операцией.

### Site

Принадлежит Project.

- `(projectId, slug)` уникален;
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

## Delete и retention

- auth child records cascade вместе с User/Organization по schema rules;
- Project/Site core relations используют `Restrict` там, где удаление потеряло бы business history;
- physical delete project/site/history требует отдельной destructive operation и backup/rollback plan;
- ReportSnapshot и historical retention автоматически не удаляются текущим application code;
- release rollback не откатывает PostgreSQL schema/data автоматически.

## Backup

Production contract: local custom-format `pg_dump`, checksum, обязательная private offsite copy с HEAD confirmation, retention tiers и restore smoke во временную БД. Детали: `docs/DATABASE.md` и `docs/ops/RECOVERY.md`.
