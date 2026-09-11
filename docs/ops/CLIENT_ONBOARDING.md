# CLIENT ONBOARDING

Purpose: create a client tenant, project, sites, user access and SEO source setup through bounded audited operations.

## Required Inputs

- organization and project names/slugs;
- user display name and unique lowercase login;
- operator-assigned password: exactly 8 printable ASCII characters;
- tenant role, default `VIEWER`;
- for each site: name, slug, exact HTTPS URL, timezone, Topvisor region;
- 20–100 unique approved queries per site;
- two Metrika business goals: `LEAD_SUBMIT` and `PHONE_CLICK`.

Credentials and provider IDs must not be copied from another project by analogy.

## Flow

1. Platform Admin opens `/admin/`.
2. Admin runs client provisioning wizard.
3. One transaction creates Organization → Project → Sites → User credential → Membership → SearchTargets → TrackedQuerySet → AuditEvent → OutboxEvent.
4. Admin sends password through a private channel outside Git/docs/logs.
5. User signs in and lands on `/dashboard/`, seeing only assigned organization.
6. Worker discovers Yandex Webmaster/Metrika mappings.
7. Admin confirms two Metrika goals if source is `ACTION_REQUIRED`.
8. Worker finds or creates Topvisor project, adds Yandex/Google × desktop/mobile targets and imports missing queries.
9. Worker performs price-check, reserves unique `ProviderOperation`, then starts first paid rank check.
10. First report and notifications are reviewed for honest `fresh/partial/stale/unavailable` states.

Deploy/release is a separate owner command.

## Private Config Sync

`config:sync --source <private-path>` is explicit operator work:

- dry-run by default;
- write only with `--apply`;
- no deploy-time config import;
- no physical deletion of history.

## Acceptance

- Provisioning is atomic.
- Duplicate login/slug returns safe error.
- Password is absent from logs, AuditEvent, URL and Git.
- Public signup stays disabled.
- Client sees only its organization.
- Every enabled site has required provider mappings or honest `ACTION_REQUIRED`.
- Topvisor setup has four search targets and 20–100 query core.
- Replayed onboarding event does not repeat paid checker.
- Admin/Analyst receive safe notifications; Client Viewer does not get `/notifications/`.
- Secrets/raw provider data are absent from browser/logs/docs.
