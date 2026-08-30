# WORKER

## Status

Wave 0 target design for background sync runtime.

Current collector is a compiled Node oneshot process publishing filesystem snapshots. V2 keeps oneshot scheduling but rewrites persistence and orchestration around PostgreSQL.

## Goal

Separate browser request handling from provider synchronization.

Correct runtime:

```text
systemd timer
  ↓
Worker
  ↓
Provider adapters
  ↓
Normalization
  ↓
Historical persistence
  ↓
Report compilation
  ↓
ReportSnapshot
  ↓
exit
```

Dashboard must never call provider APIs during page requests.

## Worker ownership

Worker owns:

- provider collection;
- sync runs and source runs;
- normalization;
- historical metric persistence;
- ranking captures;
- technical snapshots;
- report compilation;
- report publish state.

Worker does not own:

- browser sessions;
- page rendering;
- client-side authorization;
- manual admin UI.

## Pipeline

For one full run:

1. acquire full-sync guard;
2. create `SyncRun`;
3. resolve enabled sites and provider connections;
4. for each site create provider-scoped `SourceRun` records;
5. collect Webmaster;
6. collect Metrika;
7. collect Topvisor when enabled;
8. normalize DTOs;
9. persist historical relational metrics;
10. persist technical snapshots as validated JSONB where needed;
11. persist ranking captures;
12. compile `SiteReportSnapshot` for `week`, `month`, `quarter`, `halfYear`;
13. validate snapshot payloads with Zod;
14. persist `ReportSnapshot` records;
15. close `SourceRun` records with status, duration and safe error codes;
16. close `SyncRun`;
17. release guard and exit.

## Domain rules to preserve

- periods remain `7/28/90/180` days;
- `month` stays default;
- current and previous windows are equal-length;
- current ends on latest factual Webmaster date;
- one provider failure can still produce honest `partial` output;
- `quota_limited` and `access_denied` remain explicit source states;
- Metrika `420` does not trigger tight retry;
- Topvisor exact history overrides owner fallback only when exact data exists;
- null is preserved as evidence;
- direct query-to-lead attribution remains forbidden.

## LKG policy

Current file-era logic preserves last-known-good only for `webmaster` and `metrica` blocks when the incoming block is null after a non-success refresh.

V2 target:

- keep LKG explicit;
- scope it by `site + periodKey`;
- never overwrite last valid published report with invalid payload;
- preserve provenance in `sourceState` and/or `freshness`.

Open architecture choice for later wave:

- keep current narrow LKG semantics exactly;
- or extend LKG to more sections with explicit tests.

No silent broadening.

## Concurrency

Do not permit overlapping full sync for the same site.

Preferred mechanism:

- PostgreSQL advisory lock keyed by site.

Acceptable alternative:

- one higher-level global run guard if it keeps implementation simpler for the first version.

Not needed:

- Redis;
- queue broker;
- distributed lock system.

## Provider boundaries

The existing adapters are worth reusing with thin interface adaptation:

- `collector/sources/yandex-webmaster/*`;
- `collector/sources/yandex-metrica/*`;
- `collector/sources/topvisor/*`.

Rules:

- keep read-only behavior;
- keep safe error taxonomy;
- keep normalization out of UI;
- keep raw provider payloads out of browser and logs.

## Persistence strategy

Relational first:

- daily metrics in relational tables;
- ranking captures relational;
- runs relational;
- technical nested structures in validated JSONB only where natural.

`ReportSnapshot` is a materialized output, not source truth.

## Trigger model

Initial production scheduling remains simple:

- systemd timer;
- oneshot worker process;
- start, work, exit.

No always-running queue consumer is required at MVP scale.

## Logging

Structured worker logs must include:

- `syncRunId`;
- `siteId`;
- `provider`;
- duration;
- status;
- safe error code.

Must not include:

- tokens;
- passwords;
- authorization headers;
- full database URL;
- raw sensitive provider responses.

## Testing target

Required coverage:

- period derivation;
- comparison semantics;
- source-state mapping;
- partial run behavior;
- LKG behavior;
- Topvisor exact-vs-fallback;
- Metrika 420 behavior;
- multi-site sync;
- snapshot validation before publish;
- concurrency guard.

## Wave 6 acceptance target

Wave 6 is complete when:

- worker runs without browser involvement;
- all enabled sites are loaded from PostgreSQL, not config JSON;
- historical metrics and runs persist in PostgreSQL;
- snapshot payloads validate against `siteReportSnapshotSchema`;
- partial provider failures preserve honest states and valid output;
- filesystem is no longer the runtime data store.