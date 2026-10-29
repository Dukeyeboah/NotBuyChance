export interface QlooEntity {
  id: string;
  name: string;
  entityType: string;
  description: string;
  tags: string[];
  imageUrl?: string;
  address?: string;
  popularity?: number;
  affinity?: number;
}

export interface QlooTag {
  id: string;
  name: string;
  type: string;
}

interface CacheEntry {
  at: number;
  data: unknown;
}

const cache = new Map<string, CacheEntry>();
const CACHE_MS = 15 * 60 * 1000;

function baseUrl(): string {
  return (process.env.QLOO_API_BASE || "https://hackathon.api.qloo.com").replace(
    /\/$/,
    "",
  );
}

function asEntity(raw: Record<string, unknown>): QlooEntity | null {
  const id = String(raw.entity_id || raw.id || "");
  const name = String(raw.name || "");
  if (!id || !name) return null;
  const properties = (raw.properties || {}) as Record<string, unknown>;
  const typeCandidates = [
    raw.subtype,
    ...(Array.isArray(raw.types) ? raw.types : []),
    raw.type,
  ].filter((value): value is string => typeof value === "string");
  const types = typeCandidates.filter(
    (value) => value.startsWith("urn:entity:") && value !== "urn:entity",
  );
  const tagRows = Array.isArray(raw.tags) ? raw.tags : [];
  const tags = tagRows
    .map((tag) => {
      if (typeof tag === "string") return tag;
      if (tag && typeof tag === "object" && "name" in tag) {
        return String((tag as { name?: unknown }).name || "");
      }
      return "";
    })
    .filter(Boolean)
    .slice(0, 8);

  let address: string | undefined;
  if (typeof properties.address === "string" && properties.address.trim()) {
    address = properties.address.trim();
  } else if (properties.location && typeof properties.location === "object") {
    const location = properties.location as Record<string, unknown>;
    const parts = [location.name, location.admin1_region, location.country_code]
      .map((part) => (typeof part === "string" ? part : ""))
      .filter(Boolean);
    if (parts.length) address = parts.join(", ");
  }

  const image = properties.image as { url?: string } | undefined;
  const query = raw.query as { affinity?: number } | undefined;
  const description = String(
    properties.short_description || properties.description || "",
  ).slice(0, 320);

  return {
    id,
    name,
    entityType: types[0] || "unknown",
    description,
    tags,
    imageUrl: image?.url,
    address,
    popularity: typeof raw.popularity === "number" ? raw.popularity : undefined,
    affinity: typeof query?.affinity === "number" ? query.affinity : undefined,
  };
}

async function qlooGet(
  path: string,
  params: Record<string, string | undefined>,
): Promise<unknown> {
  const key = process.env.QLOO_API_KEY;
  if (!key) throw new Error("QLOO_API_KEY is not configured.");

  const url = new URL(path, baseUrl());
  for (const [name, value] of Object.entries(params)) {
    if (value) url.searchParams.set(name, value);
  }
  const cacheKey = url.toString();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const response = await fetch(url, {
    headers: { "X-Api-Key": key, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });

  if (response.status === 404) return { results: [] };
  if (!response.ok) {
    console.error("[qloo] request failed", response.status, path);
    throw new Error(`Qloo request failed (${response.status}).`);
  }

  const data = await response.json();
  cache.set(cacheKey, { at: Date.now(), data });
  return data;
}

export async function searchEntities(
  query: string,
  type?: string,
  take = 5,
): Promise<QlooEntity[]> {
  const data = (await qlooGet("/search", {
    query,
    take: String(take),
    types: type || undefined,
  })) as { results?: Record<string, unknown>[] };
  const rows = Array.isArray(data.results) ? data.results : [];
  return rows
    .map((row) => asEntity(row))
    .filter((entity): entity is QlooEntity => Boolean(entity));
}

export async function searchTags(query: string, take = 6): Promise<QlooTag[]> {
  const data = (await qlooGet("/v2/tags", {
    "filter.query": query,
    take: String(take),
  })) as { results?: { tags?: Record<string, unknown>[] } };
  const rows = data.results?.tags ?? [];
  return rows
    .map((tag) => ({
      id: String(tag.id || ""),
      name: String(tag.name || ""),
      type: String(tag.type || ""),
    }))
    .filter((tag) => tag.id && tag.name);
}

export async function getInsights(options: {
  filterType: string;
  entityIds?: string[];
  tagIds?: string[];
  locationQuery?: string;
  tagFilter?: string;
  take?: number;
}): Promise<QlooEntity[]> {
  const data = (await qlooGet("/v2/insights", {
    "filter.type": options.filterType,
    take: String(options.take ?? 6),
    "signal.interests.entities": options.entityIds?.slice(0, 5).join(","),
    "signal.interests.tags": options.tagIds?.slice(0, 4).join(","),
    "filter.location.query": options.locationQuery,
    "filter.tags": options.tagFilter,
  })) as { results?: { entities?: Record<string, unknown>[] } };
  const rows = data.results?.entities ?? [];
  return rows
    .map((row) => asEntity(row))
    .filter((entity): entity is QlooEntity => Boolean(entity));
}

export function pickEntity(
  results: QlooEntity[],
  query: string,
): QlooEntity | null {
  const wanted = query.trim().toLowerCase();
  if (wanted.length < 3) return null;
  const exact = results.find((result) => result.name.toLowerCase() === wanted);
  if (exact) return exact;
  return (
    results.find((result) => {
      const name = result.name.toLowerCase();
      return name.includes(wanted) || wanted.includes(name);
    }) ?? null
  );
}

export function pickTag(tags: QlooTag[], query: string): QlooTag | null {
  const wanted = query.trim().toLowerCase();
  let best: { tag: QlooTag; score: number } | null = null;
  for (const tag of tags) {
    const name = tag.name.toLowerCase();
    let score = 0;
    if (name === wanted) score += 6;
    else if (name.includes(wanted) || wanted.includes(name)) score += 3;
    else continue;
    if (tag.id.includes(":genre:")) score += 2;
    if (!best || score > best.score) best = { tag, score };
  }
  return best && best.score >= 3 ? best.tag : null;
}
