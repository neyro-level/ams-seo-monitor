# CLIENT ONBOARDING

## Цель

Подключить новый Project/Site к PostgreSQL runtime, provider sync и tenant access без нового report format, frontend или auth system.

## Обязательные подтверждённые данные

- project и organization names/slugs;
- exact HTTPS site URL;
- timezone;
- verified Webmaster host access;
- Metrika counter access;
- goal list и `includeInSeoConversion` policy;
- optional Topvisor project/region mapping;
- tracked query set/baseline;
- CLIENT_VIEWER username и organization membership delivery method.

Не переносить credentials/provider IDs между проектами по аналогии.

## Private configuration preparation

```bash
pnpm project:add -- --source <private-path>
```

Wizard создаёт nonsecret operator files в подготовленном private working directory и не:

- принимает token/password/client secret;
- пишет PostgreSQL;
- создаёт auth user/membership;
- запускает provider mutation;
- делает commit/push/deploy.

Dry run:

```bash
pnpm project:add -- --source <private-path> --project-name "Новый проект" --project-slug new-project --site-name "Основной сайт" --site-slug main --site-url https://example.ru --dry-run --yes
```

После создания дополнить goals, cluster/tracked query и provider mapping только подтверждёнными значениями.

## Review и DB onboarding

1. `pnpm verify:config`;
2. проверить private config на secrets/placeholders/route collisions;
3. provider preflight read-only;
4. выполнить `config:sync --source <private-path>` и проверить dry-run;
5. отдельно подтвердить `config:sync --source <private-path> --apply` в безопасном environment;
6. проверить Project/Site/ProviderConnection/Goal/TrackedQuery records;
7. создать user через bounded-stdin admin CLI;
8. добавить membership;
9. проверить analyst/client isolation;
10. выполнить worker sync и четыре periods;
11. release/deploy — отдельная owner-команда.

## Acceptance

- config schema valid;
- bootstrap idempotent, config sync не удаляет business records физически;
- enabled site не использует placeholder;
- web/worker provider configuration совпадает;
- только goals с `includeInSeoConversion=true` входят в unique SEO conversion;
- four valid ReportSnapshots на site;
- source/freshness labels честны;
- client видит только свою organization;
- analyst видит project;
- secrets/raw provider data отсутствуют в Git/browser/logs;
- backup/recovery contract не ослаблен.

Live access и onboarding status подтверждаются preflight/production evidence, а не этим runbook.
