# PRODUCT

Этот документ — единственный продуктовый source of truth AMS IMPULSE. Он описывает пользователей, сценарии и ограничения, но не заменяет architecture, schema или security contracts.

## Назначение

AMS IMPULSE объединяет:

- публичный сайт SEO-услуги АМС;
- приватный кабинет регулярной SEO-отчётности;
- внутренний Platform Admin для организаций, проектов, сайтов и доступов;
- worker-контур, который собирает provider evidence и готовит отчёты.

Цель продукта — заменить ручную сборку управленческого SEO-отчёта повторяемым контуром с честными статусами данных. Система не изменяет клиентские сайты.

## Пользователи

### Public visitor

Читает предложение, открывает login modal или отправляет заявку во внешний AMS Leads API. Доступа к кабинету и данным клиентов нет. Имя и телефон заявки не сохраняются в PostgreSQL AMS IMPULSE.

### Platform Admin

Внутренний оператор АМС. Управляет organizations, users, memberships, projects, sites, provider mappings, goals, query core and safe operations in `/admin/*`. Не видит secret values и не выполняет произвольный CRUD.

### SEO Analyst

Видит все проекты, сайты, readiness источников, отчёты и уведомления. Может запускать разрешённые operator-only sync workflows через protected server capabilities. Не получает provider credentials в browser.

### Client Viewer

Видит только organization subtree из свежего Membership. Читает `/dashboard/`, `/c/{clientSlug}/` и site reports. Не видит соседние tenants, raw provider payloads, credentials, internal snapshots и admin routes.

### Worker

Server-owned principal. Читает enabled configuration из PostgreSQL, использует provider credentials только server-side, сохраняет normalized evidence и компилирует reports. Browser requests не обслуживает.

## Product Hierarchy

```text
Все проекты
→ Проект
  → Сайты
    → Единый отчёт
```

`clientSlug/siteSlug` and `/c/*` are stable URL/data contract.

## Core Scenarios

### Public lead

1. Visitor opens `/`.
2. Reads offer and legal links.
3. Opens lead dialog.
4. Form submits only to allowlisted AMS Leads API.
5. AMS IMPULSE stores no lead PII.

### Client report

1. User signs in through Better Auth.
2. Server builds fresh `PrincipalContext`.
3. User opens `/dashboard/`.
4. User selects project and site inside allowed organization.
5. Report route loads latest validated `SiteReportSnapshot`.
6. User switches `week`, `month`, `quarter`, `halfYear`; server renders the selected period from PostgreSQL.

### Analyst review

1. SEO Analyst opens `/analyst/`.
2. Reviews all projects, sites, configuration readiness and source freshness.
3. Opens site report and sees ranking, Webmaster, Metrika, technical, competitors and methodology sections.
4. Reads notifications for failed/recovered integrations, stale data and queue issues.

### Client onboarding

1. Platform Admin creates organization, project, user, membership and 1–50 sites.
2. Each site receives exact HTTPS URL, timezone, Topvisor region and 20–100 approved queries.
3. One transaction creates business records, credential user, AuditEvent and OutboxEvent.
4. Worker discovers Yandex mappings, asks for Metrika goal confirmation when needed, finds or creates Topvisor project/search targets.
5. Paid Topvisor checker starts only after price-check and durable `ProviderOperation` reservation.
6. First reports and notifications become visible without masking partial/stale states.

Detailed operator runbook: [`ops/CLIENT_ONBOARDING.md`](ops/CLIENT_ONBOARDING.md).

## Director Report

Route:

```text
/c/{clientSlug}/{siteSlug}/?period=week|month|quarter|halfYear
```

Order of meaning:

1. Project/site context, URL, period, timezone, freshness and source state.
2. Ranking: Top-3/Top-10, coverage, movement and tracked queries.
3. Technical/Webmaster health.
4. Search demand: shows, clicks, CTR and average show position.
5. Metrika: organic visits, unique target visits, goal actions and conversion.
6. Landing pages, devices, goals, phrases and geography.
7. Competitors, alerts, risks, opportunities and methodology.

Google and desktop/mobile are explicit dimensions. Yandex remains default. Webmaster → Metrika funnel is always labelled as a summary across different sources.

## Notifications

Platform Admin and SEO Analyst receive `/notifications/`, unread count and filters. Client Viewer does not receive the route. Notifications are safe projections of lifecycle events and do not replace AuditEvent, SyncRun, SourceRun or logs.

## Product Invariants

- `SiteReportSnapshot` is the only browser-safe report DTO.
- `month` is default.
- Current and previous periods have equal length.
- `partial`, `stale`, `unavailable` and `null` stay visible and honest.
- Webmaster average show position is not exact rank.
- Top-3 is a subset of Top-10.
- Ranking denominator is the full approved enabled query core.
- Direct query-to-lead attribution is prohibited.
- Different sites are not merged into artificial ranking KPI.
- Browser never receives provider credentials or raw provider payloads.

## Non-Goals

- CRM, billing, task tracker or file storage.
- Public self-service signup.
- Client browser admin.
- Arbitrary provider write access.
- Automatic client-site changes.
- Second ORM, auth provider, backend or storage contract.
- External public `/api/v1` until a product trigger creates it.
