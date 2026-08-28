# Module: SEO Data Pipeline

## Назначение

Собирает read-only evidence, выравнивает периоды, компилирует browser-safe reports и публикует их атомарно без БД.

Не входит в scope:

- browser-to-provider API calls;
- Yandex/Topvisor mutations;
- raw Metrica Logs API;
- automatic SEO changes;
- public report access.

## Роли и права

### COLLECTOR

- единственный runtime с external API credentials;
- читает enabled site mappings;
- публикует snapshots/source bundles/client reports;
- пишет только в project shared directories.

### SEO_ANALYST

- запускает local/live-safe sync;
- читает client reports и internal normalized bundles;
- не получает raw secret-bearing responses.

### CLIENT_VIEWER

- читает только browser-safe reports через protected Nginx paths.

## Владение данными

```text
collector/sources/yandex-webmaster/
collector/sources/yandex-metrica/
collector/sources/topvisor/
collector/analytics/
collector/orchestration/client-sync.ts
collector/orchestration/report-compiler.ts
collector/storage/
```

Published layout:

```text
shared/snapshots/{project}/{site}/{period}/
├── latest.json
├── latest-sources.json
├── snapshot-<timestamp>.json
└── sources-<timestamp>.json

shared/client-reports/{project}/{site}/{period}/latest.json
shared/sync-state/
shared/locks/
```

## Команды

### Preflight/audit

```bash
pnpm collector:webmaster:preflight
pnpm collector:webmaster:audit
pnpm collector:metrica:preflight
pnpm collector:metrica:audit
```

### Client sync

```bash
pnpm collector:sync:REDACTED_CLIENT_DATA
```

Текущий command собирает все enabled sites проекта `REDACTED_CLIENT_DATA` и четыре периода.

## Period contract

| Key | Days |
|---|---:|
| `week` | 7 |
| `month` | 28 |
| `quarter` | 90 |
| `halfYear` | 180 |

- current ends on latest factual Webmaster date;
- previous immediately precedes current and has equal length;
- period mismatch is explicit;
- partial/suppressed values never become zero silently.

## Source contracts

### Webmaster

- exact verified host;
- total all-query history for KPI totals;
- popular query pools for detail;
- diagnostics/sitemaps/indexing/search events/links;
- endpoint-level partial status.

### Metrica

- exact counter/goals;
- all traffic and Yandex organic;
- bytime/landing pages/devices;
- goal actions and unique target visits;
- sampling/privacy metadata;
- HTTP 420 stops source run without tight retry.

### Topvisor

- optional read-only exact ranking history;
- no checker runs/import/mutations;
- owner fallback remains separate and labelled.

## Инварианты

- one unified `SiteReportSnapshot` is browser contract;
- detailed source bundle stays internal;
- raw provider payloads are not persisted;
- secrets are never logged/published;
- temp-write + validate + rename;
- invalid data never replaces latest valid;
- source failure preserves period-specific last-known-good;
- overlapping sync for one site is locked;
- failure of one site does not stop unrelated sites;
- query → lead direct attribution is prohibited.

## Conversion semantics

- `goalReaches` = actions and may double count one visit;
- unique target visits use OR union of allowlisted goals;
- director conversion = unique target visits / Yandex organic visits;
- per-goal action counts remain detail.

## Взаимодействия

- Project Registry supplies site/source/goal/tracked-query config;
- Ranking Analytics merges exact/fallback positions;
- Director Dashboard reads only client-safe report DTO;
- Nginx maps protected data URLs to `shared/client-reports`.

## Тесты

- exact host/counter discovery;
- UTF-8 queries;
- 401/403/404/420/429/5xx;
- equal current/previous periods;
- partial endpoint/source;
- interrupted atomic publish;
- stale/overlapping lock;
- period-specific LKG;
- no secret/raw bundle in client report;
- 3 sites × 4 presets.

## Audit

`SyncRun` and safe errors own operational evidence:

- `runId`;
- mode/status/start/finish;
- project/site/source;
- row counts/durations;
- safe error codes.

Authorization headers, tokens, response bodies and personal identifiers are forbidden.