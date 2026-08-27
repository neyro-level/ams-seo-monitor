# CLIENT ONBOARDING

## Статус

Source discovery завершён для трёх сайтов Бастиона. Live report snapshots и production auth ещё не активированы.

## Initial order

1. REDACTED_CLIENT_DATA REDACTED_CLIENT_DATA — Webmaster/Metrica confirmed;
2. REDACTED_CLIENT_DATA REDACTED_CLIENT_DATA — Webmaster/Metrica confirmed;
3. REDACTED_CLIENT_DATA REDACTED_CLIENT_DATA — Webmaster/Metrica confirmed;
4. SZ REDACTED_CLIENT_DATA — after confirmed production inputs.

## Required facts per site

- exact site URL;
- exact Webmaster verified host;
- accessible Metrica counter;
- timezone;
- goal allowlist;
- client auth delivery method.

## Rules

- do not infer one client credentials from another;
- disabled planned sites stay visible as `Не подключён`;
- onboarding must not change route architecture;
- onboarding must not expose OAuth, counter IDs or file paths in browser payload.

## Foundation already prepared

- registry-driven client and site routes;
- exact source config for three REDACTED_CLIENT_DATA cities;
- per-site goal allowlists;
- fixture snapshot DTO isolated to `/demo/`;
- separate private SourceCraft repo.
