# TOKEN ROTATION

## Current scope

Rotation policy covers:

- provider OAuth tokens;
- Better Auth secret;
- PostgreSQL app/migrator passwords;
- backup credentials.

## Rules

- secrets live in Doppler and server env, not Git;
- rotations must not print secret values to chat or logs;
- DB role rotation must be followed by connectivity verification;
- Better Auth secret rotation must preserve session strategy intentionally;
- provider token rotation must preserve read-only scopes.

## Current note

Basic Auth credentials are no longer part of the target application architecture.
