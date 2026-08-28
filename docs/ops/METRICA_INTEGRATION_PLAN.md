# Yandex Metrica integration plan

## Статус

`COMPLETED / OPERATIONAL REFERENCE`.

## Decision

- отдельное Yandex OAuth приложение с `metrika:read`;
- тот же service Yandex login, имеющий доступ к counters;
- отдельный Metrica token/env contract;
- exact per-site counter and goal allowlist in checked-in nonsecret config;
- browser never calls Metrica API.

Live local sync подтверждён для REDACTED_CLIENT_DATA, REDACTED_CLIENT_DATA и REDACTED_CLIENT_DATA.

## Official basis

1. Metrica API требует OAuth token в header `Authorization: OAuth <token>`.
2. При создании app указывается **set of accesses**; для чтения нужен `metrika:read`.
3. Token привязан к account + app + set of permissions.
4. Доступ к счётчику проверяется через `GET /management/v1/counters`.
5. Goals читаются через `GET /management/v1/counter/{counterId}/goals`.
6. Табличные отчёты — `GET /stat/v1/data`.
7. Временные ряды — `GET /stat/v1/data/bytime`.
8. При превышении quota Metrica возвращает `420 Too Many Requests`.

## REDACTED_CLIENT_DATA-first execution order

### Step 1. Confirm app strategy

Fast path:

- сохранить текущий service Yandex login;
- использовать существующий app, если для него можно выпустить token с `metrika:read`;
- не смешивать token names: Webmaster token и Metrica token остаются раздельными.

Fallback:

- если существующий app operationally неудобен или не даёт нужный scope, создать отдельное OAuth app только для Metrica read-only.

## Step 2. Prepare secret contract

В Doppler проекта `ams-seo-monitor` нужны имена:

- `YANDEX_METRICA_OAUTH_TOKEN`
- `YANDEX_METRICA_API_BASE_URL`
- `YANDEX_METRICA_TOKEN_STATUS`

Не нужны в secret env:

- site URL;
- counter ID Бастиона как секрет;
- goal allowlist как секрет.

Они должны жить в checked-in config после подтверждения discovery.

## Step 3. Counter discovery

Через `GET /management/v1/counters`:

- получить counters, доступные текущему token owner;
- сопоставить exact site URL Бастиона с `site` / mirror fields;
- зафиксировать `counterId` и `permission`;
- если counters несколько, выбрать exact production counter, а не похожий тестовый.

## Step 4. Goal discovery

Через `GET /management/v1/counter/{counterId}/goals`:

- получить реальные goal IDs;
- отделить lead goals от service events;
- собрать allowlist для REDACTED_CLIENT_DATA;
- не считать каждый event бизнес-конверсией.

## Step 5. Minimal report bundle for MVP

Сначала собрать 4 read-only слоя:

1. daily totals;
2. Yandex organic summary;
3. landing pages;
4. bytime trend.

Стартовый metric bundle:

- visits;
- users;
- pageviews;
- bounce rate;
- page depth;
- average visit duration;
- allowlisted goal reaches;
- conversion where compatible.

## Step 6. Safety rules

- browser never calls Metrica API;
- collector logs no token/header/raw sensitive body;
- `contains_sensitive_data` and `sampled` are preserved in DTO;
- low-data suppression is not converted to zero;
- `420` stops the source and marks quota failure.

## Step 7. Registry update

После confirmed discovery:

- в `config/clients/REDACTED_CLIENT_DATA.json` записать exact `counterId`;
- в `config/goals/REDACTED_CLIENT_DATA.json` записать allowlisted goals;
- если данных по другим sites нет, они остаются disabled.

## Step 8. Implementation order in code

1. `src/shared/schemas/metrica-source.ts`
2. `collector/sources/yandex-metrica/http.ts`
3. `collector/sources/yandex-metrica/client.ts`
4. `collector/sources/yandex-metrica/normalize.ts`
5. fixtures/tests
6. safe CLI runner
7. live REDACTED_CLIENT_DATA preflight

## UI rule

Metrica integration **must not redesign the dashboard**.

New metrics are inserted only into the already approved shell:

- same spacing;
- same typography;
- same KPI density;
- same table shell;
- same chart style;
- no new design language.
