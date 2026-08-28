# Site Report Information Architecture

## Решение

Один site = один единый director report:

```text
/c/{clientSlug}/{siteSlug}/
```

Вкладок `Сводка / SEO / Трафик` нет. Периоды переключают данные на одной странице:

```text
?period=week|month|quarter|halfYear
```

Подробный screen contract: `docs/DIRECTOR_DASHBOARD_V2.md`.

## Product hierarchy

```text
Все проекты
→ Проект
  → Сайты
    → Единый отчёт
```

Внешний термин — `Проект`. Internal `clientSlug`, `CLIENT_VIEWER` и `/c/*` пока сохраняются для совместимости.

## `/analyst/` — Все проекты

- единственный верхний read-only экран;
- project readiness;
- sites/source counts;
- переход в project overview;
- нет отдельного `/analyst/projects/`;
- browser не создаёт/редактирует config.

## `/c/{clientSlug}/` — Проект

- одна compact card на site;
- source readiness/freshness;
- переход в site report;
- planned site честно показывает `Не подключён`;
- разные города/рынки не суммируются в fake rank.

## `/c/{clientSlug}/{siteSlug}/` — Единый отчёт

Порядок:

1. позиции утверждённого ядра;
2. KPI Топ-3/Топ-10 и изменения;
3. history share chart;
4. tracked query table;
5. site health;
6. Webmaster demand KPI/chart;
7. Metrica traffic/conversion KPI/chart;
8. landing pages;
9. main risk and growth opportunity.

Цель: директор сначала видит результат утверждённого ядра, затем причины и бизнес-трафик. Полные provider/source bundles остаются analyst-only.

## Period contract

| Key | Label | Days |
|---|---|---:|
| `week` | Неделя | 7 |
| `month` | Месяц | 28 |
| `quarter` | 3 месяца | 90 |
| `halfYear` | Полгода | 180 |

`month` — default. Webmaster/Metrica используют непосредственно предшествующий equal period. Ranking использует первый/последний exact capture внутри периода либо явно labelled owner baseline.

## Data semantics

- exact rank source: Topvisor or owner fallback;
- Webmaster average display position не заменяет tracked ranking;
- Webmaster clicks и Metrica visits не называются одной conversion;
- unique target visits используют OR union allowlisted goals;
- goal reaches остаются cumulative actions;
- null/partial/stale не превращаются в zero;
- source/baseline/period labels видимы.

## Navigation

Analyst:

```text
Все проекты
Проекты
  REDACTED_CLIENT_DATA
    REDACTED_CLIENT_DATA
    REDACTED_CLIENT_DATA
    REDACTED_CLIENT_DATA
  Союз застройщиков
    Ростов-на-Дону — не подключён
```

Client credentials в production открывают только свой project subtree. Analyst credentials открывают все subtrees.

## Responsive contract

- 375/768: drawer, local table/control overflow, touch targets ≥44px;
- 1280/1440: fixed 260px sidebar, four KPI per row;
- report wrapper never exceeds workspace;
- whole-page horizontal overflow prohibited;
- tracked-query table scrolls only inside own container.

## Current status

- three REDACTED_CLIENT_DATA sites load protected live reports;
- four period presets and equal comparisons are active;
- unified dashboard and tracked ranking foundation implemented;
- `/demo/` remains isolated fixture;
- production auth/timers/deploy remain Wave 3.

## Visual contract

Only `docs/DESIGN_SYSTEM.md` tokens/primitives. Ranking, Webmaster and Metrica sections do not introduce separate visual languages.