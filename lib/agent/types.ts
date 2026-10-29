export interface EvidenceItem {
  id: string;
  name: string;
  entityType: string;
  description: string;
  tags: string[];
  imageUrl?: string;
  address?: string;
  affinity?: number;
  signal: string;
  matchedTerms: string[];
}

export interface ExternalHit {
  title: string;
  url: string;
  snippet: string;
  retrievedAt: string;
}

export interface ModelRec {
  title: string;
  category: string;
  description: string;
  rationale: string;
  toldUs: string;
  qlooExplanation: string;
  cosmicNote: string;
  supportingPreferences: string[];
  qlooEntityIds: string[];
  externalUrl: string;
  location: string;
  date: string;
  priceAmount: number | null;
  availabilityStatus: "verified_event" | "verified_place" | "idea" | "exploratory";
  recommendationType: "qloo_entity" | "experience_idea" | "external_opportunity";
  novelty: number;
  occasionFit: number;
}

export interface ModelPlan {
  entitySearches: { query: string; type: string }[];
  tagSearches: string[];
  externalQuery: string;
  rationale: string;
}

export interface RefineExtraction {
  summary: string;
  addInterests: string;
  addDislikes: string;
  budgetMin: number | null;
  budgetMax: number | null;
  geo: string;
  preferNovel: boolean;
}
