const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
let active = 0;
const waiters: Array<() => void> = [];

function slot(): Promise<void> {
  if (active < 1) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      active += 1;
      resolve();
    });
  });
}

function release() {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

export function illustrationFor(id: string): string | undefined {
  return cache.get(id);
}

export function requestIllustration(options: {
  id: string;
  title: string;
  description: string;
  category: string;
}): Promise<string | null> {
  const cached = cache.get(options.id);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(options.id);
  if (existing) return existing;

  const job = slot().then(async () => {
    try {
      let response = await fetch("/api/illustrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: options.title,
          description: options.description,
          category: options.category,
        }),
      });
      if (response.status === 429 || response.status === 502) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        response = await fetch("/api/illustrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: options.title,
            description: options.description,
            category: options.category,
          }),
        });
      }
      if (!response.ok) return null;
      const payload = (await response.json()) as { url?: string };
      if (payload.url && /^https:\/\//i.test(payload.url)) {
        cache.set(options.id, payload.url);
        return payload.url;
      }
      return null;
    } catch {
      return null;
    } finally {
      release();
    }
  });
  pending.set(options.id, job);
  return job;
}
