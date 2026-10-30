export const SUPPORTED_FILTER_TYPES = [
  "urn:entity:artist",
  "urn:entity:book",
  "urn:entity:brand",
  "urn:entity:destination",
  "urn:entity:movie",
  "urn:entity:place",
  "urn:entity:podcast",
  "urn:entity:tv_show",
  "urn:entity:video_game",
] as const;

export type FilterType = (typeof SUPPORTED_FILTER_TYPES)[number];

export interface CategoryDef {
  id: string;
  label: string;
  shortLabel: string;
  group: "Discover";
  filterType?: FilterType;
  extraFilterTypes?: FilterType[];
  needsExternal?: boolean;
  locationAware?: boolean;
  supplemental?: boolean;
}

/** Verified earlier against Qloo tag search. Dining place queries use it; other categories do not. */
export const DINING_PLACE_TAG = "urn:tag:genre:place:restaurant";

const LEGACY_CATEGORIES: Record<string, string> = {
  concerts: "music",
  music_gifts: "music",
  art: "experiences",
  travel: "experiences",
  outdoor: "experiences",
  wellness: "experiences",
  classes: "experiences",
  entertainment: "screen",
  home: "fashion",
  beauty: "fashion",
  design: "fashion",
  unique: "surprise",
};

export const CATEGORIES: CategoryDef[] = [
  {
    id: "dining",
    label: "Restaurants & Dining",
    shortLabel: "Dining",
    group: "Discover",
    filterType: "urn:entity:place",
    needsExternal: true,
    locationAware: true,
  },
  {
    id: "fashion",
    label: "Fashion & Clothing",
    shortLabel: "Fashion",
    group: "Discover",
    filterType: "urn:entity:brand",
  },
  {
    id: "music",
    label: "Music",
    shortLabel: "Music",
    group: "Discover",
    filterType: "urn:entity:artist",
    needsExternal: true,
    locationAware: true,
  },
  {
    id: "books",
    label: "Books",
    shortLabel: "Books",
    group: "Discover",
    filterType: "urn:entity:book",
  },
  {
    id: "screen",
    label: "Movies & TV Shows",
    shortLabel: "Movies & TV",
    group: "Discover",
    filterType: "urn:entity:movie",
    extraFilterTypes: ["urn:entity:tv_show"],
  },
  {
    id: "tech",
    label: "Electronics & Technology",
    shortLabel: "Tech",
    group: "Discover",
    filterType: "urn:entity:brand",
    supplemental: true,
  },
  {
    id: "experiences",
    label: "Experiences",
    shortLabel: "Experiences",
    group: "Discover",
    filterType: "urn:entity:place",
    extraFilterTypes: ["urn:entity:destination"],
    needsExternal: true,
    locationAware: true,
  },
  {
    id: "surprise",
    label: "Surprise Me",
    shortLabel: "Surprise Me",
    group: "Discover",
    filterType: "urn:entity:artist",
    extraFilterTypes: ["urn:entity:book", "urn:entity:place", "urn:entity:brand"],
  },
];

export const CULTURAL_OPTIONS = [
  ["west_african", "West African"],
  ["east_african", "East African"],
  ["caribbean", "Caribbean"],
  ["african_american", "African American"],
  ["latin_american", "Latin American"],
  ["east_asian", "East Asian"],
  ["south_asian", "South Asian"],
  ["european", "European"],
  ["middle_eastern", "Middle Eastern"],
  ["mixed", "Mixed influences"],
  ["ghanaian", "Ghanaian"],
  ["nigerian", "Nigerian"],
  ["jamaican", "Jamaican"],
  ["mexican", "Mexican"],
  ["japanese", "Japanese"],
  ["korean", "Korean"],
  ["indian", "Indian"],
  ["british", "British"],
  ["french", "French"],
  ["other", "Other"],
] as const;

export const INTEREST_CHIPS = [
  "Music",
  "Fashion",
  "Food",
  "Travel",
  "Books",
  "Movies",
  "Art",
  "Gaming",
  "Technology",
  "Fitness",
  "Wellness",
  "Nature",
  "Sports",
  "Photography",
  "Design",
];

export function normalizeCategoryId(id: string): string {
  return LEGACY_CATEGORIES[id] ?? id;
}

export function normalizeCategories(ids: string[]): string[] {
  const next: string[] = [];
  for (const id of ids) {
    const normalized = normalizeCategoryId(id);
    if (!categoryById(normalized) || next.includes(normalized)) continue;
    next.push(normalized);
  }
  return next;
}

export function categoryById(id: string): CategoryDef | undefined {
  return CATEGORIES.find((category) => category.id === normalizeCategoryId(id));
}

export function categoryLabel(id: string): string {
  return categoryById(id)?.label ?? id;
}

export function categoryShortLabel(id: string): string {
  return categoryById(id)?.shortLabel ?? categoryLabel(id);
}

function typesFor(id: string): FilterType[] {
  const category = categoryById(id);
  if (!category) return [];
  return [category.filterType, ...(category.extraFilterTypes ?? [])].filter(
    (value): value is FilterType => Boolean(value),
  );
}

export function selectedFilterTypes(categoryIds: string[]): FilterType[] {
  const ids = normalizeCategories(categoryIds);
  const surpriseOnly = ids.length === 1 && ids[0] === "surprise";
  const active = surpriseOnly ? ["music", "books", "dining", "fashion"] : ids.filter((id) => id !== "surprise");
  const types: FilterType[] = [];
  for (const id of active) {
    for (const filterType of typesFor(id)) {
      if (!types.includes(filterType)) types.push(filterType);
    }
  }
  if (!surpriseOnly && ids.includes("surprise")) {
    for (const extra of ["urn:entity:book", "urn:entity:brand", "urn:entity:movie"] as FilterType[]) {
      if (!types.includes(extra)) {
        types.push(extra);
        break;
      }
    }
  }
  return types.slice(0, 4);
}

export function needsLiveLookup(categoryIds: string[]): boolean {
  const ids = normalizeCategories(categoryIds);
  const active = ids.includes("surprise") ? [...ids, "music", "dining", "experiences"] : ids;
  return active.some((id) => categoryById(id)?.needsExternal);
}

export function categoryForEntityType(
  entityType: string,
  text: string,
  selected: string[],
  current: string,
): string {
  const chosen = normalizeCategories(selected);
  if (entityType.includes("book")) return "books";
  if (entityType.includes("artist")) return "music";
  if (entityType.includes("movie") || entityType.includes("tv_show") || entityType.includes("podcast")) {
    return "screen";
  }
  if (entityType.includes("destination")) return "experiences";
  if (entityType.includes("place")) {
    if (/restaurant|dining|cafe|café|kitchen|bistro|grill/.test(text) || chosen.includes("dining")) {
      if (chosen.includes("dining") && !chosen.includes("experiences")) return "dining";
      if (/restaurant|dining|cafe|café|kitchen|bistro|grill/.test(text)) return "dining";
    }
    return chosen.includes("experiences") ? "experiences" : "dining";
  }
  if (entityType.includes("brand")) {
    if (/tech|electronic|gadget|audio|phone/.test(text) && chosen.includes("tech")) return "tech";
    if (chosen.includes("fashion") && !chosen.includes("tech")) return "fashion";
    if (chosen.includes("tech") && !chosen.includes("fashion")) return "tech";
    if (chosen.includes("fashion")) return "fashion";
    return "fashion";
  }
  const fallback = normalizeCategoryId(current);
  return categoryById(fallback) ? fallback : chosen[0] || "surprise";
}

export const RELATIONSHIP_LABELS: Record<string, string> = {
  partner: "Partner",
  friend: "Friend",
  parent: "Parent",
  sibling: "Sibling",
  family: "Family member",
  colleague: "Colleague",
  myself: "Myself",
  other: "Other",
};

export const OCCASION_LABELS: Record<string, string> = {
  birthday: "Birthday",
  anniversary: "Anniversary",
  date_night: "Date night",
  congratulations: "Congratulations",
  holiday: "Holiday",
  just_because: "Just because",
  thank_you: "Thank you",
  other: "Something else",
};

export const MODE_LABELS: Record<string, string> = {
  taste: "Taste",
  cosmic: "Cosmic",
  fusion: "Fusion",
};

export const BUDGET_LABELS: Record<string, string> = {
  friendly: "Budget-friendly",
  moderate: "Moderate",
  premium: "Premium",
  none: "No specific budget",
  custom: "Custom budget",
};

export const GEO_LABELS: Record<string, string> = {
  local: "Local only",
  nearby: "Prefer nearby",
  anywhere: "Anywhere",
};

export const SUITABILITY_LABELS: Record<string, string> = {
  strong_match: "Strong match",
  worth_exploring: "Worth exploring",
  unexpected: "Unexpected discovery",
};

export const AVAILABILITY_LABELS: Record<string, string> = {
  verified_event: "Verified opportunity",
  verified_place: "Known place",
  idea: "Idea",
  exploratory: "Exploratory",
};

export const FEEDBACK_REASONS = [
  ["style", "Not their style"],
  ["expensive", "Too expensive"],
  ["far", "Too far away"],
  ["already", "They already have it"],
  ["occasion", "Not the right occasion"],
  ["other", "Something else"],
] as const;
