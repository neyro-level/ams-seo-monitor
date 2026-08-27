# SECURITY

## Роль документа

Этот файл фиксирует security-инварианты AMS SEO Monitor для MVP на static export без application backend auth.

## Trust boundaries

### Browser

Browser получает только защищённые статические HTML/CSS/JS и report JSON DTO. Browser не имеет OAuth tokens, client secrets, htpasswd hashes и прямого доступа к Yandex APIs.

### Collector

Collector — единственный runtime, который читает Yandex APIs. Он запускается как `systemd` oneshot, берёт секреты из server env, нормализует ответы и пишет только safe snapshots.

### Nginx

Production access boundary — Nginx HTTPS + Basic Auth per protected location. Он защищает не только HTML-страницы, но и соответствующие data paths.

## MVP security rules

- Только read-only Yandex scopes: `webmaster:hostinfo` и `metrika:read`.
- Никаких write endpoints Яндекса.
- Никаких URL tokens, secret links и password query params.
- Никаких cookies/sessions/application auth в MVP.
- Никаких секретов в `config/`.
- Никаких raw API responses и secret-bearing error bodies в snapshots.
- Никаких secrets в logs.
- Никаких browser-to-Yandex API calls.

## Что считается секретом

- OAuth access token;
- client secret;
- full authorization header;
- htpasswd file content;
- runtime env values;
- raw error bodies от Yandex API;
- личные идентификаторы пользователей.

## Nonsecret config

В Git допустимы только:

- client/site slugs;
- display names;
- confirmed public site URLs;
- placeholder URLs для disabled planned sites;
- cluster profiles;
- goal-profile names;
- alert thresholds.

## Planned production model

Секреты хранятся в Doppler как source of truth и материализуются в `/etc/ams-platform/ams-seo-monitor.env`. В Git этот файл не попадает.

Planned auth files:

```text
/etc/ams-platform/ams-seo-monitor-auth/
├── analyst.htpasswd
├── REDACTED_CLIENT_DATA.htpasswd
└── REDACTED_CLIENT_DATA.htpasswd
```

Live OAuth adapters уже проверены локально через Doppler. Production env materialization и auth files ещё не создавались.

## Verification focus

Проверки должны ловить:

- секреты в Git/build/browser/logs;
- неправильную client isolation;
- публичные bypass paths;
- неверный enabled placeholder config;
- snapshot schema drift.
