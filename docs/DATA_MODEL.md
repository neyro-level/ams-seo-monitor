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

## Wave 1 status

На этом этапе registry, snapshot schemas и storage engine реализуются и проверяются на fixtures. Live source DTO появятся в Wave 2, но не должны ломать текущий contract.
