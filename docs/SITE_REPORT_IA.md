# Site Report Information Architecture

## Решение

Один сайт = один route отчёта:

```text
/c/{clientSlug}/{siteSlug}/
```

Внутри route — три локальные вкладки:

1. `Сводка`
2. `SEO`
3. `Трафик и обращения`

По умолчанию открывается `Сводка`. Отдельные Webmaster/Metrica top-level routes не создаются: это раздробит один управленческий отчёт и усложнит работу клиента.

## Роли экранов

### Client overview `/c/{clientSlug}/`

Нужен для клиента с несколькими сайтами.

- одна карточка на сайт;
- статус источников и актуальность;
- четыре компактных KPI сайта;
- один главный вывод/риск;
- переход в отчёт сайта;
- planned site честно показывает `Не подключён`.

Показатели разных рынков и городов не суммируются в «общую позицию». Каждый сайт сравнивается со своим предыдущим периодом.

Для клиента с одним сайтом overview остаётся короткой точкой входа, а не дублирует весь site report.

### Site summary `/c/{clientSlug}/{siteSlug}/`

Целевая аудитория: директор/владелец. Ответ за 30–60 секунд:

- что изменилось;
- есть ли проблема;
- сколько поискового трафика и целевых визитов;
- что делать следующим.

### SEO tab

Director-level SEO detail:

- 4 KPI: total shows, clicks, CTR, average position;
- one visibility trend;
- up to 5 deterministic demand clusters;
- up to 5 priority queries and compact search coverage: pages in search, excluded pages, sitemap status, critical issues.

Full 500-query pool, HTTP histories, links and raw diagnostics stay in internal source bundles for analyst tooling.

### Traffic and conversions tab

- 4 KPI: Yandex organic visits, unique target visits, conversion, organic share;
- organic and target-visit trend;
- up to 4 main target-action types;
- up to 5 landing pages with visits, unique target visits and conversion;
- compact quality block: bounce rate, depth and average duration.

Device tables, all goals, 50 landing pages and sampling details stay analyst-only.

## Director summary

Six approved KPI:

1. Total search shows from Webmaster all-query history.
2. Search clicks from Webmaster all-query history.
3. Yandex organic visits from Metrica.
4. Unique target visits across the allowlisted goals.
5. Organic conversion: target visits / organic visits.
6. Pages in Yandex search.

Each KPI shows current value and equal-period change.

One management panel contains:

- main result;
- main risk;
- main growth opportunity;
- recommended action.

Two charts remain:

- total search shows/clicks;
- organic/unique target visits.

## Data semantics

- Webmaster clicks and Metrica visits remain separate.
- Their ratio is diagnostic, not conversion.
- Goal reaches are cumulative actions, not unique leads.
- Unique target visits use an OR union of allowlisted goals and count one visit once.
- Current and previous periods always have equal fixed length.
- Webmaster totals come from `/search-queries/all/history`; popular pools are used only for opportunities.
- Partial/stale/suppressed values never become zero silently.

## Progressive disclosure

На `Сводке` запрещены:

- полная таблица запросов;
- полный список diagnostics;
- 50 landing pages;
- технические IDs;
- длинная методология.

Вместо этого:

- top 3 opportunities;
- top 3 alerts;
- один combined trend block;
- ссылки/вкладки на detail.

## Period presets

Approved fixed comparable periods ending on the latest factual Webmaster date:

- `Неделя`: 7 days, default;
- `Месяц`: 28 days;
- `Квартал`: 90 days;
- `Полгода`: 180 days.

Each period compares with the immediately preceding equal-length period. Period selection is bookmarkable through `?period=week|month|quarter|halfYear`. `Вчера` is forbidden for weekly Webmaster query data.

## Multi-client navigation

Sidebar hierarchy:

```text
Аналитик
Клиенты
  REDACTED_CLIENT_DATA
    REDACTED_CLIENT_DATA
    REDACTED_CLIENT_DATA
    REDACTED_CLIENT_DATA
  Союз застройщиков REDACTED_CLIENT_DATA
    REDACTED_CLIENT_DATA-на-Дону — не подключён
```

Client credentials в production открывают только свой subtree. Analyst credentials открывают все subtrees.

## Current implementation status

- three REDACTED_CLIENT_DATA city routes load live protected report JSON;
- source periods are aligned across four presets;
- equal previous-period comparison and unique target visits are active;
- query clusters use checked-in deterministic brand/topic rules;
- report compiler and atomic period-aware publication are active;
- detailed current/previous source bundles stay internal;
- `/demo/` remains the only fixture route;
- loading/error states do not expose technical details;
- client navigation renders only its own subtree.

Remaining before production:

```text
scheduled sync/timers
→ Nginx protected aliases + Basic Auth isolation
→ exact-main release
```

## Visual contract

Все три вкладки используют `docs/DESIGN_SYSTEM.md`. Новая вкладка не создаёт новую дизайн-систему, палитру, радиусы или плотность.