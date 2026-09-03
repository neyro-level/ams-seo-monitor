import { z } from "zod";
import type { SiteRegistry } from "../../../src/shared/schemas/registry.ts";
import { requireTrustedApiBaseUrl } from "../trusted-api-url.ts";
import {
  topvisorSiteDataSchema,
  type RankSnapshot,
  type TopvisorSiteData,
} from "../../../src/shared/schemas/rank-source.ts";

export type TopvisorEnvironment = {
  baseUrl: string;
  userId: string;
  apiKey: string;
};

type FetchLike = typeof fetch;

type TopvisorCollectOptions = {
  dateFrom: string;
  dateTo: string;
};

export class TopvisorSafeError extends Error {
  constructor(
    readonly code: string,
    readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = "TopvisorSafeError";
  }
}

function requireEnvironment(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    throw new TopvisorSafeError("TOPVISOR_NOT_CONFIGURED", null, `Missing ${key}`);
  }
  return value;
}

export function readTopvisorEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): TopvisorEnvironment {
  const rawBaseUrl =
    env.TOPVISOR_API_BASE_URL?.trim() || "https://api.topvisor.com/v2/json";
  let baseUrl: string;
  try {
    baseUrl = requireTrustedApiBaseUrl(rawBaseUrl, {
      origin: "https://api.topvisor.com",
      pathname: "/v2/json",
    });
  } catch {
    throw new TopvisorSafeError(
      "UNTRUSTED_ORIGIN",
      null,
      "TOPVISOR_API_BASE_URL is not allowlisted",
    );
  }

  return {
    baseUrl,
    userId: requireEnvironment(env, "TOPVISOR_USER_ID"),
    apiKey: requireEnvironment(env, "TOPVISOR_API_KEY"),
  };
}

const topvisorObjectSchema = z.looseObject({});
type TopvisorObject = z.infer<typeof topvisorObjectSchema>;

function parseTopvisorObject(value: unknown): TopvisorObject | null {
  const parsed = topvisorObjectSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function unwrapResult(value: unknown) {
  const object = parseTopvisorObject(value);
  return object?.result !== undefined ? object.result : value;
}

function firstArray(value: unknown, keys: string[]): unknown[] {
  const source = unwrapResult(value);
  if (Array.isArray(source)) return source;
  const object = parseTopvisorObject(source);
  if (!object) return [];
  for (const key of keys) {
    const candidate = object[key];
    if (Array.isArray(candidate)) return candidate;
    if (parseTopvisorObject(candidate)) {
      const nested = firstArray(candidate, keys);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

function toPosition(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 1 && value <= 250 ? Math.round(value) : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 250
      ? Math.round(parsed)
      : null;
  }
  const object = parseTopvisorObject(value);
  if (object) {
    for (const key of ["position", "pos", "value"]) {
      const nested = toPosition(object[key]);
      if (nested !== null) return nested;
    }
  }
  return null;
}

function queryText(row: Record<string, unknown>) {
  for (const key of ["name", "keyword", "phrase", "query"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function extractDates(payload: unknown, dateFrom: string, dateTo: string) {
  const candidates = firstArray(payload, ["dates", "labels", "xAxis", "x_axis"])
    .map(String)
    .map((value) => value.slice(0, 10))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
  const dates = [...new Set(candidates)].filter(
    (date) => date >= dateFrom && date <= dateTo,
  );
  return dates.length > 0 ? dates.slice(-30) : [dateTo];
}

export function normalizeTopvisorHistory(args: {
  payload: unknown;
  dates: string[];
  fetchedAt: string;
  projectId: number;
  regionIndex: number;
}): TopvisorSiteData {
  const snapshots = new Map<string, RankSnapshot>(
    args.dates.map((date) => [date, { capturedAt: date, queries: [] }]),
  );
  const rows = firstArray(args.payload, ["rows", "items", "keywords", "data"]);

  for (const value of rows) {
    const row = parseTopvisorObject(value);
    if (!row) continue;
    const query = queryText(row);
    if (!query) continue;
    const positions = Array.isArray(row.positionsData)
      ? row.positionsData
      : Array.isArray(row.positions_data)
        ? row.positions_data
        : [];

    for (const [index, date] of args.dates.entries()) {
      const item = positions[index];
      const position = toPosition(item ?? (index === args.dates.length - 1 ? row.position : null));
      snapshots.get(date)?.queries.push({ query, position });
    }
  }

  return topvisorSiteDataSchema.parse({
    schemaVersion: 1,
    fetchedAt: args.fetchedAt,
    projectId: args.projectId,
    regionIndex: args.regionIndex,
    snapshots: [...snapshots.values()].filter((snapshot) => snapshot.queries.length > 0),
  });
}

async function requestTopvisor(args: {
  environment: TopvisorEnvironment;
  service: string;
  method: string;
  body: Record<string, unknown>;
  fetchImpl: FetchLike;
}) {
  const endpoint = `${args.environment.baseUrl.replace(/\/$/, "")}/get/${args.service}/${args.method}`;
  let response: Response;
  try {
    response = await args.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Id": args.environment.userId,
        Authorization: `bearer ${args.environment.apiKey}`,
      },
      body: JSON.stringify(args.body),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new TopvisorSafeError("TOPVISOR_NETWORK_ERROR", null, "Topvisor request failed");
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new TopvisorSafeError(
      response.status === 401 || response.status === 403
        ? "TOPVISOR_ACCESS_DENIED"
        : "TOPVISOR_HTTP_ERROR",
      response.status,
      `Topvisor returned HTTP ${response.status}`,
    );
  }
  const envelope = parseTopvisorObject(payload);
  if (envelope?.errors) {
    throw new TopvisorSafeError("TOPVISOR_API_ERROR", response.status, "Topvisor returned errors");
  }
  return payload;
}

export function createTopvisorClient(
  environment: TopvisorEnvironment,
  fetchImpl: FetchLike = fetch,
) {
  return {
    async collectSiteData(
      site: SiteRegistry,
      options: TopvisorCollectOptions,
    ): Promise<TopvisorSiteData> {
      const projectId = site.topvisor.projectId;
      const regionIndex = site.topvisor.regionIndex;
      if (projectId === null || regionIndex === null) {
        throw new TopvisorSafeError(
          "TOPVISOR_SITE_NOT_CONFIGURED",
          null,
          "Topvisor project mapping is missing",
        );
      }

      const chart = await requestTopvisor({
        environment,
        service: "positions_2",
        method: "summary/chart",
        body: {
          project_id: projectId,
          date1: options.dateFrom,
          date2: options.dateTo,
          show_tops: true,
          show_avg: true,
          show_visibility: true,
          region_index: regionIndex,
        },
        fetchImpl,
      });
      const dates = extractDates(chart, options.dateFrom, options.dateTo);
      const history = await requestTopvisor({
        environment,
        service: "positions_2",
        method: "history",
        body: {
          project_id: projectId,
          dates,
          positions_fields: ["position"],
          regions_indexes: [regionIndex + 1],
        },
        fetchImpl,
      });

      return normalizeTopvisorHistory({
        payload: history,
        dates,
        fetchedAt: new Date().toISOString(),
        projectId,
        regionIndex,
      });
    },
  };
}
