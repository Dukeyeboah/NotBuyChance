import type {
  DiscoveryDraft,
  FeedbackReason,
  GeoPreference,
  Recommendation,
  ResultLimitation,
} from "@/types/discovery";
import { CULTURAL_OPTIONS, normalizeCategories } from "@/lib/qloo/categories";
import { tokenize } from "@/lib/text";

export function preferenceText(draft: Pick<
  DiscoveryDraft,
  "interestsText" | "interestChips" | "lovedBefore" | "culturalNotes"
>): string {
  return [draft.interestsText, draft.interestChips.join(" "), draft.lovedBefore, draft.culturalNotes]
    .filter(Boolean)
    .join(" ");
}

export function shareGenderWithModel(draft: Pick<DiscoveryDraft, "genderOpenness" | "gender">): boolean {
  return draft.genderOpenness === "demographic" && Boolean(draft.gender);
}

/** Qloo insights calls in this app do not send a gender or audience filter. */
export function qlooGenderFilterApplied(): false {
  return false;
}

export function cosmicThemesApply(draft: Pick<
  DiscoveryDraft,
  "mode" | "cosmicInfluence" | "cosmicFeedback"
>): boolean {
  if (draft.mode === "taste") return false;
  if (draft.cosmicFeedback === "not_really") return false;
  return draft.cosmicInfluence === "yes" || draft.cosmicInfluence === "little";
}

export function tasteCompleteness(draft: Pick<
  DiscoveryDraft,
  "interestsText" | "interestChips" | "lovedBefore" | "dislikes" | "culturalNotes"
>): { level: "started" | "connecting" | "clear"; label: string; detail: string } {
  let score = 0;
  if (draft.interestsText.trim().length >= 12) score += 2;
  score += Math.min(draft.interestChips.length, 3);
  if (draft.lovedBefore.trim()) score += 1;
  if (draft.dislikes.trim()) score += 1;
  if (draft.culturalNotes.trim().length >= 8) score += 1;
  if (score <= 1) {
    return {
      level: "started",
      label: "Getting started",
      detail: "We know a little about them.",
    };
  }
  if (score <= 3) {
    return {
      level: "connecting",
      label: "Connecting the dots",
      detail: "We're beginning to understand their interests.",
    };
  }
  return {
    level: "clear",
    label: "A clearer picture",
    detail: "We have several useful preferences to work with.",
  };
}

export function guidanceFor(draft: Pick<
  DiscoveryDraft,
  "name" | "interestsText" | "interestChips" | "culturalLabels" | "culturalNotes"
>): { question?: string; prompts: string[] } {
  const name = draft.name.trim() || "them";
  const tokens = tokenize(`${draft.interestsText} ${draft.interestChips.join(" ")}`);
  if (tokens.length < 2) {
    return {
      question: `I have a starting point, but I'd love to know one thing ${name} enjoys. Is ${name} more into music, food, books, fashion, or something else?`,
      prompts: ["Music", "Food", "Books", "Fashion", "Just show me some ideas"],
    };
  }
  const artOnly =
    draft.interestChips.includes("Art") &&
    draft.interestChips.length <= 1 &&
    draft.interestsText.trim().length < 24;
  if (artOnly) {
    return {
      question: "Is the art interest more about visiting galleries, making art, or collecting creative objects?",
      prompts: ["Visiting galleries", "Making art", "Collecting objects", "Just show me some ideas"],
    };
  }
  if (draft.culturalLabels.length > 0 && draft.culturalNotes.trim().length < 8) {
    const labels = draft.culturalLabels
      .map((id) => CULTURAL_OPTIONS.find((option) => option[0] === id)?.[1] ?? id)
      .join(", ");
    return {
      question: `You mentioned ${labels}. Are there particular foods, music, traditions, or experiences they especially enjoy?`,
      prompts: ["Just show me some ideas"],
    };
  }
  return { prompts: [] };
}

export function broadenJobs(options: {
  geo: GeoPreference;
  city: string;
  categories: string[];
  tagId?: string;
  tagName?: string;
  calls: { filterType: string; resultCount: number }[];
  evidenceCount: number;
}): { filterType: string; tagIds: string[]; signal: string; location: string }[] {
  if (!options.tagId || options.evidenceCount >= 4) return [];
  const categories = normalizeCategories(options.categories);
  if (!categories.includes("dining")) return [];
  const placeCalls = options.calls.filter((call) => call.filterType.includes(":place"));
  const placeCount = placeCalls.reduce((sum, call) => sum + call.resultCount, 0);
  if (!placeCalls.length || placeCount >= 2) return [];
  if (options.geo === "local" && options.city.trim()) {
    return [
      {
        filterType: "urn:entity:place",
        tagIds: [options.tagId],
        signal: `tag:${options.tagName}:broader-place`,
        location: options.city.trim(),
      },
    ];
  }
  if (options.geo === "nearby") {
    return [
      {
        filterType: "urn:entity:place",
        tagIds: [options.tagId],
        signal: `tag:${options.tagName}:beyond-city`,
        location: "",
      },
    ];
  }
  return [];
}

export function assessCoverage(options: {
  city: string;
  geo: GeoPreference;
  categories: string[];
  requestedCount: number;
  recommendationCount: number;
  evidenceCount: number;
  resultCategories: string[];
  insightCalls: { filterType: string; resultCount: number }[];
}): ResultLimitation | undefined {
  const categories = normalizeCategories(options.categories);
  const placeCalls = options.insightCalls.filter((call) => call.filterType.includes(":place"));
  const placeCount = placeCalls.reduce((sum, call) => sum + call.resultCount, 0);
  const widen: ResultLimitation["actions"] = [];
  if (options.geo === "local") widen.push("nearby");
  if (options.geo !== "anywhere") widen.push("broader");
  widen.push("another_category");

  const diningFocused = categories.includes("dining") && !categories.includes("surprise");
  if (
    diningFocused &&
    options.city.trim() &&
    placeCalls.length > 0 &&
    placeCount < 2 &&
    options.recommendationCount < 3
  ) {
    return {
      kind: "sparse",
      message: "I'm having trouble finding enough dining recommendations for this location.",
      detail: "Would you like me to search nearby areas, explore other experiences, or try a different category?",
      actions: widen,
    };
  }

  const techResults =
    categories.includes("tech") &&
    options.resultCategories.length > 0 &&
    options.resultCategories.every((category) => category === "tech");
  if (techResults) {
    return {
      kind: "brands",
      message:
        "I found some technology brands that could match their interests, but I don't yet have enough information to recommend specific products confidently.",
      detail: "These are brand affinities, not a catalog of gadgets, prices, or stock.",
      actions: ["another_category"],
    };
  }

  if (options.evidenceCount >= 4 && options.recommendationCount <= 1) {
    return {
      kind: "irrelevant",
      message: "Qloo returned some cultural matches, but most of them conflicted with the limits you set.",
      detail: "Those were left out instead of bending a dislike, a budget, or a local-only request.",
      actions: options.geo === "local" ? ["nearby", "another_category"] : ["another_category"],
    };
  }

  if (
    options.recommendationCount > 0 &&
    options.recommendationCount < options.requestedCount
  ) {
    const count = options.recommendationCount;
    const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
    const phrase =
      count === 1 ? "one promising match" : `${words[count] ?? String(count)} promising matches`;
    return {
      kind: "partial",
      message: `I found ${phrase}. Rather than filling the list with weaker suggestions, I've kept the recommendations focused.`,
      detail: "",
      actions: [],
    };
  }

  if (options.evidenceCount === 0 && options.insightCalls.length > 0) {
    return {
      kind: "sparse",
      message: "Qloo didn't return enough usable results for this search.",
      detail: "You can try another category, add an interest, or widen the location.",
      actions: widen,
    };
  }

  return undefined;
}

export function selectUnexpected(recommendations: Recommendation[]): {
  primary: Recommendation[];
  unexpected?: Recommendation;
} {
  if (recommendations.length < 3) return { primary: recommendations };
  const lead = recommendations[0];
  const candidate = recommendations.find(
    (item, index) =>
      index > 0 &&
      item.qlooEvidence.length > 0 &&
      item.category !== lead.category,
  );
  if (!candidate) return { primary: recommendations };
  const primary = recommendations
    .filter((item) => item.id !== candidate.id)
    .map((item, index) => ({ ...item, rank: index + 1 }));
  return {
    primary,
    unexpected: {
      ...candidate,
      suitability: candidate.suitability === "strong_match" ? "strong_match" : "unexpected",
      rank: 0,
    },
  };
}

export function applyNotForThem(
  draft: DiscoveryDraft,
  item: { title: string; category: string },
  reason: FeedbackReason,
): { draft: DiscoveryDraft; summary: string } {
  const excludeTitles = draft.excludeTitles.includes(item.title)
    ? draft.excludeTitles
    : [...draft.excludeTitles, item.title];
  let next: DiscoveryDraft = { ...draft, excludeTitles };
  let summary = "I'll leave that one out. I won't treat the whole category as a dislike.";

  if (reason === "expensive") {
    if (next.budgetTier === "premium") next = { ...next, budgetTier: "moderate" };
    else if (next.budgetTier === "moderate") next = { ...next, budgetTier: "friendly" };
    else if (next.budgetTier === "custom" && Number(next.budgetMax) > 0) {
      next = {
        ...next,
        budgetMax: String(Math.max(20, Math.floor(Number(next.budgetMax) * 0.6))),
      };
    } else if (next.budgetTier === "none") {
      next = { ...next, budgetTier: "custom", budgetMax: "100", currencyTouched: true };
    }
    summary = "I'll look for less expensive ideas for this search. I didn't assume a change in their taste.";
  }

  if (reason === "far") {
    if (next.geo === "anywhere") next = { ...next, geo: "nearby" };
    else if (next.geo === "nearby" && next.city.trim()) next = { ...next, geo: "local" };
    summary = "I'll keep this search closer to them. The rest of their tastes stay as they were.";
  }

  if (reason === "style") summary = "I'll skip that style for now, without dropping the whole category.";
  if (reason === "already") summary = "I'll leave out that one. It doesn't change what they enjoy.";
  if (reason === "occasion") summary = "I'll look for something that fits the occasion better.";

  return { draft: next, summary };
}
