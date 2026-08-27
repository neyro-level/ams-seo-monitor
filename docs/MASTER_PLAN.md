# MASTER PLAN

## Текущее решение

AMS SEO Monitor идёт в 3 крупные волны.

### Wave 1 — Foundation

- отдельный repo;
- core docs;
- static export shell;
- registry/routes;
- snapshot storage engine;
- fixture data;
- foundation checks.

### Wave 2 — Data and dashboards

- Yandex Webmaster adapter;
- Yandex Metrica adapter;
- combined analytics engine;
- dashboards;
- CSV/export/print.

### Wave 3 — Access, release, operations

- Nginx isolation;
- AMS Server release;
- timers;
- live client onboarding;
- hardening and recovery.

## Current phase

**Active:** W4 — Yandex Webmaster adapter на ветке `w4-webmaster-adapter`; frozen design system остаётся без редизайна.

## Wave 1 acceptance

- `pnpm build` produces `out/`;
- shell matches frozen REDACTED_CLIENT_DATA analytics language;
- routes are registry-driven;
- disabled sites render honest `Не подключён` state;
- invalid snapshot does not replace latest valid snapshot;
- no production server changes.

## Risks

- переусложнить foundation ранними abstractions;
- размыть frozen design contract;
- сделать слабый snapshot contract перед live integrations.

## W4 current scope

- OAuth preflight;
- exact verified host discovery;
- normalized Webmaster DTO;
- fixture tests and safe collector runner;
- no secrets in stdout/stderr.

## Next checkpoint after Wave 1

После приёмки foundation проверить:

- удобен ли shell и плотность UI;
- достаточно ли snapshot DTO;
- нет ли лишнего слоя в registry/storage;
- готовы ли мы к Wave 2 without redesign.

## W5 live adapter status

- Metrica OAuth and exact REDACTED_CLIENT_DATA counter verified;
- counters and goals discovery implemented;
- all traffic and Yandex organic bundles implemented;
- bytime, landing pages, devices and allowlisted goal stats implemented;
- aggregate goal reaches are not presented as unique conversion; per-goal conversion comes from the official API metric.
- frozen design system remains unchanged; UI wiring is the next separate scope.
