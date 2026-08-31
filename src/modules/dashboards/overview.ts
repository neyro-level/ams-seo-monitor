import "server-only";

import type { AuthenticatedUser } from "../../application/ports/authenticated-user";
import type { AnalystOverview } from "../../application/services/analyst-service";
import type { ClientOverview } from "../../application/services/site-service";
import { getAnalystService, getSiteService } from "../../infrastructure/service-container";

export async function buildAnalystOverview(
  user: AuthenticatedUser,
): Promise<AnalystOverview> {
  return getAnalystService().getDashboardForUser(user);
}

export async function buildClientOverview(
  user: AuthenticatedUser,
  clientSlug: string,
): Promise<ClientOverview | null> {
  return getSiteService().getProjectOverviewForUser(user, clientSlug);
}
