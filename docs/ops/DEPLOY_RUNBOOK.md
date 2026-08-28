# DEPLOY RUNBOOK

## Статус

Production уже активирован на SHA `797cf812688bf3b6c2405f73374e9340ab43e637`. Следующий release обновляет его только после HEAVY Merge Gate и появления нового exact SHA в SourceCraft `main`.

## Production target

- AMS Main Server;
- immutable release directory;
- shared snapshots outside release;
- Nginx serves static `out/`;
- collector runs separately through `systemd` oneshot + timers.

Production URL:

```text
https://seo-monitor.ams24.ru
```

## Release layout

```text
/opt/ams-platform/ams-seo-monitor/
├── releases/<main-sha>/
│   ├── out/
│   ├── dist-collector/
│   ├── config/
│   ├── ops/
│   ├── node_modules/  # readonly hardlink reuse only when lock SHA matches
│   └── release-manifest.json
├── shared/
│   ├── client-reports/
│   ├── snapshots/
│   ├── sync-state/
│   ├── locks/
│   ├── deployed-sha.txt
│   ├── previous-release.txt
│   └── runtime/current -> node-v24-linux-x64
└── current -> releases/<main-sha>
```

Checked-in production units:

- `ops/nginx/ams-seo-monitor.conf`;
- `ops/systemd/ams-seo-monitor.service`;
- `ops/systemd/ams-seo-monitor.timer`.

Daily timer rebuilds all four report presets; a second weekly API run is intentionally absent because it would duplicate the same collection.

## Deploy sequence

1. merge reviewed PR through exact-head HEAVY gate;
2. clean local `main` equals `origin/main`;
3. run `pnpm release:build`;
4. builder verifies main/clean worktree and creates `.release-artifacts/ams-seo-monitor-<sha>.tar.gz`;
5. run `pnpm release:deploy`;
6. deploy verifies artifact and manifest SHA;
7. dependency lock must match previous readonly `node_modules`, otherwise deploy stops;
8. extract immutable release and atomically switch `current`;
9. install checked-in systemd units;
10. `nginx -t`, reload and collector oneshot;
11. enable/verify timer;
12. authenticated HTML/data isolation smoke;
13. record exact SHA, artifact checksum and previous release.

## Required production inputs

- DNS `seo-monitor.ams24.ru` points to AMS Main Server;
- explicit owner production command;
- exact reviewed SourceCraft `main` SHA;
- project secrets materialized in `/etc/ams-platform/ams-seo-monitor.env`;
- Basic Auth files in `/etc/ams-platform/ams-seo-monitor-auth/`;
- Certbot-issued certificate after the HTTP virtual host passes `nginx -t`.

Secrets, auth files and shared snapshots are never stored inside an immutable release.

## Nginx rule

Checked-in `ops/nginx/ams-seo-monitor.conf` is the canonical TLS config with existing Certbot certificate paths. Deploy backs up the live config, installs the reviewed file, runs `nginx -t` and restores the backup on failure.

Private HTML/data responses require:

```text
Cache-Control: private, no-store, max-age=0
Pragma: no-cache
X-Robots-Tag: noindex, nofollow, noarchive
```

Hashed static assets may remain public immutable.

## Isolation smoke

Expected:

```text
no auth:
/                           → 401
/analyst/                   → 401
/c/REDACTED_CLIENT_DATA/                 → 401
/c/REDACTED_CLIENT_DATA/data/...json     → 401

REDACTED_CLIENT_DATA credentials:
/c/REDACTED_CLIENT_DATA/**               → 200
/analyst/**                 → 401/403
/c/REDACTED_CLIENT_DATA/**             → 401/403

Analyst credentials:
/analyst/**                 → 200
/c/REDACTED_CLIENT_DATA/**               → 200
```

## Rollback

`scripts/deploy-production.mjs` records previous release. If Nginx validation or collector smoke fails before completion, it restores the previous `current` symlink. Manual rollback:

```bash
ln -s <previous-release-path> /opt/ams-platform/ams-seo-monitor/current.rollback
mv -Tf /opt/ams-platform/ams-seo-monitor/current.rollback /opt/ams-platform/ams-seo-monitor/current
nginx -t
systemctl reload nginx
```

Rollback never deletes `shared/`.
