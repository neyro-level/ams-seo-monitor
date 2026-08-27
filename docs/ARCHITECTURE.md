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

- static routes из checked-in registry;
- frozen dashboard shell;
- versioned snapshot schema и atomic storage primitives;
- read-only Webmaster client: access, summary, diagnostics, sitemaps, popular queries;
- read-only Metrica client: counter/goals discovery, all traffic, Yandex organic, bytime, landing pages, devices, allowlisted goals;
- live proof на `REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA`.

## Critical current gap

Source adapters сейчас выводят свои DTO в stdout. Между ними и UI отсутствует обязательный runtime слой:

```text
source DTO
→ report compiler
→ SiteReportSnapshot
→ atomic publish
→ protected browser data
```

Поэтому client route пока читает synthetic fixture. До закрытия этого gap интерфейс нельзя считать подключённым к live данным.

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

## Required next block

1. Закрыть остаток W4: indexing/search events/links и требуемые source fields.
2. W6: привести source periods, вычислить deltas/opportunities/alerts.
3. Посчитать unique converted organic visits по union allowlisted goals; сумму reaches не выдавать за уникальную конверсию.
4. Скомпилировать единый `SiteReportSnapshot`.
5. Опубликовать snapshot через существующий atomic storage layer.
6. После этого подключить UI `Сводка / SEO / Трафик`.

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
collector/orchestration/                   config and future sync/compiler
collector/storage/                         atomic publish/locks/LKG
```

## Security boundary

- Browser never receives OAuth/client secrets.
- Collector uses GET-only Yandex endpoints.
- Nginx must protect HTML and matching data aliases.
- Client isolation is a path/server invariant, not a frontend filter.
