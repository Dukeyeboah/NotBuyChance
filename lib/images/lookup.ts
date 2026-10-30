const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "into"]);
const CACHE_MS = 15 * 60 * 1000;
const cache = new Map<string, { at: number; url?: string }>();

export interface ImageQuery {
  title: string;
  location?: string;
  pageUrl?: string;
  category?: string;
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP.has(token));
}

export function titlesMatch(query: string, candidate: string): boolean {
  const wanted = tokens(query);
  const found = new Set(tokens(candidate));
  if (!wanted.length || !found.size) return false;
  const hits = wanted.filter((token) => found.has(token)).length;
  return hits >= Math.min(2, wanted.length) && hits / wanted.length >= 0.6;
}

export function publicHttps(value: string): string | undefined {
  const raw = value.trim();
  const withProtocol = raw.startsWith("//") ? `https:${raw}` : raw;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:") return undefined;
  if (url.username || url.password) return undefined;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return undefined;
  }
  if (/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return undefined;
  return url.toString();
}

function looksLikeImage(url: string): boolean {
  const parsed = new URL(url);
  if (/\.(jpe?g|png|webp|gif|avif)(\b|$)/i.test(parsed.pathname)) return true;
  const host = parsed.hostname;
  return (
    host.endsWith("wikimedia.org") ||
    host.endsWith("wikipedia.org") ||
    host.endsWith("qloo.com") ||
    host.includes("googleusercontent") ||
    host.includes("gstatic") ||
    host.includes("ggpht") ||
    host.includes("cloudfront") ||
    host.includes("imgix") ||
    host.includes("cloudinary") ||
    host.includes("wp.com") ||
    host.includes("pinimg") ||
    host.includes("ytimg") ||
    host.includes("media-amazon") ||
    host.includes("mzstatic") ||
    host.includes("fbcdn") ||
    host.includes("cdninstagram")
  );
}

function imageRank(url: string): number {
  const host = new URL(url).hostname;
  if (host.endsWith("wikimedia.org") || host.endsWith("wikipedia.org")) return 0;
  if (host.endsWith("qloo.com")) return 1;
  if (host.includes("lookaside") || host.includes("fbcdn") || host.includes("instagram")) return 5;
  return 2;
}

async function wikipediaImage(title: string): Promise<string | undefined> {
  const endpoint = new URL("https://en.wikipedia.org/w/rest.php/v1/search/page");
  endpoint.searchParams.set("q", title.slice(0, 180));
  endpoint.searchParams.set("limit", "1");
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "NotBuyChance/0.1 (finding photos for gift suggestions)",
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return undefined;
  const data = (await response.json()) as {
    pages?: { title?: string; thumbnail?: { url?: string } }[];
  };
  const page = data.pages?.[0];
  if (!page?.title || !titlesMatch(title, page.title)) return undefined;
  const url = page.thumbnail?.url ? publicHttps(page.thumbnail.url) : undefined;
  return url;
}

async function serperImage(query: string): Promise<string | undefined> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return undefined;
  const response = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query.slice(0, 180), num: 5 }),
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) return undefined;
  const data = (await response.json()) as { images?: { imageUrl?: string }[] };
  const urls = (data.images ?? [])
    .map((image) => (image.imageUrl ? publicHttps(image.imageUrl) : undefined))
    .filter((url): url is string => Boolean(url && looksLikeImage(url)))
    .sort((a, b) => imageRank(a) - imageRank(b));
  return urls[0];
}

async function openGraphImage(pageUrl: string, depth = 0): Promise<string | undefined> {
  if (depth > 1) return undefined;
  const page = publicHttps(pageUrl);
  if (!page) return undefined;
  const response = await fetch(page, {
    redirect: "manual",
    headers: { Accept: "text/html", "User-Agent": "NotBuyChance/0.1 (finding photos for gift suggestions)" },
    signal: AbortSignal.timeout(4000),
  });
  if (response.status >= 300 && response.status < 400) {
    const next = response.headers.get("location");
    if (!next) return undefined;
    const resolved = publicHttps(new URL(next, page).toString());
    if (!resolved) return undefined;
    return openGraphImage(resolved, depth + 1);
  }
  if (!response.ok) return undefined;
  const html = (await response.text()).slice(0, 120_000);
  const match =
    html.match(/property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i);
  if (!match?.[1]) return undefined;
  return publicHttps(new URL(match[1], page).toString());
}

function searchQuery(query: ImageQuery): string {
  const place = query.category === "dining" || query.category === "experiences";
  const where = query.location?.trim();
  if (place && where) return `${query.title} ${where}`.replace(/\s+/g, " ").trim();
  return query.title.trim();
}

export async function findFindingImage(query: ImageQuery): Promise<string | undefined> {
  const title = query.title.replace(/\s+/g, " ").trim();
  if (title.length < 2) return undefined;
  const key = [title.toLowerCase(), searchQuery(query).toLowerCase(), query.pageUrl || ""].join("|");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.url;

  let url: string | undefined;
  try {
    url = await wikipediaImage(title);
    if (!url) url = await serperImage(searchQuery({ ...query, title }));
    if (!url && query.pageUrl) url = await openGraphImage(query.pageUrl);
  } catch (error) {
    console.error("[images] lookup failed", error instanceof Error ? error.message : "unknown");
  }
  cache.set(key, { at: Date.now(), url });
  return url;
}
