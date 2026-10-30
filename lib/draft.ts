import type { DiscoveryDraft } from "@/types/discovery";
import { normalizeCategories } from "@/lib/qloo/categories";

export function emptyDraft(): DiscoveryDraft {
  return {
    personId: crypto.randomUUID(),
    forSelf: false,
    name: "",
    birthDate: "",
    birthTime: "",
    birthPlace: "",
    age: "",
    ageRange: "",
    gender: "",
    genderCustom: "",
    genderOpenness: "open",
    ethnicity: [],
    ethnicityOther: "",
    culturalLabels: [],
    culturalNotes: "",
    visualAppearance: { skinTone: "", hair: "", style: "", additionalDetails: "" },
    imagePreference: "",
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
    geo: "local",
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
    birthTime: raw.birthTime ?? "",
    birthPlace: raw.birthPlace ?? "",
    ethnicity: Array.isArray(raw.ethnicity) ? raw.ethnicity : [],
    ethnicityOther: raw.ethnicityOther ?? "",
    culturalLabels: Array.isArray(raw.culturalLabels) ? raw.culturalLabels : [],
    culturalNotes: raw.culturalNotes ?? "",
    visualAppearance: {
      skinTone: raw.visualAppearance?.skinTone ?? "",
      hair: raw.visualAppearance?.hair ?? "",
      style: raw.visualAppearance?.style ?? "",
      additionalDetails: raw.visualAppearance?.additionalDetails ?? "",
    },
    imagePreference:
      raw.imagePreference === "describe-appearance" ||
      raw.imagePreference === "subject-only" ||
      raw.imagePreference === "no-recipient"
        ? raw.imagePreference
        : "",
    savedIdeas: Array.isArray(raw.savedIdeas) ? raw.savedIdeas : [],
    feedback: Array.isArray(raw.feedback) ? raw.feedback : [],
    excludeTitles: Array.isArray(raw.excludeTitles) ? raw.excludeTitles : [],
    interestChips: Array.isArray(raw.interestChips) ? raw.interestChips : [],
    occasions: Array.isArray(raw.occasions) ? raw.occasions : [],
    geo: raw.geo === "nearby" ? "nearby" : "local",
  };
}

export function sampleDraft(): DiscoveryDraft {
  return {
    ...emptyDraft(),
    personId: "sample-maya",
    forSelf: false,
    name: "Maya",
    birthDate: "1997-08-01",
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
    geo: "local",
    count: 5,
  };
}
