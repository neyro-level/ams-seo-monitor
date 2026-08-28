# TOKEN ROTATION

## Статус

OAuth tokens используются в live local sync через Doppler. Production materialized env создаётся при deploy.

## Secret classes

- `YANDEX_WEBMASTER_OAUTH_TOKEN`
- `YANDEX_METRICA_OAUTH_TOKEN`
- optional `TOPVISOR_USER_ID` / `TOPVISOR_API_KEY`
- runtime env materialization file
- client Basic Auth credentials

## Rules

- Doppler is source of truth;
- runtime copy is materialized separately on server;
- collector does not call Doppler during daily/weekly run;
- tokens are never printed to chat, logs, Git or browser payload;
- 401/403 must stop blind retry and trigger operator action.

## Rotation sequence

1. obtain fresh token/key with required read-only scope;
2. update `ams-seo-monitor/prd` in Doppler;
3. run provider preflight without printing values;
4. materialize server env with root ownership and mode `0600`;
5. run one manual site/client sync;
6. validate published report freshness and systemd result;
7. retire obsolete token/key;
8. record safe rotation proof without values.
