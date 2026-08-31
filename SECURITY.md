# SECURITY

## Trust boundaries

### Browser

Browser получает только authenticated HTML/JS/CSS и browser-safe report DTO. Browser не получает provider credentials, raw provider payloads и internal technical snapshots.

### Next.js application

- Better Auth отвечает за session auth;
- route/page access проверяется server-side;
- analyst/client isolation не опирается на скрытые ссылки;
- health endpoints не раскрывают secrets.

### PostgreSQL

- localhost-only access;
- runtime roles separated: app vs migrator;
- no public DB exposure;
- backup/restore mandatory.

### Worker

- отдельный OS user `seo-monitor-worker` и отдельный root-owned env без Better Auth secret;
- единственный runtime, который синхронизирует providers;
- пишет SyncRun, SourceRun, historical metrics, ranking captures, technical snapshots и report snapshots;
- не обслуживает browser requests.

### Nginx

- TLS и HSTS;
- reverse proxy без framework version disclosure;
- internal-only `/api/health/ready`;
- private/no-store/noindex headers;
- не является application auth system.

## Roles

### SEO_ANALYST

Видит все projects/sites/reports.

### CLIENT_VIEWER

Видит только organization-scoped data.

## Security invariants

- Better Auth public signup disabled;
- provider tokens остаются в server environment;
- Prisma и DB URLs не попадают в browser;
- direct Prisma/SQL in UI prohibited;
- provider APIs not callable from browser;
- provider credential sinks accept only exact HTTPS allowlisted API origins;
- web process environment never contains provider tokens;
- auth user passwords are stdin-only, never argv;
- foreign project/site/report access denied server-side;
- local PostgreSQL port not exposed publicly;
- backup secrets not stored in Git.

## Current state

- auth route wired;
- login page exists;
- analyst/client route gating работает;
- health routes работают;
- local backup + restore smoke работают;
- private offsite bucket `ams-seo-monitor-offsite-20260831` активен; отдельный restricted S3 user имеет только `read/write` на этот bucket, shared administrator credential не используется.
