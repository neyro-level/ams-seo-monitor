# DATA MODEL

## Runtime source of truth

PostgreSQL — единственный runtime source of truth.

Git хранит только:

- seed inputs;
- tracked query baseline imports;
- fixtures;
- nonsecret helper config.

## Core entities

- `User`, `Session`, `Account`, `Verification`
- `Organization`, `Member`, `Invitation`
- `Project`, `Site`, `ProviderConnection`
- `ThresholdProfile`, `QueryClusterProfile`, `QueryClusterGroup`
- `GoalDefinition`, `GoalDefinitionSite`
- `TrackedQuerySet`, `TrackedQuery`
- `SyncRun`, `SourceRun`
- `WebmasterDailyMetric`, `WebmasterQueryDailyMetric`
- `MetrikaDailyMetric`, `LandingPageDailyMetric`, `MetrikaDeviceDailyMetric`, `MetrikaGoalDailyMetric`
- `RankingCapture`
- `TechnicalSnapshot`
- `ReportSnapshot`

## Browser contract

`SiteReportSnapshot` остаётся browser-safe DTO. UI не знает таблицы под ним.

## Historical persistence rules

- Webmaster all-query history пишет daily metrics;
- Webmaster query collections пишутся как period-scoped metric rows;
- Metrika byTime пишет daily organic metrics;
- Metrika landing/device/goal aggregates пишутся как period-scoped rows;
- Topvisor exact snapshots пишутся как `RankingCapture`;
- сложные technical structures пишутся как validated `TechnicalSnapshot` JSONB;
- compiled `ReportSnapshot` — materialized report output, не raw source.

## Auth rules

- `SEO_ANALYST` — system role;
- `CLIENT_VIEWER` — tenant-bound through membership;
- public signup off;
- disabled user не проходит authorization.

## SEO semantics preserved

- `partial` не становится `success`;
- `stale` не становится `current`;
- `null` не становится `0`;
- Top-3 входит в Top-10;
- lower position = better;
- denominator ranking share = полное утверждённое ядро;
- conversion = unique target visits / organic visits;
- direct query → lead attribution запрещена.

## Backup note

Local backup и restore smoke уже настроены. Offsite backup остаётся внешним blocker до появления S3 credentials/bucket.