import "server-only";

import type { ActorContext } from "../../application/ports/actor-context";
import type { AnalystOverview } from "../../application/services/analyst-service";
import type { ClientOverview } from "../../application/services/site-service";
import { getAnalystService, getSiteService } from "../../infrastructure/service-container";

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
