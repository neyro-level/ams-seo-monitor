# TOKEN ROTATION

Scope:

- provider OAuth/API tokens;
- Better Auth secret;
- PostgreSQL app/migrator passwords;
- offsite backup credentials;
- external delivery credentials when Leads API is involved.

## Rules

- Source of truth: approved Doppler/project protected env.
- Never print secret values in chat, shell history, logs or docs.
- Never pass secrets through argv.
- Rotate one boundary at a time.
- Keep rollback credential until proof passes.
- Production restart/deploy requires separate owner command.
- Web, worker, migrator and backup credentials are not shared.

## Provider Token

1. Create credential with minimal read-only scope when possible.
2. Update worker secret source/protected env.
3. Restart only affected worker runtime through approved operation.
4. Run provider preflight.
5. Run bounded worker smoke.
6. Confirm safe SourceRun/log status.
7. Revoke old token after proof.

Web env must not receive provider tokens.

## Better Auth Secret

1. Record expected session invalidation impact.
2. Update only web secret source/env.
3. Restart web runtime through approved operation.
4. Verify login, disabled user and analyst/client isolation.
5. Confirm secret is absent from build/browser/logs.

## PostgreSQL Credentials

1. Identify app, migrator, test or backup boundary.
2. Create/update credential server-side without printing value.
3. Update only matching protected env.
4. Verify app readiness or migration connectivity.
5. Verify worker separately if app runtime credential changed.
6. Revoke old credential after proof.

No `db push`, restore or destructive operation belongs to credential rotation.

## Backup Credentials

1. Create restricted credential for dedicated private bucket.
2. Update backup env.
3. Run backup upload and HEAD confirmation.
4. Run isolated restore smoke.
5. Revoke old credential after proof.

## Evidence

Record boundary, safe credential identifier, time, smoke checks and result. Never record value, header, DB URL, response body or PII.
