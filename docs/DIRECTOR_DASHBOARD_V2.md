# Director Dashboard V2

## Статус

`DRAFT FOR DISCUSSION`. Это не утверждённое ТЗ. Реализация Summary/SEO/Traffic запрещена до явного решения владельца по составу блоков и показателей.

Цель: полностью перестроить управленческую иерархию, графики и показатели без изменения static/no-DB архитектуры и без нового визуального языка.

## Пользователь и задача

Основной пользователь — директор или владелец проекта. За 30–60 секунд он должен понять:

1. Получает ли сайт поисковый спрос.
2. Приводит ли этот спрос органический трафик.
3. Даёт ли трафик целевые визиты.
4. Что изменилось к равному предыдущему периоду.
5. Есть ли критичный риск.
6. Какое одно действие приоритетно сейчас.

Аналитические детали доступны во вкладках, но не перегружают первый экран.

## Product hierarchy

```text
Все проекты
→ Проект
  → Сайты
    → Сводка / SEO / Трафик и обращения
```

Один сайт остаётся одним route: `/c/{clientSlug}/{siteSlug}/`.

## Current audit

Текущая версия уже имеет правильные вкладки и equal-period data, но требует переработки:

- `SiteReportView.tsx` объединяет вычисления и 3 экрана в одном файле;
- шесть одинаково тяжёлых KPI не создают бизнес-приоритет;
- четыре management cards конкурируют между собой;
- chart component визуально рисует только primary series, хотя подписи обещают вторую;
- secondary KPI и source health не собраны в отдельную компактную иерархию;
- SEO/Traffic detail составлен правильно по смыслу, но нуждается в более чётких section roles и mobile composition.

## V2 site header

Порядок:

1. breadcrumbs;
2. back to project;
3. site name;
4. compact source/freshness status;
5. period selector;
6. tabs.

Period selector остаётся bookmarkable:

```text
?period=week|month|quarter|halfYear
```

## V2 Summary

### Primary KPI — 4 cards

Порядок задаёт бизнес-воронку:

1. `Целевые визиты` — главный результат, dark primary card.
2. `Органические визиты` — трафик из Яндекса.
3. `Клики из поиска` — переходы по данным Webmaster.
4. `Показы в поиске` — поисковая видимость.

Каждая карточка показывает current value и equal-period delta.

### Supporting metrics — compact panel

1. `Конверсия` — target visits / Yandex organic visits.
2. `CTR` — Webmaster clicks / shows.
3. `Средняя позиция` — weighted by shows; уменьшение позиции считается улучшением.
4. `Страницы в поиске` — latest factual Webmaster value.

Supporting metrics визуально легче primary KPI и не выглядят как второй равнозначный KPI-row.

### Management decision panel — 3 roles

1. `Итог периода` — самое существенное подтверждённое изменение.
2. `Главный риск` — один alert или честное отсутствие критичных рисков.
3. `Следующее действие` — одна конкретная рекомендация на период.

Отдельная четвёртая карточка «точка роста» не нужна: opportunity входит в следующее действие.

### Summary charts

Два panel в desktop grid, один под другим на mobile:

- `Поисковая видимость`: shows primary + clicks secondary.
- `Органический результат`: organic visits primary + unique target visits secondary.

Secondary series обязана реально рисоваться. Third metric остаётся в tooltip/summary, если использует несовместимую шкалу.

### Source status

Compact strip показывает отдельно:

- Webmaster status and factual period;
- Metrica status and factual period;
- generated time;
- `partial/stale` не маскируется зелёным общим статусом.

## V2 SEO tab

### KPI

- Показы;
- Клики;
- CTR;
- Средняя позиция.

### Sections

1. Visibility chart.
2. Top 3 deterministic opportunities.
3. Up to 5 demand clusters.
4. Up to 5 priority queries.
5. Compact search health: pages in search, excluded, sitemap, critical diagnostics.

Full query pools, histories and links remain analyst-only source bundles.

## V2 Traffic and conversions tab

### KPI

- Organic visits;
- Unique target visits;
- Conversion;
- Organic share of all traffic.

### Sections

1. Organic/target trend.
2. Up to 4 target action types.
3. Up to 5 landing pages.
4. Compact traffic quality: bounce rate, depth, duration.

Goal reaches are actions, not unique leads. Device details and full goal list remain analyst-only.

## Authoritative KPI dictionary

| Widget | Source | Formula | Delta | Direction |
|---|---|---|---|---|
| Целевые визиты | Metrica | unique visits matching OR-union allowlisted goals | percent | more is positive |
| Органические визиты | Metrica | Yandex organic visits | percent | more is positive |
| Клики из поиска | Webmaster | all-query history clicks | percent | more is positive |
| Показы в поиске | Webmaster | all-query history shows | percent | context-dependent, default positive |
| Конверсия | Combined/Metrica | target visits / organic visits × 100 | percentage points | more is positive |
| CTR | Webmaster | clicks / shows × 100 | percentage points | more is positive |
| Средняя позиция | Webmaster | shows-weighted average position | absolute position delta | lower position is positive |
| Страницы в поиске | Webmaster | latest factual pages-in-search value | percent | sharp decline is negative |
| Доля органики | Metrica | Yandex organic visits / all visits × 100 | percentage points | context only |

## Precision rules

- Webmaster clicks and Metrica visits are never named one conversion.
- Goal reaches are never named unique leads.
- One visit matching several goals counts once in `targetVisits`.
- Different sites are never summed into a fake average position/rank.
- `null`, suppressed, partial and stale values never silently become zero.
- Count: integer; percent: maximum 1 decimal; CTR: maximum 2; position: 1 decimal.
- Every delta compares immediately preceding equal-length period.
- Source periods remain visible and may differ from display preset boundaries only with explicit label.

## Semantic core model

Tracked query count is project-specific, not fixed:

```text
1..100 owner-approved queries per site
```

For REDACTED_CLIENT_DATA the supplied core contains 75 queries. Other sites may contain 35, 50 or another approved count.

Two layers must remain separate:

1. `Tracked core` — where the project wants to rank; stable owner-provided set used for Topvisor monitoring.
2. `Observed Webmaster pool` — where the site actually appeared; dynamic source evidence.

Dashboard shows:

- tracked core coverage in Webmaster;
- tracked core position distribution;
- tracked queries absent from observed pool;
- observed queries outside tracked core;
- Webmaster current/previous metrics for the tracked core;
- later Topvisor exact positions, history and SERP competitors.

UI renders the first 20 rows and expands to the entire approved core count. It never silently truncates every project to 50.

## View-model boundary

`SiteReportView.tsx` becomes composition only.

Target files:

```text
src/modules/dashboards/report-view-model.ts
src/modules/dashboards/DirectorSummary.tsx
src/modules/dashboards/SeoReportTab.tsx
src/modules/dashboards/TrafficReportTab.tsx
src/components/charts/ReportTrendChart.tsx
```

View model owns:

- formatting-ready values;
- delta text and tone;
- priority outcome/risk/action;
- cluster aggregation;
- capped table rows;
- source freshness labels.

Components do not recalculate business metrics in JSX.

## Visual contract

Use only `docs/DESIGN_SYSTEM.md`:

- PT Root UI;
- full remaining-width workspace;
- fixed 260px sidebar;
- 16px panel/KPI radius;
- 12px controls;
- 1/2/4 responsive KPI grid;
- no glass, glow, random colors or new theme;
- no horizontal page overflow;
- table overflow local only;
- touch targets at least 44px.

## Responsive acceptance

### 375

- primary KPI one column;
- supporting metrics 2-column compact grid;
- management panel one column;
- charts stacked;
- tabs and period selector remain usable without page overflow.

### 768

- primary KPI two columns;
- supporting metrics two or four columns by readable width;
- charts stacked;
- local table overflow only.

### 1280 / 1440

- primary KPI four columns;
- supporting panel four columns;
- management panel three columns;
- two summary charts side by side;
- full remaining-width workspace.

## Acceptance

- one H1;
- functional period selector and tabs;
- both chart series visibly rendered;
- director summary answers the six management questions above;
- no metric changes source/formula without matching schema/compiler tests;
- `pnpm verify:config`, typecheck, lint, tests and build pass;
- browser proof at 375/768/1280/1440;
- live REDACTED_CLIENT_DATA, REDACTED_CLIENT_DATA and REDACTED_CLIENT_DATA reports render without fixture fallback.
