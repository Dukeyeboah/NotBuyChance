import type {
  DiscoveryInput,
  Recommendation,
  Suitability,
} from "@/types/discovery";
import { includesPhrase, normalize, tokenize } from "@/lib/text";
import { cosmicThemesApply, preferenceText } from "@/lib/discovery-rules";

export function budgetRange(input: DiscoveryInput): {
  min?: number;
  max?: number;
} | null {
  const tier = input.draft.budgetTier;
  if (tier === "none") return null;
  if (tier === "custom") {
    if (input.budgetMin == null && input.budgetMax == null) return null;
    return { min: input.budgetMin, max: input.budgetMax };
  }
  if (tier === "friendly") return { min: 0, max: 50 };
  if (tier === "moderate") return { min: 50, max: 150 };
  return { min: 150, max: 500 };
}

export function dislikeClauses(dislikes: string): string[] {
  return dislikes
    .split(/[,.;]|\band\b/i)
    .map((part) => part.trim())
    .filter((part) => normalize(part).length >= 4);
}

export function conflictsWithDislike(text: string, dislikes: string): boolean {
  if (!dislikes.trim()) return false;
  if (dislikeClauses(dislikes).some((clause) => includesPhrase(text, clause))) {
    return true;
  }
  const tokens = tokenize(dislikes);
  const haystack = normalize(text);
  const hits = tokens.filter((token) => haystack.includes(token));
  return hits.some((token) => token.length > 6) || hits.length >= 2;
}

export function priceOutsideBudget(
  amount: number | undefined,
  range: { min?: number; max?: number } | null,
): boolean {
  if (amount == null || !range) return false;
  if (range.min != null && amount < range.min) return true;
  if (range.max != null && amount > range.max) return true;
  return false;
}

function clamp(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function preferenceAlignment(
  recommendation: Recommendation,
  input: DiscoveryInput,
): number {
  const interestText = preferenceText(input.draft);
  const interestTokens = tokenize(interestText);
  const supported = normalize(
    [
      recommendation.supportingPreferences.join(" "),
      recommendation.rationale,
      recommendation.description,
      recommendation.title,
    ].join(" "),
  );
  const supportHits = interestTokens.filter((token) => supported.includes(token));
  const evidenceHits = recommendation.qlooEvidence.filter((item) => {
    const signal = normalize(`${item.signal} ${item.name}`);
    return interestTokens.some((token) => signal.includes(token));
  });
  if (evidenceHits.length && supportHits.length) return 1;
  if (evidenceHits.length || supportHits.length >= 2) return 0.8;
  if (supportHits.length === 1) return 0.55;
  if (interestTokens.length === 0) return 0.2;
  return 0.15;
}

function locationScore(recommendation: Recommendation, input: DiscoveryInput): number {
  const relevance = recommendation.geographicRelevance;
  if (input.draft.geo === "anywhere") return 1;
  if (input.draft.geo === "nearby") {
    if (relevance === "elsewhere") return 0.55;
    if (relevance === "in_country") return 0.8;
    return 1;
  }
  if (relevance === "in_city" || relevance === "not_location_specific") return 1;
  if (relevance === "in_country") return 0.7;
  if (relevance === "unknown") return 0.6;
  return 0.25;
}

export function affinityChance(recommendation: { qlooEvidence: { affinity?: number }[] }): string | undefined {
  const values = recommendation.qlooEvidence
    .map((item) => item.affinity)
    .filter((value): value is number => typeof value === "number");
  if (!values.length) return undefined;
  const best = Math.max(...values);
  if (best >= 0.85) return "A strong chance they'd love this";
  if (best >= 0.55) return "A good chance this fits";
  return undefined;
}

export function scoreRecommendation(
  recommendation: Recommendation,
  input: DiscoveryInput,
): number {
  const preference = preferenceAlignment(recommendation, input);
  const affinities = recommendation.qlooEvidence
    .map((item) => item.affinity)
    .filter((value): value is number => typeof value === "number");
  const qloo = recommendation.qlooEvidence.length
    ? affinities.length
      ? affinities.reduce((sum, value) => sum + value, 0) / affinities.length
      : 0.65
    : 0;
  const occasion = clamp(recommendation.occasionFit);
  const budget = recommendation.price.status === "verified" ? 1 : 0.75;
  const budgetLocation = (budget + locationScore(recommendation, input)) / 2;
  const interestTokens = tokenize(
    `${input.draft.interestsText} ${input.draft.interestChips.join(" ")}`,
  );
  const titleTokens = tokenize(`${recommendation.title} ${recommendation.description}`);
  const overlap = titleTokens.filter((token) => interestTokens.includes(token)).length;
  const novelty = overlap === 0 && recommendation.qlooEvidence.length ? 0.72 : overlap === 0 ? 0.55 : 0.32;

  let total =
    preference * 0.35 +
    qloo * 0.25 +
    occasion * 0.15 +
    budgetLocation * 0.15 +
    novelty * 0.1;

  const cosmicAllowed = cosmicThemesApply(input.draft) && Boolean(recommendation.whyMatch.cosmic);
  if (cosmicAllowed) {
    total += input.draft.cosmicInfluence === "yes" ? 0.06 : 0.03;
  }
  if (preference < 0.5) total = Math.min(total, 0.58);
  return clamp(total);
}

function suitabilityFor(
  recommendation: Recommendation,
  input: DiscoveryInput,
  score: number,
): Suitability {
  const preference = preferenceAlignment(recommendation, input);
  if (
    !recommendation.exploratory &&
    preference >= 0.7 &&
    score >= 0.62 &&
    recommendation.qlooEvidence.length > 0
  ) {
    return "strong_match";
  }
  if (preference < 0.5 && score >= 0.45 && recommendation.qlooEvidence.length > 0) {
    return "unexpected";
  }
  return "worth_exploring";
}

export function rankRecommendations(
  recommendations: Recommendation[],
  input: DiscoveryInput,
): Recommendation[] {
  const scored = recommendations.map((recommendation) => {
    const next = cosmicThemesApply(input.draft)
      ? recommendation
      : {
          ...recommendation,
          whyMatch: { ...recommendation.whyMatch, cosmic: undefined },
        };
    const score = scoreRecommendation(next, input);
    const suitability = suitabilityFor(next, input, score);
    const exploratory =
      next.exploratory ||
      suitability !== "strong_match" && next.qlooEvidence.length === 0 && next.availabilityStatus !== "verified_event";
    return {
      ...next,
      rankingScore: score,
      suitability: exploratory && suitability === "strong_match" ? "worth_exploring" : suitability,
      exploratory,
    };
  });

  const ordered = [...scored].sort((a, b) => b.rankingScore - a.rankingScore);
  const picked: Recommendation[] = [];
  const similar = (candidate: Recommendation) =>
    picked.some((chosen) => {
      const left = tokenize(chosen.title);
      const right = new Set(tokenize(candidate.title));
      if (!left.length || !right.size) return false;
      const shared = left.filter((token) => right.has(token)).length;
      return shared >= 2 && shared / Math.min(left.length, right.size) >= 0.6;
    });

  if (ordered[0]) picked.push(ordered[0]);
  for (const recommendation of ordered) {
    if (picked.length >= 10 || picked.includes(recommendation)) continue;
    if (picked.some((chosen) => chosen.category === recommendation.category)) continue;
    if (similar(recommendation)) continue;
    picked.push(recommendation);
  }
  for (const recommendation of ordered) {
    if (picked.length >= 10 || picked.includes(recommendation) || similar(recommendation)) continue;
    picked.push(recommendation);
  }
  for (const recommendation of ordered) {
    if (picked.length >= 10) break;
    if (!picked.includes(recommendation)) picked.push(recommendation);
  }

  return picked.slice(0, 10).map((recommendation, index) => ({
    ...recommendation,
    rank: index + 1,
  }));
}
