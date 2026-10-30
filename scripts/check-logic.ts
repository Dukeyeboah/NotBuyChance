import assert from "node:assert/strict";
import {
  birthdayNumber,
  buildCosmicProfile,
  expressionNumber,
  lifePathFromIso,
  reduceNumber,
  sunSign,
} from "../lib/cosmic/calculate";
import { affinityChance, conflictsWithDislike } from "../lib/agent/rank";
import { qlooAgeSignal } from "../lib/qloo/age";
import { sampleDraft } from "../lib/draft";
import { publicHttps, titlesMatch } from "../lib/images/lookup";
import {
  categoryForEntityType,
  normalizeCategories,
  selectedFilterTypes,
} from "../lib/qloo/categories";
import {
  applyNotForThem,
  assessCoverage,
  broadenJobs,
  cosmicThemesApply,
  guidanceFor,
  preferenceText,
  qlooGenderFilterApplied,
  selectUnexpected,
  shareGenderWithModel,
  tasteCompleteness,
  tasteQueries,
} from "../lib/discovery-rules";
import { currencyForCountry } from "../lib/countries";
import { currencyName } from "../lib/format";
import { firstName } from "../lib/text";
import { illustrationPrompt } from "../lib/identity";
import { pdfFilename, buildFindingsPdf } from "../components/download-report";
import type { Recommendation } from "../types/discovery";

assert.equal(reduceNumber(11), 11);
assert.equal(reduceNumber(31), 4);
assert.equal(lifePathFromIso("2000-01-08"), 11);
assert.equal(lifePathFromIso("1990-07-23"), 4);
assert.equal(sunSign(3, 21), "Aries");
assert.equal(sunSign(3, 20), "Pisces");
assert.equal(sunSign(7, 23), "Leo");
assert.equal(sunSign(7, 22), "Cancer");
assert.equal(sunSign(12, 22), "Capricorn");
assert.equal(sunSign(12, 21), "Sagittarius");
assert.equal(expressionNumber("Maya"), 4);

const cosmic = buildCosmicProfile("Maya", "1997-08-01");
assert.ok(cosmic);
assert.equal(cosmic?.sunSign, "Leo");
assert.equal(birthdayNumber("1997-08-01"), 1);
assert.equal(birthdayNumber("2000-01-29"), 11);
assert.equal(cosmic?.sunSign, "Leo");
assert.equal(cosmic?.birthdayNumber, 1);
assert.match(cosmic?.reading || "", /spotlight|quality/i);
assert.doesNotMatch(cosmic?.reading || "", /entertainment|pseudoscience|just for fun|not real/i);
assert.doesNotMatch(cosmic?.reading || "", /she loves luxury/i);
assert.match(buildCosmicProfile("Maya", "1997-08-01", { birthTime: "08:30", birthPlace: "Accra" })?.reading || "", /Rising sign and houses are not calculated/);
assert.equal(firstName("Judith Nana Afrakuma Bannerman Quist"), "Judith");
assert.equal(titlesMatch("Diana Krall", "Diana Krall"), true);
assert.equal(titlesMatch("The Ghana Jazz Experience", "Ghana"), false);
assert.equal(publicHttps("//thumb.wikimedia.org/wikipedia/commons/a.jpg"), "https://thumb.wikimedia.org/wikipedia/commons/a.jpg");
assert.equal(publicHttps("http://example.com/a.jpg"), undefined);
assert.equal(publicHttps("https://127.0.0.1/a.jpg"), undefined);
assert.equal(currencyForCountry("Ghana"), "GHS");
assert.equal(currencyForCountry("China"), "CNY");
assert.equal(currencyForCountry("United States"), "USD");
assert.equal(currencyName("USD"), "US dollars");

assert.equal(
  conflictsWithDislike("A packed stadium show with loud crowds", "Loud, overcrowded venues."),
  true,
);
assert.equal(
  conflictsWithDislike("A quiet listening bar with a small room", "Loud, overcrowded venues."),
  false,
);

assert.deepEqual(normalizeCategories(["concerts", "art", "books"]), ["music", "experiences", "books"]);
assert.deepEqual(selectedFilterTypes(["dining"]), ["urn:entity:place"]);
assert.ok(selectedFilterTypes(["surprise"]).includes("urn:entity:book"));
assert.ok(selectedFilterTypes(["surprise"]).includes("urn:entity:artist"));
assert.equal(categoryForEntityType("urn:entity:artist", "jazz", ["music"], "music"), "music");
assert.equal(categoryForEntityType("urn:entity:book", "photo book", ["books"], "books"), "books");
assert.equal(categoryForEntityType("urn:entity:brand", "audio gadget", ["tech"], "tech"), "tech");

const sparse = tasteCompleteness({
  interestsText: "",
  interestChips: [],
  lovedBefore: "",
  dislikes: "",
  culturalNotes: "",
});
assert.equal(sparse.level, "started");
assert.equal(tasteCompleteness(sampleDraft()).level, "clear");

const unsure = guidanceFor({
  name: "Sarah",
  interestsText: "",
  interestChips: [],
  culturalLabels: [],
  culturalNotes: "",
});
assert.match(unsure.question || "", /one thing Sarah enjoys/);
assert.ok(unsure.prompts.includes("Just show me some ideas"));

const cultural = preferenceText({
  interestsText: "",
  interestChips: [],
  lovedBefore: "",
  culturalNotes: "loves Korean food and Japanese design",
});
assert.match(cultural, /Korean food/);
assert.doesNotMatch(cultural, /West African/);
assert.deepEqual(
  tasteQueries({
    interestsText: "She loves Erykah Badu and quiet jazz bars.",
    interestChips: ["Music"],
    lovedBefore: "A photography book.",
    culturalNotes: "enjoys Korean food",
    occasionOther: "",
  }).tags.slice(0, 3),
  ["jazz", "photography", "food"],
);
assert.equal(qlooAgeSignal({ age: 29 }), "35_and_younger");
assert.equal(qlooAgeSignal({ birthDate: "1997-08-01" }), "35_and_younger");
assert.equal(qlooAgeSignal({ age: 40 }), "36_to_55");
assert.equal(qlooAgeSignal({ ageRange: "65+" }), "55_and_older");
assert.equal(qlooAgeSignal({}), undefined);
assert.equal(affinityChance({ qlooEvidence: [{ affinity: 0.99 }] }), "A strong chance they'd love this");
assert.equal(affinityChance({ qlooEvidence: [{}] }), undefined);

const localWiden = broadenJobs({
  geo: "local",
  city: "Accra",
  categories: ["dining"],
  tagId: "urn:tag:genre:music:jazz",
  tagName: "Jazz",
  calls: [{ filterType: "urn:entity:place", resultCount: 0 }],
  evidenceCount: 0,
});
assert.equal(localWiden[0]?.location, "Accra");
assert.equal(
  broadenJobs({
    geo: "anywhere",
    city: "Accra",
    categories: ["dining"],
    tagId: "urn:tag:genre:music:jazz",
    tagName: "Jazz",
    calls: [{ filterType: "urn:entity:place", resultCount: 0 }],
    evidenceCount: 0,
  }).length,
  0,
);

const diningLimit = assessCoverage({
  city: "Accra",
  geo: "local",
  categories: ["dining"],
  requestedCount: 5,
  recommendationCount: 0,
  evidenceCount: 0,
  resultCategories: [],
  insightCalls: [{ filterType: "urn:entity:place", resultCount: 0 }],
});
assert.equal(diningLimit?.kind, "sparse");
assert.ok(diningLimit?.actions.includes("nearby"));
assert.equal(diningLimit?.actions.includes("broader"), true);

const partial = assessCoverage({
  city: "",
  geo: "anywhere",
  categories: ["books"],
  requestedCount: 10,
  recommendationCount: 4,
  evidenceCount: 4,
  resultCategories: ["books", "books", "books", "books"],
  insightCalls: [{ filterType: "urn:entity:book", resultCount: 4 }],
});
assert.equal(partial?.kind, "partial");
assert.match(partial?.message || "", /four promising matches/);

function card(id: string, category: string, evidence: boolean): Recommendation {
  return {
    id,
    title: id,
    category,
    description: "",
    rationale: "",
    whyMatch: { toldUs: "Jazz", why: "A cultural connection." },
    supportingPreferences: [],
    qlooEvidence: evidence
      ? [{ entityId: id, name: id, entityType: `urn:entity:${category}`, signal: "tag:jazz" }]
      : [],
    geographicRelevance: "not_location_specific",
    price: { status: "unavailable" },
    availabilityStatus: "exploratory",
    recommendationType: "qloo_entity",
    rankingScore: 0.5,
    occasionFit: 0.4,
    suitability: "worth_exploring",
    exploratory: true,
    rank: 1,
  };
}

const mixed = selectUnexpected([
  card("a", "music", true),
  card("b", "music", true),
  card("c", "books", true),
]);
assert.equal(mixed.unexpected?.category, "books");
assert.equal(mixed.primary.some((item) => item.id === "c"), false);
const same = selectUnexpected([card("a", "music", true), card("b", "music", true), card("d", "music", true)]);
assert.equal(same.unexpected, undefined);

const costly = applyNotForThem(
  { ...sampleDraft(), budgetTier: "premium", categories: ["music", "books"] },
  { title: "Arena night", category: "music" },
  "expensive",
);
assert.equal(costly.draft.budgetTier, "moderate");
assert.deepEqual(costly.draft.categories, ["music", "books"]);
assert.ok(costly.draft.excludeTitles.includes("Arena night"));

assert.equal(cosmicThemesApply({ mode: "taste", cosmicInfluence: "yes", cosmicFeedback: "accurate" }), false);
assert.equal(cosmicThemesApply({ mode: "fusion", cosmicInfluence: "yes", cosmicFeedback: "not_really" }), false);
assert.equal(cosmicThemesApply({ mode: "fusion", cosmicInfluence: "little", cosmicFeedback: "somewhat" }), true);
assert.equal(cosmicThemesApply({ mode: "cosmic", cosmicInfluence: "", cosmicFeedback: "" }), true);
assert.equal(cosmicThemesApply({ mode: "fusion", cosmicInfluence: "no", cosmicFeedback: "accurate" }), false);

const quietJazz = illustrationPrompt({
  title: "An intimate jazz performance",
  description: "A small room and a live trio.",
  category: "music",
  city: "Accra",
  imagePreference: "subject-only",
});
assert.match(quietJazz, /Do not depict an identifiable recipient/);
assert.doesNotMatch(quietJazz, /Dark skin|Black woman|curly/i);

const depicted = illustrationPrompt({
  title: "An intimate jazz performance",
  category: "music",
  city: "Accra",
  age: "29",
  mode: "fusion",
  imagePreference: "describe-appearance",
  appearance: { skinTone: "Dark skin", hair: "Natural curly hair", style: "Simple tailored clothes", additionalDetails: "Adult woman" },
  ethnicityLabels: ["Black / African descent"],
});
assert.match(depicted, /Dark skin/);
assert.match(depicted, /Natural curly hair/);
assert.match(depicted, /Black \/ African descent/);
assert.match(depicted, /Do not replace the stated skin tone/);
assert.match(depicted, /Do not invent physical characteristics from astrology/);

const mixedHeritage = illustrationPrompt({
  title: "A design book",
  category: "books",
  imagePreference: "describe-appearance",
  appearance: { skinTone: "Medium brown skin", hair: "Dark wavy hair", style: "", additionalDetails: "" },
  ethnicityLabels: ["Mixed or multiple heritages"],
});
assert.match(mixedHeritage, /Medium brown skin/);
assert.match(mixedHeritage, /Mixed or multiple heritages/);

const optedOut = illustrationPrompt({
  title: "An intimate jazz performance",
  category: "music",
  imagePreference: "no-recipient",
  appearance: { skinTone: "Dark skin", hair: "Natural curly hair", style: "", additionalDetails: "" },
  ethnicityLabels: ["Black / African descent"],
});
assert.match(optedOut, /Do not depict an identifiable recipient/);
assert.doesNotMatch(optedOut, /Dark skin/);

const abroad = preferenceText({
  interestsText: "classical music, Japanese cinema, Scandinavian design, Italian food",
  interestChips: ["Music"],
  lovedBefore: "",
  culturalNotes: "Ghanaian, grew up in London, enjoys Korean food and Japanese design",
});
assert.match(abroad, /Korean food/);
assert.match(abroad, /Japanese cinema/);
assert.doesNotMatch(abroad, /Black \/ African/);
assert.equal(shareGenderWithModel({ genderOpenness: "open", gender: "female" }), false);
assert.equal(qlooGenderFilterApplied(), false);

assert.equal(pdfFilename("Maya"), "NotBuyChance_Maya_Discovery.pdf");
assert.equal(pdfFilename("Maya").endsWith(".html"), false);
void (async () => {
const findings = await buildFindingsPdf(
  { ...sampleDraft(), mode: "fusion", birthDate: "1997-08-01", feedback: [{ id: "f", title: "Quiet bar", reaction: "love", createdAt: "2026-10-29T00:00:00.000Z" }] },
  {
    summary: "A short overview for Maya.",
    recommendations: [{ ...card("Quiet bar", "music", true), description: "A small room and a good trio.", rationale: "Jazz was named outright." }],
    unexpected: { ...card("Coastal weekend", "experiences", false), rank: 2, description: "A slower weekend.", rationale: "Travel sits next to the music." },
    trace: {
      planSource: "fallback",
      entityQueries: [],
      resolvedEntities: [],
      tagsUsed: [],
      insightCalls: [],
      externalSearches: [],
      limitations: [],
      cosmicUsed: true,
      qlooFailed: false,
    },
  },
);
const pdf = findings.output();
assert.match(pdf, /^%PDF/);
assert.equal(pdf.includes("<!DOCTYPE html>"), false);
assert.match(pdf, /Maya/);
assert.match(pdf, /Fusion/);
assert.match(pdf, /Quiet bar/);
assert.match(pdf, /Something you might not have considered|Coastal weekend/);

console.log("logic checks passed");
})().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
