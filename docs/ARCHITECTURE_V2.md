# ARCHITECTURE V2

## Статус

Target architecture для полной перестройки технического ядра AMS SEO Monitor.

Этот документ заменяет старые ограничения static export, filesystem storage и Nginx Basic Auth как целевой direction. До полного cutover действующая production-схема ещё остаётся в `docs/ARCHITECTURE.md` и `docs/ops/*`.

## Цель

Сохранить UI, product hierarchy и SEO semantics.

Перестроить runtime в application-first архитектуру:

```text
Browser
  ↓
Nginx
  ↓
Next.js App Router
  ↓
Application Services
  ↓
Repository Contracts
  ↓
Prisma Repositories
  ↓
Prisma
  ↓
PostgreSQL
```

Фоновый ingestion и report compilation:

```text
systemd timer
  ↓
Worker
  ↓
Provider Adapters
  ↓
Normalization
  ↓
Application Services
  ↓
Repository Contracts
  ↓
Prisma Repositories
  ↓
PostgreSQL
```

## Что сохраняется

### Browser contract

`SiteReportSnapshot` остаётся единственным browser-safe DTO.

UI не должен:

- вызывать provider APIs;
- читать Prisma напрямую;
- рассчитывать ranking, conversion или period semantics;
- восстанавливать partial/stale/null через собственные эвристики.

### Product contracts

Сохраняются:

- `SEO_ANALYST` и `CLIENT_VIEWER`;
- hierarchy `Все проекты → Проект → Сайты → Единый отчёт`;
- маршруты `/analyst/`, `/c/{clientSlug}/`, `/c/{clientSlug}/{siteSlug}/`;
- четыре периода `week`, `month`, `quarter`, `halfYear`;
- `month` как default;
- ranking/Webmaster/Metrica separation;
- visible source, baseline, freshness и period labels.

### SEO semantics

Сохраняются инварианты:

- `partial` не становится `success`;
- `stale` не становится `current`;
- `null` не становится `0`;
- Webmaster total использует all-query history;
- Webmaster average position не является exact rank;
- Top-3 ⊂ Top-10;
- меньшая позиция лучше;
- denominator ranking share = полное утверждённое ядро;
- direct query → lead attribution запрещена;
- current/previous periods должны быть равной длины и сопоставимы.

## Что удаляется как target legacy

После cutover не сохраняются как primary architecture:

- `output: "export"`;
- filesystem snapshots как source of truth;
- filesystem report loader и `/data/latest.json` browser dependency;
- static build-time registry как production runtime store;
- fs lockfiles;
- Nginx Basic Auth как app authorization boundary;
- Nginx JSON aliases на `shared/client-reports`.

## Слои

### Presentation

Расположение:

- `src/app`;
- `src/components`;
- client-side interaction blocks.

Ответственность:

- routes;
- Server Components;
- Client Components только там, где нужна интерактивность;
- forms;
- navigation;
- rendering DTO.

Запреты:

- Prisma imports в `page.tsx` и UI components;
- raw SQL в React;
- provider API calls из browser;
- business calculations в JSX.

### Application

Расположение:

- `src/application/services`;
- `src/application/ports`.

Ответственность:

- use cases;
- orchestration нескольких repositories;
- authorization-aware reads;
- compilation boundary между normalized persistence и browser DTO.

Планируемые сервисы:

- `ProjectService`;
- `SiteService`;
- `ReportService`;
- `MonitoringService`;
- `AnalystService`;
- `SyncService`.

### Domain

Расположение:

- `src/domain/analytics`;
- `src/domain/reports`;
- `src/domain/types`.

Ответственность:

- period math;
- ranking calculations;
- conversion semantics;
- source-state logic;
- report compiler rules.

Хорошая текущая логика для reuse уже живёт в:

- `collector/analytics/periods.ts`;
- `collector/analytics/webmaster-queries.ts`;
- `collector/orchestration/report-compiler.ts`.

Эту логику нужно вынести из file-era orchestration и сделать общей для worker и web runtime.

### Infrastructure

Расположение:

- `src/infrastructure/database/prisma`;
- `src/infrastructure/database/repositories`;
- `src/infrastructure/providers/*`;
- `src/infrastructure/auth`.

Ответственность:

- Prisma client;
- Prisma repository implementations;
- Better Auth adapter;
- provider HTTP clients;
- Postgres-specific persistence;
- advisory locks и system integrations.

### Worker

Расположение:

- `src/worker` или `src/worker/*`.

Ответственность:

- scheduled sync;
- run lifecycle;
- provider collection;
- normalized persistence;
- snapshot compilation;
- closing run states;
- exit.

Worker не должен обслуживать browser requests.

## Data flow after cutover

### Reads

```text
Server Page / Route Handler
  ↓
Application Service
  ↓
Repository Contract
  ↓
Prisma Repository
  ↓
PostgreSQL
  ↓
SiteReportSnapshot DTO
  ↓
UI
```

### Sync

```text
systemd timer
  ↓
Worker job
  ↓
Create SyncRun
  ↓
Resolve enabled sites + provider connections
  ↓
Collect provider data
  ↓
Normalize DTOs
  ↓
Persist historical data + technical snapshots + ranking captures
  ↓
Compile SiteReportSnapshot
  ↓
Validate SiteReportSnapshot with Zod
  ↓
Persist ReportSnapshot
  ↓
Close SourceRuns and SyncRun
```

## Repository policy

Repository contracts выражаются языком приложения, не Prisma.

Минимум:

- `ProjectRepository`;
- `SiteRepository`;
- `MonitoringRepository`;
- `ReportRepository`;
- `SyncRepository`.

Контракт не должен содержать:

- `PrismaClient`;
- `Prisma.*` generated types;
- SQL payloads;
- database-specific DTO names.

## Auth boundary

Authorization переносится в application/server layer.

Нельзя опираться на:

- скрытие navigation;
- `clientSlug` в URL;
- Nginx path filtering;
- знание чужого report ID.

Каждое server-side чтение проверяет actor scope.

## Current audited hotspots

Файлы первой очереди migration:

- `next.config.ts` — static export;
- `src/modules/client-registry/registry.ts` — file-based runtime registry;
- `src/modules/access/navigation.ts` — navigation, завязанная на static registry;
- `src/modules/report-data/LiveSiteReport.tsx` — client fetch of `/data/latest.json`;
- `collector/orchestration/client-sync.ts` — file-era orchestration and period fallback coupling;
- `collector/orchestration/report-compiler.ts` — must become shared pure/domain compiler;
- `collector/storage/*` — fs publish, locks, LKG;
- `scripts/dev-live.mjs` и `scripts/serve-local-reports.mjs` — local file-backed report delivery;
- `ops/nginx/ams-seo-monitor.conf` — static root + Basic Auth + JSON alias.

## Hidden couplings from Wave 0 audit

- `client-sync.ts` умеет брать `periodEnd` из последнего month snapshot, если baseline Webmaster date недоступна. Это coupling file-era recovery и future DB model должен убрать.
- `goalDefinition.includeInSeoConversion` есть в schema/config, но текущая collector-логика его не использует. В V2 нужно либо начать использовать, либо удалить как dead flag отдельным решением.
- Current LKG переносит только `webmaster` и `metrica`, но не `ranking` и не `combined`. Это нужно явно сохранить или осознанно поменять, не случайно.

## Suggested folder target

```text
src/
├── app/
├── components/
├── modules/
│   ├── organizations/
│   ├── projects/
│   ├── sites/
│   ├── monitoring/
│   ├── reports/
│   └── auth/
├── application/
│   ├── services/
│   └── ports/
├── domain/
│   ├── analytics/
│   ├── reports/
│   └── types/
├── infrastructure/
│   ├── auth/
│   ├── database/
│   │   ├── prisma/
│   │   └── repositories/
│   └── providers/
├── shared/
│   ├── schemas/
│   └── utils/
└── worker/
```

Это target structure. Во время migration допустимы временные coexistence-зоны, но не две постоянные архитектуры.

## Done for architecture cutover

Архитектура считается реально перестроенной, когда:

- Next работает как server application;
- PostgreSQL становится source of truth;
- UI не импортирует Prisma;
- бизнес-логика не зависит от Prisma generated types;
- worker использует те же domain rules, что и web runtime;
- filesystem остаётся только для backups, artifacts и test fixtures;
- Better Auth и tenant authorization заменяют Basic Auth;
- `SiteReportSnapshot` и SEO semantics сохраняются без деградации.