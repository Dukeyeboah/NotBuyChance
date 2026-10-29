import { z } from "zod";
import type { DiscoveryDraft, DiscoveryInput, Occasion, Relationship } from "@/types/discovery";
import { ageFromIso, buildCosmicProfile, parseIsoDate } from "@/lib/cosmic/calculate";
import { CULTURAL_OPTIONS, normalizeCategories } from "@/lib/qloo/categories";

const OCCASIONS = [
  "birthday",
  "anniversary",
  "date_night",
  "congratulations",
  "holiday",
  "just_because",
  "thank_you",
  "other",
] as const;

const RELATIONSHIPS = [
  "partner",
  "friend",
  "parent",
  "sibling",
  "family",
  "colleague",
  "myself",
  "other",
] as const;

const GENDERS = ["female", "male", "nonbinary", "self_describe", "unspecified", ""] as const;

const draftSchema = z.object({
  personId: z.string().min(1).max(80),
  forSelf: z.boolean(),
  name: z.string().trim().min(1, "Add a name to continue.").max(80),
  birthDate: z.string().max(20),
  age: z.string().max(8),
  ageRange: z.string().max(40),
  gender: z.enum(GENDERS),
  genderCustom: z.string().max(40),
  genderOpenness: z.enum(["open", "demographic"]).optional(),
  culturalLabels: z.array(z.string().max(40)).max(12).optional(),
  culturalNotes: z.string().max(500).optional(),
  country: z.string().max(80),
  city: z.string().max(80),
  relationship: z.string().max(40),
  relationshipOther: z.string().max(80),
  occasions: z.array(z.string()).min(1, "Choose an occasion.").max(8),
  occasionDate: z.string().max(20),
  occasionOther: z.string().max(120),
  mode: z.enum(["taste", "cosmic", "fusion"]),
  cosmicFeedback: z.string().max(40),
  cosmicCorrection: z.string().max(500),
  cosmicInfluence: z.string().max(20),
  interestsText: z.string().max(2000),
  interestChips: z.array(z.string().max(40)).max(20),
  lovedBefore: z.string().max(500),
  dislikes: z.string().max(500),
  categories: z.array(z.string().max(40)).min(1, "Choose at least one kind of surprise.").max(16),
  budgetTier: z.enum(["friendly", "moderate", "premium", "none", "custom"]),
  currency: z.string().trim().min(3).max(8),
  budgetMin: z.string().max(12),
  budgetMax: z.string().max(12),
  currencyTouched: z.boolean(),
  geo: z.enum(["local", "nearby", "anywhere"]),
  count: z.union([z.literal(5), z.literal(10)]),
  feedback: z
    .array(
      z.object({
        id: z.string().max(80),
        title: z.string().max(180),
        reaction: z.enum(["love", "maybe", "not"]),
        category: z.string().max(40).optional(),
        reason: z.enum(["style", "expensive", "far", "already", "occasion", "other"]).optional(),
        note: z.string().max(300).optional(),
        createdAt: z.string().max(40),
      }),
    )
    .max(40),
  excludeTitles: z.array(z.string().max(180)).max(40),
  preferNovel: z.boolean(),
  savedIdeas: z.array(z.string().max(180)).max(30).optional(),
});

export const discoveryRequestSchema = z.object({
  draft: draftSchema,
  refinementMessage: z.string().max(500).optional(),
});

function numberOrUndefined(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1_000_000) return undefined;
  return parsed;
}

export function toDiscoveryInput(
  draft: z.infer<typeof draftSchema>,
): { ok: true; input: DiscoveryInput } | { ok: false; error: string } {
  const parsed = draftSchema.safeParse(draft);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Some details need another look." };
  }
  const clean = parsed.data;
  if (clean.birthDate && !parseIsoDate(clean.birthDate)) {
    return { ok: false, error: "That birth date doesn't look valid." };
  }
  if (clean.age && numberOrUndefined(clean.age) == null) {
    return { ok: false, error: "Age should be a number." };
  }
  const occasions = clean.occasions.filter((occasion): occasion is Occasion =>
    OCCASIONS.includes(occasion as Occasion),
  );
  if (!occasions.length) return { ok: false, error: "Choose an occasion." };
  const relationship = clean.forSelf ? "myself" : clean.relationship;
  if (!RELATIONSHIPS.includes(relationship as Relationship)) {
    return { ok: false, error: "Choose how you know them." };
  }
  const categories = normalizeCategories(clean.categories);
  if (!categories.length) return { ok: false, error: "Choose at least one kind of surprise." };
  const allowedCulture = new Set<string>(CULTURAL_OPTIONS.map((option) => option[0]));
  const culturalLabels = (clean.culturalLabels ?? []).filter((label) => allowedCulture.has(label));
  if (clean.geo === "local" && !clean.city.trim()) {
    return { ok: false, error: "Add a city for local-only discovery, or choose a wider area." };
  }
  const budgetMin = numberOrUndefined(clean.budgetMin);
  const budgetMax = numberOrUndefined(clean.budgetMax);
  if (clean.budgetTier === "custom" && budgetMin == null && budgetMax == null) {
    return { ok: false, error: "Add a minimum or maximum for your budget." };
  }
  if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) {
    return { ok: false, error: "The budget minimum is higher than the maximum." };
  }

  const normalized: DiscoveryDraft = {
    ...clean,
    occasions,
    relationship: relationship as Relationship,
    categories,
    gender: clean.gender,
    genderOpenness: clean.genderOpenness === "demographic" ? "demographic" : "open",
    culturalLabels,
    culturalNotes: clean.culturalNotes ?? "",
    savedIdeas: clean.savedIdeas ?? [],
    cosmicFeedback:
      clean.cosmicFeedback === "accurate" ||
      clean.cosmicFeedback === "somewhat" ||
      clean.cosmicFeedback === "not_really"
        ? clean.cosmicFeedback
        : "",
    cosmicInfluence:
      clean.cosmicInfluence === "yes" ||
      clean.cosmicInfluence === "little" ||
      clean.cosmicInfluence === "no"
        ? clean.cosmicInfluence
        : "",
  };

  return {
    ok: true,
    input: {
      draft: normalized,
      cosmic:
        normalized.mode === "taste"
          ? null
          : buildCosmicProfile(normalized.name, normalized.birthDate || undefined),
      age: normalized.birthDate
        ? ageFromIso(normalized.birthDate) ?? undefined
        : numberOrUndefined(normalized.age),
      budgetMin,
      budgetMax,
    },
  };
}
