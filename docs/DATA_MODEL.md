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
- snapshot `latest.json` updates atomically;
- browser-safe `client-reports/{client}/{site}/latest.json` publishes atomically;
- invalid snapshot never replaces latest valid data;
- partial source preserves last-known-good section;
- raw responses and secret-bearing error bodies are never persisted.

## Current status

- Registry and per-site goal profiles are checked in and validated.
- Three REDACTED_CLIENT_DATA sites have exact Webmaster/Metrica ownership.
- Webmaster and Metrica normalized DTOs compile into `SiteReportSnapshot`.
- Snapshot/client-report publication and LKG behavior are implemented.
- Client UI fetches and validates protected runtime JSON.
- Local live sync is proven for REDACTED_CLIENT_DATA, REDACTED_CLIENT_DATA and REDACTED_CLIENT_DATA.

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
