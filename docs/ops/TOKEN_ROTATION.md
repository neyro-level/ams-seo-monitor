# TOKEN ROTATION

## Статус

Wave 1: no live token rotation yet. This document fixes the safe future rule-set.

## Planned secret classes

- `YANDEX_WEBMASTER_OAUTH_TOKEN`
- `YANDEX_METRICA_OAUTH_TOKEN`
- runtime env materialization file
- client Basic Auth credentials

## Rules

- Doppler is source of truth;
- runtime copy is materialized separately on server;
- collector does not call Doppler during daily/weekly run;
- tokens are never printed to chat, logs, Git or browser payload;
- 401/403 must stop blind retry and trigger operator action.

## Future rotation sequence

1. obtain fresh token with read-only scope;
2. update Doppler value;
3. materialize server env safely;
4. run preflight;
5. verify next sync success;
6. retire obsolete token.
