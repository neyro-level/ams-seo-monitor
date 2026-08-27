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

## Storage invariants

- temp-write и publish только в том же filesystem;
- schema validation до publish;
- `latest.json` обновляется последним;
- invalid snapshot не затирает latest valid snapshot;
- partial source не уничтожает last-known-good другого source;
- raw responses и secret-bearing error bodies не сохраняются.

## Current status

- Registry and goal profiles are checked in and validated.
- Atomic snapshot storage and last-known-good behavior are implemented.
- Webmaster and Metrica have separate normalized source DTOs and live proof for REDACTED_CLIENT_DATA REDACTED_CLIENT_DATA.
- A compiler from source DTOs to `SiteReportSnapshot` is not implemented yet.
- UI still reads a synthetic snapshot and must not be described as live.

## Conversion invariant

- `goalReaches` may contain several reaches from one visit.
- Sum of allowlisted goal reaches is not unique converted visits.
- Aggregate conversion remains `null` until W6 computes union allowlisted converted visits without double counting.
- Per-goal conversion may use the official Metrica `goal<ID>conversionRate`.

## Period invariant

- Current and previous periods have equal length.
- Webmaster and Metrica retain their factual periods/timezones.
- Combined metrics never hide a source-period mismatch.
- Incomplete or suppressed values stay nullable; they do not become zero.
