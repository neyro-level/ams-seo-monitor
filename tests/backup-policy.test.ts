import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scriptPath = "ops/postgres/backup.sh";

function runBackupPolicy(environment: NodeJS.ProcessEnv) {
  const env = { ...process.env };
  for (const key of [
    "REQUIRE_OFFSITE",
    "S3_BUCKET",
    "S3_ENDPOINT",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ]) {
    delete env[key];
  }
  for (const [key, value] of Object.entries(environment)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  return spawnSync("bash", [scriptPath], {
    encoding: "utf8",
    env,
    timeout: 3000,
  });
}

const backupPolicyDescription = process.platform === "win32" ? describe.skip : describe;

describe("RLS backup policy", () => {
  it("fails closed before dump/upload when FORCE RLS exists without BYPASSRLS", () => {
    const script = readFileSync(scriptPath, "utf8");

    expect(script).toContain("relforcerowsecurity");
    expect(script).toContain('if [ "${HAS_FORCED_RLS}" = "t" ] && [ "${BACKUP_BYPASS_RLS}" != "t" ]');
    expect(script.indexOf("backup_rls_preflight_failed=true")).toBeLessThan(
      script.indexOf("pg_dump --format=custom"),
    );
  });
});

backupPolicyDescription("production backup policy", () => {
  it.each([undefined, "false", "TRUE", "1"])(
    "rejects a non-mandatory offsite mode: %s",
    (requireOffsite) => {
      const result = runBackupPolicy({
        REQUIRE_OFFSITE: requireOffsite,
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("offsite_backup_policy_invalid=true");
    },
  );

  it("rejects missing S3 credentials before creating a local dump", () => {
    const result = runBackupPolicy({
      REQUIRE_OFFSITE: "true",
      S3_BUCKET: "",
      S3_ENDPOINT: "",
      AWS_ACCESS_KEY_ID: "",
      AWS_SECRET_ACCESS_KEY: "",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("offsite_backup_configuration_missing=true");
  });
});
