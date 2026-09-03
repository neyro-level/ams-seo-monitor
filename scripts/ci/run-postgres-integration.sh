#!/usr/bin/env bash
set -euo pipefail

PG_BIN=/usr/lib/postgresql/18/bin
export PGDATA
PGDATA="$(mktemp -d)"
chown postgres:postgres "$PGDATA"
chmod 0700 "$PGDATA"
gosu postgres "$PG_BIN/initdb" --username=postgres --auth-local=trust --auth-host=scram-sha-256 >/dev/null
gosu postgres "$PG_BIN/pg_ctl" --wait --options="-c listen_addresses=127.0.0.1" start >/dev/null
trap 'gosu postgres "$PG_BIN/pg_ctl" --wait stop >/dev/null' EXIT

TEST_DATABASE_USER=seo_monitor_test
TEST_DATABASE_PASSWORD=ci_test_password
TEST_DATABASE_NAME=seo_monitor_test

"$PG_BIN/psql" --username postgres --dbname postgres --set ON_ERROR_STOP=1 \
  --command "CREATE ROLE ${TEST_DATABASE_USER} LOGIN PASSWORD '${TEST_DATABASE_PASSWORD}'"
"$PG_BIN/createdb" --username postgres --owner "$TEST_DATABASE_USER" "$TEST_DATABASE_NAME"

export TEST_DATABASE_HOST=127.0.0.1
export TEST_DATABASE_PORT=5432
export TEST_DATABASE_USER
export TEST_DATABASE_PASSWORD
export TEST_DATABASE_NAME
export TEST_DATABASE_SSLMODE=disable

pnpm test:integration
