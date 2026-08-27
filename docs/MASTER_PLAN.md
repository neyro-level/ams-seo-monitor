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

**Active:** Wave 1 Foundation.

## Wave 1 acceptance

- `pnpm build` produces `out/`;
- shell matches frozen REDACTED_CLIENT_DATA analytics language;
- routes are registry-driven;
- disabled sites render honest `Не подключён` state;
- invalid snapshot does not replace latest valid snapshot;
- no live OAuth or production server changes.

## Risks

- переусложнить foundation ранними abstractions;
- размыть frozen design contract;
- сделать слабый snapshot contract перед live integrations.

## Next checkpoint after Wave 1

После приёмки foundation проверить:

- удобен ли shell и плотность UI;
- достаточно ли snapshot DTO;
- нет ли лишнего слоя в registry/storage;
- готовы ли мы к Wave 2 without redesign.
