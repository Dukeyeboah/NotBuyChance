export type DiscoveryMode = "taste" | "cosmic" | "fusion";

export type Relationship =
  | "partner"
  | "friend"
  | "parent"
  | "sibling"
  | "family"
  | "colleague"
  | "myself"
  | "other";

export type Occasion =
  | "birthday"
  | "anniversary"
  | "date_night"
  | "congratulations"
  | "holiday"
  | "just_because"
  | "thank_you"
  | "other";

export type BudgetTier = "friendly" | "moderate" | "premium" | "none" | "custom";

export type GeoPreference = "local" | "nearby" | "anywhere";

export type Gender =
  | "female"
  | "male"
  | "nonbinary"
  | "self_describe"
  | "unspecified";

export type Reaction = "love" | "maybe" | "not";

export type FeedbackReason = "style" | "expensive" | "far" | "already" | "occasion" | "other";

export type GenderOpenness = "open" | "demographic";

export type Suitability = "strong_match" | "worth_exploring" | "unexpected";

export type AvailabilityStatus =
  | "verified_event"
  | "verified_place"
  | "idea"
  | "exploratory";

export type RecommendationType =
  | "qloo_entity"
  | "experience_idea"
  | "external_opportunity";

export interface CosmicProfile {
  sunSign?: string;
  lifePath?: number;
  /** Calendar day, reduced with the same master-number rules as the life path. */
  birthdayNumber?: number;
  expression?: number;
  themes: string[];
  reading: string;
  limited: boolean;
  method: string;
}

export interface VisualAppearance {
  skinTone: string;
  hair: string;
  style: string;
  additionalDetails: string;
}

export type ImagePreference = "" | "describe-appearance" | "subject-only" | "no-recipient";

export interface FeedbackItem {
  id: string;
  title: string;
  reaction: Reaction;
  category?: string;
  reason?: FeedbackReason;
  note?: string;
  createdAt: string;
}

export interface DiscoveryDraft {
  personId: string;
  forSelf: boolean;
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  age: string;
  ageRange: string;
  gender: Gender | "";
  genderCustom: string;
  genderOpenness: GenderOpenness;
  ethnicity: string[];
  ethnicityOther: string;
  culturalLabels: string[];
  culturalNotes: string;
  visualAppearance: VisualAppearance;
  imagePreference: ImagePreference;
  country: string;
  city: string;
  relationship: Relationship | "";
  relationshipOther: string;
  occasions: Occasion[];
  occasionDate: string;
  occasionOther: string;
  mode: DiscoveryMode;
  cosmicFeedback: "" | "accurate" | "somewhat" | "not_really";
  cosmicCorrection: string;
  cosmicInfluence: "" | "yes" | "little" | "no";
  interestsText: string;
  interestChips: string[];
  lovedBefore: string;
  dislikes: string;
  categories: string[];
  budgetTier: BudgetTier;
  currency: string;
  budgetMin: string;
  budgetMax: string;
  currencyTouched: boolean;
  geo: GeoPreference;
  count: 5 | 10;
  feedback: FeedbackItem[];
  excludeTitles: string[];
  preferNovel: boolean;
  savedIdeas: string[];
}

export interface DiscoveryInput {
  draft: DiscoveryDraft;
  cosmic: CosmicProfile | null;
  age?: number;
  budgetMin?: number;
  budgetMax?: number;
}

export interface QlooCitation {
  entityId: string;
  name: string;
  entityType: string;
  affinity?: number;
  signal: string;
  imageUrl?: string;
}

export interface Recommendation {
  id: string;
  title: string;
  category: string;
  description: string;
  rationale: string;
  whyMatch: {
    toldUs: string;
    qloo?: string;
    why: string;
    cosmic?: string;
  };
  supportingPreferences: string[];
  qlooEvidence: QlooCitation[];
  location?: string;
  geographicRelevance:
    | "in_city"
    | "in_country"
    | "not_location_specific"
    | "elsewhere"
    | "unknown";
  date?: string;
  price: {
    amount?: number;
    currency?: string;
    status: "verified" | "unavailable";
    note?: string;
  };
  externalSource?: {
    title: string;
    url: string;
    retrievedAt: string;
  };
  availabilityStatus: AvailabilityStatus;
  recommendationType: RecommendationType;
  rankingScore: number;
  occasionFit: number;
  suitability: Suitability;
  exploratory: boolean;
  rank: number;
}

export interface DiscoveryTrace {
  planSource: "model" | "fallback";
  entityQueries: string[];
  resolvedEntities: { id: string; name: string; type: string }[];
  tagsUsed: { id: string; name: string }[];
  insightCalls: {
    filterType: string;
    signal: string;
    location?: string;
    resultCount: number;
  }[];
  externalSearches: { query: string; resultCount: number }[];
  limitations: string[];
  cosmicUsed: boolean;
  qlooFailed: boolean;
}

export interface ProfilePatch {
  interestsText?: string;
  dislikes?: string;
  budgetTier?: BudgetTier;
  budgetMin?: string;
  budgetMax?: string;
  geo?: GeoPreference;
  preferNovel?: boolean;
}

export interface ResultLimitation {
  kind: "sparse" | "partial" | "brands" | "irrelevant";
  message: string;
  detail: string;
  actions: Array<"nearby" | "another_category" | "broader">;
}

export interface DiscoveryResult {
  recommendations: Recommendation[];
  unexpected?: Recommendation;
  limitation?: ResultLimitation;
  trace: DiscoveryTrace;
  followUpQuestion?: string;
  summary?: string;
  patch?: ProfilePatch;
}
