# DATA MODEL

## Core sources

### Registry config

Checked-in nonsecret files в `config/` описывают:

- клиента;
- сайты клиента;
- cluster profile;
- goal profile;
- thresholds.

В registry запрещены OAuth tokens, passwords, database URLs, htpasswd hashes и raw API responses.

### SiteReportSnapshot

Главный report document для UI и storage:

- `schemaVersion`
- `clientSlug`
- `siteSlug`
- `siteUrl`
- `generatedAt`
- `freshness`
- `sources.webmaster`
- `sources.metrica`
- `webmaster`
- `metrica`
- `combined`
- `periodKey`
- `comparison.currentPeriod / previousPeriod`
- `comparison.metrics`

## Source states

Допустимые source statuses:

- `success`
- `partial`
- `failed`
- `not_configured`
- `access_denied`
- `quota_limited`
- `stale`

## SyncRun

Sync run хранит состояние запуска collector:

- `runId`
- `mode`
- `status`
- `startedAt`
- `finishedAt`
- `clients`
- `safeErrorCodes`

## Storage layout

```text
shared/
├── snapshots/
├── client-reports/
├── sync-state/
├── locks/
└── backup-staging/
```

Period-aware layout:

```text
snapshots/{client}/{site}/{twoWeeks|month|quarter|halfYear}/
├── latest.json
├── latest-sources.json
├── snapshot-<timestamp>.json
└── sources-<timestamp>.json

client-reports/{client}/{site}/{period}/latest.json
```

## Storage invariants

- temp-write и publish только в том же filesystem;
- schema validation до publish;
- snapshot `latest.json` updates atomically;
- browser-safe `client-reports/{client}/{site}/{period}/latest.json` publishes atomically;
- invalid snapshot never replaces latest valid data;
- partial source preserves last-known-good section;
- raw responses and secret-bearing error bodies are never persisted.

## Current status

- Registry and per-site goal profiles are checked in and validated.
- Three REDACTED_CLIENT_DATA sites have exact Webmaster/Metrica ownership.
- Webmaster all-query totals and popular-query pools are stored separately.
- Metrica stores both cumulative goal actions and unique target visits.
- Every preset stores current and immediately preceding equal periods.
- Detailed current/previous source bundles remain internal.
- Period snapshots compile into browser-safe `SiteReportSnapshot`.
- Client UI fetches and validates period-aware protected JSON.
- Query clusters use deterministic checked-in `brandTerms` and group `terms`; unmatched queries become `Другое`.
- Live sync is proven for 3 sites × 4 presets.

## Conversion invariant

- `goalReaches` may contain several actions from one visit.
- Unique target visits use an OR union of allowlisted `goal<ID>IsReached` conditions.
- One visit is counted once even when several goals are reached.
- Director conversion = unique target visits / Yandex organic visits.
- Per-goal action counts remain secondary detail.

## Period invariant

- `twoWeeks` = 14, `month` = 28, `quarter` = 90, `halfYear` = 180 days.
- Every current period ends on the same latest factual Webmaster date.
- Previous period is immediately preceding and equal in length.
- Webmaster and Metrica use the same explicit `dateFrom/dateTo`.
- Partial/stale/suppressed values never become zero silently.
