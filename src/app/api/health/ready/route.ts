import { NextResponse } from "next/server";
import {
  getMonitoringService,
  getReliabilityService,
} from "../../../../infrastructure/service-container";
import { hasAuthConfiguration } from "../../../../infrastructure/auth/auth";
import { readReleaseSha } from "../../../../platform/config/server-environment";
import { createCorrelationId } from "../../../../platform/http/correlation";
import { createPublicErrorResponse } from "../../../../platform/http/error-envelope";
import { readyHealthSchema } from "../../../../platform/http/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const correlationId = createCorrelationId();

  try {
    if (!hasAuthConfiguration()) {
      throw new Error("Auth configuration is unavailable");
    }
    const [, outbox] = await Promise.all([
      getMonitoringService().ping(),
      getReliabilityService().getHealth(),
    ]);

    return NextResponse.json(
      readyHealthSchema.parse({
        status: "ready",
        service: "ams-seo-monitor",
        releaseSha: readReleaseSha(),
        correlationId,
        dependencies: {
          postgresql: "ready",
          auth: "configured",
          outbox,
        },
      }),
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Correlation-ID": correlationId,
        },
      },
    );
  } catch {
    return createPublicErrorResponse(
      {
        code: "READINESS_FAILED",
        message: "Сервис временно не готов принимать запросы.",
        correlationId,
      },
      503,
    );
  }
}
