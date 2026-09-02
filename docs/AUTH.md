# AUTH

## Модель

Better Auth `1.7.2` с Prisma adapter, username plugin и organization plugin — единственный application auth boundary.

- public signup выключен;
- accounts создаёт только operator CLI;
- private routes проверяют session server-side;
- tenant access определяется memberships в PostgreSQL;
- Nginx не заменяет auth.

## Roles

### SEO_ANALYST

- global read access к projects/sites/reports;
- доступ к `/analyst/`;
- не получает provider credentials через UI.

### CLIENT_VIEWER

- доступ только к project subtree своей organization membership;
- не открывает `/analyst/`;
- foreign project/site/report получает denial/not-found.

## Sign-in

- login identifier: immutable lowercase `username`;
- username ограничен `a-z`, digits и `_`, длина 3–30;
- Better Auth email field остаётся внутренним compatibility field;
- password policy для operator provisioning: ровно 8 цифр;
- password читается bounded stdin и запрещён в argv;
- login modal расположен на public `/`; `?login=1` открывает его после redirect.

## Authorization flow

```text
request headers
→ Better Auth session
→ getCurrentAuthenticatedUser
→ fresh User read
→ disabledAt check
→ SEO_ANALYST global scope или Member organization IDs
→ scoped repository query
→ DTO
```

Удаление membership или установка `disabledAt` влияет на следующий server-side read; navigation hiding не участвует в решении.

## Entry points

- `src/infrastructure/auth/auth.ts` — Better Auth configuration;
- `src/infrastructure/auth/session.ts` — request session;
- `src/infrastructure/auth/authorization.ts` — active user/project/site access;
- `src/app/api/auth/[...all]/route.ts` — auth HTTP handler;
- `src/components/auth/LoginDialog.tsx` — client login UI;
- `scripts/auth-admin.ts` — operator provisioning and access changes.

## Admin commands

```bash
# Password is provided through stdin; --password is rejected.
<secret-provider> | pnpm user:create -- --username <name> --name <display-name> --system-role CLIENT_VIEWER
pnpm user:disable -- --username <name>
pnpm user:set-system-role -- --username <name> --system-role SEO_ANALYST
pnpm user:add-to-organization -- --username <name> --organization <slug>
pnpm user:remove-from-organization -- --username <name> --organization <slug>
```

Команды требуют server-side DB env. Они не запускаются из browser, не делают deploy и не печатают password.

## Failure behavior

- auth без обязательной DB/secret/base URL configuration возвращает safe 503 route response;
- unauthenticated page redirect: `/?login=1`;
- non-analyst `/analyst/` redirect: `/dashboard/`;
- disabled user считается unauthenticated;
- foreign tenant route не раскрывает чужие данные.

## Проверки

- analyst/client/disabled-user matrix;
- cross-tenant project/site/report denial;
- public signup disabled;
- username normalization/uniqueness/immutability;
- password not accepted through argv;
- membership add/remove behavior;
- auth unavailable safe response;
- no auth secrets/Prisma records in browser payload.

Live login smoke требует отдельные test credentials и не подменяется unit tests.
