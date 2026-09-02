# Module: SEO Data Pipeline

## Назначение

Собирает read-only provider evidence, нормализует его, сохраняет историю в PostgreSQL и компилирует browser-safe `SiteReportSnapshot`.

## Ownership

- adapters: `collector/sources/*`;
- live composition: `collector/orchestration/live-collectors.ts`;
- period/query analytics: `src/domain/analytics/*`;
- report compiler: `src/domain/reports/report-compiler.ts`;
- worker entry: `src/worker/*`;
- orchestration: `src/application/services/sync-service.ts`;
- persistence: `src/infrastructure/database/repositories/prisma-sync-repository.ts`;
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
