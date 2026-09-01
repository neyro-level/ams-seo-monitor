# SECURITY

## Trust boundaries

### Browser

Browser получает публичные страницы, login/contact modals и после авторизации browser-safe report DTO. Browser не получает provider credentials, raw provider payloads, internal technical snapshots, DB URLs или Better Auth secret.

### Next.js application

- Better Auth отвечает за session auth;
- route/page access проверяется server-side;
- analyst/client isolation не опирается на скрытые ссылки;
- health endpoints не раскрывают secrets.

### AMS Leads API

- публичная contact form отправляет только имя, телефон, source/UTM и технические anti-spam metadata;
- `NEXT_PUBLIC_LEADS_SITE_KEY` — публичный идентификатор сайта, не credential доступа к данным;
- Leads API проверяет project, site key, exact origin, honeypot, минимальное время заполнения и rate limit;
- заявка не сохраняется в PostgreSQL AMS IMPULSE и передаётся в настроенный Max channel через отдельный AMS Leads API;
- bot token и Max chat ID остаются только в server environment Leads API.

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
- AMS Leads API — отдельный allowlisted lead-intake boundary, не provider API;
- имя и телефон не пишутся в browser/server logs AMS IMPULSE;
- web process environment never contains provider tokens;
- auth user passwords are stdin-only, never argv;
- foreign project/site/report access denied server-side;
- local PostgreSQL port not exposed publicly;
- backup secrets not stored in Git.

## Current state

- auth route wired;
- login modal wired on public `/`;
- analyst/client route gating работает;
- health routes работают;
- local backup + restore smoke работают;
- private offsite bucket `ams-seo-monitor-offsite-20260831` активен; отдельный restricted S3 user имеет только `read/write` на этот bucket, shared administrator credential не используется.
- AMS IMPULSE registered in AMS Leads API with Max delivery enabled.
