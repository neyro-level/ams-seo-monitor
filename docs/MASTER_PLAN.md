# MASTER PLAN

Только незавершённая работа; завершённые этапы остаются в Git/SourceCraft.

## GitHub sanitation

- держать зеркало private, пока старый pre-rewrite SHA доступен;
- пройти официальный purge process GitHub;
- вернуть public visibility только после недоступности старого SHA, полного signature scan и exact-SHA equality с SourceCraft `main`.

## Provider mappings

- для трёх выключенных Topvisor connections получить подтверждённые project/region mappings;
- выполнить read-only preflight и включать каждое подключение только при свежих непустых position rows;
- отсутствие данных не маскировать как нулевые позиции; paid checks и provider mutations не выполнять.

## Platform controls

- независимо подтвердить SourceCraft secret scanning;
- сузить `CREATEDB` production migrator role после owner-approved impact scope;
- добавить внешний monitor только для landing/public health и alert на stale integration/worker/queue без публикации readiness body.

Managed PostgreSQL: `NOT_APPLICABLE`. Текущий contract — self-managed PostgreSQL с release-time backup/restore и read-only operational audit.
