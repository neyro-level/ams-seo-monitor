export const MCP_SCOPE = "mcp:research" as const;

type OAuthSearchParams = Record<string, string | string[] | undefined>;

export function isMcpOAuthLoginRequest(params: OAuthSearchParams) {
  return params.response_type === "code"
    && typeof params.client_id === "string"
    && typeof params.sig === "string"
    && typeof params.ba_iat === "string";
}

export function getMcpResource(baseUrl: string) {
  return `${new URL(baseUrl).origin}/mcp`;
}

export function getConfiguredMcpResource(fallbackUrl?: string) {
  const baseUrl = process.env.BETTER_AUTH_URL?.trim() || fallbackUrl;
  if (!baseUrl) throw new Error("BETTER_AUTH_URL_REQUIRED");
  return getMcpResource(baseUrl);
}
