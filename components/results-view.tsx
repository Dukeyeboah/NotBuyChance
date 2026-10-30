"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  DiscoveryDraft,
  DiscoveryResult,
  FeedbackReason,
  Reaction,
  Recommendation,
} from "@/types/discovery";
import {
  AVAILABILITY_LABELS,
  FEEDBACK_REASONS,
  GEO_LABELS,
  MODE_LABELS,
  RELATIONSHIP_LABELS,
  SUITABILITY_LABELS,
  categoryLabel,
} from "@/lib/qloo/categories";
import { guidanceFor, tasteCompleteness } from "@/lib/discovery-rules";
import { affinityChance } from "@/lib/agent/rank";
import { budgetLabel, formatMoney } from "@/lib/format";
import { lookupLinks } from "@/lib/links";
import { firstName } from "@/lib/text";
import { aiIllustrationsEnabled } from "@/lib/ai-illustrations";
import { discoveryIcons, utilityIcons } from "@/lib/icons";
import { illustrationFor, requestIllustration } from "@/components/illustrations";
import { ETHNICITY_OPTIONS, appearanceText, depictsRecipient } from "@/lib/identity";
import { downloadFindings } from "@/components/download-report";
import { Button, TextArea } from "@/components/ui";

function prettyType(type: string): string {
  return (type.split(":").pop() || type).replaceAll("_", " ");
}

type IllustrationScene = {
  look: string;
  mode: string;
  city: string;
  age: string;
  imagePreference: string;
  appearance: DiscoveryDraft["visualAppearance"];
  ethnicityLabels: string[];
};

function illustrationScene(draft: DiscoveryDraft): IllustrationScene {
  const showPerson = depictsRecipient(draft);
  const ethnicityLabels = showPerson
    ? draft.ethnicity
        .filter((id) => id !== "prefer_not")
        .map((id) =>
          id === "self_describe"
            ? draft.ethnicityOther.trim()
            : ETHNICITY_OPTIONS.find((option) => option[0] === id)?.[1] || "",
        )
        .filter(Boolean)
    : [];
  const look = [
    draft.imagePreference,
    appearanceText(draft.visualAppearance),
    ethnicityLabels.join(","),
    draft.mode,
    draft.city,
    draft.age || draft.ageRange,
  ].join("|");
  return {
    look,
    mode: draft.mode,
    city: draft.city,
    age: draft.age || draft.ageRange,
    imagePreference: draft.imagePreference || "subject-only",
    appearance: showPerson ? draft.visualAppearance : { skinTone: "", hair: "", style: "", additionalDetails: "" },
    ethnicityLabels,
  };
}

function RecommendationCard({
  item,
  name,
  city,
  country,
  reaction,
  saved,
  featured,
  scene,
  backupImage,
  onReact,
  onSave,
}: {
  item: Recommendation;
  name: string;
  city: string;
  country: string;
  reaction?: Reaction;
  saved?: boolean;
  featured?: boolean;
  scene: IllustrationScene;
  backupImage?: string;
  onReact: (reaction: Reaction, reason?: FeedbackReason) => void;
  onSave?: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const [drawing, setDrawing] = useState<string | undefined>(
    aiIllustrationsEnabled ? illustrationFor(item.id) : undefined,
  );
  const [qlooFailed, setQlooFailed] = useState(false);
  const [backupFailed, setBackupFailed] = useState(false);
  const qlooImage = item.qlooEvidence.find((evidence) => evidence.imageUrl)?.imageUrl;
  const qlooPhoto = !qlooFailed && qlooImage && /^https:\/\//i.test(qlooImage) ? qlooImage : undefined;
  const backupPhoto = !backupFailed && backupImage && /^https:\/\//i.test(backupImage) ? backupImage : undefined;
  const photo = qlooPhoto || backupPhoto;
  const photoIsBackup = !qlooPhoto && Boolean(backupPhoto);
  const links = lookupLinks(item, { city, country });
  const price =
    item.price.status === "verified" && item.price.amount != null && item.price.currency
      ? `${formatMoney(item.price.amount, item.price.currency)} ${item.price.currency}`
      : "Price unavailable";

  useEffect(() => {
    if (!aiIllustrationsEnabled) return;
    let cancelled = false;
    if (drawing) return;
    void requestIllustration({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      look: scene.look,
      mode: scene.mode,
      city: scene.city,
      age: scene.age,
      imagePreference: scene.imagePreference,
      appearance: scene.appearance,
      ethnicityLabels: scene.ethnicityLabels,
    }).then((url) => {
      if (!cancelled && url) setDrawing(url);
    });
    return () => {
      cancelled = true;
    };
  }, [drawing, item.category, item.description, item.id, item.title, scene]);

  return (
    <article className="rise lift flex h-full flex-col rounded-[28px] border border-line bg-card p-4 shadow-[0_16px_40px_rgba(79,70,229,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        {photo ? (
          <img
            src={photo}
            alt=""
            className="h-16 w-16 shrink-0 rounded-2xl object-cover"
            onError={() => (photoIsBackup ? setBackupFailed(true) : setQlooFailed(true))}
          />
        ) : aiIllustrationsEnabled && drawing ? (
          <img src={drawing} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
        ) : (
          <img
            src={discoveryIcons[item.category] || utilityIcons.gift}
            alt=""
            className="h-14 w-14 shrink-0 object-contain"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            {featured ? "Cross-category" : String(item.rank).padStart(2, "0")} · {categoryLabel(item.category)}
          </p>
          <h3 className="mt-1 font-display text-2xl leading-tight">{item.title}</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-accent-deep">
              {featured ? SUITABILITY_LABELS.unexpected : affinityChance(item) || SUITABILITY_LABELS[item.suitability]}
            </span>
            <span className="rounded-full border border-line px-3 py-1 text-muted">
              {item.qlooEvidence.length && item.availabilityStatus !== "verified_event"
                ? "Taste recommendation"
                : AVAILABILITY_LABELS[item.availabilityStatus]}
            </span>
            {item.availabilityStatus === "verified_place" ? (
              <span className="rounded-full border border-line px-3 py-1 text-muted">
                Known place, not a reservation
              </span>
            ) : null}
            {item.exploratory ? (
              <span className="rounded-full border border-line px-3 py-1 text-muted">Exploratory</span>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-5 leading-7 text-ink/90">{item.description}</p>
      <div className="mt-5 rounded-2xl bg-ivory px-4 py-4">
        <p className="text-sm font-medium">Why {name} might love this</p>
        <p className="mt-2 text-sm leading-6 text-muted">{item.rationale}</p>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Cost</dt>
          <dd className="mt-1">{price}</dd>
        </div>
        <div>
          <dt className="text-muted">Place</dt>
          <dd className="mt-1">
            {item.location ||
              (item.geographicRelevance === "not_location_specific"
                ? "Not tied to one city"
                : "Location not verified")}
          </dd>
        </div>
        {item.date ? (
          <div>
            <dt className="text-muted">When</dt>
            <dd className="mt-1">{item.date}</dd>
          </div>
        ) : null}
      </dl>

      <ul className="mt-4 space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <a className="font-medium text-accent-deep underline-offset-4 hover:underline" href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
            <p className="text-xs text-muted">{link.note}</p>
          </li>
        ))}
      </ul>

      <details className="mt-5 rounded-2xl border border-line px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">Why this suggestion?</summary>
        <div className="mt-4 space-y-4 text-sm leading-6">
          <div>
            <p className="font-medium">What you told us</p>
            <p className="text-muted">{item.whyMatch.toldUs}</p>
          </div>
          <div>
            <p className="font-medium">What we discovered</p>
            <p className="text-muted">
              {item.qlooEvidence.length
                ? item.whyMatch.qloo ||
                  item.qlooEvidence
                    .map((evidence) => `${evidence.name} (${prettyType(evidence.entityType)})`)
                    .join(", ")
                : "Qloo didn't supply a direct affinity for this idea."}
            </p>
          </div>
          <div>
            <p className="font-medium">Why we suggested this</p>
            <p className="text-muted">{item.whyMatch.why}</p>
          </div>
          {item.whyMatch.cosmic ? (
            <div>
              <p className="font-medium">Cosmic inspiration</p>
              <p className="text-muted">{item.whyMatch.cosmic}</p>
            </div>
          ) : null}
        </div>
      </details>

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        {(
          [
            ["love", "Love this", "react-love"],
            ["maybe", "Maybe", "react-maybe"],
            ["not", "Not for them", "react-skip"],
          ] as const
        ).map(([value, label, tone]) => (
          <button
            key={value}
            type="button"
            aria-pressed={reaction === value}
            onClick={() => {
              if (value === "not") {
                setAsking(true);
                return;
              }
              setAsking(false);
              onReact(value);
            }}
            className={`min-h-11 rounded-full px-4 text-sm ${tone}`}
          >
            {label}
          </button>
        ))}
        {onSave ? (
          <button
            type="button"
            aria-pressed={saved}
            onClick={onSave}
            className={`react-save relative min-h-11 rounded-full px-4 text-sm ${saved ? "heart-pop" : ""}`}
          >
            {saved ? (
              <img src={utilityIcons.favorites} alt="" className="heart-pop inline h-6 w-6 object-contain" />
            ) : (
              <span aria-hidden>♡</span>
            )}
            {saved ? " Saved" : " Save idea"}
            {saved ? (
              <span className="confetti" aria-hidden>
                <i /><i /><i /><i /><i /><i />
              </span>
            ) : null}
          </button>
        ) : null}
      </div>
      {asking ? (
        <div className="mt-4">
          <p className="text-sm font-medium">What wasn't quite right?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FEEDBACK_REASONS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setAsking(false);
                  onReact("not", id);
                }}
                className="min-h-10 rounded-full border border-line bg-card px-3 text-sm"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function ResultsView({
  draft,
  result,
  onReact,
  onRefine,
  onReplace,
  onAdjust,
  onPrompt,
  onSave,
  comparing,
  basic,
  compareError,
  onCompare,
}: {
  draft: DiscoveryDraft;
  result: DiscoveryResult;
  onReact: (item: Recommendation, reaction: Reaction, reason?: FeedbackReason) => void;
  onRefine: (message: string) => void;
  onCategorySearch: (categoryId: string) => void;
  onReplace: () => void;
  onAdjust?: (action: "nearby" | "another_category" | "broader") => void;
  onPrompt?: (prompt: string) => void;
  onSave?: (item: Recommendation) => void;
  comparing: boolean;
  basic: Recommendation[] | null;
  compareError: string;
  onCompare: () => void;
}) {
  const [message, setMessage] = useState("");
  const [foundImages, setFoundImages] = useState<Record<string, string>>({});
  const askedImages = useRef("");
  const [dismissedPrompt, setDismissedPrompt] = useState(false);
  const [pdfState, setPdfState] = useState<"idle" | "working" | "error">("idle");
  const name = firstName(draft.name);
  const reactions = new Map(draft.feedback.map((item) => [item.title, item.reaction]));
  const completeness = tasteCompleteness(draft);
  const guide = guidanceFor(draft);
  const scene = useMemo(() => illustrationScene(draft), [draft]);
  const visible = result.recommendations.slice(0, 5);

  useEffect(() => {
    const cards = [...result.recommendations.slice(0, 5), ...(result.unexpected ? [result.unexpected] : [])];
    const items = cards
      .filter((item) => !item.qlooEvidence.some((evidence) => evidence.imageUrl && /^https:\/\//i.test(evidence.imageUrl)))
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        title: item.title,
        location: item.location || [draft.city, draft.country].filter(Boolean).join(", "),
        pageUrl: item.externalSource?.url || "",
        category: item.category,
      }));
    const requestKey = items.map((item) => item.id).join("|");
    if (!items.length || askedImages.current === requestKey) return;
    askedImages.current = requestKey;
    let cancelled = false;
    void fetch("/api/finding-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { images?: Record<string, string> };
        if (!cancelled && payload.images) {
          setFoundImages((current) => ({ ...current, ...payload.images }));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      askedImages.current = "";
    };
  }, [draft.city, draft.country, result]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 pb-20 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Discoveries</p>
          <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
            A few things {name === "them" ? "they" : name} might love.
          </h1>
        </div>
        <div className="text-right">
          <Button
            variant="secondary"
            disabled={pdfState === "working"}
            onClick={() => {
              setPdfState("working");
              void downloadFindings(draft, result, foundImages)
                .then(() => setPdfState("idle"))
                .catch(() => setPdfState("error"));
            }}
          >
            {pdfState === "working" ? "Preparing PDF…" : "Download PDF"}
          </Button>
          {pdfState === "error" ? (
            <p className="mt-2 text-sm text-muted">The PDF didn't finish. Try again.</p>
          ) : null}
        </div>
      </div>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
        {name === "them"
          ? "Here's the fun version. We followed the tastes you mentioned and kept the ideas that actually felt like a fit."
          : `Here's the fun version for ${name}. We followed the tastes you mentioned and kept the ideas that actually felt like ${name}.`}
      </p>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-line">
          {RELATIONSHIP_LABELS[draft.forSelf ? "myself" : draft.relationship] || "Someone special"}
        </span>
        {draft.city ? (
          <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-line">
            {[draft.city, draft.country].filter(Boolean).join(", ")}
          </span>
        ) : null}
        <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-line">
          Mode: {MODE_LABELS[draft.mode]}
        </span>
        <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-line">
          {budgetLabel({
            tier: draft.budgetTier,
            currency: draft.currency,
            min: draft.budgetMin,
            max: draft.budgetMax,
          })}
        </span>
        <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-line">{GEO_LABELS[draft.geo]}</span>
        <span className="rounded-full bg-accent-soft px-3 py-1.5 text-accent-deep">{completeness.label}</span>
      </div>
      <p className="mt-3 text-sm text-muted">{completeness.detail}</p>
      {draft.interestChips.length || draft.interestsText ? (
        <p className="mt-2 text-sm text-muted">
          {[...draft.interestChips, draft.city].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      {result.summary ? (
        <p className="mt-6 rounded-2xl bg-accent-soft px-4 py-3 text-sm leading-6">{result.summary}</p>
      ) : null}
      {result.trace.qlooFailed ? (
        <p className="mt-4 rounded-2xl border border-line bg-card px-4 py-3 text-sm leading-6">
          Qloo could not be reached, so these ideas are not taste-graph results.
        </p>
      ) : null}
      {result.limitation ? (
        <div className="mt-4 rounded-2xl border border-line bg-card px-4 py-4 text-sm leading-6">
          <p className="font-medium">{result.limitation.message}</p>
          {result.limitation.detail ? <p className="mt-2 text-muted">{result.limitation.detail}</p> : null}
          {result.limitation.actions.length && onAdjust ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.limitation.actions.includes("nearby") ? (
                <Button variant="secondary" onClick={() => onAdjust("nearby")}>Search nearby</Button>
              ) : null}
              {result.limitation.actions.includes("another_category") ? (
                <Button variant="secondary" onClick={() => onAdjust("another_category")}>Try another category</Button>
              ) : null}
              {result.limitation.actions.includes("broader") ? (
                <Button variant="secondary" onClick={() => onAdjust("broader")}>Explore broader options</Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {!dismissedPrompt && (guide.question || result.followUpQuestion) ? (
        <div className="mt-4">
          <p className="text-sm leading-6 text-muted">{guide.question || result.followUpQuestion}</p>
          {guide.prompts.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {guide.prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="min-h-10 rounded-full border border-line bg-card px-3 text-sm"
                  onClick={() => {
                    if (prompt === "Just show me some ideas") {
                      setDismissedPrompt(true);
                      return;
                    }
                    onPrompt?.(prompt);
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-line px-5 py-10 text-center">
          <p>Nothing held up yet.</p>
          <p className="mt-2 text-sm text-muted">Try refining with one interest, or look a little further from the city.</p>
        </div>
      ) : (
        <div className="mt-8 grid items-stretch gap-4 lg:grid-cols-3">
          {visible.map((item) => (
            <RecommendationCard
              key={item.id}
              item={item}
              name={name}
              city={draft.city}
              country={draft.country}
              scene={scene}
              backupImage={foundImages[item.id]}
              reaction={reactions.get(item.title)}
              saved={draft.savedIdeas.includes(item.title)}
              onReact={(reaction, reason) => onReact(item, reaction, reason)}
              onSave={onSave ? () => onSave(item) : undefined}
            />
          ))}
        </div>
      )}

      {result.unexpected ? (
        <section className="unexpected-wrap mt-8 p-2">
          <p className="flex items-center gap-2 px-3 pt-3 text-sm font-medium">
            <img src="/assets/icons/surprise.png" alt="" className="icon-spark h-11 w-11 object-contain" />
            Something you might not have considered
          </p>
          <p className="px-3 pb-2 text-sm leading-6 text-muted">
            Here's an idea that connects a few of their interests in a less obvious way.
          </p>
          <RecommendationCard
            item={result.unexpected}
            name={name}
            city={draft.city}
            country={draft.country}
            featured
            scene={scene}
            backupImage={foundImages[result.unexpected.id]}
            reaction={reactions.get(result.unexpected.title)}
            saved={draft.savedIdeas.includes(result.unexpected.title)}
            onReact={(reaction, reason) => onReact(result.unexpected as Recommendation, reaction, reason)}
            onSave={onSave ? () => onSave(result.unexpected as Recommendation) : undefined}
          />
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onReplace}>
          Show me something different
        </Button>
      </div>

      <form
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (!message.trim()) return;
          onRefine(message.trim());
          setMessage("");
        }}
      >
        <label className="block text-sm font-medium" htmlFor="refine">
          <img src={utilityIcons.refine} alt="" className="mb-2 h-12 w-12 object-contain" />
          Want to tell us something else about {name}?
        </label>
        <TextArea
          id="refine"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={`Tell me something else about ${name}...`}
          className="mt-2"
        />
        <Button className="mt-3" type="submit" disabled={!message.trim()}>
          Update discoveries
        </Button>
      </form>

      <details className="mt-8 rounded-[28px] border border-line bg-card px-5 py-4">
        <summary className="cursor-pointer font-medium">How this discovery was made</summary>
        <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
          <p>
            Plan: {result.trace.planSource === "model" ? "the agent chose the searches" : "we used the interests you typed"}.
            Cosmic themes {result.trace.cosmicUsed ? "had a small influence" : "were not used"}.
          </p>
          {result.trace.resolvedEntities.length ? (
            <p>Qloo entities: {result.trace.resolvedEntities.map((entity) => entity.name).join(", ")}.</p>
          ) : (
            <p>No named interest resolved to a Qloo entity.</p>
          )}
          {result.trace.tagsUsed.length ? (
            <p>Taste tags: {result.trace.tagsUsed.map((tag) => tag.name).join(", ")}.</p>
          ) : null}
          {result.trace.insightCalls.length ? (
            <ul className="space-y-1">
              {result.trace.insightCalls.map((call, index) => (
                <li key={`${call.filterType}-${index}`}>
                  Insights for {prettyType(call.filterType)}
                  {call.location ? ` in ${call.location}` : ""} · {call.resultCount} results · {call.signal}
                </li>
              ))}
            </ul>
          ) : (
            <p>No Qloo insights call returned entities.</p>
          )}
          {result.trace.externalSearches.length ? (
            <p>
              Web search: {result.trace.externalSearches.map((search) => search.query).join("; ")}.
            </p>
          ) : (
            <p>No live web search ran for this pass.</p>
          )}
          {result.trace.limitations.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {result.trace.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </details>

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-3xl">See how taste intelligence changes this</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Same person, occasion, and limits. Basic suggestions use the profile only. The discoveries above also use Qloo affinities and any source we could verify. One side is not automatically better.
        </p>
        {basic ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Basic AI suggestions</p>
              <div className="mt-3 space-y-3">
                {basic.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-line bg-card p-4">
                    <p className="text-xs text-muted">Idea · not from Qloo</p>
                    <h3 className="mt-1 font-medium">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Qloo-powered discoveries</p>
              <div className="mt-3 space-y-3">
                {result.recommendations.slice(0, 5).map((item) => (
                  <article key={item.id} className="rounded-2xl border border-line bg-card p-4">
                    <p className="text-xs text-muted">
                      {item.qlooEvidence.length ? "Uses a Qloo affinity" : "Idea, Qloo evidence was limited"}
                    </p>
                    <h3 className="mt-1 font-medium">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.rationale}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Button className="mt-4" variant="secondary" onClick={onCompare} disabled={comparing}>
            {comparing ? "Preparing the comparison..." : "Compare with basic AI"}
          </Button>
        )}
        {compareError ? <p className="mt-3 text-sm text-muted">{compareError}</p> : null}
      </section>
    </div>
  );
}
