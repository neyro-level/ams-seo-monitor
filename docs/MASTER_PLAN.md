# MASTER PLAN

Этот файл содержит только незавершённую работу. Завершённые этапы остаются в Git/SourceCraft history, не в worklog.

## Next Product Work

- Спроектировать два новых больших модуля через отдельные `docs/modules/MODULE_<NAME>.md`: purpose, roles, data owner, routes, permissions, async policy, failure behavior and tests.
- Для каждого модуля до кода определить risk: likely `RISKY`, если есть schema, tenant access, worker, provider, PII or external side effect.
- Делать новые private screens сразу mobile-ready по `INTERNAL_DASHBOARD_DESIGN_SYSTEM.md`.

## Mobile / Installable App

- До добавления больших модулей сохранять mobile web contract: topbar/drawer, responsive cards/tables, touch targets and visual proof at `375 / 768 / 1280 / 1440`.
- После стабилизации новых модулей добавить lightweight installable layer: `app/manifest.ts`, icons `192/512`, `display: standalone`, start URL `/dashboard/`.
- Service worker/offline caching не добавлять без отдельного RISKY design: private PII/report pages must not be cached accidentally.

## Provider Mappings

- После merge нового onboarding выполнить управляемое подключение существующих сайтов: выбрать region и загрузить ядро 20–100 запросов.
- Подтвердить две цели Метрики для каждого сайта со статусом `ACTION_REQUIRED`.
- Первый production Topvisor price-check/paid capture выполнять только после отдельной release/operation command.
- Missing ranking data must stay partial/unavailable, not zero.

## Platform Controls

- Independently confirm SourceCraft secret scanning.
- Keep GitHub mirror private until old pre-rewrite SHA is unavailable, official purge is complete, signature scan is clean and SourceCraft/GitHub `main` SHA equality is confirmed.
- Narrow production migrator `CREATEDB` role after owner-approved impact scope.
- Add external monitor only for landing/public health and stale integration/worker/queue alerts; do not publish readiness body.

## Documentation Discipline

- No new duplicate `AUTH`, `DATABASE`, `WORKER`, `TECH_STACK`, `PLATFORM_CONFORMANCE`, `SITE_REPORT_IA` files.
- Update the owner document instead: `SECURITY`, `DATA_MODEL`, `ARCHITECTURE`, `PRODUCT`, module contract or ops runbook.
- Archive is not active canon.
