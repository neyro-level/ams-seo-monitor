# SECURITY

Security boundary: `multi-tenant / pii / own-saas / Platform Admin enabled`.

## Core Rule

Authorization is deny-by-default. A user can act only when the server proves all required relationships:

```text
active identity
+ active product membership
+ explicit project grant
+ role permission
+ resource belongs to that project
= allow
```

Missing, stale or inconsistent evidence means deny.

## Identity

Better Auth `1.7.2` owns credentials and sessions. AMS owns system roles, product memberships, project grants, permissions, resource authorization and audit.

System roles:

- `PLATFORM_ADMIN` - only global bypass;
- `ANALYST` - internal identity, explicit grants required;
- `CLIENT` - customer identity, explicit grants required.

`PrincipalContext` contains identity/system role/correlation ID. Browser, URL, form, cookie, token claim or first membership never chooses tenant scope.

Public signup, user-created organizations, self-service role editing and arbitrary custom roles are disabled.

## Authorization Contract

```text
authorize(principal, permission, resourceRef)
-> ALLOW | DENY
```

`resourceRef` names product and exact organization/project/resource. Authorization runs for every:

- private Server Component and route handler;
- server action and application command;
- API and export download;
- MCP tool call;
- worker job.

Navigation hiding is not authorization. Unknown or foreign resource returns safe not-found semantics. Error bodies and timing should not intentionally disclose whether a foreign ID exists.

## Product Isolation

- SEO grant never opens Leads or Tools.
- Leads grant never opens SEO or Tools.
- Tools grant never opens client products.
- Organization membership does not open every project.
- No access to future projects is inherited automatically.
- Product-specific access tables use real foreign keys; generic polymorphic grants are forbidden.
- Analyst receives no data solely from `ANALYST` system role.

Changing/revoking membership or project grant writes AuditEvent and revokes active Better Auth sessions. Effective access is rebuilt from database state on the next request.

## PostgreSQL Defense

Application authorization, scoped repositories and composite ownership constraints are mandatory. RLS adds defense in depth for tenant-owned runtime tables:

- `ENABLE ROW LEVEL SECURITY`;
- `FORCE ROW LEVEL SECURITY`;
- runtime roles use `NOBYPASSRLS` and do not own protected tables;
- transaction-local user/product/project context;
- no context means default deny;
- `USING` restricts reads/deletes and `WITH CHECK` restricts inserts/updates;
- web and worker roles cannot run DDL;
- migrator and backup identities are not used by application runtime.

RLS changes require PostgreSQL integration tests proving allowed and denied reads/writes. Backup proof verifies complete dump and restore independently from runtime policies.

## Browser And UI

- Server builds navigation from effective product access.
- Organization/project selectors receive only authorized options.
- Client-side permission checks improve UX only.
- Private responses use `Cache-Control: no-store` where relevant.
- Service worker cannot cache session, API, report, export, research or PII responses.
- Private S3 object keys are never public; download URLs are short-lived and issued after fresh authorization.

## MCP

- Production transport uses OAuth 2.1 + PKCE.
- Access token subject maps to Better Auth user.
- Token scopes may narrow but cannot expand current AMS grants.
- Authorization is re-evaluated on every tool call.
- No browser cookie, universal admin bearer token, generic SQL or direct database tool.
- Paid tool requires a persisted estimate, matching confirmation amount and idempotency key.
- Tool outputs are bounded and redact provider/internal errors.

## Worker And Providers

- JobPrincipal contains exact product, organization, project and job identity.
- Handler verifies payload ownership before data access.
- Provider secrets exist only server-side.
- XMLRiver full URL/query credential/raw response is never logged.
- XML parser disables DTD/external entities and applies response-size limits.
- External call runs outside DB transaction.
- Paid run is reserved durably before queue dispatch.
- Ambiguous paid result becomes `FAILED` with a safe code, never automatic retry.

Research worker sets transaction-local `ams.job_organization_id` and `ams.job_project_id`. RLS allows `ams_worker` only rows matching both values from the validated queue payload.

## Passwords And Sessions

The existing operator-assigned password policy remains until a separate identity-hardening decision. Password and hashes never enter Git, docs, argv, logs or AuditEvent. Password reset, access change and user disable revoke sessions.

No additional authentication factor remains an approved owner exception. Compensating controls: HTTPS/HSTS, closed signup, rate limiting, fresh authorization, session revocation and audit.

## PII, Secrets And Logging

- PII is limited to required identity/product records.
- Production PII is prohibited in fixtures.
- Secrets come from approved Doppler scope/protected server environment.
- Server secrets never use `NEXT_PUBLIC_*`.
- Logs contain safe IDs/counts/status/correlation only.
- Passwords, tokens, cookies, API keys, emails, phones, raw payloads and signed URLs are redacted.
- Public errors contain stable code, safe message and correlation ID.

## Required Access Matrix

Tests must prove:

- SEO-only, Leads-only, SEO+Leads and Tools-only navigation/data behavior;
- project A cannot read project B in same organization;
- tenant A cannot read/write tenant B;
- guessed IDs fail in route/action/API/MCP;
- direct server action invocation fails without access;
- revoked/disabled user loses web and MCP access;
- analyst has only explicit grants;
- RLS denies missing context and cross-tenant inserts/updates;
- backup includes all tenant rows;
- logs/errors reveal no foreign resource or secret data.

## Delivery

Auth, tenancy, RLS, MCP, paid provider, PII and schema changes are `RISKY`. Merge requires diff review, scoped tests, PostgreSQL integration proof and green SourceCraft exact-head gate. Production additionally requires backup/restore, migration and live access smoke after an explicit owner command.
