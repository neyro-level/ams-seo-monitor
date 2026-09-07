# CLIENT PROVISIONING

## Цель

Подключить новый клиентский tenant, проект, пользователя и read-only SEO-источники без ручных записей в БД и без второго auth contract.

## Обязательные данные

- organization/project names и уникальные slugs;
- имя и уникальный lowercase login пользователя;
- назначенный Platform Admin пароль ровно из 8 печатных символов;
- tenant role: `VIEWER` по умолчанию;
- exact HTTPS site URL и timezone;
- подтверждённые Webmaster host, Metrika counter/goals;
- optional Topvisor project/region mapping;
- tracked query set, thresholds и clusters.

Credentials и provider IDs нельзя переносить между проектами по аналогии.

## Порядок

1. В `/admin/` запустить единый мастер создания клиента.
2. Создать одной командой Organization → Project → User credential → Membership → AuditEvent.
3. Передать назначенный пароль пользователю приватным каналом; не сохранять его в документах или сообщениях команды.
4. Проверить вход: пользователь сразу попадает в `/dashboard/` и видит только назначенную organization.
5. Создать Site и nonsecret ProviderConnection mappings через typed admin forms.
6. Выполнить read-only preflight каждого провайдера.
7. Включать connection только после подтверждения access и mapping; Topvisor дополнительно требует свежие непустые позиции.
8. Выполнить worker sync и проверить четыре report periods.
9. Release/deploy выполнять отдельной owner-командой.

Private operator config при необходимости синхронизируется только явным `config:sync --source <private-path>`: сначала dry-run, затем отдельный `--apply`. Deployment config sync не вызывает.

## Acceptance

- создание клиента атомарно; duplicate login/slug возвращает safe error;
- пароль отсутствует в logs, AuditEvent, URL и Git;
- public signup недоступен;
- client видит только свою organization;
- enabled sources имеют подтверждённый mapping и свежий успешный SourceRun;
- four valid ReportSnapshots на site;
- `partial`, `stale` и missing values отображаются честно;
- secrets/raw provider data отсутствуют в Git/browser/logs;
- backup/recovery contract не ослаблен.

Live access и integration state подтверждаются runtime evidence, а не этим runbook.
