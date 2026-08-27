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
- Webmaster and Metrica periods align to the factual Webmaster week;
- normalized source DTOs compile into one `SiteReportSnapshot`;
- snapshots and browser-safe client reports publish atomically;
- endpoint/source failure produces `partial` and preserves last-known-good data;
- client route loads protected runtime JSON instead of a fixture;
- registry and navigation use `REDACTED_CLIENT_DATA`, not the incorrect legacy name;
- client navigation contains only its own subtree;
- static export contract and server-only secrets are preserved.

Live local proof:

```text
REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA   → fresh
REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA  → fresh
REDACTED_CLIENT_DATA/REDACTED_CLIENT_DATA  → fresh
```

## Remaining W6 analytics

Implemented:

- equal-period derivation/assertion;
- Webmaster show/click pool merge by `queryId + device`;
- initial deterministic opportunities;
- unified report compiler;
- aligned current source period;
- atomic site/client report publication.

Still required before executive deltas are final:

- collect previous Webmaster/Metrica periods;
- weighted current/previous deltas;
- minimum-baseline trend alerts;
- unique converted organic visits across allowlisted goals;
- cluster and brand/nonbrand rules;
- richer director priority selection.

Current aggregate `goalReaches` remains cumulative and is not presented as unique conversion.

## Runtime pipeline acceptance

- `pnpm collector:sync:REDACTED_CLIENT_DATA` publishes three valid reports;
- source periods match for each site;
- partial source refresh preserves LKG;
- raw API responses and secrets are not published;
- runtime report path follows `/c/{clientSlug}/data/{siteSlug}/latest.json`;
- Nginx alias/security activation remains Wave 3.

## Director cabinet UI foundation

Implemented against the approved REDACTED_CLIENT_DATA references:

- full remaining-width workspace; no artificial `max-width` frame;
- canonical PT Root UI and CRM tokens;
- fixed 260px sidebar and white mobile topbar;
- project panel/KPI/table radius restored to 16px;
- one route with bookmarkable `Сводка / SEO / Трафик` tabs;
- default `Сводка` with 8 KPI + one priority section;
- client route navigation contains only its own client subtree;
- detail tables moved to SEO/Traffic tabs;
- `/demo/` remains separate from client data;
- live client routes fetch protected runtime snapshots and show safe loading/error states.

Page contract: `docs/SITE_REPORT_IA.md`.

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
