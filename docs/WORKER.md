# WORKER

## Current branch state

Worker больше не публикует filesystem snapshots как runtime truth.

Сейчас в ветке реализовано:

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
→ worker oneshot
→ provider adapters
→ normalization
→ PostgreSQL historical tables
→ ReportSnapshot / SiteReportSnapshot
→ exit
```

## Preserved semantics

- periods `week/month/quarter/halfYear`;
- previous period equal length;
- Topvisor exact snapshots stored separately;
- partial failures stay partial;
- source states and safe error codes stay explicit;
- provider APIs are not called from browser.

## Commands

```bash
pnpm build:collector
pnpm worker:sync:project -- <project-slug>
pnpm worker:sync:REDACTED_CLIENT_DATA
```

## Verified in branch

- worker integration test writes runs, report snapshots, historical metrics, ranking captures and technical snapshots;
- compiled worker smoke with invalid provider endpoints returns honest `partial` result and safe error codes instead of crashing.
