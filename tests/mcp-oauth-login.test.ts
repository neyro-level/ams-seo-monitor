import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isMcpOAuthLoginRequest } from "../src/platform/auth/mcp-config.ts";

const authSource = readFileSync(new URL("../src/platform/auth/auth.ts", import.meta.url), "utf8");

describe("MCP OAuth login routing", () => {
  it("uses a query-free login page for provider redirects", () => {
    expect(authSource).toContain('loginPage: "/"');
    expect(authSource).not.toContain('loginPage: "/?');
  });

  it("recognizes a signed authorization-code login request", () => {
    expect(isMcpOAuthLoginRequest({
      response_type: "code",
      client_id: "codex-client",
      sig: "signed-query",
      ba_iat: "1789140000000",
    })).toBe(true);
  });

  it.each([
    { response_type: "code", client_id: "codex-client", ba_iat: "1789140000000" },
    { response_type: "code", sig: "signed-query", ba_iat: "1789140000000" },
    { response_type: "token", client_id: "codex-client", sig: "signed-query", ba_iat: "1789140000000" },
    { login: "1" },
  ])("does not treat an incomplete or ordinary login as OAuth", (params) => {
    expect(isMcpOAuthLoginRequest(params)).toBe(false);
  });
});
