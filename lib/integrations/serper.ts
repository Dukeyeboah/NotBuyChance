export interface ExternalHit {
  title: string;
  url: string;
  snippet: string;
  retrievedAt: string;
}

export async function searchWeb(query: string): Promise<ExternalHit[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];
  const retrievedAt = new Date().toISOString();
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query.slice(0, 180), num: 5 }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    console.error("[serper] request failed", response.status);
    throw new Error(`Web search failed (${response.status}).`);
  }
  const data = (await response.json()) as {
    organic?: { title?: string; link?: string; snippet?: string }[];
  };
  return (data.organic ?? [])
    .filter((item) => item.link && item.title)
    .slice(0, 5)
    .map((item) => ({
      title: String(item.title).slice(0, 180),
      url: String(item.link),
      snippet: String(item.snippet || "").slice(0, 320),
      retrievedAt,
    }));
}
