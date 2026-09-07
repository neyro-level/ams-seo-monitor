# MASTER PLAN

Только незавершённая работа; завершённые этапы остаются в Git/SourceCraft.

## GitHub sanitation

- держать зеркало private, пока старый pre-rewrite SHA доступен;
- пройти официальный purge process GitHub;
- вернуть public visibility только после недоступности старого SHA, полного signature scan и exact-SHA equality с SourceCraft `main`.

## Provider mappings

- после merge нового onboarding выполнить управляемое подключение существующих сайтов: выбрать region и загрузить ядро 20–100 запросов;
- подтвердить две цели Метрики для каждого сайта со статусом `ACTION_REQUIRED`;
- первый production Topvisor price-check/paid capture выполнить только после отдельной release-команды; отсутствие данных не маскировать нулевыми позициями.

## Platform controls

- независимо подтвердить SourceCraft secret scanning;
- сузить `CREATEDB` production migrator role после owner-approved impact scope;
- добавить внешний monitor только для landing/public health и alert на stale integration/worker/queue без публикации readiness body.

Managed PostgreSQL: `NOT_APPLICABLE`. Текущий contract — self-managed PostgreSQL с release-time backup/restore и read-only operational audit.
