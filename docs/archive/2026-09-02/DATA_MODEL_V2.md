# DATA MODEL V2

## Статус

Target relational model для AMS SEO Monitor после отказа от filesystem runtime storage.

Главный принцип: PostgreSQL хранит runtime truth, а `SiteReportSnapshot` остаётся materialized browser DTO, а не raw source of truth.

## Модель уровней данных

```text
relational runtime data
  ↓
normalized provider history
  ↓
domain analytics
  ↓
ReportSnapshot.payload (SiteReportSnapshot)
  ↓
UI
```

## Identity hierarchy

```text
Organization
  ↓
Project
  ↓
Site
```

Сохраняем UI semantics:

- Organization соответствует клиенту;
- Project остаётся верхним пользовательским уровнем в UI;
- Site остаётся отдельным отчётом;
- internal route contract `/c/{clientSlug}/{siteSlug}/` сохраняется.

## Auth entities

Better Auth с Prisma adapter требует модели:

- `User`;
- `Session`;
- `Account`;
- `Verification`;
- `Organization`;
- `Member`;
- `Invitation`.

Project-специфично добавляются:

- global system role пользователя;
- связь Organization → Project → Site.

Public signup выключен.

## Core application entities

### Organization

```text
id
name
slug
createdAt
updatedAt
```

Назначение: tenant boundary для `CLIENT_VIEWER`.

Constraints:

- `slug` unique;
- organization не удаляется каскадно без отдельного data decision.

### Project

```text
id
organizationId
slug
name
status
createdAt
updatedAt
```

Назначение: продуктовый уровень `Проект`.

Constraints:

- `organizationId + slug` unique;
- один project принадлежит одной organization;
- status отделяет active/planned/disabled состояния.

### Site

```text
id
projectId
slug
name
url
timezone
enabled
createdAt
updatedAt
```

Constraints:

- `(projectId, slug)` unique;
- URL должен быть https;
- disabled site не может иметь enabled provider connections;
- timezone сохраняет существующий contract `±HH:MM`.

## Provider configuration

### ProviderConnection

```text
id
siteId
provider
externalId
enabled
settingsJson
createdAt
updatedAt
```

Provider enum:

- `YANDEX_WEBMASTER`;
- `YANDEX_METRIKA`;
- `TOPVISOR`.

Rules:

- один site может иметь максимум одну connection на provider;
- secrets не хранятся в `settingsJson`;
- `externalId` — host URL, counter ID или Topvisor project ID по смыслу provider;
- nonsecret provider-specific settings допустимы в JSON, если для них нет ясной отдельной таблицы.

## Query and goal model

### GoalDefinition

```text
id
projectId
externalGoalId
label
category
direction
includeInSeoConversion
siteScopeJson
createdAt
updatedAt
```

Назначение: allowlist целей для Metrica.

Rules:

- `projectId + externalGoalId` unique;
- `siteScopeJson` временно допустим как список site slugs/id, если отдельная join-table не нужна сразу;
- V2 должна принять явное решение по `includeInSeoConversion`: использовать в расчётах или удалить.

### QueryClusterProfile

```text
id
slug
name
createdAt
updatedAt
```

### QueryClusterGroup

```text
id
profileId
slug
name
termsJson
brandTermsJson
order
```

Назначение: deterministic query classification. Cluster semantics не живут в UI.

### TrackedQuery

```text
id
siteId
query
normalizedQuery
enabled
baselineCurrentPosition
baselinePreviousPosition
baselineLabel
source
createdAt
updatedAt
```

Rules:

- `(siteId, normalizedQuery)` unique;
- source initially supports owner-provided baseline and future Topvisor enrichment;
- nullable positions сохраняются.

`normalizedQuery` должен повторять текущую нормализацию lower-case + whitespace collapse.

## Sync/run model

### SyncRun

```text
id
trigger
status
startedAt
finishedAt
sitesProcessed
safeError
createdAt
updatedAt
```

Назначение: один запуск worker.

Status enum минимум:

- `running`;
- `success`;
- `partial`;
- `failed`.

Trigger enum минимум:

- `daily`;
- `manual`;
- `preflight`;
- `backfill`.

### SourceRun

```text
id
syncRunId
siteId
provider
status
startedAt
finishedAt
durationMs
rowsReceived
safeErrorCode
notes
createdAt
updatedAt
```

Source status сохраняет текущую taxonomy:

- `success`;
- `partial`;
- `failed`;
- `not_configured`;
- `access_denied`;
- `quota_limited`;
- `stale`.

## Historical metrics

### WebmasterDailyMetric

```text
id
siteId
date
shows
clicks
ctr
averagePosition
pagesInSearch
excludedPages
sitemapUrls
sqi
sourceRunId
createdAt
```

Unique:

- `(siteId, date)`.

### WebmasterQueryDailyMetric

```text
id
siteId
date
query
normalizedQuery
device
shows
clicks
ctr
averagePosition
sourceRunId
createdAt
```

Unique candidate:

- `(siteId, date, normalizedQuery, device)`.

### MetrikaDailyMetric

```text
id
siteId
date
visits
users
pageviews
bounceRate
depth
averageVisitDurationSeconds
organicVisits
goalReaches
uniqueTargetVisits
uniqueTargetUsers
allVisits
conversionRate
sourceRunId
createdAt
```

Rules:

- `goalReaches` и `uniqueTargetVisits` хранятся отдельно;
- conversion = `uniqueTargetVisits / organicVisits * 100`;
- null suppression не превращается в zero.

### LandingPageDailyMetric

```text
id
siteId
date
path
visits
organicVisits
targetVisits
conversionRate
sourceRunId
createdAt
```

Unique candidate:

- `(siteId, date, path)`.

## Ranking history

### RankingCapture

```text
id
trackedQueryId
capturedAt
position
source
sourceRunId
createdAt
```

Rules:

- `position` nullable;
- lower numeric position = better;
- `new/lost` вычисляются только по exact captures, не по owner nullable baseline.

## Technical snapshots

### TechnicalSnapshot

```text
id
siteId
capturedAt
sourceRunId
kind
payload
createdAt
```

Назначение: сложные provider structures, которые не стоит размазывать по множеству узких таблиц.

Разрешённые payload classes:

- diagnostics;
- sitemaps;
- indexing histories;
- search appearance/removal events;
- links;
- other validated provider-specific structures.

Payload должен проходить schema validation перед записью.

## Materialized report

### ReportSnapshot

```text
id
siteId
periodKey
schemaVersion
generatedAt
freshness
payload
sourceRunSetJson
createdAt
```

Rules:

- payload обязан проходить `siteReportSnapshotSchema`;
- `(siteId, periodKey, generatedAt)` index;
- latest published report выбирается query, а не filesystem path;
- report snapshot не хранит secrets и raw provider responses.

`freshness` сохраняет browser semantics: `fresh`, `stale`, `partial`, `unavailable`.

## Internal analyst detail

Filesystem `SiteSourceBundle` перестаёт быть runtime file contract. Но разделение browser-safe и internal detail сохраняется.

Варианты реализации:

1. отдельные normalized historical tables + `TechnicalSnapshot`;
2. optional validated JSONB bundle table для analyst tooling.

Выбор: relational first, JSONB только для сложных provider payloads.

## Required indexes

Минимально:

- `Project(organizationId)`;
- `Site(projectId)`;
- `ProviderConnection(siteId, provider)` unique;
- `SyncRun(startedAt)`;
- `SourceRun(siteId, provider, startedAt)`;
- `WebmasterDailyMetric(siteId, date)` unique/index;
- `WebmasterQueryDailyMetric(siteId, date)`;
- `WebmasterQueryDailyMetric(siteId, normalizedQuery, date)`;
- `MetrikaDailyMetric(siteId, date)` unique/index;
- `LandingPageDailyMetric(siteId, date)`;
- `TrackedQuery(siteId)`;
- `RankingCapture(trackedQueryId, capturedAt)`;
- `ReportSnapshot(siteId, periodKey, generatedAt)`.

Без speculative partitioning и TimescaleDB.

## Data invariants carried from V1

- `SiteReportSnapshot` остаётся единственным browser DTO;
- current/previous periods равны по длине;
- current ends on latest factual Webmaster date;
- Webmaster totals не равны сумме visible popular-query pool;
- Topvisor exact history приоритетнее owner fallback;
- owner fallback остаётся явно labelled;
- LKG применяется явно и детерминированно;
- different sites не смешиваются в fake aggregate rank;
- no direct query-to-lead attribution.

## Seed policy

Git может хранить:

- dev/test seeds;
- demo fixtures;
- onboarding presets;
- tracked query baseline imports.

Git не должен оставаться production runtime registry.

## Migration notes from Wave 0 audit

- Существующие `config/clients`, `config/goals`, `config/clusters`, `config/tracked-queries` — source для initial seed, не target runtime store.
- Topvisor mapping для REDACTED_CLIENT_DATA есть, но disabled.
- `includeInSeoConversion` сейчас не влияет на runtime collector и требует explicit implementation decision.
- Current LKG переносит только `webmaster` и `metrica`; этот rule нужно явно закодировать и протестировать в новой модели.