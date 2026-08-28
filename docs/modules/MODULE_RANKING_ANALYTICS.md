# Module: Ranking Analytics

## Назначение

Показывает директору результат утверждённого поискового ядра через точные позиции, доли Топ-3/Топ-10 и динамику tracked queries.

Webmaster не заменяет этот модуль: средняя позиция показа Вебмастера относится только к фактическим показам за период и не является регулярным rank-check полного ядра.

Не входит в scope:

- запуск платных Topvisor checks;
- импорт/изменение keywords;
- редактирование Topvisor projects;
- автоматическое создание SEO-задач.

## Роли и права

### SEO_ANALYST

- поддерживает checked-in tracked query set;
- проверяет owner baseline и будущую Topvisor history;
- читает полный ranking detail.

### CLIENT_VIEWER

- видит browser-safe ranking dashboard своего сайта;
- не видит Topvisor credentials/internal IDs кроме безопасной source attribution.

### COLLECTOR

- читает optional Topvisor source или owner fallback;
- не вызывает mutation/paid checker methods.

## Владение данными

```text
config/tracked-queries/{project}-{site}.json
src/shared/schemas/tracked-query.ts
src/shared/schemas/rank-source.ts
collector/sources/topvisor/client.ts
collector/orchestration/report-compiler.ts
src/components/charts/RankingShareChart.tsx
src/components/tables/TrackedQueryTable.tsx
```

REDACTED_CLIENT_DATA set:

```text
config/tracked-queries/bastion-lugansk.json
75 queries
baseline label: 02.06
```

Topvisor mapping:

```text
projectId: REDACTED_CLIENT_DATA
regionIndex: 0
enabled: false
```

## Команды

Нет отдельной mutation-команды. Ranking входит в normal site sync/report compilation.

Разрешённые Topvisor methods:

```text
GET positions_2/summary/chart
GET positions_2/history
```

## Инварианты

- tracked query slug/query unique within set;
- full approved core is denominator, including unmeasured queries;
- Top-3 is a subset of Top-10;
- lower numeric position is better;
- positive delta means improvement;
- `new/lost` require exact previous capture;
- nullable owner baseline is not silently interpreted as `new/lost`;
- source and baseline label remain visible;
- no fabricated date/year for owner baseline;
- Webmaster average position stays separate.

## Расчёты

- `top3Share = top3Count / queryCount × 100`;
- `top10Share = top10Count / queryCount × 100`;
- `improved`: current < previous;
- `declined`: current > previous;
- `new`: previous absent, current present, only for exact capture;
- `lost`: previous present, current absent, only for exact capture.

## Взаимодействия

- Project Registry links a site to a tracked query set and optional Topvisor mapping;
- Data Pipeline preserves normalized ranking source in internal bundles;
- Report Compiler produces browser-safe `ranking` block;
- Director Dashboard renders KPI, share chart and filtered table.

## Тесты

- tracked set validation;
- 51/75 Top-10 and 40/75 Top-3 fallback acceptance;
- share denominator includes missing current positions;
- delta direction;
- exact vs nullable baseline behavior;
- Topvisor read-only request contract;
- filter counts;
- live snapshot schema validation;
- mobile local table overflow.

## Audit

Current source can be:

- `topvisor` — exact API capture;
- `owner_fallback` — checked-in owner-provided baseline.

Every report preserves source, capture/baseline labels and measured count. Credentials/raw Topvisor payloads are never published.