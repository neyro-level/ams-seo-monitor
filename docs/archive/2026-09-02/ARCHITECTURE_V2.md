# ARCHITECTURE V2

## Status

Ветка `work/background-migration` реализует V2 как активную архитектуру проекта, а не только проектный intent.

## Final direction

```text
Browser
→ Nginx
→ Next.js App Router
→ Application services
→ Repository contracts
→ Prisma repositories
→ PostgreSQL

systemd timer
→ worker oneshot
→ provider adapters
→ PostgreSQL history
→ ReportSnapshot / SiteReportSnapshot
```

## What changed versus V1

Удалено из active runtime path:

- static export delivery;
- browser fetch of `/data/latest.json`;
- filesystem snapshot publish path;
- fs locks and fs LKG store;
- Basic Auth as application auth;
- old collector-only systemd pair.

## Current active entry points

- web app routes in `src/app/*`;
- Better Auth route `src/app/api/auth/[...all]/route.ts`;
- health routes `src/app/api/health/*`;
- worker `src/worker/main.ts`;
- live provider collectors `collector/orchestration/live-collectors.ts`;
- pure report compiler `collector/orchestration/report-compiler.ts`.

## Current invariants

- UI reads service DTOs, not Prisma models;
- worker and web share the same domain/report compiler;
- PostgreSQL stores runtime truth and historical evidence;
- `SiteReportSnapshot` stays browser contract;
- config JSON is no longer runtime store, only seed/input material.
