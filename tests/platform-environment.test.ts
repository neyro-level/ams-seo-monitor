import { describe, expect, it } from "vitest";
import { readPublicLeadsEnvironment } from "../src/platform/config/public-environment";
import {
  hasDatabaseConfiguration,
  readAuthEnvironment,
  readDatabaseEnvironment,
  readReleaseSha,
} from "../src/platform/config/server-environment";

describe("platform environment contracts", () => {
  it("accepts complete component database configuration", () => {
    const environment = {
      DATABASE_HOST: "127.0.0.1",
      DATABASE_PORT: "55432",
      DATABASE_USER: "seo_monitor_local",
      DATABASE_PASSWORD: "local-only",
      DATABASE_NAME: "seo_monitor_test",
      DATABASE_SSLMODE: "disable",
    };

    expect(hasDatabaseConfiguration(environment)).toBe(true);
    expect(readDatabaseEnvironment(environment)).toMatchObject({
      DATABASE_PORT: "55432",
      DATABASE_NAME: "seo_monitor_test",
    });
  });

  it("rejects incomplete or malformed database configuration", () => {
    expect(() => readDatabaseEnvironment({ DATABASE_HOST: "127.0.0.1" })).toThrow(
      "invalid or incomplete",
    );
    expect(() =>
      readDatabaseEnvironment({ DATABASE_URL: "https://example.com/database" }),
    ).toThrow("invalid or incomplete");
  });

  it("requires complete HTTPS auth configuration outside loopback", () => {
    expect(readAuthEnvironment({})).toBeNull();
    expect(() => readAuthEnvironment({ BETTER_AUTH_SECRET: "x".repeat(32) })).toThrow(
      "invalid or incomplete",
    );
    expect(() =>
      readAuthEnvironment({
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "http://auth.example.com",
      }),
    ).toThrow("must use HTTPS");
    expect(
      readAuthEnvironment({
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "http://127.0.0.1:3000",
      }),
    ).toEqual({ secret: "x".repeat(32), baseUrl: "http://127.0.0.1:3000" });
  });

  it("validates exact release and public Leads contracts", () => {
    expect(readReleaseSha({ RELEASE_SHA: "a".repeat(40) })).toBe("a".repeat(40));
    expect(() => readReleaseSha({ RELEASE_SHA: "main" })).toThrow("full lowercase Git SHA");
    expect(
      readPublicLeadsEnvironment({
        NEXT_PUBLIC_LEADS_API_URL: "https://ams24.ru/api/leads",
        NEXT_PUBLIC_LEADS_PROJECT_ID: "ams-impulse",
        NEXT_PUBLIC_LEADS_SITE_KEY: "public-site-key-123456",
      }),
    ).toMatchObject({ apiUrl: "https://ams24.ru/api/leads", projectId: "ams-impulse" });
    expect(() =>
      readPublicLeadsEnvironment({
        NEXT_PUBLIC_LEADS_API_URL: "https://attacker.example/api/leads",
        NEXT_PUBLIC_LEADS_PROJECT_ID: "ams-impulse",
        NEXT_PUBLIC_LEADS_SITE_KEY: "public-site-key-123456",
      }),
    ).toThrow("временно не настроена");
  });
});
