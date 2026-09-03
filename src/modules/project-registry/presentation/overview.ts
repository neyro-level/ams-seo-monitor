import "server-only";

import type { ActorContext } from "../../identity-access/index";
import type { AnalystOverview } from "../application/analyst-service";
import type { ClientOverview } from "../application/site-service";
import { getAnalystService, getSiteService } from "../../../infrastructure/service-container";

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
