import { NextResponse } from "next/server";
import { readReleaseSha } from "../../../../platform/config/server-environment";
import { createCorrelationId } from "../../../../platform/http/correlation";
import { liveHealthSchema } from "../../../../platform/http/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const correlationId = createCorrelationId();
  const payload = liveHealthSchema.parse({
    status: "ok",
    service: "ams-seo-monitor",
    releaseSha: readReleaseSha(),
    correlationId,
    time: new Date().toISOString(),
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      "X-Correlation-ID": correlationId,
    },
  });
}
