const STOP = new Set([
  "about",
  "and",
  "the",
  "she",
  "her",
  "his",
  "him",
  "they",
  "them",
  "their",
  "with",
  "that",
  "this",
  "from",
  "have",
  "has",
  "loves",
  "love",
  "likes",
  "like",
  "really",
  "very",
  "into",
  "enjoy",
  "enjoys",
  "something",
  "someone",
  "would",
  "doesnt",
  "don't",
  "does",
  "not",
  "for",
  "who",
  "what",
  "when",
  "your",
  "you",
]);

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokenize(value: string): string[] {
  const tokens = normalize(value)
    .split(" ")
    .filter((token) => token.length > 3 && !STOP.has(token));
  return [...new Set(tokens)];
}

export function includesPhrase(haystack: string, phrase: string): boolean {
  const hay = normalize(haystack);
  const needle = normalize(phrase);
  if (!needle || needle.length < 4) return false;
  return hay.includes(needle);
}

export function slug(value: string): string {
  return normalize(value).replace(/\s+/g, "-").slice(0, 60);
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function prettyType(entityType: string): string {
  const leaf = entityType.split(":").pop() || entityType;
  return leaf.replaceAll("_", " ");
}

export function displayName(name: string): string {
  const trimmed = name.trim();
  return trimmed || "them";
}

export function possessive(name: string): string {
  const trimmed = name.trim() || "their";
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
}
