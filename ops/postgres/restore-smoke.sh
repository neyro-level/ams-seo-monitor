#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-seo_monitor_prod}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/ams-seo-monitor-postgres}"
BACKUP_FILE="${BACKUP_FILE:-${BACKUP_ROOT}/latest.dump}"
RESTORE_DB="seo_monitor_restore_smoke_$(date -u +%Y%m%d%H%M%S)"
MIN_PROJECT_COUNT="${MIN_PROJECT_COUNT:-1}"
MIN_SITE_COUNT="${MIN_SITE_COUNT:-1}"
MIN_REPORT_COUNT="${MIN_REPORT_COUNT:-1}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "missing_backup=${BACKUP_FILE}" >&2
  exit 1
fi

cleanup() {
  sudo -u postgres dropdb --if-exists "${RESTORE_DB}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

sudo -u postgres createdb -O seo_monitor_migrator "${RESTORE_DB}"
sudo -u postgres pg_restore --clean --if-exists --no-owner --no-privileges -d "${RESTORE_DB}" "${BACKUP_FILE}"

RESTORED_DB="$(sudo -u postgres psql -At -d "${RESTORE_DB}" -c 'select current_database()')"
OWNER_NAME="$(sudo -u postgres psql -At -d postgres -c "select pg_catalog.pg_get_userbyid(datdba) from pg_database where datname = '${RESTORE_DB}'")"
SCHEMA_COUNT="$(sudo -u postgres psql -At -d "${RESTORE_DB}" -c "select count(*) from information_schema.schemata where schema_name not like 'pg_%' and schema_name <> 'information_schema'")"
MIGRATION_COUNT="$(sudo -u postgres psql -At -d "${RESTORE_DB}" -c 'select count(*) from "_prisma_migrations"' 2>/dev/null || echo 0)"
PROJECT_TABLE="$(sudo -u postgres psql -At -d "${RESTORE_DB}" -c "select to_regclass('public.\"Project\"') is not null")"
SITE_TABLE="$(sudo -u postgres psql -At -d "${RESTORE_DB}" -c "select to_regclass('public.\"Site\"') is not null")"
REPORT_TABLE="$(sudo -u postgres psql -At -d "${RESTORE_DB}" -c "select to_regclass('public.\"ReportSnapshot\"') is not null")"
PROJECT_COUNT="$(sudo -u postgres psql -At -d "${RESTORE_DB}" -c 'select count(*) from "Project"')"
SITE_COUNT="$(sudo -u postgres psql -At -d "${RESTORE_DB}" -c 'select count(*) from "Site"')"
REPORT_COUNT="$(sudo -u postgres psql -At -d "${RESTORE_DB}" -c 'select count(*) from "ReportSnapshot"')"

if [ "${RESTORED_DB}" != "${RESTORE_DB}" ]; then
  echo "restore_db_mismatch=${RESTORED_DB}" >&2
  exit 1
fi

if [ "${OWNER_NAME}" != "seo_monitor_migrator" ]; then
  echo "restore_owner_mismatch=${OWNER_NAME}" >&2
  exit 1
fi

if [ "${MIGRATION_COUNT}" -lt 1 ]; then
  echo "restore_migrations_missing=${MIGRATION_COUNT}" >&2
  exit 1
fi

if [ "${PROJECT_TABLE}" != "t" ] || [ "${SITE_TABLE}" != "t" ] || [ "${REPORT_TABLE}" != "t" ]; then
  echo "restore_tables_missing=project:${PROJECT_TABLE},site:${SITE_TABLE},report:${REPORT_TABLE}" >&2
  exit 1
fi


if [ "${PROJECT_COUNT}" -lt "${MIN_PROJECT_COUNT}" ] || [ "${SITE_COUNT}" -lt "${MIN_SITE_COUNT}" ] || [ "${REPORT_COUNT}" -lt "${MIN_REPORT_COUNT}" ]; then
  echo "restore_row_sanity_failed=project:${PROJECT_COUNT},site:${SITE_COUNT},report:${REPORT_COUNT}" >&2
  exit 1
fi

echo "restore_status=ok"
echo "restore_db=${RESTORE_DB}"
echo "restore_schema_count=${SCHEMA_COUNT}"
echo "restore_migration_count=${MIGRATION_COUNT}"
echo "restore_project_count=${PROJECT_COUNT}"
echo "restore_site_count=${SITE_COUNT}"
echo "restore_report_count=${REPORT_COUNT}"
echo "source_backup=${BACKUP_FILE}"
