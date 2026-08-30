import { NextResponse } from "next/server";
import { getPrismaClient, hasDatabaseUrl } from "../../../../infrastructure/database/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      {
        status: "unavailable",
        dependency: "postgresql",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    await getPrismaClient().$queryRawUnsafe("select 1");
    return NextResponse.json(
      {
        status: "ready",
        dependency: "postgresql",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        dependency: "postgresql",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
