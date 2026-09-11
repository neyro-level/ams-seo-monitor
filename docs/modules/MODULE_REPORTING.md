# Module: Reporting

## Purpose

Compiles and serves browser-safe director reports for one authorized site and one period.

## Not In Scope

Provider HTTP, provider credentials, report mutations from browser, second compiler and raw provider UI.

## Ownership

- `ReportSnapshot` persistence contract.
- `SiteReportSnapshot` schema compatibility.
- Period semantics.
- Director analytics projections.
- Single compiler: `src/modules/reporting/domain/report-compiler.ts`.

## Principals

Platform Analyst can read reports globally. Tenant User can read only reports inside fresh Membership organization. Route slugs do not prove access.

## Route Contract

```text
/c/{clientSlug}/{siteSlug}/?period=week|month|quarter|halfYear
```

Invalid or missing period resolves to `month`.

## Report Order

1. Site context, URL, period, timezone, freshness and source state.
2. Ranking: Top-3/Top-10, coverage, movement and tracked queries.
3. Technical/Webmaster health.
4. Search demand.
5. Metrika organic/goal/conversion data.
6. Landing pages, devices, goals, phrases and geography.
7. Competitors, alerts, risks, opportunities and methodology.

## Invariants

- `SiteReportSnapshot` is the only browser-safe report DTO.
- Current and previous periods have equal length.
- `partial`, `stale`, `unavailable` and `null` stay explicit.
- Webmaster average show position is not exact rank.
- Top-3 is a subset of Top-10.
- Direct query-to-lead attribution is prohibited.
- Sites and periods are never mixed.

## Tests

Compiler semantics, period math, latest snapshot selection, authorization, schema serialization, null/partial/stale rendering and responsive route proof.
