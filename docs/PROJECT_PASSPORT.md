# AMS SEO Monitor — Project Passport

## Идентификация

| Поле | Значение |
|---|---|
| Product | AMS SEO Monitor |
| Repository | `integrator-p/ams-seo-monitor` |
| Canonical Git | SourceCraft `origin/main` |
| Production URL | `https://seo-monitor.ams24.ru` |
| Production host | AMS Main Server |
| Doppler | `ams-seo-monitor/prd` |
| Runtime | static Next.js export + compiled Node collector |
| Database | отсутствует в MVP |

## Назначение

Приватный кабинет АМС для регулярного мониторинга поисковой видимости, технического состояния сайта, органического трафика и целевых действий по нескольким проектам и сайтам.

Система отделена от runtime клиентских сайтов. Она не изменяет сайты и использует только read-only интеграции.

## Пользователи

### SEO_ANALYST

- видит `Все проекты`;
- открывает все проекты и сайты;
- контролирует readiness, freshness, partial/stale состояния;
- использует подробные source bundles для анализа;
- не выполняет API-мутации Яндекса и Topvisor.

### CLIENT_VIEWER

- видит только свой проект и его сайты;
- открывает единый директорский отчёт сайта;
- не видит соседние проекты, OAuth, counter/host IDs, server paths и internal source bundles.

### COLLECTOR

- читает nonsecret registry;
- получает credentials через server environment;
- вызывает allowlisted read-only endpoints;
- компилирует и атомарно публикует snapshots;
- не обслуживает browser requests.

## Product hierarchy

```text
Все проекты
→ Проект
  → Сайты
    → Единый отчёт
```

Внутренний `clientSlug` и route `/c/*` сохраняются как совместимый data/access contract. В пользовательском интерфейсе верхний уровень называется `Проект`.

## Первый production scope

Проект `REDACTED_CLIENT_DATA`:

| Site | URL | Webmaster | Metrica | Ranking |
|---|---|---|---|---|
| REDACTED_CLIENT_DATA | `https://REDACTED_CLIENT_DATA` | enabled | enabled | owner baseline; Topvisor mapping disabled |
| REDACTED_CLIENT_DATA | `https://REDACTED_CLIENT_DATA` | enabled | enabled | not configured |
| REDACTED_CLIENT_DATA | `https://REDACTED_CLIENT_DATA` | enabled | enabled | not configured |

Проект `REDACTED_CLIENT_DATA` зарегистрирован, но site onboarding остаётся disabled до подтверждения production inputs.

## Стек

- Next.js 16 App Router, `output: "export"`;
- React 19;
- TypeScript strict;
- Tailwind CSS v4;
- Recharts;
- Zod;
- Node.js 24 compiled collector;
- built-in `fetch`, `node:fs/promises`, `node:test`-compatible runtime;
- versioned JSON snapshots;
- Nginx HTTPS + Basic Auth;
- systemd oneshot + timers.

## Интеграции

### Yandex Webmaster

Read-only: hosts, summary, diagnostics, sitemaps, query pools, indexing/search history, search events, internal/external links.

### Yandex Metrica

Read-only: counters/goals, all traffic, Yandex organic, bytime, landing pages, devices, unique target visits, sampling/privacy metadata.

### Topvisor

Read-only foundation: `positions_2/summary/chart`, `positions_2/history`. Paid checker runs, keyword import and mutations запрещены. Live source остаётся disabled до credentials и отдельного включения mapping.

## Runtime flow

```text
registry + goals + tracked query sets
→ source adapters
→ normalized current/previous source bundles
→ equal-period analytics and ranking merge
→ SiteReportSnapshot
→ atomic snapshots/internal bundles/client reports
→ protected report JSON
→ static director dashboard
```

## Периоды

| Key | UI | Days |
|---|---|---:|
| `week` | Неделя | 7 |
| `month` | Месяц | 28 |
| `quarter` | 3 месяца | 90 |
| `halfYear` | Полгода | 180 |

`month` — default. Каждый current period сравнивается с непосредственно предшествующим периодом равной длины.

## Директорский отчёт

Один экран без вкладок:

1. позиции утверждённого ядра;
2. доли Топ-3/Топ-10;
3. таблица tracked queries;
4. техническое состояние;
5. показы/клики/CTR/средняя позиция;
6. organic visits/target visits/conversion;
7. landing pages;
8. главный риск и точка роста.

Визуальный контракт: `docs/DESIGN_SYSTEM.md`. Продуктовый контракт: `docs/DIRECTOR_DASHBOARD_V2.md`.

## Security invariants

- secrets только в Doppler/server env;
- browser не вызывает external APIs;
- browser получает только client-safe report DTO;
- internal source bundles лежат вне browser paths;
- Webmaster/Metrica/Topvisor работают read-only;
- Nginx защищает HTML и matching data paths;
- client isolation обеспечивается server path policy, не frontend filter;
- raw API responses и secret-bearing errors не сохраняются.

## Production status

`ACTIVE`.

- SourceCraft dashboard and deploy hotfix PRs merged;
- immutable exact-main artifact deployed;
- Nginx TLS + Basic Auth protects HTML and data paths;
- REDACTED_CLIENT_DATA/analyst isolation matrix passes;
- collector oneshot and daily timer active;
- REDACTED_CLIENT_DATA, REDACTED_CLIENT_DATA and REDACTED_CLIENT_DATA reports fresh;
- private/no-store/noindex headers active;
- previous release remains rollback-ready;
- release proof stored in production `shared/`.

## Remaining product work

- optional live Topvisor credentials/mapping;
- SZ REDACTED_CLIENT_DATA source onboarding;
- analyst-only detailed source-bundle views;
- scheduled external availability alerting.

## Команды

```bash
pnpm verify:config
pnpm verify:snapshots
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm project:add
pnpm collector:sync:REDACTED_CLIENT_DATA
pnpm dev:live
```

## Definition of Done production

Achieved:

- reviewed exact SourceCraft `main` SHA;
- immutable release artifact and manifest;
- static UI + protected report aliases on `seo-monitor.ams24.ru`;
- analyst/client Basic Auth isolation matrix;
- daily timer and successful collector oneshot;
- three REDACTED_CLIENT_DATA sites publish fresh reports;
- live revision/route/data/auth/header proof;
- previous release retained for rollback.