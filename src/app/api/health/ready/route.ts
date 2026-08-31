import { NextResponse } from "next/server";
import { getMonitoringService } from "../../../../infrastructure/service-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getMonitoringService().ping();
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
