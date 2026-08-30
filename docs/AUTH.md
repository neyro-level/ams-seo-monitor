# AUTH

## Status

Wave 0 target authentication and authorization model.

Current production still relies on Nginx Basic Auth and path isolation. This document defines the application-level target that will replace it.

## Target stack

- Better Auth stable;
- Prisma adapter;
- email/password;
- session support;
- organization plugin.

Public signup:

- disabled.

## Core principle

Authentication answers:

```text
кто пользователь?
```

Authorization answers:

```text
что этот пользователь может читать и делать?
```

These concerns must remain separate in code.

## Roles

### `SEO_ANALYST`

System-level role.

Can:

- view all organizations;
- view all projects;
- view all sites;
- view all reports;
- view sync and readiness information;
- use analyst-only views.

Cannot:

- bypass provider read-only restrictions;
- self-assign other protected security capabilities without server-side authorization.

### `CLIENT_VIEWER`

Tenant-scoped role through organization membership.

Can view only:

```text
Organization membership
  ↓
Projects of that Organization
  ↓
Sites of those Projects
  ↓
Reports of those Sites
```

Cannot:

- see sibling organizations;
- see analyst-only views;
- access provider credentials;
- read raw/internal source bundles.

## Identity model

```text
User
  ├── systemRole
  ├── sessions
  └── memberships

Organization
  └── members
        ↓
      Project
        ↓
        Site
```

Organization is the tenant boundary. Project remains the visible business layer in UI.

## Better Auth entities

Required baseline models:

- `User`;
- `Session`;
- `Account`;
- `Verification`;
- `Organization`;
- `Member`;
- `Invitation`.

The product adds:

- system role on `User` or adjacent table;
- application-level link from `Organization` to `Project`.

Teams are out of scope.

## Session policy

- session-based auth for web app;
- secure server-side checks on every protected read;
- anonymous user denied by default;
- no authorization through middleware-only assumptions;
- no trust in hidden links or route shape.

## Authorization policy

Every protected server read must enforce scope before data leaves the server.

Examples:

- `getProjectsForUser(user)` returns all projects only for analyst;
- `getProject(user, slug)` denies access if project does not belong to the user organization;
- `getSiteReport(user, clientSlug, siteSlug, periodKey)` verifies tenant ownership or analyst role before loading the report.

Forbidden patterns:

- relying on `clientSlug` from URL as sufficient proof;
- filtering only navigation but not data query;
- returning broad Prisma records and filtering in React;
- exposing cross-tenant IDs in browsable lists.

## Entry points

Expected route ownership:

- Better Auth handlers;
- login/logout flows;
- user/session utilities;
- admin CLI for initial users and membership management.

Route handlers are justified for:

- Better Auth;
- browser-initiated protected mutations;
- health endpoints.

Server Components should call services directly when no public HTTP boundary is needed.

## Initial user management

Instead of building a large admin UI immediately, create operational scripts/commands:

- `user:create`;
- `user:disable`;
- `user:set-system-role`;
- `user:add-to-organization`;
- `user:remove-from-organization`.

These scripts must run server-side only and must not log passwords or secrets.

## Migration boundary

During cutover there must not remain two permanent auth systems.

Interim coexistence may exist only while code is incomplete inside the branch, but final architecture target is:

- Better Auth for application access;
- Nginx for TLS, reverse proxy and hardening only;
- no Basic Auth for normal product access.

## Security rules

- secrets stay in server environment;
- Better Auth secret never enters `NEXT_PUBLIC_*`;
- session cookies use secure production settings;
- public signup disabled;
- role assignment only through server-side admin path;
- invitation/member flows cannot self-escalate role;
- protected endpoints do not leak internal data on denial.

## Test matrix

Required authorization coverage:

```text
Analyst → Client A = allowed
Analyst → Client B = allowed
Client A → Client A = allowed
Client A → Client B = denied
Anonymous → protected = denied
```

Also verify direct URL access to foreign report and foreign project overview.

## Wave 4 acceptance target

Wave 4 is complete when:

- Better Auth is wired to Prisma;
- first analyst user exists;
- at least one client viewer user exists;
- organization membership enforces tenant scope;
- protected reads use application authorization, not Basic Auth;
- auth tests cover cross-tenant denial and analyst full access.