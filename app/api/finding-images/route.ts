import { findFindingImage } from "@/lib/images/lookup";

export const maxDuration = 20;

const hits = new Map<string, number[]>();

function allowed(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 20) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowed(ip)) {
    return Response.json({ error: "Too many image lookups. Wait a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The image request was not readable." }, { status: 400 });
  }
  const items = Array.isArray((body as { items?: unknown })?.items) ? (body as { items: unknown[] }).items : [];
  const queries = items.slice(0, 6).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const id = clip(record.id, 80);
    const title = clip(record.title, 180);
    if (!id || title.length < 2) return [];
    return [
      {
        id,
        title,
        location: clip(record.location, 120),
        pageUrl: clip(record.pageUrl, 400),
        category: clip(record.category, 40),
      },
    ];
  });

  const images: Record<string, string> = {};
  await Promise.all(
    queries.map(async (query) => {
      const url = await findFindingImage(query);
      if (url) images[query.id] = url;
    }),
  );
  return Response.json({ images });
}
