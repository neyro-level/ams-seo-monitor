# Module: Identity Access

## Purpose

Separates Better Auth identity/session lifecycle from AMS business authorization. Builds fresh server-only `PrincipalContext` and owns user/membership administration.

## Ownership

- Better Auth: identity, password credential, sessions, verification records.
- AMS: `systemRole`, Organization Membership, tenant role, permissions, resource authorization and safe audit markers.

Public signup, password recovery, invitations, impersonation, Organization Plugin and second auth provider are out of scope.

## Principals

- `platform-admin`: platform management, explicit target organization for cross-tenant operations.
- `platform-analyst`: global project/report/sync read.
- `tenant-user`: fresh Membership with `ORG_OWNER`, `ORG_MEMBER` or `VIEWER`.
- `job`: created by server worker flow.
- `api-client`: reserved, not active.

Browser never creates `PrincipalContext`. Disabled User and removed Membership fail on the next fresh principal read.

## Commands And Queries

Commands: provision client user, reset password, enable/disable user, change tenant role, add/remove Membership.

Queries: browser-safe users, memberships and form options. Password hash, session token and unnecessary PII are not DTO.

## Invariants

- Password is exactly 8 printable ASCII characters and is passed only through protected UI/stdin.
- Password reset revokes sessions.
- Platform principals do not receive fake `organizationId`.
- Tenant principal requires active Membership.
- Every successful mutation writes safe AuditEvent in the same transaction.

## Tests

Principal matrix, closed signup, duplicate login, password length, session revocation, disabled user, membership removal, tenant isolation and atomic provisioning.
