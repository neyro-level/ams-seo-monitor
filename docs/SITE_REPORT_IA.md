# Site Report Information Architecture

## Решение

Один сайт = один route отчёта:

```text
/c/{clientSlug}/{siteSlug}/
```

Внутри route — три локальные вкладки:

1. `Сводка`
2. `SEO`
3. `Трафик`

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

Целевая аудитория: аналитик/владелец, когда нужен detail drill-down.

- Webmaster visibility;
- queries;
- indexing;
- sitemap;
- diagnostics;
- links;
- source caveats.

### Traffic tab

- Yandex organic trend;
- landing pages;
- devices;
- allowlisted goals;
- sampling/privacy metadata;
- source caveats.

## Director summary: 9 управленческих сигналов

### KPI row 1 — search visibility

1. Показы в Яндексе
2. Клики из поиска
3. CTR
4. Средняя позиция

### KPI row 2 — business traffic

5. Органические визиты из Яндекса
6. Органические посетители
7. Уникальные целевые визиты по allowlist
8. Конверсия organic visits → unique converted visits

### Signal 9 — priority panel

Один full-width блок:

- состояние источников и freshness;
- один главный риск;
- одна главная точка роста;
- короткая рекомендация действия.

Не делать девятую декоративную KPI-card: сетка 4+4 и один приоритетный panel лучше соответствует утверждённой плотности.

## Семантика данных

- Webmaster clicks и Metrica visits показываются отдельно.
- Их отношение — diagnostic ratio, не conversion.
- Сумма goal reaches не является уникальными конверсиями.
- Для KPI 7–8 W6 должен посчитать union allowlisted goals через converted visits, без двойного счёта одного визита.
- current/previous используют равные периоды.
- фактические source periods и timezone видимы.
- partial/stale source не скрывается и не превращается в zero.

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

## Period and device controls

Current live report shows the exact aligned factual period and does not display fake controls.

After scheduled period snapshots are implemented, controls become:

- 7 days;
- 28 days;
- quarter;
- year;
- device: all/desktop/mobile.

Webmaster weekly delay remains explicit. `Вчера` is forbidden for weekly query data. Tabs are already bookmarkable through `#summary/#seo/#traffic`; period/device state must also be static-safe and bookmarkable when enabled.

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
- source periods are aligned;
- report compiler and atomic publication are active;
- `/demo/` remains the only fixture route;
- loading/error states do not expose technical details;
- client navigation renders only its own subtree.

Remaining before production:

```text
previous-period analytics
→ scheduled sync/timers
→ Nginx protected aliases + Basic Auth isolation
→ exact-main release
```

## Visual contract

Все три вкладки используют `docs/DESIGN_SYSTEM.md`. Новая вкладка не создаёт новую дизайн-систему, палитру, радиусы или плотность.