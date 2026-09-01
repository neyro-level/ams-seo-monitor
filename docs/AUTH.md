# AUTH

## Current state

Application auth уже переведён на Better Auth.

Реализовано:

- Better Auth 1.7.2;
- Prisma adapter;
- email/password login;
- public signup disabled;
- route handler `/api/auth/[...all]`;
- login modal on public product page `/`;
- protected routes redirect unauthenticated users to `/?login=1`;
- analyst/client route gating;
- auth admin CLI scripts;
- user creation password is bounded stdin only and never an argv value.

## Roles

### SEO_ANALYST

- видит все projects/sites/reports;
- открывает `/analyst/`;
- проходит server-side authorization без tenant restriction.

### CLIENT_VIEWER

- видит только organization-scoped projects/sites/reports;
- не открывает `/analyst/`;
- при попытке прямого доступа к чужому project/site получает denial через app routing.

## Entry points

- `src/infrastructure/auth/auth.ts`
- `src/infrastructure/auth/auth-client.ts`
- `src/infrastructure/auth/session.ts`
- `src/infrastructure/auth/authorization.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/components/auth/LoginDialog.tsx`
- `src/app/dashboard/page.tsx`
- `scripts/auth-admin.ts`

## Current scripts

```bash
# Password is accepted only through bounded stdin; --password argv is rejected.
doppler secrets get <PASSWORD_SECRET> --plain | pnpm user:create -- --email ... --name ... --system-role CLIENT_VIEWER
pnpm user:disable
pnpm user:set-system-role
pnpm user:add-to-organization
pnpm user:remove-from-organization
```

## Invariants

- Better Auth secret и DB credentials не попадают в browser;
- session auth проверяется server-side;
- public signup off;
- analyst/client isolation не опирается на navigation hiding;
- disabled users return `null` from authorization helper;
- UI routes redirect unauthenticated users to `/?login=1`; the query opens the login modal.

## Verified state

- sign-in endpoint returns session token;
- analyst opens `/analyst/` and site reports;
- client viewer is redirected away from `/analyst/` and sees only own project subtree;
- auth integration tests cover analyst/client/disabled-user matrix.
