# ARCHITECTURE

## High-level target

```text
systemd timer
→ compiled Node collector
→ Webmaster/Metrica source adapters
→ normalized source DTO
→ equal-period analytics + report compiler
→ validated SiteReportSnapshot
→ atomic publish into shared/
→ protected Nginx data aliases
→ static Next.js dashboard
```

## Runtime model

Next.js использует `output: "export"` и не работает как постоянный web server. Nginx отдаёт immutable static release и отдельно защищённые report JSON. Collector запускается по `systemd` timer, читает Yandex APIs, публикует snapshots и завершается.

Предварительный production URL:

```text
https://seo-monitor.ams24.ru
```

Production activation остаётся отдельной Wave 3/release задачей.

## Implemented now

- static routes from checked-in registry;
- build-time project registry discovers every `config/clients/*.json` and matching goal profile;
- `pnpm project:add` creates new nonsecret project/site config without a backend or DB;
- three enabled REDACTED_CLIENT_DATA cities: REDACTED_CLIENT_DATA, REDACTED_CLIENT_DATA, REDACTED_CLIENT_DATA;
- frozen full-width dashboard shell;
- complete read-only Webmaster/Metrica source adapters;
- total Webmaster history and popular-query detail pools;
- unique target organic visits across allowlisted goals;
- 7/28/90/180-day current and previous aligned periods;
- period-aware normalized source bundles and report compiler;
- atomic internal snapshot and browser report publication;
- endpoint/source partial handling and period-specific LKG;
- protected runtime report loader with Zod validation;
- live local proof for all sites and presets.

Runtime chain:

```text
source DTO
→ report compiler
→ SiteReportSnapshot
→ atomic snapshots/source-bundles/client-reports publish
→ /c/{client}/data/{site}/{period}/latest.json
→ browser validation
→ unified director report
```

## Data dependency direction

```text
registry/threshold/goal config
→ source adapters
→ normalized source DTO
→ equal-period selectors and deterministic calculations
→ SiteReportSnapshot
→ report view model
→ dashboard components
```

Второй параллельный report format запрещён.

## Remaining runtime work

1. Activate production Nginx aliases and Basic Auth isolation.
2. Materialize server env and install daily/weekly systemd units.
3. Add sync-run/stale operational monitoring.
4. Build analyst-only views from preserved internal source bundles.
5. Optionally enable live Topvisor mapping after credentials/owner decision.
6. Deploy reviewed exact `main` artifact to `https://seo-monitor.ams24.ru`.

## Frontend IA

- `/analyst/` — read-only `Все проекты` and readiness;
- `/c/{clientSlug}/` — project overview and site selection without fake aggregate ranking;
- `/c/{clientSlug}/{siteSlug}/` — one unified director report.

Contracts: `docs/SITE_REPORT_IA.md`, `docs/DIRECTOR_DASHBOARD_V2.md`.

## Code zones

```text
src/app/                                  static routes
src/modules/access/                       navigation metadata
src/modules/client-registry/              registry and static params
src/modules/report-data/                  browser report loading
src/modules/dashboards/                   report view models
src/components/                           frozen UI primitives
src/shared/schemas/                       registry/source/snapshot schemas

collector/sources/yandex-webmaster/        Webmaster adapter
collector/sources/yandex-metrica/          Metrica adapter
collector/sources/topvisor/                optional ranking source
collector/analytics/                       periods/query analytics
collector/orchestration/                   config, sync and report compiler
collector/storage/                         atomic publish/locks/LKG
scripts/project-add.mjs                    interactive operator wizard
scripts/project-config.mjs                 safe config builder/write boundary
```

Module contracts:

- `docs/modules/MODULE_PROJECT_REGISTRY.md`;
- `docs/modules/MODULE_DATA_PIPELINE.md`;
- `docs/modules/MODULE_RANKING_ANALYTICS.md`;
- `docs/DIRECTOR_DASHBOARD_V2.md`.

## Security boundary

- Browser never receives OAuth/client secrets.
- Collector uses GET-only Yandex endpoints.
- Nginx must protect HTML and matching data aliases.
- Client isolation is a path/server invariant, not a frontend filter.
