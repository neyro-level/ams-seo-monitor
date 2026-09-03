import "server-only";

import type { ActorContext } from "../../identity-access/index.ts";
import type { AnalystOverview } from "../application/analyst-service.ts";
import type { ClientOverview } from "../application/site-service.ts";
import { getAnalystService, getSiteService } from "../../../infrastructure/service-container.ts";

export async function buildAnalystOverview(
  user: ActorContext,
): Promise<AnalystOverview> {
  return getAnalystService().getDashboardForUser(user);
}

export async function buildClientOverview(
  user: ActorContext,
  clientSlug: string,
): Promise<ClientOverview | null> {
  return getSiteService().getProjectOverviewForUser(user, clientSlug);
}
