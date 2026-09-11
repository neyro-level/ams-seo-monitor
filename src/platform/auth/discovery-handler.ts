import { auth } from "./auth.ts";

export async function handleAuthDiscovery(request: Request) {
  if (!auth) return new Response(null, { status: 503 });
  const response = await auth.handler(request);
  response.headers.set("Cache-Control", "public, max-age=300");
  return response;
}
