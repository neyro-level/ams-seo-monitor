\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset fieldsep '|'

CREATE TEMP TABLE verification_row_counts (
  schema_name text NOT NULL,
  table_name text NOT NULL,
  row_count bigint NOT NULL
);

DO $counts$
DECLARE
  relation record;
  count_value bigint;
BEGIN
  FOR relation IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      AND schemaname NOT LIKE 'pg_temp_%'
      AND schemaname NOT LIKE 'pg_toast_temp_%'
    ORDER BY schemaname, tablename
  LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I', relation.schemaname, relation.tablename)
      INTO count_value;
    INSERT INTO verification_row_counts (schema_name, table_name, row_count)
      VALUES (relation.schemaname, relation.tablename, count_value);
  END LOOP;
END
$counts$;

SELECT schema_name, table_name, row_count
FROM verification_row_counts
ORDER BY schema_name, table_name;
