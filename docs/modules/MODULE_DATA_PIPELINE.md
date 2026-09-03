# Module: SEO Data Pipeline

## Назначение

Собирает read-only provider evidence, нормализует его, сохраняет историю в PostgreSQL и компилирует browser-safe `SiteReportSnapshot`.

## Ownership

- adapters: `collector/sources/*`;
- live composition: `collector/orchestration/live-collectors.ts`;
- period/query analytics: `src/modules/reporting/domain/periods.ts`, `src/modules/ranking-analytics/domain/webmaster-queries.ts`;
- report compiler: `src/modules/reporting/domain/report-compiler.ts`;
- worker entry: `src/worker/main.ts`;
- orchestration API: `src/modules/data-ingestion/index.ts`, `src/modules/data-ingestion/worker.ts`;
- persistence adapters: `src/modules/data-ingestion/server.ts`;
- contracts: `src/shared/schemas/*`.

## Runtime

```text
worker oneshot
→ advisory full-sync lock
→ SyncRun/SourceRuns
→ Webmaster/Metrika/Topvisor read-only collectors
→ normalized DTOs
→ four equal-period snapshots
→ historical/technical/ranking persistence
→ ReportSnapshot
→ close runs and release lock
```

## Invariants

- browser не вызывает providers;
- raw responses/secrets не сохраняются;
- one `SiteReportSnapshot` browser contract;
- partial/stale/null остаются явными;
- technical baseline errors сохраняются как partial;
- period error не загрязняет следующий успешный period;
- snapshot `generatedAt` стабилен на sync, run `finishedAt` фактический;
- invalid DTO не сохраняется как valid report;
- concurrent full sync запрещён;
- only `includeInSeoConversion=true` goals формируют unique-target filter;
- unexpected exception закрывает open runs failed;
- filesystem не является runtime data store.

## Persistence semantics

- daily metrics upsert by natural site/date keys;
- period detail upsert by site/period/date/dimension keys;
- ranking captures upsert by query/capture/source;
- technical and report snapshots append history;
- latest report выбирается repository по site/period/generatedAt.

## Checks

- provider error mapping;
- period alignment;
- report compiler contracts;
- goal conversion filtering;
- DB integration counts and constraints;
- run finalization/timestamps;
- advisory lock overlap;
- compiled worker smoke.

DB-backed checks требуют isolated `TEST_DATABASE_*`.
