# ARCHITECTURE

Platform contract: `AMS Application Platform Core 3.4 - Solo Minimal`.

Profile: `TENANCY = multi-tenant`, `ASYNC = outbox-plus-queue`, `DATA = pii`, `DELIVERY = own-saas`, `PLATFORM_ADMIN = enabled`, `DATABASE = managed-postgresql-target`.

## Status Convention

- `CURRENT` - работает в canonical `main`.
- `TARGET` - утверждено и реализуется stacked Pull Requests.

Текущий SEO runtime сохраняется до прохождения migration gates. Target architecture не считается production truth до merge/release.

## System Context

```text
Browser / Codex / ChatGPT
-> Nginx / Next.js web
-> Better Auth identity
-> PrincipalContext
-> AuthorizationService
-> product application command/query
-> scoped repository transaction
-> PostgreSQL 18

Outbox -> pg-boss -> bounded product worker -> provider/storage -> PostgreSQL
```

Web, MCP и worker собираются из одного repository и immutable OCI image. Research worker является отдельным process/service, но не отдельным микросервисом.

## Product Boundaries

### Platform

Владеет identity adapters, product catalog, authorization contract, commands/actions, database scope, audit, idempotency, outbox, queue transport, HTTP/MCP transport and observability.

### SEO Monitor

Владеет SEO organizations/projects/sites, provider configuration/evidence, ranking analytics and reports. Текущие `project-registry`, `data-ingestion`, `ranking-analytics` and `reporting` остаются совместимыми facades во время миграции.

### AMS Leads

Владеет Leads organizations/projects/funnels/leads. На первом цикле регистрируется как недоступный product; business implementation выполняется позже.

### Tools

Владеет Tools organizations/projects and project grants. Подмодули используют `ToolsProject` через публичный facade:

- `research`;
- `contracts`;
- `invoices`;
- `presentations`;
- `site-clone`.

Research не создаёт собственные organizations/projects.

## Layer Rules

Модуль может содержать `domain / application / infrastructure / presentation`.

- Domain не импортирует Next.js, React, Prisma, HTTP, MCP или provider SDK.
- Application зависит от domain и typed ports.
- Infrastructure реализует repositories/providers/storage.
- Presentation вызывает только module facade.
- Cross-module consumers используют root entrypoints `index.ts`, `server.ts`, `worker.ts`, `mcp.ts`.
- Deep imports другого module запрещает architecture guard.

## Product Catalog

Neutral registry предоставляет browser-safe metadata:

```text
seo-monitor -> SEO Монитор -> active
leads       -> АМС Лиды    -> planned
tools       -> Инструменты  -> active when user has grant
```

Tools registry:

```text
research      -> Исследования
contracts     -> Договоры
invoices      -> Счета
presentations -> Презентации
site-clone    -> Клон сайтов
```

Feature availability and access are separate: active module still requires permission.

## Identity And Authorization

`PrincipalContext` carries identity, system role and correlation ID. It does not select an arbitrary first organization.

```text
authorize(principal, permission, resourceRef)
-> system-role check
-> product membership
-> explicit project grant
-> module-owned resource relation
-> ALLOW | DENY
```

The only implicit global access is `PLATFORM_ADMIN`. `ANALYST` and `CLIENT` require explicit grants. Navigation is built from `listAccessibleProducts`, but every backend entrypoint authorizes independently.

Product-specific membership/project-access tables preserve real foreign keys. Generic polymorphic `resourceType/resourceId` grants are prohibited.

## Data Schemas

Target PostgreSQL schemas:

- `platform` - Better Auth identity, catalog metadata, audit/idempotency;
- `seo` - SEO organizations/projects/sites/evidence/reports;
- `leads` - Leads organizations/projects/funnels/leads;
- `tools` - shared Tools organizations/projects/grants;
- `research`, `contracts`, `invoices`, `presentations`, `site_clone` - tool-owned records;
- `ops`, `pgboss` - delivery, jobs and transport.

Prisma multi-schema and immutable SQL migrations are canonical. Product schemas do not imply separate database servers.

## RLS Defense

Tenant-owned tables use PostgreSQL Row-Level Security after compatibility proof:

- `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`;
- runtime roles are `NOBYPASSRLS` and do not own protected tables;
- web reads/writes use transaction-local principal/product/project context;
- missing or malformed context means deny;
- worker context names exact product/organization/project;
- migrator owns DDL; backup procedure explicitly verifies complete dump/restore.

RLS is defense in depth. Application authorization and composite ownership constraints remain mandatory.

## Research Runtime

```text
UI / MCP
-> Research command
-> transaction: Research + Run + Audit + Outbox
-> outbox worker
-> research.run.v1
-> research worker (concurrency 1)
-> XMLRiver / export storage
-> normalized evidence + notification
```

Paid call runs only after estimate, exact request hash, approved amount, idempotency reservation and active permission. Ambiguous paid outcome becomes `ACTION_REQUIRED`.

## MCP

Canonical endpoint: `/mcp`, Streamable HTTP. OAuth 2.1 + PKCE maps token subject to Better Auth user. Token scopes can narrow but never expand current AMS grants. MCP exposes bounded Research tools and no SQL/database/provider credentials.

## UI

Private shell uses server-built navigation and accessible organization/project options. Client state owns only presentation interactions such as drawer state. Direct URL access always reauthorizes server-side.

Routes planned for Research:

- `/tools/`;
- `/tools/research/`;
- `/tools/research/new/`;
- `/tools/research/[id]/`.

## Runtime And Delivery

Current production: host Nginx -> web/outbox worker containers -> self-managed PostgreSQL 18.

Target production: host Nginx -> web/outbox/research worker containers -> Timeweb Managed PostgreSQL 18 over private network/TLS. Database has no public IP. Existing AMS server public IP remains because it serves HTTPS domains and SSH.

Migration requires backup, restore smoke, maintenance window up to one hour, data verification and 14-day read-only fallback database. Production change needs a separate owner command.

## Verification

- `pnpm architecture:check` - dependency/import boundaries.
- `pnpm test:unit` - domain and contracts.
- `pnpm test:integration` - PostgreSQL authorization/constraints/RLS.
- `pnpm test:e2e` - browser access matrix and responsive flows.
- `pnpm verify:risky` - changed auth/data/runtime proof.
- SourceCraft exact-head RISKY gate before merge.
