# ARCHITECTURE

## Runtime model

```text
Public/private browser request
→ Nginx: TLS, static assets, reverse proxy, hardening
→ Next.js App Router standalone server
→ session + authorization
→ application service
→ repository port
→ Prisma repository
→ PostgreSQL

systemd timer or operator command
→ compiled worker oneshot
→ PostgreSQL advisory full-sync lock
→ read-only provider adapters
→ normalized provider DTOs
→ domain analytics and report compiler
→ SyncService
→ Prisma repositories
→ PostgreSQL history + ReportSnapshot
```

Next.js не является static export. PostgreSQL — runtime source of truth. Filesystem используется для immutable releases, build artifacts, backups и test fixtures, но не как product database.

## Слои и ownership

### Presentation — `src/app`, `src/components`, `src/modules`

Владеет routes, metadata, layouts, rendering и browser interaction.

- public: `/`, legal pages, robots, sitemap;
- private: `/dashboard/`, `/analyst/`, `/c/*`, `/demo/`;
- API: Better Auth и health routes;
- получает browser-safe DTO;
- не импортирует Prisma, SQL и provider clients;
- не вычисляет ranking/conversion/provider semantics.

### Application — `src/application`

Владеет use cases и ports:

- `ActorContext`, permissions и tenant scope — application access contract;
- `ProjectService` — tenant-scoped projects/sites;
- `SiteService` — project overview;
- `ReportService` — authorized report reads;
- `MonitoringService` — runtime registry/readiness context;
- `AnalystService` — analyst dashboard;
- `SyncService` — provider collection lifecycle и persistence orchestration.

Application types не зависят от Prisma generated types.

### Domain — `src/domain`

- `analytics/periods.ts` — четыре period presets и previous-period math;
- `analytics/webmaster-queries.ts` — deterministic query analytics;
- `reports/report-compiler.ts` — единственный compiler `SiteReportSnapshot`.

Domain не знает React, Better Auth, Prisma, PostgreSQL и HTTP transport.

### Platform — `src/platform`

- `config` — server/public environment schemas;
- `http` — correlation ID, error envelope и release-aware health DTO;
- не импортирует project business layers;
- используется adapters/routes как технический contract.

### Infrastructure — `src/infrastructure`

- `database/prisma` — singleton Prisma/pg context;
- `database/repositories` — реализации application ports;
- `auth` — Better Auth, session и server-side authorization;
- `logging` — safe structured sync events;
- `service-container.ts` — web composition root;
- `worker-service-container.ts` — worker composition root.

### Provider adapters — `collector/sources`

Read-only clients and normalizers:

- Yandex Webmaster;
- Yandex Metrica;
- optional Topvisor history.

Secrets доступны только worker environment. Raw responses и sensitive error bodies не становятся browser payload.

### Worker — `src/worker`

Compiled entry: `dist-collector/src/worker/main.js`.

Worker:

- запускается oneshot;
- блокирует overlapping full sync PostgreSQL advisory lock;
- создаёт `SyncRun`/`SourceRun`;
- собирает enabled sites;
- сохраняет history/technical/ranking records;
- компилирует и сохраняет четыре `ReportSnapshot` на сайт;
- завершает runs фактическими timestamps и safe statuses;
- не обслуживает HTTP.

## Направление зависимостей

```text
Presentation
→ Application services
→ Application ports + Domain
← Infrastructure implementations

Worker composition root
→ Application SyncService
→ Domain + provider ports
← Prisma repositories + provider adapters
```

Запрещены:

- Prisma/SQL в React и `src/app`;
- provider calls из browser;
- второй report compiler;
- business calculations в JSX;
- authorization только через navigation hiding;
- filesystem runtime registry/snapshots как параллельный source of truth.

## Data ownership

PostgreSQL хранит:

- users, sessions, organizations и memberships;
- projects, sites и provider mappings;
- thresholds, clusters, goals и tracked queries;
- sync/source runs;
- Webmaster/Metrica history;
- ranking captures и technical snapshots;
- materialized `ReportSnapshot` payloads.

`config/*` хранит reviewed nonsecret seed/input. `prisma/schema.prisma` и immutable migrations владеют DB shape. `src/shared/schemas` владеет runtime validation DTO.

## Authorization flow

```text
request headers
→ Better Auth session
→ fresh non-disabled User + memberships
→ PLATFORM_ADMIN / SEO_ANALYST / CLIENT_VIEWER capability map
→ validated active organization
→ repository tenant scope
→ report-specific capability
→ explicit DTO + correlation ID
```

Private routes/services проверяют capabilities до data read. Membership revocation действует на следующий request. Nginx и navigation не заменяют этот boundary.

## Public lead flow

```text
LeadRequestDialog
→ allowlisted AMS Leads API
→ anti-spam/origin/rate checks во внешнем сервисе
→ configured delivery channel
```

AMS IMPULSE не пишет имя и телефон заявки в свою PostgreSQL. Публичный site key не даёт доступ к данным; delivery credentials остаются только во внешнем service environment.

## Executable guardrails

- `dependency-cruiser.config.cjs` блокирует циклы, inner-to-outer imports, production-to-tests и прямой database import из presentation;
- `vitest.config.mts` запускает unit suites без скрытых DB skips;
- `vitest.integration.config.mts` изолирует real-PostgreSQL suites;
- `scripts/run-integration-tests.mjs` fail-closed проверяет `*_test`, применяет migrations/seed и только затем запускает integration;
- `docker-compose.dev.yml` поднимает loopback-only PostgreSQL `18.6` с отдельными dev/test databases;
- `playwright.config.ts` проверяет public UI и auth redirect на 375/768/1280/1440;
- `.sourcecraft/ci.yaml` exact-head gate выполняет `verify:fast`, collector/build proof; real PostgreSQL integration и Playwright остаются обязательным operator HEAVY evidence до появления стабильного prebuilt CI image.

Текущая global-layer структура мигрируется в vertical modules по `docs/MASTER_PLAN.md`; пустые параллельные modules не создаются.

## Production runtime

- `ops/nginx/ams-seo-monitor.conf` — TLS, public assets, reverse proxy, internal readiness;
- `ops/systemd/seo-monitor-web.service` — standalone Next;
- `ops/systemd/seo-monitor-worker.{service,timer}` — provider sync;
- `ops/systemd/seo-monitor-db-backup.{service,timer}` — PostgreSQL backup;
- `scripts/build-release.mjs` — immutable source artifact;
- `scripts/deploy-production.mjs` — target build, migration, seed, backup/restore smoke, cutover/rollback;
- deploy атомарно пишет root-owned `shared/release.env` с exact `RELEASE_SHA`;
- web systemd читает release env, а live/ready DTO возвращают exact SHA;
- rollback синхронно возвращает previous release SHA.

`pnpm build` после Next build копирует `public/` и `.next/static/` внутрь standalone tree; это обеспечивает корректную прямую работу standalone runtime.

## Удалённый legacy

Не являются active architecture:

- `output: "export"`;
- browser fetch `/data/latest.json`;
- filesystem `latest.json`, fs locks и period LKG store;
- Basic Auth как application authorization;
- build-time registry как production runtime store;
- старый collector-only systemd runtime.

Исторические migration-документы находятся в `docs/archive/`.
