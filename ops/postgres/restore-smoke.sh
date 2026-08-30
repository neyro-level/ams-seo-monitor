#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-seo_monitor_prod}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/ams-seo-monitor-postgres}"
BACKUP_FILE="${BACKUP_FILE:-${BACKUP_ROOT}/latest.dump}"
RESTORE_DB="seo_monitor_restore_smoke_$(date -u +%Y%m%d%H%M%S)"

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

if [ "${RESTORED_DB}" != "${RESTORE_DB}" ]; then
  echo "restore_db_mismatch=${RESTORED_DB}" >&2
  exit 1
fi

if [ "${OWNER_NAME}" != "seo_monitor_migrator" ]; then
  echo "restore_owner_mismatch=${OWNER_NAME}" >&2
  exit 1
fi

echo "restore_status=ok"
echo "restore_db=${RESTORE_DB}"
echo "restore_schema_count=${SCHEMA_COUNT}"
echo "source_backup=${BACKUP_FILE}"
