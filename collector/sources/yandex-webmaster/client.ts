import { webmasterDeviceSchema, webmasterQueryOrderBySchema, type WebmasterHostAccess } from "../../../src/shared/schemas/webmaster-source";
import { WebmasterSafeError, type FetchLike, getWebmasterJson } from "./http";
import {
  buildWebmasterSiteData,
  findExactVerifiedHost,
  normalizeDiagnostics,
  normalizePopularQueries,
  normalizeSiteUrl,
  normalizeSitemaps,
  normalizeSummary,
} from "./normalize";

export type WebmasterEnvironment = {
  token: string;
  baseUrl: string;
  targetSiteUrl: string;
  tokenStatus: string | null;
};

export type WebmasterClientDependencies = {
  fetchImpl?: FetchLike;
  now?: () => string;
};

export function readWebmasterEnvironment(env: NodeJS.ProcessEnv = process.env): WebmasterEnvironment {
  const token = env.YANDEX_WEBMASTER_OAUTH_TOKEN?.trim();
  const baseUrl = env.YANDEX_WEBMASTER_API_BASE_URL?.trim();
  const targetSiteUrl = env.YANDEX_WEBMASTER_SITE_URL?.trim();
  const tokenStatus = env.YANDEX_WEBMASTER_TOKEN_STATUS?.trim() ?? null;

  if (!token) {
    throw new WebmasterSafeError({
      code: "MISSING_ENV",
      endpoint: "env:YANDEX_WEBMASTER_OAUTH_TOKEN",
      message: "Required environment variable is missing: YANDEX_WEBMASTER_OAUTH_TOKEN",
    });
  }

  if (!baseUrl) {
    throw new WebmasterSafeError({
      code: "MISSING_ENV",
      endpoint: "env:YANDEX_WEBMASTER_API_BASE_URL",
      message: "Required environment variable is missing: YANDEX_WEBMASTER_API_BASE_URL",
    });
  }

  if (!targetSiteUrl) {
    throw new WebmasterSafeError({
      code: "MISSING_ENV",
      endpoint: "env:YANDEX_WEBMASTER_SITE_URL",
      message: "Required environment variable is missing: YANDEX_WEBMASTER_SITE_URL",
    });
  }

  if (tokenStatus !== null && tokenStatus.toUpperCase() !== "ACTIVE") {
    throw new WebmasterSafeError({
      code: "TOKEN_INACTIVE",
      endpoint: "env:YANDEX_WEBMASTER_TOKEN_STATUS",
      message: "YANDEX_WEBMASTER_TOKEN_STATUS is not ACTIVE",
    });
  }

  return {
    token,
    baseUrl: baseUrl.replace(/\/$/, ""),
    targetSiteUrl: normalizeSiteUrl(targetSiteUrl),
    tokenStatus,
  };
}

export function createWebmasterClient(config: WebmasterEnvironment, deps: WebmasterClientDependencies = {}) {
  const fetchImpl = deps.fetchImpl;
  const now = deps.now ?? (() => new Date().toISOString());

  async function getUserId() {
    const payload = await getWebmasterJson({
      baseUrl: config.baseUrl,
      token: config.token,
      endpoint: "/user",
      fetchImpl,
    });

    const root = payload as Record<string, unknown>;
    const userId =
      typeof root.user_id === "number" || typeof root.user_id === "string"
        ? String(root.user_id)
        : typeof root.id === "number" || typeof root.id === "string"
          ? String(root.id)
          : null;

    if (!userId) {
      throw new WebmasterSafeError({
        code: "INVALID_RESPONSE",
        endpoint: "/user",
        message: "Yandex Webmaster API did not return user_id",
      });
    }

    return userId;
  }

  async function resolveVerifiedHost(): Promise<WebmasterHostAccess> {
    const userId = await getUserId();
    const hostsPayload = await getWebmasterJson({
      baseUrl: config.baseUrl,
      token: config.token,
      endpoint: `/user/${userId}/hosts`,
      fetchImpl,
    });

    const root = hostsPayload as Record<string, unknown>;
    if (root.user_id === undefined) {
      root.user_id = userId;
    }

    const access = findExactVerifiedHost(root, config.targetSiteUrl);
    if (!access) {
      throw new WebmasterSafeError({
        code: "TARGET_SITE_MISSING",
        endpoint: `/user/${userId}/hosts`,
        message: "Target site is not available to the OAuth user in Yandex Webmaster",
      });
    }

    if (!access.verified) {
      throw new WebmasterSafeError({
        code: "TARGET_SITE_UNVERIFIED",
        endpoint: `/user/${userId}/hosts`,
        message: "Target site exists in Yandex Webmaster but is not verified for this user",
      });
    }

    return access;
  }

  async function preflight() {
    return resolveVerifiedHost();
  }

  async function collectSiteData(options?: {
    queryLimit?: number;
    queryOrders?: Array<"TOTAL_SHOWS" | "TOTAL_CLICKS">;
    devices?: Array<"ALL" | "DESKTOP" | "MOBILE">;
  }) {
    const access = await resolveVerifiedHost();
    const queryLimit = options?.queryLimit ?? 50;
    const queryOrders = options?.queryOrders ?? ["TOTAL_SHOWS", "TOTAL_CLICKS"];
    const devices = options?.devices ?? ["ALL", "DESKTOP", "MOBILE"];

    const summaryPayload = await getWebmasterJson({
      baseUrl: config.baseUrl,
      token: config.token,
      endpoint: `/user/${access.userId}/hosts/${access.hostId}/summary`,
      fetchImpl,
    });
    const diagnosticsPayload = await getWebmasterJson({
      baseUrl: config.baseUrl,
      token: config.token,
      endpoint: `/user/${access.userId}/hosts/${access.hostId}/diagnostics`,
      fetchImpl,
    });
    const sitemapsPayload = await getWebmasterJson({
      baseUrl: config.baseUrl,
      token: config.token,
      endpoint: `/user/${access.userId}/hosts/${access.hostId}/sitemaps`,
      fetchImpl,
    });

    const queryCollections = [];
    for (const orderBy of queryOrders) {
      webmasterQueryOrderBySchema.parse(orderBy);
      for (const device of devices) {
        webmasterDeviceSchema.parse(device);
        const queriesPayload = await getWebmasterJson({
          baseUrl: config.baseUrl,
          token: config.token,
          endpoint: `/user/${access.userId}/hosts/${access.hostId}/search-queries/popular`,
          query: {
            order_by: orderBy,
            query_indicator: ["TOTAL_SHOWS", "TOTAL_CLICKS", "AVG_SHOW_POSITION", "AVG_CLICK_POSITION"],
            device_type_indicator: device,
            limit: queryLimit,
          },
          fetchImpl,
        });
        queryCollections.push(
          normalizePopularQueries({
            payload: queriesPayload,
            orderBy,
            device,
            requestedLimit: queryLimit,
          }),
        );
      }
    }

    return buildWebmasterSiteData({
      fetchedAt: now(),
      access,
      summary: normalizeSummary(summaryPayload, config.targetSiteUrl),
      diagnostics: normalizeDiagnostics(diagnosticsPayload),
      sitemaps: normalizeSitemaps(sitemapsPayload),
      queryCollections,
    });
  }

  return {
    preflight,
    collectSiteData,
  };
}
