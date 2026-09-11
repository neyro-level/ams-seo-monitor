import { handleAuthDiscovery } from "@/platform/auth/discovery-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleAuthDiscovery;
export const HEAD = handleAuthDiscovery;
