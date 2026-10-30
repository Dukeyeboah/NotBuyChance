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
  look?: string;
  mode?: string;
  city?: string;
  age?: string;
  imagePreference?: string;
  appearance?: {
    skinTone?: string;
    hair?: string;
    style?: string;
    additionalDetails?: string;
  };
  ethnicityLabels?: string[];
}): Promise<string | null> {
  const cacheKey = `${options.id}::${options.look || ""}`;
  const cached = cache.get(cacheKey);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(cacheKey);
  if (existing) return existing;

  const body = {
    title: options.title,
    description: options.description,
    category: options.category,
    mode: options.mode,
    city: options.city,
    age: options.age,
    imagePreference: options.imagePreference,
    appearance: options.appearance,
    ethnicityLabels: options.ethnicityLabels,
  };
  const job = slot().then(async () => {
    try {
      let response = await fetch("/api/illustrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status === 429 || response.status === 502) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        response = await fetch("/api/illustrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!response.ok) return null;
      const payload = (await response.json()) as { url?: string };
      if (payload.url && /^https:\/\//i.test(payload.url)) {
        cache.set(cacheKey, payload.url);
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
  pending.set(cacheKey, job);
  return job;
}
