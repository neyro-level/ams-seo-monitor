# ARCHITECTURE

## Runtime

```text
Browser
→ Nginx reverse proxy
→ Next.js App Router
→ Application services
→ Repository contracts
→ Prisma repositories
→ PostgreSQL

systemd timer
→ Worker composition root
→ provider adapters
→ normalized DTOs
→ domain analytics / report compiler
→ SyncService
→ repository contracts
→ Prisma repositories
→ PostgreSQL
→ ReportSnapshot / SiteReportSnapshot
```

Next.js больше не static export runtime. Production target — standalone Node application behind Nginx.

## Layers

### Presentation

- `src/app`
- `src/components`
- client/server React components

Presentation не импортирует Prisma и не знает provider APIs.

### Application

- `src/application/services`
- `src/application/ports`

Здесь находятся use cases, repository contracts и orchestration.

### Domain

- `src/domain/analytics`
- `src/domain/reports`

Domain содержит pure period/query analytics и report compiler; не знает React, Prisma и provider transport.

### Infrastructure

- `src/infrastructure/database`
- `src/infrastructure/auth`
- `src/infrastructure/logging`
- `collector/sources/*`

Infrastructure знает Prisma, Better Auth, PostgreSQL, structured journald output и provider transport.

### Worker

- `src/worker`

Worker выполняет sync runs, source runs, historical persistence и report snapshot compilation.

## Core invariants

- UI → Service → Repository Contract → Prisma Repository → PostgreSQL;
- `SiteReportSnapshot` остаётся browser contract;
- Better Auth — application auth layer;
- `CLIENT_VIEWER` isolation проверяется server-side, не navigation filter;
- filesystem не используется как runtime source of truth;
- old file-based sync path удалён.

## Data ownership

- PostgreSQL хранит organizations, projects, sites, provider connections, tracked queries, sync runs, historical metrics, ranking captures, technical snapshots и report snapshots.
- `config/*` остаётся seed/input material, не production runtime registry.
- `src/domain/reports/report-compiler.ts` — shared pure compiler; provider adapters инжектируются worker composition root через application port.

## Runtime surfaces

- public product route `/`;
- public legal routes `/politika/`, `/soglasie/`, `/cookies/`, `/terms/`;
- authenticated web app routes under `/dashboard/`, `/analyst/` and `/c/*`;
- login modal is owned by the public `/` route;
- auth route `/api/auth/[...all]`;
- public contact form calls allowlisted AMS Leads API directly and does not write lead PII to PostgreSQL AMS IMPULSE;
- health routes `/api/health/live`, `/api/health/ready`;
- worker entry `src/worker/main.ts`.

## Production assets

- `ops/nginx/ams-seo-monitor.conf`
- `ops/systemd/seo-monitor-web.service`
- `ops/systemd/seo-monitor-worker.service`
- `ops/systemd/seo-monitor-worker.timer`
- `ops/systemd/seo-monitor-db-backup.service`
- `ops/systemd/seo-monitor-db-backup.timer`

## Removed legacy path

Удалены из active architecture:

- file snapshot publish pipeline;
- fs locks and LKG filesystem storage;
- `/data/latest.json` browser fetch path;
- static route generation dependency;
- Basic Auth as application authorization;
- old collector service/timer pair.
