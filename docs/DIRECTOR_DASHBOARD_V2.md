# Director Dashboard V2

## Статус

`IMPLEMENTED / READY FOR REVIEW`.

Цель: единый управленческий отчёт по сайту без вкладок. Первый экран показывает результат утверждённого поискового ядра; ниже остаются техническое здоровье, поисковый спрос и органический трафик.

## Product hierarchy

```text
Все проекты
→ Проект
  → Сайт
    → Единый отчёт
```

Route сайта: `/c/{clientSlug}/{siteSlug}/`.

## Роли и права

- `CLIENT_VIEWER` читает единый отчёт только своего project/site subtree.
- `SEO_ANALYST` читает все отчёты и source/freshness detail.
- Dashboard не выполняет mutations и не получает provider credentials.

## Владение данными

Dashboard не владеет provider/source DTO. Его единственный вход — validated browser-safe `SiteReportSnapshot`.

UI state:

- period query `week|month|quarter|halfYear`;
- tracked-query table filter;
- loading/error/partial/stale states;
- раскрытие первых 20 строк ядра.

Provider calculations, periods, conversion/ranking semantics принадлежат compiler/source modules, не JSX.

## Периоды

Селектор сохраняется в URL:

```text
?period=week|month|quarter|halfYear
```

- `week`: 7 дней;
- `month`: 28 дней, default;
- `quarter`: 90 дней, UI label `3 месяца`;
- `halfYear`: 180 дней.

Webmaster и Metrica сравниваются с непосредственно предшествующим равным периодом. Позиционные KPI сравнивают последний съём с первым съёмом внутри выбранного периода. При отсутствии Topvisor history используется утверждённая owner-provided baseline без выдуманной даты или года.

## Порядок единой страницы

### 1. Позиции утверждённого ядра

Основное табло:

1. размер утверждённого ядра;
2. запросы в Топ-10: количество, доля, изменение;
3. запросы в Топ-3: количество, доля, изменение;
4. выросшие, упавшие, новые и потерянные запросы.

Для REDACTED_CLIENT_DATAа утверждено 75 запросов. Исходный owner-provided снимок содержит 51 запрос в Топ-10, 40 в Топ-3, 7 выросших и 1 упавший относительно baseline `02.06`.

Точные позиции берутся из Topvisor. Яндекс.Вебмастер не подменяет rank-check: его позиция является средней позицией показа за период и наблюдается только для запросов, по которым сайт фактически показывался.

### 2. График долей Топ-3 и Топ-10

- две линии;
- ось Y — 0–100%;
- точки только по реальным датам съёмов;
- tooltip показывает процент и абсолютное значение `N из ядра`;
- до второго Topvisor snapshot показывается честное empty state.

### 3. Таблица ядра

Фильтры:

```text
Все | Топ-3 | Топ-10 | 11–20 | Выросшие | Упавшие | Новые | Потерянные
```

Определения:

- `improved`: current position меньше previous;
- `declined`: current position больше previous;
- `new`: в точном предыдущем съёме позиции нет, в текущем есть;
- `lost`: в предыдущем съёме позиция есть, в текущем нет;
- owner-provided nullable baseline не интерпретируется как `new/lost` без точного съёма.

Таблица показывает текущую позицию, baseline, улучшение в местах, показатели Webmaster. Первые 20 строк раскрываются до полного размера ядра.

### 4. Состояние сайта

- диагностика;
- Sitemap и ошибки;
- страницы в поиске и исключённые страницы;
- появившиеся и удалённые страницы;
- HTTP status history;
- ИКС и изменение к предыдущему замеру.

### 5. Поисковый спрос

- показы;
- клики;
- CTR;
- средняя позиция показа;
- ежедневный график показов и кликов.

### 6. Трафик

- органические визиты;
- уникальные целевые визиты;
- конверсия;
- средняя длительность;
- график визитов и целевых визитов;
- основные посадочные страницы.

## Topvisor contract

Direct read-only adapter использует только:

```text
GET positions_2/summary/chart
GET positions_2/history
```

Платный `checker/go`, keyword import, project mutations и любые `add/edit/del` операции не входят в sync pipeline.

Проект REDACTED_CLIENT_DATAа зарегистрирован как Topvisor project `REDACTED_CLIENT_DATA`, region index `0`. Источник остаётся disabled, пока в Doppler `ams-seo-monitor/prd` не появятся `TOPVISOR_USER_ID` и `TOPVISOR_API_KEY` и владелец не разрешит включить mapping. Owner-provided снимок остаётся рабочим честным fallback.

## Precision rules

- Top-3 входит в Top-10;
- доли считаются от полного утверждённого ядра, включая запросы без текущей позиции;
- положительный position delta означает улучшение;
- null не превращается молча в ноль;
- Webmaster clicks и Metrica visits не объединяются в одну конверсию;
- goal reaches не называются уникальными лидами;
- разные сайты не суммируются в фиктивную среднюю позицию.

## Взаимодействия

- Project Registry задаёт project/site navigation.
- Data Pipeline публикует period-aware report JSON.
- Ranking Analytics формирует `ranking`.
- `LiveSiteReport` загружает и валидирует protected report.
- Frozen primitives и tokens задаёт `docs/DESIGN_SYSTEM.md`.

## Audit и privacy

- browser payload не содержит credentials, raw source bundles, host/counter IDs и stack traces;
- source/freshness/baseline labels остаются видимыми;
- report view не ведёт application audit log в MVP;
- authenticated access evidence принадлежит Nginx/system logs в Wave 3.

## Проверки

- month default and URL-preserved selector;
- loading/error/partial/stale;
- tracked query filter counts;
- exact source and baseline labels;
- no whole-page overflow at 375/768/1280/1440;
- local table overflow only;
- keyboard/focus/touch targets;
- build with all static project/site routes.

## Responsive acceptance

- 375 px: нет горизонтального overflow страницы, таблица прокручивается локально;
- period и filter controls прокручиваются внутри собственной строки;
- touch target не меньше 44 px;
- desktop: четыре KPI в строке;
- таблица не расширяет workspace.

## Acceptance

- `month` выбран без query-параметра;
- `14 дней` и ключ `twoWeeks` удалены;
- REDACTED_CLIENT_DATA показывает 51 из 75 в Топ-10 и 40 из 75 в Топ-3 по утверждённому снимку;
- Topvisor history, когда подключён, заменяет owner fallback;
- filter counts детерминированы;
- health, Webmaster и Metrica сохранены ниже позиционного табло;
- live snapshot проходит schema validation;
- desktop и 375 px проходят browser QA.
