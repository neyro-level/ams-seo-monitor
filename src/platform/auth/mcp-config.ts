export const MCP_SCOPE = "mcp:research" as const;

export function getMcpResource(baseUrl: string) {
  return `${new URL(baseUrl).origin}/mcp`;
}

export function getConfiguredMcpResource(fallbackUrl?: string) {
  const baseUrl = process.env.BETTER_AUTH_URL?.trim() || fallbackUrl;
  if (!baseUrl) throw new Error("BETTER_AUTH_URL_REQUIRED");
  return getMcpResource(baseUrl);
}
