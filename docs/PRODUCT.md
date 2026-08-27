# PRODUCT

## Проблема

АМС ведёт несколько клиентов и несколько сайтов. Нужен единый приватный сервис, который собирает подтверждённые SEO-данные, хранит историю и показывает клиенту понятный отчёт без доступа к техническим кабинетам Яндекса и без внедрения аналитики внутрь каждого сайта.

## Ценность

Для АМС:

- единый SEO-monitoring контур;
- меньше ручных отчётов;
- повторяемый onboarding;
- история изменений и ошибок индексации.

Для клиента:

- одна защищённая ссылка;
- понятные KPI и динамика;
- честные caveats и точки роста;
- печать/PDF без ручной сборки.

## Пользователи

### SEO_ANALYST

- видит overview всех клиентов;
- видит sync health и stale/partial статусы;
- открывает все client/site reports.

### CLIENT_VIEWER

- видит только своего клиента;
- не видит соседних клиентов;
- не видит внутренние IDs, OAuth и file paths.

### COLLECTOR

- читает registry;
- получает OAuth из server env;
- читает только утверждённые GET endpoints;
- пишет snapshots;
- не обслуживает browser requests.

## Первые клиенты

- `REDACTED_CLIENT_DATA`
  - `REDACTED_CLIENT_DATA` — подтверждённый URL `https://REDACTED_CLIENT_DATA`
  - `volchevsk` — planned/not connected
  - `REDACTED_CLIENT_DATA` — planned/not connected
- `REDACTED_CLIENT_DATA`
  - `REDACTED_CLIENT_DATA` — planned until confirmed onboarding inputs


## Cabinet experience

- директор по умолчанию видит короткую `Сводку`, а не полный технический отчёт;
- один site route содержит локальные вкладки `Сводка / SEO / Трафик`;
- клиент с несколькими сайтами сначала выбирает сайт на client overview;
- показатели разных городов не складываются в искусственный общий рейтинг;
- analyst может открыть технические детали, source periods и sync health;
- production URL: `https://seo-monitor.ams24.ru`.

## Non-goals MVP

- не CRM;
- не task tracker;
- не billing SaaS;
- не editor сайтов;
- не raw user-level Metrica Logs API;
- не автоматический SEO-оптимизатор.

## Product contract MVP

- static private dashboard;
- read-only Yandex data;
- history via versioned JSON snapshots;
- multiple clients and sites;
- no database in MVP;
- clean migration path to future DB/auth stack.
