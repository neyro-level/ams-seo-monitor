#!/usr/bin/env bash
set -euo pipefail

: "${TEST_DATABASE_USER:?TEST_DATABASE_USER is required}"
: "${TEST_DATABASE_PASSWORD:?TEST_DATABASE_PASSWORD is required}"
: "${TEST_DATABASE_NAME:?TEST_DATABASE_NAME is required}"

[[ "$TEST_DATABASE_USER" =~ (^|_)test($|_) ]] || {
  echo "TEST_DATABASE_USER must identify a dedicated test role" >&2
  exit 1
}
[[ "$TEST_DATABASE_NAME" == *_test ]] || {
  echo "TEST_DATABASE_NAME must end with _test" >&2
  exit 1
}
[[ "$TEST_DATABASE_USER" != "$POSTGRES_USER" ]] || {
  echo "Test and development database roles must differ" >&2
  exit 1
}

psql --username "$POSTGRES_USER" --dbname postgres \
  --set=test_user="$TEST_DATABASE_USER" \
  --set=test_password="$TEST_DATABASE_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'test_user', :'test_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'test_user') \gexec
SQL

psql --username "$POSTGRES_USER" --dbname postgres \
  --set=database_name=seo_monitor_dev \
  --set=database_owner="$POSTGRES_USER" <<'SQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'database_name', :'database_owner')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'database_name') \gexec
SQL

psql --username "$POSTGRES_USER" --dbname postgres \
  --set=database_name="$TEST_DATABASE_NAME" \
  --set=database_owner="$TEST_DATABASE_USER" <<'SQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'database_name', :'database_owner')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'database_name') \gexec
SQL
