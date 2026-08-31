# WORKER

## Current state

Worker больше не публикует filesystem snapshots как runtime truth.

Сейчас реализовано:

- worker entry `src/worker/main.ts`;
- DB-backed `syncProjectToDatabase()`;
- `SyncRun` и `SourceRun` persistence;
- `ReportSnapshot` persistence;
- historical metric persistence for Webmaster/Metrica;
- `RankingCapture` persistence;
- `TechnicalSnapshot` persistence;
- compiled worker path `dist-collector/src/worker/main.js`.

## Runtime flow

```text
systemd timer
→ worker oneshot (`daily` trigger)
→ PostgreSQL advisory full-sync lock
→ provider adapters
→ normalized DTOs
→ domain analytics / report compiler
→ SyncService
→ repository contracts
→ PostgreSQL historical tables
→ ReportSnapshot / SiteReportSnapshot
→ structured JSON status logs in journald
→ release lock and exit
```

## Preserved semantics

- periods `week/month/quarter/halfYear`;
- previous period equal length;
- Topvisor exact snapshots stored separately;
- partial failures stay partial;
- source states and safe error codes stay explicit;
- provider APIs are not called from browser;
- a second full sync for the runtime is rejected by PostgreSQL advisory lock;
- unexpected exceptions finalize open `SourceRun` and `SyncRun` records as failed;
- scheduled and manual triggers remain distinguishable in PostgreSQL.

## Commands

```bash
pnpm build:collector
pnpm worker:sync:project -- <project-slug>
pnpm worker:sync:REDACTED_CLIENT_DATA
```

## Verified state

- worker integration test writes runs, report snapshots, historical metrics, ranking captures and technical snapshots;
- failure integration test proves open runs become `FAILED` on unexpected compiler failure;
- advisory-lock integration test proves overlapping full sync denial and release;
- compiled worker smoke proves the plain Node runtime does not import the web-only `server-only` marker.
