import type { DiscoveryDraft } from "@/types/discovery";
import { normalizeCategories } from "@/lib/qloo/categories";

export function emptyDraft(): DiscoveryDraft {
  return {
    personId: crypto.randomUUID(),
    forSelf: false,
    name: "",
    birthDate: "",
    age: "",
    ageRange: "",
    gender: "",
    genderCustom: "",
    genderOpenness: "open",
    culturalLabels: [],
    culturalNotes: "",
    country: "",
    city: "",
    relationship: "",
    relationshipOther: "",
    occasions: [],
    occasionDate: "",
    occasionOther: "",
    mode: "taste",
    cosmicFeedback: "",
    cosmicCorrection: "",
    cosmicInfluence: "",
    interestsText: "",
    interestChips: [],
    lovedBefore: "",
    dislikes: "",
    categories: [],
    budgetTier: "moderate",
    currency: "USD",
    budgetMin: "",
    budgetMax: "",
    currencyTouched: false,
    geo: "nearby",
    count: 5,
    feedback: [],
    excludeTitles: [],
    preferNovel: false,
    savedIdeas: [],
  };
}

export function hydrateDraft(raw: Partial<DiscoveryDraft>): DiscoveryDraft {
  const base = emptyDraft();
  return {
    ...base,
    ...raw,
    personId: raw.personId || base.personId,
    categories: normalizeCategories(raw.categories ?? []),
    genderOpenness: raw.genderOpenness === "demographic" ? "demographic" : "open",
    culturalLabels: Array.isArray(raw.culturalLabels) ? raw.culturalLabels : [],
    culturalNotes: raw.culturalNotes ?? "",
    savedIdeas: Array.isArray(raw.savedIdeas) ? raw.savedIdeas : [],
    feedback: Array.isArray(raw.feedback) ? raw.feedback : [],
    excludeTitles: Array.isArray(raw.excludeTitles) ? raw.excludeTitles : [],
    interestChips: Array.isArray(raw.interestChips) ? raw.interestChips : [],
    occasions: Array.isArray(raw.occasions) ? raw.occasions : [],
  };
}

export function sampleDraft(): DiscoveryDraft {
  return {
    ...emptyDraft(),
    personId: "sample-maya",
    forSelf: false,
    name: "Maya",
    age: "29",
    country: "Ghana",
    city: "Accra",
    relationship: "partner",
    occasions: ["birthday"],
    mode: "taste",
    interestsText:
      "Jazz and neo-soul. Photography. Contemporary art. Minimalist design.",
    interestChips: ["Music", "Art", "Photography", "Design"],
    dislikes: "Loud, overcrowded venues.",
    categories: ["music", "dining", "books", "experiences"],
    budgetTier: "custom",
    currency: "USD",
    budgetMin: "50",
    budgetMax: "200",
    currencyTouched: true,
    geo: "nearby",
    count: 5,
  };
}
