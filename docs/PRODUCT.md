# PRODUCT

## Назначение

AMS IMPULSE — продукт АМС для SEO-продвижения и регулярного контроля поисковой видимости, технического состояния, органического трафика и целевых действий по нескольким проектам и сайтам.

Публичный маршрут `/` представляет предложение продукта. Приватный кабинет не изменяет сайты и не делает provider mutations: он показывает готовый управленческий отчёт на основе read-only data.

## Пользователи

### SEO_ANALYST

- видит все проекты и сайты;
- открывает analyst dashboard;
- видит readiness и source status;
- использует внутренние рабочие потоки синхронизации и detail data;
- не получает provider credentials через UI.

### CLIENT_VIEWER

- видит только проекты и сайты своей organization;
- открывает только свои director reports;
- не видит соседние tenants;
- не видит internal technical snapshots и provider credentials.

## Product hierarchy

```text
Все проекты
→ Проект
  → Сайты
    → Единый отчёт
```

`clientSlug` и `/c/*` сохраняются как рабочий URL/data contract.

## Директорский отчёт

Один site report без вкладок показывает:

1. ranking утверждённого ядра;
2. Top-3 / Top-10 и динамику;
3. tracked queries;
4. technical health и indexing;
5. Webmaster demand metrics;
6. Metrica traffic / target visits / conversion;
7. landing pages;
8. alerts и opportunities.

## Product rules

- `SiteReportSnapshot` — единственный browser-safe DTO;
- partial/stale/null показываются честно;
- source, period и baseline labels видимы;
- current и previous periods равны по длине;
- разные сайты не агрегируются в fake rank.

## Current product state

В этой ветке продукт уже работает как full-stack foundation:

- analyst/client access через Better Auth;
- data и runtime через PostgreSQL;
- worker sync отдельно от web runtime;
- report pages читают DB-backed snapshots;
- filesystem больше не является runtime product DB.

## Non-goals

- public signup;
- public reports;
- provider write access;
- CRM/catalog/leads product scope из других AMS-репозиториев;
- direct search-query to lead attribution;
- second frontend/backend architecture рядом с основной.