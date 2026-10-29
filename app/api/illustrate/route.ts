export const maxDuration = 60;

const hits = new Map<string, number[]>();

function allowed(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 12) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function outputUrl(output: unknown): string | null {
  const items = Array.isArray(output) ? output : [output];
  for (const item of items) {
    if (typeof item === "string" && /^https:\/\//i.test(item)) return item;
    if (item && typeof item === "object") {
      const record = item as { url?: unknown; href?: unknown };
      if (typeof record.url === "string" && /^https:\/\//i.test(record.url)) return record.url;
      if (typeof record.href === "string" && /^https:\/\//i.test(record.href)) return record.href;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowed(ip)) {
    return Response.json({ error: "Too many illustration requests. Wait a minute." }, { status: 429 });
  }

  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) {
    return Response.json({ error: "Illustrations aren't configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const title = clip(record.title, 140);
  const description = clip(record.description, 500);
  const category = clip(record.category, 40);
  if (title.length < 2) {
    return Response.json({ error: "A title is required." }, { status: 400 });
  }

  const prompt = [
    "A warm cartoon illustration with rounded shapes, soft light, and a coral, violet, and cream palette.",
    `Scene: ${title}.`,
    description ? `Moment: ${description}` : "",
    category ? `Kind of find: ${category}.` : "",
    "No text, no letters, no logos, no watermark, and no photorealistic portrait of a real person.",
  ]
    .filter(Boolean)
    .join(" ");

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: "3:2",
    quality: "low",
    output_format: "webp",
    number_of_images: 1,
    background: "auto",
    moderation: "auto",
  };
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) input.openai_api_key = openaiKey;

  try {
    const created = await fetch("https://api.replicate.com/v1/models/openai/gpt-image-2/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=55",
      },
      body: JSON.stringify({ input }),
      signal: AbortSignal.timeout(58000),
    });
    if (!created.ok) {
      console.error("[illustrate] replicate rejected the request", created.status);
      return Response.json({ error: "The illustration didn't start." }, { status: 502 });
    }
    let prediction = (await created.json()) as {
      id?: string;
      status?: string;
      output?: unknown;
      error?: unknown;
    };
    const deadline = Date.now() + 50000;
    while (
      prediction.id &&
      (prediction.status === "starting" || prediction.status === "processing") &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const follow = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!follow.ok) break;
      prediction = (await follow.json()) as typeof prediction;
    }
    const url = outputUrl(prediction.output);
    if (!url) {
      console.error("[illustrate] no image", prediction.status || "unknown");
      return Response.json({ error: "No illustration came back." }, { status: 502 });
    }
    return Response.json({ url });
  } catch (error) {
    console.error("[illustrate] failed", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "The illustration didn't finish." }, { status: 502 });
  }
}
