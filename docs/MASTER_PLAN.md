# MASTER PLAN

## Product route

AMS SEO Monitor идёт в 3 macro waves:

1. Foundation
2. Data, analytics and dashboards
3. Access, release and operations

## Production target

```text
https://seo-monitor.ams24.ru
```

Domain уже создан владельцем. DNS/Nginx/SSL/deploy не выполняются до отдельной production-команды.

## Current verified state

### Wave 1 — complete

- separate SourceCraft repository;
- core docs;
- Next static export;
- frozen shell;
- client/site registry and routes;
- snapshot schema/storage/locks/LKG;
- responsive browser proof.

### W4 Webmaster — partial, live proof exists

Implemented:

- OAuth preflight;
- exact verified host;
- summary;
- diagnostics;
- sitemaps;
- popular query pools by shows/clicks and devices;
- safe errors/retry;
- live REDACTED_CLIENT_DATA REDACTED_CLIENT_DATA proof.

Still required by original W4:

- indexing history;
- pages-in-search history;
- search appearance/removal events;
- broken internal links;
- external links;
- additional source fields needed by final report;
- partial endpoint orchestration instead of all-or-nothing audit.

### W5 Metrica — adapter complete, live proof exists

- separate Metrica OAuth app/token;
- exact counter and goals discovery;
- all traffic;
- Yandex organic;
- bytime;
- landing pages;
- devices;
- allowlisted per-goal stats;
- sampling/privacy metadata;
- safe 401/403/404/420/5xx behavior;
- live REDACTED_CLIENT_DATA REDACTED_CLIENT_DATA proof.

## Product audit verdict

### Works

- adapters return real normalized data;
- registry supports several clients and sites;
- planned sites remain honest `Не подключён`;
- frozen shell and responsive primitives exist;
- source secrets stay server-side;
- static export contract is preserved.

### Does not work end-to-end yet

- collectors do not publish a unified live `SiteReportSnapshot`;
- UI reads `demo-data.ts`, not collector output;
- no scheduled site sync orchestration;
- no equal-period current/previous calculations;
- no deterministic live opportunities/alerts;
- period buttons are presentation-only;
- the current report is too long for a director and exposes details before summary;
- current UI text still says fixture/foundation.

The product is a verified data-adapter prototype plus static UI foundation, not yet a live client cabinet.

## Next mandatory block — Data pipeline closure

Execution order:

### A. W4 completion

- finish remaining read-only Webmaster endpoints;
- represent endpoint-level partial failures;
- preserve factual source periods.

### B. W6 analytics/report compiler

- equal current/previous periods;
- weighted metrics and correct delta direction;
- query pool merge/deduplication;
- deterministic opportunity rules;
- alerts with minimum baselines;
- unique converted organic visits across allowlisted goals;
- no query → lead attribution;
- compile one versioned `SiteReportSnapshot`.

### C. Snapshot publish

- atomic publish through existing storage;
- last-known-good per source;
- client/site report DTO generation;
- no raw API responses;
- safe sync run state.

Acceptance:

- one local command collects both sources and publishes a valid snapshot;
- source failure yields partial report and preserves LKG;
- fixture is no longer used by the REDACTED_CLIENT_DATA client route;
- every derived value identifies source, formula and period.

## Following block — Director cabinet UI

Only after data pipeline closure:

- one site route;
- local tabs `Сводка / SEO / Трафик`;
- default `Сводка`;
- 8 KPI + one priority panel;
- top 3 alerts/opportunities;
- details moved to SEO/Traffic tabs;
- no redesign outside `docs/DESIGN_SYSTEM.md`;
- viewport proof 375/768/1280/1440.

Page contract: `docs/SITE_REPORT_IA.md`.

## Multi-site behavior

- `/c/{clientSlug}/` shows one compact card per site;
- each site keeps its own periods and comparison;
- different cities/markets are not summed into fake rank;
- one-site clients still use the same architecture;
- disabled sites stay available as `Не подключён`.

## Wave 3 — after reviewed UI/data completion

- Nginx Basic Auth and isolation matrix;
- protected data aliases;
- exact main artifact;
- AMS Main Server release;
- `systemd` daily/weekly timers;
- initial onboarding;
- stale/partial operations;
- token rotation/recovery/rollback.

## Quality risk

Current next block is **HEAVY**: critical integrations, background collection, snapshot publication and future production impact.

Required checks:

```text
pnpm verify:config
pnpm verify:snapshots
pnpm typecheck
pnpm lint
pnpm test
pnpm build
live read-only preflight/audit
behavioral partial/LKG tests
```
