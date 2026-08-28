# CLIENT ONBOARDING

## Статус

Live local onboarding завершён для трёх сайтов Бастиона. Production auth/deploy ещё не активированы.

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

- верхний продуктовый уровень называется `Проект`;
- do not infer one project credentials from another;
- disabled planned sites stay visible as `Не подключён`;
- onboarding must not expose OAuth, counter IDs or file paths in browser payload;
- wizard никогда не принимает token/client secret/password;
- project creation не выполняет commit, push, build или deploy автоматически.

## Foundation already prepared

- registry-driven client and site routes;
- exact source config for three REDACTED_CLIENT_DATA cities;
- per-site goal allowlists;
- fixture snapshot DTO isolated to `/demo/`;
- separate private SourceCraft repo.

## Operator workflow

Interactive:

```bash
pnpm project:add
```

Preview without writes:

```bash
pnpm project:add \
  --project-name \"Новый проект\" \
  --project-slug new-project \
  --site-name \"Основной сайт\" \
  --site-slug main \
  --site-url https://example.ru \
  --dry-run --yes
```

Wizard creates:

```text
config/clients/{projectSlug}.json
config/goals/{projectSlug}.json
```

Then:

1. inspect Git diff;
2. confirm Webmaster/Metrica access through discovery;
3. update goal allowlist;
4. run `pnpm verify:config`, tests and build;
5. commit/push only by owner command;
6. production onboarding stays a separate release operation.
