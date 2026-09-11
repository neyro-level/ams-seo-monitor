# Module: Data Ingestion

## Purpose

Collects provider evidence, safely performs bounded Topvisor operations and persists normalized tenant-owned history in PostgreSQL.

## Not In Scope

Browser provider calls, Yandex mutations, arbitrary Topvisor actions, credential storage, report presentation and generic scheduler logic.

## Ownership

SyncRun, SourceRun, provider operation lifecycle, historical metrics, RankingCapture, CompetitorSnapshot, TechnicalSnapshot and ingestion repository ports.

Reporting owns ReportSnapshot semantics. Project Registry owns site configuration and search targets.

## Providers

- Yandex Webmaster: read-only host, summary, query and technical data.
- Yandex Metrika: read-only counters, goals, traffic, phrases, devices, geography and landing pages.
- Topvisor: bounded project/search-target/query/checker/competitor operations.

Topvisor paid checker requires price-check and durable `ProviderOperation` reservation before dispatch.

## Worker Commands

```bash
pnpm worker:sync:project -- <project-slug>
pnpm worker:sync:all
pnpm worker:topvisor:checks
pnpm worker:sync:competitors
```

Outbox-related commands are owned by Platform Operations but may trigger ingestion handlers.

## Invariants

- Browser has no provider token and no provider HTTP path.
- Provider origins are exact allowlisted HTTPS.
- `enabled=false` forbids provider calls.
- One provider/period failure does not contaminate other periods.
- Concurrent full sync is blocked by PostgreSQL advisory lock.
- Unexpected failure closes open SourceRuns and SyncRun best-effort.
- Raw HTTP body, token, header and sensitive provider settings are not persisted/logged.

## Async

Topics:

- `project.sync.requested`;
- `site.integrations.setup.requested`;
- `site.competitors.sync.requested`.

Handlers run outside enqueue transaction using JobPrincipal and validate organization scope again.

## Tests

Provider error mapping, goal semantics, period isolation, real PostgreSQL persistence, lock overlap/release, Topvisor price-check/idempotency, failure finalization and compiled worker smoke.
