# Module: SEO Data Pipeline

## Назначение

Собирает read-only provider data, нормализует её, сохраняет историю в PostgreSQL и компилирует browser-safe `SiteReportSnapshot`.

## Владение данными

- provider adapters in `collector/sources/*`
- live collectors in `collector/orchestration/live-collectors.ts`
- report compiler in `collector/orchestration/report-compiler.ts`
- worker orchestration in `src/worker/*`
- DB persistence in `src/infrastructure/database/repositories/prisma-sync-repository.ts`

## Runtime contract

```text
systemd timer
→ worker oneshot
→ providers
→ normalized DTOs
→ PostgreSQL historical tables
→ ReportSnapshot
→ UI via ReportService
```

## Invariants

- browser does not call providers;
- `SiteReportSnapshot` remains the browser contract;
- source failures stay explicit;
- safe error codes are preserved;
- historical metrics are stored in PostgreSQL;
- filesystem is not runtime source of truth.

## Current checks

- worker integration test;
- compiled worker smoke with safe partial failure;
- `pnpm build:collector`;
- `pnpm typecheck`.
