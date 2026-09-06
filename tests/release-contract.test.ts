import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production backup identity", () => {
  it("runs both pre-migration and scheduled backups as the postgres OS user", () => {
    const deployScript = readFileSync("scripts/deploy-production.mjs", "utf8");
    const backupUnit = readFileSync(
      "ops/systemd/seo-monitor-db-backup.service",
      "utf8",
    );

    expect(deployScript).toContain(
      'run_with_env_file "$BACKUP_ENV_FILE" runuser -u postgres -- /usr/bin/env REQUIRE_OFFSITE=true',
    );
    expect(backupUnit).toContain("User=postgres\nGroup=postgres");
  });
});

describe("production restore readiness", () => {
  it("waits for the final PostgreSQL server after first-run initialization", () => {
    const restoreScript = readFileSync(
      "ops/postgres/restore-smoke.sh",
      "utf8",
    );
    const initComplete = restoreScript.indexOf(
      "PostgreSQL init process complete; ready for start up.",
    );
    const readiness = restoreScript.indexOf("pg_isready", initComplete);
    const createDatabase = restoreScript.indexOf("createdb", readiness);

    expect(initComplete).toBeGreaterThan(-1);
    expect(readiness).toBeGreaterThan(initComplete);
    expect(createDatabase).toBeGreaterThan(readiness);
    expect(restoreScript).toContain("restore_database_not_ready=true");
    expect(restoreScript).toContain(
      'BACKUP_FILE_RESOLVED="$(readlink -f -- "${BACKUP_FILE}")"',
    );
    expect(restoreScript).toContain(
      '-v "${BACKUP_FILE_RESOLVED}:${CONTAINER_BACKUP_FILE}:ro"',
    );
    expect(restoreScript).not.toContain("BACKUP_DIR_MOUNT");
  });
});
