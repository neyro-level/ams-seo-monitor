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
- three enabled REDACTED_CLIENT_DATA cities: REDACTED_CLIENT_DATA, REDACTED_CLIENT_DATA, REDACTED_CLIENT_DATA;
- frozen full-width dashboard shell;
- complete read-only Webmaster/Metrica source adapters;
- source-period alignment;
- normalized source DTOs;
- unified `SiteReportSnapshot` compiler;
- atomic versioned snapshot and client-report publication;
- endpoint/source partial handling and last-known-good preservation;
- protected runtime report loader with Zod validation;
- live local proof for all three REDACTED_CLIENT_DATA sites.

Runtime chain:

```text
source DTO
→ report compiler
→ SiteReportSnapshot
→ atomic snapshots/client-reports publish
→ /c/{client}/data/{site}/latest.json
→ browser validation
→ Summary / SEO / Traffic
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

1. Collect previous aligned source periods and calculate deltas.
2. Calculate unique converted organic visits across allowlisted goals.
3. Complete thresholded trend alerts and query clustering.
4. Add scheduled `systemd` daily/weekly commands and sync-run state.
5. Activate protected Nginx aliases and client isolation on production.
6. Deploy reviewed exact `main` artifact to `https://seo-monitor.ams24.ru`.

## Frontend IA

- `/analyst/` — owner operational overview;
- `/c/{clientSlug}/` — выбор и сравнение сайтов клиента без fake aggregate ranking;
- `/c/{clientSlug}/{siteSlug}/` — один site report с локальными вкладками `Сводка / SEO / Трафик`.

Подробный contract: `docs/SITE_REPORT_IA.md`.

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
collector/orchestration/                   config, sync and report compiler
collector/storage/                         atomic publish/locks/LKG
```

## Security boundary

- Browser never receives OAuth/client secrets.
- Collector uses GET-only Yandex endpoints.
- Nginx must protect HTML and matching data aliases.
- Client isolation is a path/server invariant, not a frontend filter.
