#!/usr/bin/env bash
set -euo pipefail

for database in seo_monitor_dev seo_monitor_test; do
  if ! psql --username "$POSTGRES_USER" --dbname postgres --tuples-only --no-align \
    --command "SELECT 1 FROM pg_database WHERE datname = '$database'" | grep -qx 1; then
    psql --username "$POSTGRES_USER" --dbname postgres --command "CREATE DATABASE $database OWNER $POSTGRES_USER"
  fi
done
