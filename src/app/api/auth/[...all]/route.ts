import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/infrastructure/auth/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveHandler(method: "GET" | "POST") {
  if (!auth) {
    return () => NextResponse.json({ error: "auth_unavailable" }, { status: 503 });
  }

  const handlers = toNextJsHandler(auth);
  return method === "GET" ? handlers.GET : handlers.POST;
}

export async function GET(request: Request) {
  const handler = resolveHandler("GET");
  return handler(request);
}

export async function POST(request: Request) {
  const handler = resolveHandler("POST");
  return handler(request);
}
