import type {
  AvailabilityStatus,
  DiscoveryInput,
  Recommendation,
  RecommendationType,
} from "@/types/discovery";
import { categoryById, categoryForEntityType, normalizeCategoryId } from "@/lib/qloo/categories";
import { cosmicThemesApply } from "@/lib/discovery-rules";
import {
  budgetRange,
  conflictsWithDislike,
  priceOutsideBudget,
} from "@/lib/agent/rank";
import { normalize } from "@/lib/text";
import type { EvidenceItem, ExternalHit, ModelRec } from "@/lib/agent/types";

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const CURRENCY_MARKERS: Record<string, string[]> = {
  USD: ["usd", "us$", "$"],
  GBP: ["gbp", "£"],
  EUR: ["eur", "€"],
  GHS: ["ghs", "gh₵", "₵"],
  NGN: ["ngn", "₦"],
  CAD: ["cad", "c$"],
  AUD: ["aud", "a$"],
  KES: ["kes"],
  ZAR: ["zar", "r "],
  INR: ["inr", "₹"],
  JPY: ["jpy", "¥"],
};

function parseLooseDate(value: string): Date | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (iso) {
    return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  }
  const monthMatch = value
    .toLowerCase()
    .match(
      /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/,
    );
  const yearMatch = value.match(/\b(20\d{2})\b/);
  const dayMatch = value.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (!monthMatch || !yearMatch || !dayMatch) return null;
  const month = MONTHS[monthMatch[1]];
  const day = Number(dayMatch[1]);
  if (!month || day < 1 || day > 31) return null;
  return new Date(Date.UTC(Number(yearMatch[1]), month - 1, day));
}

function isUpcoming(date: Date, today: Date): boolean {
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return date.getTime() >= start;
}

function snippetHasAmount(snippet: string, amount: number): boolean {
  const digits = snippet.replace(/,/g, "");
  const pattern = new RegExp(`(?<!\\d)${Math.round(amount)}(?:\\.\\d{1,2})?(?!\\d)`);
  return pattern.test(digits);
}

function snippetHasCurrency(snippet: string, currency: string): boolean {
  const haystack = snippet.toLowerCase();
  return (CURRENCY_MARKERS[currency] ?? [currency.toLowerCase()]).some((marker) =>
    haystack.includes(marker.toLowerCase()),
  );
}

function geographicRelevance(
  location: string,
  entityType: string,
  input: DiscoveryInput,
): Recommendation["geographicRelevance"] {
  const city = normalize(input.draft.city);
  const country = normalize(input.draft.country);
  const place = normalize(location);
  if (!place) {
    if (entityType.includes("place") || entityType.includes("destination")) return "unknown";
    return "not_location_specific";
  }
  if (city && place.includes(city)) return "in_city";
  if (country && place.includes(country)) return "in_country";
  return "elsewhere";
}

function blockedForAudience(text: string, input: DiscoveryInput): boolean {
  const age = input.age;
  const under18 = (age != null && age < 18) || input.draft.ageRange === "Under 18";
  const romantic =
    /\b(date night|romantic|lingerie|cocktail|nightlife|wine tasting|couples retreat)\b/i.test(
      text,
    );
  if (under18 && romantic) return true;
  if (under18 && /\b(bar|alcohol|pub crawl)\b/i.test(text)) return true;
  const relationship = input.draft.forSelf ? "myself" : input.draft.relationship;
  const askedForRomance = input.draft.occasions.some((occasion) =>
    ["date_night", "anniversary"].includes(occasion),
  );
  if (
    ["colleague", "parent", "sibling", "family"].includes(relationship) &&
    romantic &&
    !askedForRomance
  ) {
    return true;
  }
  return false;
}

function categoryForEntity(
  entityType: string,
  text: string,
  selected: string[],
  current: string,
): string {
  return categoryForEntityType(entityType, text, selected, current);
}

export function prepareRecommendations(options: {
  raw: ModelRec[];
  input: DiscoveryInput;
  evidence: EvidenceItem[];
  external: ExternalHit[];
  today?: Date;
}): Recommendation[] {
  const today = options.today ?? new Date();
  const evidenceById = new Map(options.evidence.map((item) => [item.id, item]));
  const externalByUrl = new Map(options.external.map((item) => [item.url, item]));
  const range = budgetRange(options.input);
  const seen = new Set<string>();
  const prepared: Recommendation[] = [];

  for (const item of options.raw) {
    if (!item.title.trim()) continue;
    const key = normalize(item.title);
    if (seen.has(key)) continue;
    if (
      options.input.draft.excludeTitles.some(
        (excluded) => normalize(excluded) === key,
      )
    ) {
      continue;
    }

    const written = normalize(`${item.title} ${item.description}`);
    const citations = item.qlooEntityIds
      .map((id) => evidenceById.get(id))
      .filter((entry): entry is EvidenceItem => Boolean(entry))
      .filter((entry) => written.includes(normalize(entry.name)))
      .map((entry) => ({
        entityId: entry.id,
        name: entry.name,
        entityType: entry.entityType,
        affinity: entry.affinity,
        signal: entry.signal,
        imageUrl: entry.imageUrl,
      }));

    const source = item.externalUrl ? externalByUrl.get(item.externalUrl) : undefined;
    const mentionedInSource = options.external.some((hit) => {
      const haystack = `${hit.title} ${hit.snippet}`.toLowerCase();
      const probe = item.title.toLowerCase().replace(/^[^:]+:\s*/, "").trim();
      return probe.length >= 8 && haystack.includes(probe);
    });
    if (!citations.length && !mentionedInSource) continue;

    let title = item.title.trim();
    let description = item.description.trim();
    let rationale = item.rationale.trim();
    if (citations.length === 1 && !mentionedInSource) {
      const cited = citations[0];
      if (normalize(title) !== normalize(cited.name)) {
        title = cited.name;
        const evidence = evidenceById.get(cited.entityId);
        if (description.length < 80 && evidence?.description) description = evidence.description;
        if (rationale.length < 80) {
          rationale = `Qloo connected ${cited.signal} with ${cited.name}. That is a cultural affinity, not a confirmed preference.`;
        }
      }
    }
    if (seen.has(normalize(title))) continue;

    const blob = [title, description, rationale, item.location, item.cosmicNote].join(" ");
    if (conflictsWithDislike(blob, options.input.draft.dislikes)) continue;
    if (blockedForAudience(blob, options.input)) continue;

    let availability = item.availabilityStatus as AvailabilityStatus;
    let recommendationType = item.recommendationType as RecommendationType;
    let date: string | undefined;
    let location = item.location.trim();
    const primary = citations[0];

    if (!citations.length && recommendationType === "qloo_entity") {
      recommendationType = source ? "external_opportunity" : "experience_idea";
      availability = source ? "exploratory" : "idea";
    }

    const place = citations.find(
      (citation) =>
        citation.entityType.includes("place") || citation.entityType.includes("destination"),
    );
    const placeAddress = place
      ? options.evidence.find((entry) => entry.id === place.entityId)?.address
      : undefined;
    if (placeAddress && availability !== "verified_event") {
      availability = "verified_place";
      recommendationType = "qloo_entity";
      location = placeAddress;
    } else if (availability === "verified_place") {
      availability = citations.length ? "exploratory" : "idea";
    }

    if (availability === "verified_event") {
      const parsed = item.date ? parseLooseDate(item.date) : null;
      const snippet = source?.snippet ?? "";
      const dateIsInSource =
        Boolean(source) &&
        Boolean(parsed) &&
        snippet.toLowerCase().includes(String(parsed?.getUTCFullYear())) &&
        isUpcoming(parsed as Date, today);
      if (!dateIsInSource) {
        availability = source ? "exploratory" : "idea";
        date = undefined;
      } else {
        date = item.date.trim();
      }
    }

    let price: Recommendation["price"] = { status: "unavailable" };
    if (
      source &&
      item.priceAmount != null &&
      snippetHasAmount(source.snippet, item.priceAmount) &&
      snippetHasCurrency(source.snippet, options.input.draft.currency)
    ) {
      price = {
        status: "verified",
        amount: item.priceAmount,
        currency: options.input.draft.currency,
      };
    }
    if (price.status === "verified" && priceOutsideBudget(price.amount, range)) {
      continue;
    }

    const entityType = primary?.entityType ?? "";
    const relevance = geographicRelevance(location, entityType, options.input);
    if (
      options.input.draft.geo === "local" &&
      options.input.draft.city &&
      (availability === "verified_place" || availability === "verified_event") &&
      relevance === "elsewhere"
    ) {
      continue;
    }

    const normalizedCurrent = normalizeCategoryId(item.category);
    const fallbackCategory = categoryById(normalizedCurrent)
      ? normalizedCurrent
      : options.input.draft.categories[0] || "surprise";
    const category = primary
      ? categoryForEntity(
          primary.entityType,
          `${title} ${description}`,
          options.input.draft.categories,
          fallbackCategory,
        )
      : fallbackCategory;
    const interests = `${options.input.draft.interestsText} ${options.input.draft.interestChips.join(" ")}`.trim();
    const claimsUnstatedEntity = citations.some(
      (citation) =>
        item.toldUs.toLowerCase().includes(citation.name.toLowerCase()) &&
        !interests.toLowerCase().includes(citation.name.toLowerCase()),
    );
    const toldUs = claimsUnstatedEntity
      ? interests || "The interests you shared."
      : item.toldUs.trim();
    if (category === "tech" && !/specific product|brand affinity/i.test(rationale)) {
      rationale = `${rationale} This is a brand affinity, not a specific product, price, or stock level.`;
    }
    const exploratory =
      availability === "exploratory" ||
      (citations.length === 0 && availability !== "verified_event");

    const cosmic =
      cosmicThemesApply(options.input.draft) && item.cosmicNote.trim()
        ? item.cosmicNote.trim()
        : undefined;

    seen.add(normalize(title));
    prepared.push({
      id: crypto.randomUUID(),
      title,
      category,
      description,
      rationale,
      whyMatch: {
        toldUs,
        qloo: title === item.title.trim() ? item.qlooExplanation.trim() || undefined : rationale,
        why: rationale,
        cosmic,
      },
      supportingPreferences: item.supportingPreferences.filter(Boolean).slice(0, 6),
      qlooEvidence: citations,
      location: location || undefined,
      geographicRelevance: relevance,
      date,
      price,
      externalSource: source
        ? { title: source.title, url: source.url, retrievedAt: source.retrievedAt }
        : undefined,
      availabilityStatus: availability,
      recommendationType,
      rankingScore: 0,
      occasionFit: Math.min(1, Math.max(0, item.occasionFit)),
      suitability: "worth_exploring",
      exploratory,
      rank: prepared.length + 1,
    });
  }

  return prepared;
}
