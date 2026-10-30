"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CosmicProfile, DiscoveryDraft, DiscoveryResult, FeedbackReason, Reaction, Recommendation } from "@/types/discovery";
import { emptyDraft, sampleDraft } from "@/lib/draft";
import { COUNTRIES, currencyForCountry } from "@/lib/countries";
import { buildCosmicProfile } from "@/lib/cosmic/calculate";
import {
  CATEGORIES,
  CULTURAL_OPTIONS,
  GEO_LABELS,
  INTEREST_CHIPS,
  MODE_LABELS,
  OCCASION_LABELS,
  RELATIONSHIP_LABELS,
  categoryLabel,
} from "@/lib/qloo/categories";
import { applyNotForThem } from "@/lib/discovery-rules";
import { budgetLabel, currencyName, formatMoney } from "@/lib/format";
import { firstName } from "@/lib/text";
import { LoadingStory } from "@/components/loading-story";
import { saveDiscovery, saveFeedback, updateDraft } from "@/lib/storage";
import { aiIllustrationsEnabled } from "@/lib/ai-illustrations";
import { ETHNICITY_OPTIONS } from "@/lib/identity";
import { CategoryIcon } from "@/components/category-icon";
import { utilityIcons } from "@/lib/icons";
import { Button, Choice, Field, TextArea, TextInput } from "@/components/ui";
import { ResultsView } from "@/components/results-view";

const STEPS = ["Who", "Occasion", "Style", "Tastes", "Details", "Review"] as const;
const STEP_NOTES = [
  "Let's get to know them.",
  "Nice. What's the moment for?",
  "Explore astrological and numerological insights as another way to inspire personalized discoveries.",
  "I'm starting to see a few interesting directions.",
  "What kind of surprise feels right?",
  "Let's see what we can discover.",
];

function CategoryMark({ id, selected }: { id: string; selected: boolean }) {
  return <CategoryIcon id={id} size={68} selected={selected} />;
}

const AGE_RANGES = ["Under 18", "18–24", "25–34", "35–44", "45–54", "55–64", "65+"];

async function readStream(
  response: Response,
  onPhase: (phase: { id: string; message: string }) => void,
): Promise<DiscoveryResult> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Discovery didn't start.");
  const decoder = new TextDecoder();
  let buffer = "";
  let result: DiscoveryResult | null = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((item) => item.startsWith("data:"));
      if (!line) continue;
      const event = JSON.parse(line.slice(5).trim()) as {
        type: string;
        id?: string;
        message?: string;
        result?: DiscoveryResult;
      };
      if (event.type === "phase" && event.id && event.message) {
        onPhase({ id: event.id, message: event.message });
      }
      if (event.type === "error") throw new Error(event.message || "Discovery didn't finish.");
      if (event.type === "result" && event.result) result = event.result;
    }
  }
  if (!result) throw new Error("Discovery didn't finish.");
  return result;
}

function toggle<T extends string>(items: T[], value: T): T[] {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

export function DiscoverFlow() {
  const params = useSearchParams();
  const sample = params.get("sample") === "1";
  const personId = params.get("person");
  const [draft, setDraft] = useState<DiscoveryDraft>(() => (sample ? sampleDraft() : emptyDraft()));
  const [step, setStep] = useState(sample ? 5 : 0);
  const [loading, setLoading] = useState(false);
  const [phases, setPhases] = useState<{ id: string; message: string }[]>([]);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [basic, setBasic] = useState<Recommendation[] | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState("");

  useEffect(() => {
    if (sample || !personId) return;
    void import("@/lib/storage").then(({ getPerson }) => {
      const person = getPerson(personId);
      if (!person) return;
      setDraft(person.draft);
      setStep(params.get("step") === "edit" ? 0 : 5);
      const latest = person.sessions[0];
      if (latest && params.get("step") !== "edit") {
        setResult({
          recommendations: latest.recommendations,
          unexpected: latest.unexpected,
          limitation: latest.limitation,
          trace: latest.trace,
          summary: latest.summary,
        });
      }
    });
  }, [personId, sample, params]);

  useEffect(() => {
    document.documentElement.dataset.theme = draft.mode || "taste";
    return () => {
      document.documentElement.dataset.theme = "taste";
    };
  }, [draft.mode]);

  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), 20000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const cosmic = useMemo(
    () =>
      buildCosmicProfile(draft.name || "They", draft.birthDate || undefined, {
        birthTime: draft.birthTime,
        birthPlace: draft.birthPlace,
      }),
    [draft.birthDate, draft.birthPlace, draft.birthTime, draft.name],
  );

  function update(patch: Partial<DiscoveryDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function setCountry(country: string) {
    setDraft((current) => ({
      ...current,
      country,
      currency: current.currencyTouched ? current.currency : currencyForCountry(country),
    }));
  }

  function validate(index: number): string {
    if (index === 0 && !draft.name.trim()) return "Add a name to continue.";
    if (index === 0 && !draft.forSelf && !draft.relationship) return "Choose how you know them.";
    if (index === 1 && draft.occasions.length === 0) return "Choose an occasion.";
    if (index === 2 && draft.mode !== "taste" && cosmic && !draft.cosmicInfluence) {
      return "Choose whether cosmic themes should influence the discoveries.";
    }
    if (index === 4 && draft.categories.length === 0) return "Choose at least one kind of surprise.";
    if (index === 4 && draft.geo === "local" && !draft.city.trim()) {
      return "Add a city for local-only discovery, or choose a wider area.";
    }
    if (index === 4 && draft.budgetTier === "custom" && !draft.budgetMin && !draft.budgetMax) {
      return "Add a minimum or maximum for your budget.";
    }
    return "";
  }

  function next() {
    const message = validate(step);
    setError(message);
    if (message) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function discover(
    nextDraft: DiscoveryDraft,
    refinementMessage?: string,
    merge = false,
    noticeText = "Saved on this device.",
  ) {
    setLoading(true);
    setError("");
    setBasic(null);
    setPhases([{ id: "understanding", message: "Exploring their interests..." }]);
    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: nextDraft, refinementMessage }),
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream")) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Discovery didn't start.");
      }
      const discovered = await readStream(response, (phase) => {
        setPhases((current) =>
          current.some((item) => item.id === phase.id) ? current : [...current, phase],
        );
      });
      const patched = discovered.patch ? { ...nextDraft, ...discovered.patch } : nextDraft;
      setDraft(patched);
      setResult((current) => {
        if (!merge || !current) return discovered;
        const seen = new Set(current.recommendations.map((item) => item.title.toLowerCase()));
        const added = discovered.recommendations.filter((item) => !seen.has(item.title.toLowerCase()));
        return {
          ...discovered,
          recommendations: [...current.recommendations, ...added].map((item, index) => ({
            ...item,
            rank: index + 1,
          })),
        };
      });
      saveDiscovery(patched, discovered);
      setNotice(noticeText);
      window.setTimeout(() => setNotice(""), 3200);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Discovery didn't finish.");
    } finally {
      setLoading(false);
    }
  }

  function reactTo(item: Recommendation, reaction: Reaction, reason?: FeedbackReason) {
    const applied =
      reaction === "not"
        ? applyNotForThem(draft, item, reason || "other")
        : { draft, summary: "" };
    const feedback = {
      id: crypto.randomUUID(),
      title: item.title,
      reaction,
      category: item.category,
      reason: reaction === "not" ? reason || "other" : undefined,
      createdAt: new Date().toISOString(),
    };
    const nextDraft: DiscoveryDraft = {
      ...applied.draft,
      feedback: [...draft.feedback.filter((entry) => entry.title !== item.title), feedback],
    };
    setDraft(nextDraft);
    saveFeedback(nextDraft.personId, feedback, nextDraft);
    if (reaction === "not" && (reason === "expensive" || reason === "far")) {
      void discover(nextDraft, undefined, false, applied.summary);
      return;
    }
    if (reaction === "not" && result) {
      const recommendations = result.recommendations
        .filter((entry) => entry.id !== item.id)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
      const unexpected = result.unexpected?.id === item.id ? undefined : result.unexpected;
      setResult({ ...result, recommendations, unexpected });
      setNotice(applied.summary);
    }
  }

  function saveIdea(item: Recommendation) {
    const savedIdeas = draft.savedIdeas.includes(item.title)
      ? draft.savedIdeas.filter((title) => title !== item.title)
      : [...draft.savedIdeas, item.title];
    const nextDraft = { ...draft, savedIdeas };
    setDraft(nextDraft);
    updateDraft(nextDraft.personId, nextDraft);
    setNotice(savedIdeas.includes(item.title) ? "Saved with this profile." : "Removed from saved ideas.");
  }

  async function compare() {
    setComparing(true);
    setCompareError("");
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const payload = (await response.json()) as { recommendations?: Recommendation[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "The comparison didn't finish.");
      setBasic(payload.recommendations || []);
    } catch (caught) {
      setCompareError(caught instanceof Error ? caught.message : "The comparison didn't finish.");
    } finally {
      setComparing(false);
    }
  }

  const name = firstName(draft.name);

  if (loading) {
    return <LoadingStory name={name} phases={phases} slow={slow} />;
  }

  if (result) {
    return (
      <div>
        {notice ? (
          <p role="status" className="mx-auto mb-4 w-full max-w-[1440px] px-5 text-sm text-muted lg:px-10">
            {notice}
          </p>
        ) : null}
        {error ? (
          <div className="mx-auto mb-4 w-full max-w-[1440px] px-5 lg:px-10">
            <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm">{error}</p>
            <Button className="mt-3" variant="secondary" onClick={() => discover(draft)}>
              Try again
            </Button>
          </div>
        ) : null}
        <div className="mx-auto mb-4 flex w-full max-w-[1440px] justify-end px-5 lg:px-10">
          <Button variant="ghost" onClick={() => setResult(null)}>
            Edit details
          </Button>
        </div>
        <ResultsView
          draft={draft}
          result={result}
          onReact={reactTo}
          onRefine={(message) => discover(draft, message)}
          onCategorySearch={(categoryId) => discover({ ...draft, categories: [categoryId] }, undefined, true)}
          onReplace={() =>
            discover({
              ...draft,
              preferNovel: true,
              excludeTitles: [
                ...draft.excludeTitles,
                ...result.recommendations.map((item) => item.title),
                ...(result.unexpected ? [result.unexpected.title] : []),
              ],
            })
          }
          onAdjust={(action) => {
            if (action === "another_category") {
              setResult(null);
              setStep(4);
              return;
            }
            void discover(
              { ...draft, geo: "nearby" },
              undefined,
              false,
              "I'll look a little further from the city.",
            );
          }}
          onPrompt={(prompt) => {
            const chips = ["Music", "Food", "Books", "Fashion", "Art"];
            if (chips.includes(prompt)) {
              const interestChips = draft.interestChips.includes(prompt)
                ? draft.interestChips
                : [...draft.interestChips, prompt];
              void discover({ ...draft, interestChips });
              return;
            }
            void discover({
              ...draft,
              interestsText: `${draft.interestsText} ${prompt}`.trim(),
            });
          }}
          onSave={saveIdea}
          comparing={comparing}
          basic={basic}
          compareError={compareError}
          onCompare={compare}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 lg:px-10">
      <ol className="flex gap-1.5" aria-label="Progress">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`h-1 flex-1 rounded-full ${index <= step ? "progress-on" : "bg-line"}`}
          />
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>
      <p className="mt-2 text-sm text-accent-deep">{STEP_NOTES[step]}</p>

      {sample && step === 5 ? (
        <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm leading-6">
          Maya is a demo profile. The button below runs a real discovery. You can go back and change anything first.
        </p>
      ) : null}

      <div className="mt-6">
        {step === 0 ? <WhoStep draft={draft} update={update} setCountry={setCountry} /> : null}
        {step === 1 ? <OccasionStep draft={draft} update={update} /> : null}
        {step === 2 ? (
          <StyleStep draft={draft} update={update} cosmic={cosmic} />
        ) : null}
        {step === 3 ? <TasteStep draft={draft} update={update} /> : null}
        {step === 4 ? <DetailStep draft={draft} update={update} /> : null}
        {step === 5 ? <ReviewStep draft={draft} /> : null}
      </div>

      {error ? <p className="mt-4 text-sm text-accent-deep">{error}</p> : null}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < 5 ? (
          <Button onClick={next}>Continue</Button>
        ) : (
          <Button onClick={() => discover(draft)}>
            {draft.forSelf ? "Find something I'll love" : "Find something they'll love"}
          </Button>
        )}
      </div>
    </div>
  );
}

function WhoStep({
  draft,
  update,
  setCountry,
}: {
  draft: DiscoveryDraft;
  update: (patch: Partial<DiscoveryDraft>) => void;
  setCountry: (country: string) => void;
}) {
  const [ageEntry, setAgeEntry] = useState<"date" | "age">(draft.age.trim() && !draft.birthDate ? "age" : "date");
  const hasExactAge = Boolean(draft.birthDate || draft.age.trim());
  return (
    <div className="space-y-6">
      <div>
        <img src={utilityIcons.profile} alt="" className="mb-3 h-16 w-16 object-contain" />
        <h1 className="font-display text-4xl leading-tight">Let's get to know them.</h1>
        <p className="mt-3 text-muted">A little information helps us make more thoughtful suggestions.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Choice selected={!draft.forSelf} title="Someone else" onClick={() => update({ forSelf: false, relationship: draft.relationship === "myself" ? "" : draft.relationship })} />
        <Choice selected={draft.forSelf} title="Myself" onClick={() => update({ forSelf: true, relationship: "myself" })} />
      </div>
      <Field label="Name">
        <TextInput value={draft.name} onChange={(event) => update({ name: event.target.value })} placeholder="Maya Owusu" autoComplete="off" />
      </Field>
      {draft.forSelf ? null : (
        <fieldset>
          <legend className="text-sm font-medium">Who are they to you?</legend>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Object.entries(RELATIONSHIP_LABELS)
              .filter(([id]) => id !== "myself")
              .map(([id, label]) => (
                <Choice key={id} selected={draft.relationship === id} title={label} onClick={() => update({ relationship: id as DiscoveryDraft["relationship"] })} />
              ))}
          </div>
        </fieldset>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end lg:[&>*]:min-w-0">
        <Field label="Country" aside="Optional. Used for nearby ideas.">
          <TextInput list="countries" value={draft.country} onChange={(event) => setCountry(event.target.value)} placeholder="Ghana" />
          <datalist id="countries">
            {COUNTRIES.map((country) => (
              <option key={country} value={country} />
            ))}
          </datalist>
        </Field>
        <Field label="City">
          <TextInput value={draft.city} onChange={(event) => update({ city: event.target.value })} placeholder="Accra" />
        </Field>
        <Field label="Birthplace" aside="optional">
          <TextInput value={draft.birthPlace} onChange={(event) => update({ birthPlace: event.target.value })} placeholder="Accra" />
        </Field>
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <span className="text-sm font-medium">
              {ageEntry === "date" ? "Date of birth" : "Age"}
              {ageEntry === "date" ? (
                <span className="ml-1.5 font-normal italic text-muted">(used for more accurate personality reading)</span>
              ) : null}
            </span>
            <div className="inline-flex rounded-full bg-card p-1 ring-1 ring-line" role="group" aria-label="Age entry">
              {(
                [
                  ["date", "Date"],
                  ["age", "Age"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={ageEntry === id}
                  onClick={() => {
                    setAgeEntry(id);
                    update(id === "date" ? { age: "" } : { birthDate: "" });
                  }}
                  className={`min-h-8 rounded-full px-2.5 text-xs ${ageEntry === id ? "chip-on" : "text-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2">
            {ageEntry === "date" ? (
              <TextInput
                type="date"
                value={draft.birthDate}
                onChange={(event) => update({ birthDate: event.target.value, age: "", ageRange: event.target.value ? "" : draft.ageRange })}
              />
            ) : (
              <TextInput
                inputMode="numeric"
                value={draft.age}
                onChange={(event) => update({ age: event.target.value, birthDate: "", ageRange: event.target.value.trim() ? "" : draft.ageRange })}
                placeholder="29"
              />
            )}
          </div>
        </div>
      </div>
      {hasExactAge ? null : (
        <Field label="Age range">
          <div className="flex flex-wrap gap-2">
            {AGE_RANGES.map((range) => (
              <button
                key={range}
                type="button"
                aria-pressed={draft.ageRange === range}
                onClick={() => update({ ageRange: draft.ageRange === range ? "" : range })}
                className={`min-h-10 rounded-full px-3 text-sm ${draft.ageRange === range ? "chip-on" : "bg-card ring-1 ring-line"}`}
              >
                {range}
              </button>
            ))}
          </div>
        </Field>
      )}
      <fieldset>
        <legend className="text-sm font-medium">Gender, if you want to share it</legend>
        <div className="mt-3 flex flex-wrap gap-2 lg:flex-nowrap">
          {[
            ["female", "Female"],
            ["male", "Male"],
            ["nonbinary", "Nonbinary"],
            ["self_describe", "Prefer to self-describe"],
            ["unspecified", "Prefer not to say"],
          ].map(([id, label]) => (
            <Choice
              key={id}
              className="w-auto shrink-0 whitespace-nowrap px-3 py-2"
              selected={draft.gender === id}
              title={label}
              onClick={() => update({ gender: id as DiscoveryDraft["gender"] })}
            />
          ))}
        </div>
        {draft.gender === "self_describe" ? (
          <TextInput className="mt-3" value={draft.genderCustom} onChange={(event) => update({ genderCustom: event.target.value })} placeholder="How should we refer to them?" />
        ) : null}
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">How open should we be with recommendations?</legend>
        <div className="mt-3 grid gap-3">
          <Choice
            selected={draft.genderOpenness !== "demographic"}
            title="Open to everything"
            detail="Explore ideas based on what they enjoy, without limiting recommendations by gender."
            onClick={() => update({ genderOpenness: "open" })}
          />
          <Choice
            selected={draft.genderOpenness === "demographic"}
            title="Use gender-related insights when helpful"
            detail="Consider relevant context alongside their personal interests. This does not add a gender filter to Qloo."
            onClick={() => update({ genderOpenness: "demographic" })}
          />
        </div>
      </fieldset>
      <details className="rounded-[28px] border border-line bg-card p-5">
        <summary className="cursor-pointer text-sm font-medium">A little more about them, if you want</summary>
        <p className="mt-3 text-sm leading-6 text-muted">
          Ethnicity and cultural influences are optional. Skip anything you don't know. A heritage label is not treated as a list of tastes.
        </p>
        <fieldset className="mt-5">
          <legend className="text-sm font-medium">How would they describe their ethnicity or heritage?</legend>
          <p className="mt-2 text-sm leading-6 text-muted">This can help us personalize cultural context and visual representations when relevant. Choose more than one if it fits.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ETHNICITY_OPTIONS.map(([id, label]) => {
              const selected = draft.ethnicity.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    if (id === "prefer_not") {
                      update({ ethnicity: selected ? [] : ["prefer_not"] });
                      return;
                    }
                    update({
                      ethnicity: toggle(
                        draft.ethnicity.filter((item) => item !== "prefer_not"),
                        id,
                      ),
                    });
                  }}
                  className={`min-h-10 rounded-full px-3 text-sm ${selected ? "chip-on" : "bg-ivory ring-1 ring-line"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {draft.ethnicity.includes("self_describe") ? (
            <TextInput
              className="mt-3"
              value={draft.ethnicityOther}
              onChange={(event) => update({ ethnicityOther: event.target.value })}
              placeholder="In their words"
            />
          ) : null}
        </fieldset>
        <fieldset className="mt-6">
          <legend className="text-sm font-medium">Are there cultural influences or traditions they especially connect with?</legend>
          <p className="mt-2 text-sm leading-6 text-muted">
            Share foods, music, traditions, or places they actually enjoy. A label alone won't decide their taste.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CULTURAL_OPTIONS.map(([id, label]) => {
              const selected = draft.culturalLabels.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update({ culturalLabels: toggle(draft.culturalLabels, id) })}
                  className={`min-h-10 rounded-full px-3 text-sm ${selected ? "chip-on" : "bg-ivory ring-1 ring-line"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <Field label="Anything more specific?" hint="Skip this if you'd rather not say.">
            <TextArea
              value={draft.culturalNotes}
              onChange={(event) => update({ culturalNotes: event.target.value })}
              placeholder="She's Ghanaian, grew up in London, and enjoys Korean food and Japanese design."
            />
          </Field>
        </fieldset>
        {aiIllustrationsEnabled ? (
        <fieldset className="mt-6">
          <legend className="text-sm font-medium">How should we represent this person in generated images?</legend>
          <div className="mt-3 grid gap-2">
            <Choice
              selected={draft.imagePreference === "describe-appearance"}
              title="Use the appearance details I provide"
              detail="Illustrations can include a person who matches what you describe."
              onClick={() => update({ imagePreference: "describe-appearance" })}
            />
            <Choice
              selected={draft.imagePreference === "" || draft.imagePreference === "subject-only"}
              title="Keep images focused on the gift or experience"
              detail="The picture stays on the place, object, or meal."
              onClick={() => update({ imagePreference: "subject-only" })}
            />
            <Choice
              selected={draft.imagePreference === "no-recipient"}
              title="Don't depict the recipient"
              onClick={() => update({ imagePreference: "no-recipient" })}
            />
          </div>
          {draft.imagePreference === "describe-appearance" ? (
            <div className="mt-4 grid gap-3">
              <Field label="Skin tone or complexion">
                <TextInput value={draft.visualAppearance.skinTone} onChange={(event) => update({ visualAppearance: { ...draft.visualAppearance, skinTone: event.target.value } })} placeholder="Dark skin" />
              </Field>
              <Field label="Hair">
                <TextInput value={draft.visualAppearance.hair} onChange={(event) => update({ visualAppearance: { ...draft.visualAppearance, hair: event.target.value } })} placeholder="Natural curly hair" />
              </Field>
              <Field label="Clothing or visual style">
                <TextInput value={draft.visualAppearance.style} onChange={(event) => update({ visualAppearance: { ...draft.visualAppearance, style: event.target.value } })} placeholder="Simple tailored clothes" />
              </Field>
              <Field label="Anything else that should show" hint="Only what you want an illustration to follow.">
                <TextArea value={draft.visualAppearance.additionalDetails} onChange={(event) => update({ visualAppearance: { ...draft.visualAppearance, additionalDetails: event.target.value } })} placeholder="Adult woman, warm smile, no jewelry" />
              </Field>
            </div>
          ) : null}
        </fieldset>
        ) : null}
      </details>
    </div>
  );
}

function OccasionStep({
  draft,
  update,
}: {
  draft: DiscoveryDraft;
  update: (patch: Partial<DiscoveryDraft>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">What's the occasion?</h1>
        <p className="mt-3 text-muted">Choose more than one if it fits.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(OCCASION_LABELS).map(([id, label]) => (
          <Choice
            key={id}
            selected={draft.occasions.includes(id as DiscoveryDraft["occasions"][number])}
            title={label}
            onClick={() =>
              update({
                occasions: toggle(draft.occasions, id as DiscoveryDraft["occasions"][number]),
              })
            }
          />
        ))}
      </div>
      {draft.occasions.includes("other") ? (
        <Field label="What's the occasion?">
          <TextInput value={draft.occasionOther} onChange={(event) => update({ occasionOther: event.target.value })} />
        </Field>
      ) : null}
      <Field label="When is the occasion?" hint="Optional. Used as a real constraint for ticketed ideas.">
        <TextInput type="date" value={draft.occasionDate} onChange={(event) => update({ occasionDate: event.target.value })} />
      </Field>
    </div>
  );
}

function StyleStep({
  draft,
  update,
  cosmic,
}: {
  draft: DiscoveryDraft;
  update: (patch: Partial<DiscoveryDraft>) => void;
  cosmic: CosmicProfile | null;
}) {
  const name = firstName(draft.name);
  const themes = cosmic?.themes ?? [];
  const showJoin = draft.mode !== "taste" && draft.cosmicFeedback !== "not_really";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">How would you like to discover?</h1>
        <p className="mt-3 text-muted">Explore astrological and numerological insights as another way to inspire personalized discoveries.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {(
          [
            ["taste", "Taste", "Known interests, cultural notes, Qloo affinities, and your feedback."],
            ["cosmic", "Cosmic", "Sun-sign and numerology themes lead, within budget, place, occasion, and dislikes."],
            ["fusion", "Fusion", "Qloo affinities and cosmic themes together."],
          ] as const
        ).map(([id, title, detail]) => (
          <Choice
            key={id}
            selected={draft.mode === id}
            title={title}
            detail={detail}
            showCheck
            mark={
              <CategoryIcon
                id={id}
                size={72}
                motion={
                  draft.mode === id && id === "cosmic"
                    ? "float"
                    : draft.mode === id && id === "fusion"
                      ? "orbit"
                      : "none"
                }
              />
            }
            onClick={() =>
              update({
                mode: id,
                cosmicInfluence:
                  id === "taste" || draft.cosmicInfluence
                    ? draft.cosmicInfluence
                    : id === "fusion"
                      ? "little"
                      : "yes",
              })
            }
          />
        ))}
      </div>
      {cosmic ? (
        <div className="rounded-[28px] border border-line bg-card p-5">
          <p className="text-sm text-muted">A little more about {name}</p>
          <p className="mt-3 leading-7">
            {themes.length
              ? `Based on ${name}'s astrological and numerological profile, themes of ${themes.slice(0, 3).join(", ")} come through. These interpretations suggest directions we could explore when choosing something special.`
              : `${name}'s profile can grow from here.`}
          </p>
          {themes.length ? <p className="mt-4 text-sm">Associated themes: {themes.join(", ")}</p> : null}
          {draft.mode === "taste" ? (
            <p className="mt-3 text-sm text-muted">Taste mode follows known interests. Cosmic and Fusion can draw on this profile.</p>
          ) : null}
          <div className={`mt-5 grid items-start gap-6 ${showJoin ? "lg:grid-cols-2" : ""}`}>
            <div>
              <p className="text-sm font-medium">Does this sound like the person you know?</p>
              <div className="mt-3 flex flex-col items-start gap-2">
                {(
                  [
                    ["accurate", "Yes, very much."],
                    ["somewhat", "Somewhat."],
                    ["not_really", "Not really."],
                  ] as const
                ).map(([id, label]) => (
                  <Choice
                    key={id}
                    className="w-fit"
                    selected={draft.cosmicFeedback === id}
                    title={label}
                    onClick={() =>
                      update({
                        cosmicFeedback: id,
                        cosmicInfluence: id === "accurate" ? "yes" : id === "somewhat" ? "little" : "no",
                      })
                    }
                  />
                ))}
              </div>
              {draft.cosmicFeedback === "somewhat" || draft.cosmicFeedback === "not_really" ? (
                <Field label="What else should we know?">
                  <TextArea
                    value={draft.cosmicCorrection}
                    onChange={(event) => update({ cosmicCorrection: event.target.value })}
                    placeholder="She's adventurous but doesn't really enjoy crowded places."
                  />
                </Field>
              ) : null}
            </div>
            {showJoin ? (
              <div>
                <p className="text-sm font-medium">How should this profile join the discovery?</p>
                <div className="mt-3 flex flex-col items-start gap-2">
                  {(
                    [
                      ["yes", "Let these themes inspire the suggestions."],
                      ["little", "Use them alongside what I already know."],
                      ["no", "Follow what I know about them."],
                    ] as const
                  ).map(([id, label]) => (
                    <Choice
                      key={id}
                      className="w-fit"
                      selected={draft.cosmicInfluence === id}
                      title={label}
                      onClick={() => update({ cosmicInfluence: id })}
                    />
                  ))}
                </div>
              </div>
            ) : draft.mode !== "taste" && draft.cosmicFeedback === "not_really" ? (
              <p className="text-sm leading-6 text-muted">
                We'll follow what you know about them. These themes won't shape the suggestions.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">Add a name, and a birth date if you have one, to see an astrological and numerological profile.</p>
      )}
      <p className="text-xs text-muted">Current mode: {MODE_LABELS[draft.mode]}.</p>
    </div>
  );
}

function TasteStep({
  draft,
  update,
}: {
  draft: DiscoveryDraft;
  update: (patch: Partial<DiscoveryDraft>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">What do you already know they love?</h1>
        <p className="mt-3 text-muted">Even one or two things can help us make better suggestions.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {INTEREST_CHIPS.map((chip) => {
          const selected = draft.interestChips.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              aria-pressed={selected}
              onClick={() => update({ interestChips: toggle(draft.interestChips, chip) })}
              className={`min-h-10 rounded-full px-3 text-sm ${selected ? "chip-on" : "bg-card ring-1 ring-line"}`}
            >
              {chip}
            </button>
          );
        })}
      </div>
      <Field label="In their own words">
        <TextArea
          value={draft.interestsText}
          onChange={(event) => update({ interestsText: event.target.value })}
          placeholder="She loves Erykah Badu, enjoys art galleries, and likes minimalist fashion."
        />
      </Field>
      <Field label="Have you given them something they really loved before?" hint="Optional.">
        <TextArea value={draft.lovedBefore} onChange={(event) => update({ lovedBefore: event.target.value })} placeholder="I bought her a photography book last year, and she loved it." />
      </Field>
      <Field label="Anything they definitely wouldn't like?" hint="We'll treat this as a strong constraint.">
        <TextArea value={draft.dislikes} onChange={(event) => update({ dislikes: event.target.value })} placeholder="She hates loud crowds and doesn't enjoy expensive luxury brands." />
      </Field>
    </div>
  );
}

function DetailStep({
  draft,
  update,
}: {
  draft: DiscoveryDraft;
  update: (patch: Partial<DiscoveryDraft>) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">What kind of surprise are you thinking about?</h1>
        <p className="mt-3 text-muted">Choose as many as you like. Surprise Me looks across categories for a real connection.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {CATEGORIES.map((category) => (
          <Choice
            key={category.id}
            selected={draft.categories.includes(category.id)}
            title={category.label}
            showCheck
            mark={<CategoryMark id={category.id} selected={draft.categories.includes(category.id)} />}
            tone={`tone-${category.id}`}
            detail={
              category.id === "tech"
                ? "Brand affinities, not a gadget catalog."
                : category.id === "fashion"
                  ? "Fashion and lifestyle brands."
                  : category.id === "dining"
                  ? "Restaurants and places to eat."
                : category.id === "surprise"
                    ? "Cross-category ideas tied to their tastes."
                    : undefined
            }
            onClick={() => update({ categories: toggle(draft.categories, category.id) })}
          />
        ))}
      </div>
      <fieldset>
        <legend className="font-display text-3xl">What budget are you thinking?</legend>
        <p className="mt-3 text-sm text-muted">
          {draft.country
            ? `Money is in ${currencyName(draft.currency)}, matching ${draft.country}.`
            : `Money is in ${currencyName(draft.currency)} until a country is set.`}
        </p>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {(
            [
              ["friendly", "Budget-friendly", `Up to ${formatMoney(50, draft.currency)} ${currencyName(draft.currency)}.`],
              ["moderate", "Moderate", `${formatMoney(50, draft.currency)}–${formatMoney(150, draft.currency)} ${currencyName(draft.currency)}.`],
              ["premium", "Premium", `${formatMoney(150, draft.currency)}–${formatMoney(500, draft.currency)} ${currencyName(draft.currency)}.`],
              ["none", "No specific budget", `We'll still talk about money in ${currencyName(draft.currency)}, and skip anything that conflicts with a dislike.`],
              ["custom", "Set my own budget", `A minimum, a maximum, or both, in ${currencyName(draft.currency)}.`],
            ] as const
          ).map(([id, title, detail]) => (
            <Choice key={id} selected={draft.budgetTier === id} title={title} detail={detail} onClick={() => update({ budgetTier: id })} />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Those bands are rough guides in {currencyName(draft.currency)}. They are not a cost-of-living conversion, and we won't invent a price.</p>
        {draft.budgetTier === "custom" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label={`Currency · ${currencyName(draft.currency)}`}>
              <TextInput value={draft.currency} onChange={(event) => update({ currency: event.target.value.toUpperCase(), currencyTouched: true })} />
            </Field>
            <Field label="Minimum">
              <TextInput inputMode="decimal" value={draft.budgetMin} onChange={(event) => update({ budgetMin: event.target.value })} />
            </Field>
            <Field label="Maximum">
              <TextInput inputMode="decimal" value={draft.budgetMax} onChange={(event) => update({ budgetMax: event.target.value })} />
            </Field>
          </div>
        ) : null}
      </fieldset>
      <fieldset>
        <legend className="font-display text-3xl">How important is location?</legend>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {(
            [
              ["local", "Their location", "Use the city and country you entered."],
              ["nearby", "Prefer nearby", "Start with that place, and allow good alternatives close by."],
            ] as const
          ).map(([id, title, detail]) => (
            <Choice key={id} selected={draft.geo === id || (id === "local" && draft.geo === "anywhere")} title={title} detail={detail} onClick={() => update({ geo: id })} />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function ReviewStep({ draft }: { draft: DiscoveryDraft }) {
  const fullName = draft.name.trim() || "them";
  const name = firstName(draft.name);
  return (
    <div className="mx-auto max-w-2xl space-y-5 text-center">
      <div>
        <h1 className="font-display text-4xl">Ready when you are.</h1>
        <p className="mt-3 text-muted">We'll use this to look for something {name} might love.</p>
      </div>
      <dl className="space-y-3 rounded-[28px] border border-line bg-card p-5 text-left text-sm leading-6">
        <div>
          <dt className="text-muted">Person</dt>
          <dd>{fullName} · {RELATIONSHIP_LABELS[draft.forSelf ? "myself" : draft.relationship] || "Relationship not set"}</dd>
        </div>
        <div>
          <dt className="text-muted">Place</dt>
          <dd>{[draft.city, draft.country].filter(Boolean).join(", ") || "Not specified"}</dd>
        </div>
        <div>
          <dt className="text-muted">Occasion</dt>
          <dd>{draft.occasions.map((occasion) => OCCASION_LABELS[occasion]).join(", ")}</dd>
        </div>
        <div>
          <dt className="text-muted">Mode</dt>
          <dd>{MODE_LABELS[draft.mode]}{draft.mode !== "taste" && draft.cosmicInfluence ? ` · ${draft.cosmicInfluence} cosmic influence` : ""}</dd>
        </div>
        {draft.imagePreference === "describe-appearance" ? (
          <div>
            <dt className="text-muted">Illustrations</dt>
            <dd>Using the appearance details you added.</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted">Interests</dt>
          <dd>{[...draft.interestChips, draft.interestsText].filter(Boolean).join(" · ") || "Not much yet — suggestions will be exploratory."}</dd>
        </div>
        {draft.dislikes ? (
          <div>
            <dt className="text-muted">Avoid</dt>
            <dd>{draft.dislikes}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted">Looking for</dt>
          <dd>{draft.categories.map(categoryLabel).join(", ")}</dd>
        </div>
        <div>
          <dt className="text-muted">Budget and place</dt>
          <dd>
            {budgetLabel({ tier: draft.budgetTier, currency: draft.currency, min: draft.budgetMin, max: draft.budgetMax })}
            {" · "}
            {GEO_LABELS[draft.geo]}
          </dd>
        </div>
      </dl>
        <p className="text-xs leading-5 text-muted">
          Friendly, moderate, and premium are rough bands in {currencyName(draft.currency)}. A price is shown only when a source states it.
        </p>
    </div>
  );
}
