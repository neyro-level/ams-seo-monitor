# Module: Research

- Status: `PLANNED`
- User name: **Исследования**
- Product: **Инструменты**
- Namespace: `research`
- Cabinet route: `/tools/research/`
- First template: **Анализ конкурентов**

## Purpose

Research выполняет разовые исследования рынка и поисковой выдачи, сохраняет историю по общему Tools project и выдаёт воспроизводимый отчёт. Первый сценарий собирает Yandex SERP, ads, suggestions and Wordstat through XMLRiver and builds a deterministic competitor map.

Three entrypoints call one application contract:

1. MCP for Codex/ChatGPT.
2. AMS IMPULSE cabinet.
3. Future internal AI agent.

No entrypoint gets direct PostgreSQL, provider secret or another module's internals.

## Ownership

Research does not own organizations/projects.

```text
ToolsOrganization
-> ToolsProject
-> Research
-> ResearchQuery
-> ResearchRun
-> ResearchQueryRun / Evidence / CompetitorProjection / Export
```

Every Research record has valid `toolsOrganizationId` and `toolsProjectId`. Cross-project links are rejected by authorization and composite database constraints.

## MVP

- create/archive/list Research records;
- 1-20 unique queries per run;
- Yandex, one region, desktop or mobile, Top-10;
- optional ads, suggestions and Wordstat;
- local estimate and maximum cost ceiling;
- separate paid confirmation;
- async run with progress and safe errors;
- normalized evidence and deterministic competitor map;
- saved report and CSV export;
- MCP tools and cabinet screens;
- strict Tools project grants.

Later: XLSX, AI insight, additional research templates and internal AI agent.

Non-goals: rank monitoring, Google SERP, site crawling, generic SQL, synchronous long MCP request, Research-owned organizations/projects.

## Boundary

```text
src/modules/research/
  domain/
  application/
  infrastructure/
  presentation/
  index.ts
  server.ts
  worker.ts
  mcp.ts
```

- Domain is framework/provider independent.
- Application depends on domain and ports.
- Infrastructure owns Prisma/XMLRiver/export implementations.
- Web, worker and MCP are adapters over the same commands/queries.
- Other modules use only Research root entrypoints.

## Permissions

```text
research:read
research:create
research:update
research:archive
research:estimate
research:run
research:export
research:manage
```

Default mapping:

| Actor | Effective access |
|---|---|
| Platform Admin | all Research permissions |
| Tools `ANALYST` | read/create/update/estimate/run/export on explicitly granted projects |
| Tools `VIEWER` | read/report/export on explicitly granted projects |
| Client without Tools grant | deny |
| JobPrincipal | one exact run/project |

System role `ANALYST` without Tools membership/project grant is denied.

## Core Records

### Research

Project-owned aggregate: id, name, type, status, author, version and archive marker.

### ResearchQuery

Original text, normalized text and stable order. Unique `(researchId, normalizedText)`.

### ResearchRun

Immutable request/rate snapshots, lifecycle, estimate, confirmation hash/actor/expiry, counters, calculated cost and correlation ID.

### ResearchQueryRun

Per-query operation key, state, attempt, provider metadata, billable units, safe error code and timestamps.

### Evidence

- SerpResult: rank, URL, domain, title, plain-text snippet and result type.
- SerpAd: placement, advertiser/domain, title/text and URL.
- KeywordMetric: type, value, period/source/freshness.
- ResearchSuggestion: related/suggested query.
- CompetitorProjection: deterministic domain aggregate.
- ResearchExport: format/status/checksum/private storage reference.

Raw XML/HTML is not stored by default.

## Lifecycle

```text
DRAFT -> QUEUED -> RUNNING -> SUCCESS | PARTIAL | FAILED | ACTION_REQUIRED
DRAFT | QUEUED -> CANCELLED before paid dispatch
```

- `PARTIAL != SUCCESS`; `null != 0`.
- Successful query results survive another query failure.
- Completed input snapshot is immutable.
- Re-run creates a new ResearchRun.
- Safe retry is finite; ambiguous paid result is not retried.
- One operation key cannot produce a second paid call.

## Budget

Pilot limits:

- 20 queries per run;
- 500 RUB per day;
- 3000 RUB per month;
- worker concurrency 1.

Estimate is local and free. Confirmation binds exact request hash, rate snapshot, maximum approved amount and expiration. Paid dispatch requires current `research:run` permission and idempotency reservation.

## XMLRiver Port

```text
estimate(request)
collectYandexSerp(request)
collectYandexSuggestions(request)
collectWordstat(request)
getProviderHealth()
```

Adapter requirements:

- HTTPS allowlist, timeout, bounded body and finite retry;
- DTD/external entities disabled;
- schema validation before persistence;
- full credential URL, raw body and auth data never logged;
- normalized URL/domain and plain text output;
- errors classified as retryable, permanent or ambiguous-paid;
- external HTTP outside business transaction.

## Async Flow

```text
Research confirm command
-> transaction: run + audit + outbox
-> outbox worker
-> research.run.v1
-> research worker
-> provider calls
-> evidence/projection/status/notification
```

MCP/UI returns `researchId`, `runId`, status and recommended poll interval. It never waits for a full run.

## MCP

Endpoint `/mcp`, Streamable HTTP, OAuth 2.1 + PKCE.

Tools:

- `research_estimate_competitor_run`;
- `research_create_draft`;
- `research_confirm_and_run`;
- `research_get_status`;
- `research_get_report`;
- `research_create_export`;
- `research_get_export`.

Every call resolves current Better Auth user and current Tools grants. Outputs are bounded/paginated. Direct SQL, database credentials and universal admin tokens are prohibited.

## Cabinet

Routes:

- `/tools/`;
- `/tools/research/`;
- `/tools/research/new/`;
- `/tools/research/[id]/`.

Screens include authorized project selector, list, creation wizard, estimate/confirmation step, progress, report sections and export state. Foreign resource uses not-found semantics.

## Storage And Retention

Normalized records stay in PostgreSQL. Export binaries use private S3 and short-lived authorized downloads. Research history is retained until explicit owner deletion policy; archive hides records without destroying evidence.

## Acceptance

- Same command behavior through cabinet and MCP.
- User sees only explicitly granted Tools projects.
- Direct URL/API/MCP cross-project access is denied.
- Paid duplicate and ambiguous retry are blocked.
- Worker restart preserves durable progress.
- CSV is deterministic for the same normalized evidence.
- No provider credentials/raw XML/private signed URLs in logs or browser DTO.
