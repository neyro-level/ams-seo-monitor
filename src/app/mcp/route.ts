import { createMcpHandler } from "@modelcontextprotocol/server";
import { requireMcpAuth } from "@better-auth/mcp";
import { auth } from "@/modules/identity-access/server";
import { createResearchMcpServer } from "@/modules/research/mcp/research-mcp-server";
import { createResearchMcpServices } from "@/modules/research/server";
import { getConfiguredMcpResource, MCP_SCOPE } from "@/platform/auth/mcp-config";
import { getIdentityPrincipalByUserId } from "@/platform/authorization/principal-factories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function forbidden() {
  return Response.json({ jsonrpc: "2.0", error: { code: -32001, message: "Access denied" }, id: null }, { status: 403, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!auth) return new Response(null, { status: 503 });
  const resource = getConfiguredMcpResource(request.url);
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(resource).origin) return forbidden();
  const protectedHandler = requireMcpAuth(auth, async (verifiedRequest, claims) => {
    if (typeof claims.sub !== "string") return forbidden();
    const principal = await getIdentityPrincipalByUserId(claims.sub);
    if (!principal) return forbidden();
    const handler = createMcpHandler(() => createResearchMcpServer({
      principal,
      ...createResearchMcpServices(principal),
    }), { legacy: "reject" });
    return handler.fetch(verifiedRequest);
  }, { resource, requiredScopes: [MCP_SCOPE], challengeScopes: [MCP_SCOPE] });
  const response = await protectedHandler(request);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
