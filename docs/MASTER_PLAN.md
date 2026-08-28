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

### W4 Webmaster — complete for three REDACTED_CLIENT_DATA cities

- OAuth preflight and exact verified hosts;
- summary, diagnostics and sitemaps;
- popular query pools by shows/clicks and devices;
- indexing HTTP history;
- pages-in-search history;
- search appearance/removal events;
- broken internal links history;
- external links history;
- endpoint-level partial collection;
- safe errors/retry;
- live proof: REDACTED_CLIENT_DATA, REDACTED_CLIENT_DATA, REDACTED_CLIENT_DATA.

### W5 Metrica — complete for three REDACTED_CLIENT_DATA cities

- separate Metrica OAuth app/token;
- exact counters and goals discovery;
- per-site conversion allowlists;
- all traffic and aligned Yandex organic periods;
- bytime, landing pages and devices;
- allowlisted per-goal stats;
- sampling/privacy metadata;
- safe 401/403/404/420/5xx behavior;
- live proof: REDACTED_CLIENT_DATA, REDACTED_CLIENT_DATA, REDACTED_CLIENT_DATA.

## Current verified product state

Works end-to-end locally:

- one command synchronizes all three enabled REDACTED_CLIENT_DATA sites;
- four fixed period presets align to the latest factual Webmaster date;
- every preset includes the immediately preceding equal-length comparison;
- Webmaster totals come from all-query history, not popular-query sums;
- Metrica counts unique target visits through the allowlisted goal union;
- normalized current/previous DTOs compile into period-aware snapshots;
- detailed normalized source bundles remain internal for analyst tooling;
- snapshots and browser-safe client reports publish atomically;
- endpoint/source failure produces `partial` and preserves last-known-good data;
- client routes load protected runtime JSON instead of fixtures;
- client navigation contains only its own subtree;
- static export contract and server-only secrets are preserved.

Live local proof:

```text
REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA   → fresh
REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA  → fresh
REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA  → fresh
```

## W6 analytics status

Implemented:

- fixed presets: week 7, month 28 (default), quarter 90, half-year 180 days;
- immediately preceding equal-period comparison;
- total Webmaster shows/clicks/position history;
- popular query pool merge by `queryId + device`;
- unique target organic visits without double counting;
- conversion and organic-share calculation;
- KPI percent/percentage-point deltas;
- position improvement direction;
- minimum-baseline trend alerts;
- initial deterministic opportunities;
- deterministic query clusters from checked-in brand/topic terms;
- period-aware report compiler/publication;
- compact director dashboard.

Still useful as the next analytics refinement:

- richer opportunity scoring;
- separate analyst UI for the preserved full source bundles.

Aggregate `goalReaches` stays available only as actions; director conversion uses unique target visits.

## Runtime pipeline acceptance

- `pnpm collector:sync:REDACTED_CLIENT_DATA` publishes 12 current reports: 3 sites × 4 presets;
- every report contains current and previous equal periods;
- partial source refresh preserves period-specific LKG;
- internal source bundles remain outside browser paths;
- raw API responses and secrets are not published;
- runtime report path follows `/c/{clientSlug}/data/{siteSlug}/{periodKey}/latest.json`;
- Nginx alias/security activation remains Wave 3.

## Director dashboard V2

Branch: `work/director-dashboard-v2`.

The approved contract is `docs/DIRECTOR_DASHBOARD_V2.md`:

```text
Все проекты
→ Проект
  → Сайт
    → Единый отчёт
```

Implemented:

- one unified report without tabs;
- visible `Неделя / Месяц / 3 месяца / Полгода` selector with month default;
- tracked query ranking dashboard before site health;
- Top-3/Top-10 KPI and share chart with owner-provided fallback;
- tracked-query table and filters;
- Webmaster health, demand KPI and real shows/clicks chart;
- Metrica traffic, target visits and landing pages;
- client route navigation contains only its own project subtree;
- `/demo/` remains separate from client data;
- live client routes fetch protected runtime snapshots and show safe loading/error states;
- mobile width constraints and softened active sidebar states.

Page contract: `docs/SITE_REPORT_IA.md`.

## Projects registry foundation

Implemented without changing static/no-DB architecture:

- product hierarchy `Все проекты → Проект → Сайты → Отчёты`;
- read-only `/analyst/` replaces the removed common overview;
- automatic build-time discovery of `config/clients/*.json`;
- project readiness cards and source/site counts;
- `pnpm project:add` interactive operator wizard;
- dry-run and non-interactive flags;
- no overwrite, no secrets, no commit/push/deploy;
- rollback of generated files when registry validation fails.

Internal `clientSlug`, `CLIENT_VIEWER` and `/c/*` remain compatible until a future standalone/database migration.

## Multi-site behavior

- `/c/{clientSlug}/` shows one compact card per site;
- REDACTED_CLIENT_DATA contains REDACTED_CLIENT_DATA, REDACTED_CLIENT_DATA and REDACTED_CLIENT_DATA as enabled sites;
- each site keeps its own periods and comparison;
- different cities/markets are not summed into fake rank;
- one-site clients still use the same architecture;
- disabled future sites stay available as `Не подключён`.

## Wave 3 — after reviewed UI/data completion

- Nginx Basic Auth and isolation matrix;
- protected data aliases;
- exact main artifact;
- AMS Main Server release;
- `systemd` daily/weekly timers;
- initial onboarding;
- stale/partial operations;
- token rotation/recovery/rollback.

## Current release route

Current branch: `work/director-dashboard-v2`, pushed and clean before release preparation.

Risk: **HEAVY** — analytics/compiler, provider adapter, browser report schema, UI and future production impact.

Required route:

```text
documentation sync
→ full diff review
→ exact-head HEAVY gate
→ SourceCraft PR merge
→ exact main artifact
→ AMS Main Server deploy
→ Nginx/auth/timers/live proof
```
