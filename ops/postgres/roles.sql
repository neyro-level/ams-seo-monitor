DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ams_web') THEN
    CREATE ROLE ams_web NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ams_worker') THEN
    CREATE ROLE ams_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ams_migrator') THEN
    CREATE ROLE ams_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ams_backup') THEN
    CREATE ROLE ams_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  END IF;
END
$roles$;

GRANT USAGE ON SCHEMA public, platform, seo, leads, tools, research, contracts, invoices, presentations, site_clone, ops, pgboss TO ams_web, ams_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ams_web, ams_worker;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ams_web, ams_worker;

ALTER DEFAULT PRIVILEGES FOR ROLE ams_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ams_web, ams_worker;
ALTER DEFAULT PRIVILEGES FOR ROLE ams_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ams_web, ams_worker;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ams_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE ams_migrator IN SCHEMA public
  GRANT SELECT ON TABLES TO ams_backup;

-- Login roles are provider-managed secrets. Grant exactly one group role to each
-- login during the production cutover; never reuse a runtime login for migrations
-- or backups.
