"use client";

import { useMemo, useState } from "react";
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
  categoryShortLabel,
  normalizeCategories,
} from "@/lib/qloo/categories";
import { guidanceFor, tasteCompleteness } from "@/lib/discovery-rules";
import { budgetLabel, formatMoney } from "@/lib/format";
import { Button, TextArea } from "@/components/ui";

function prettyType(type: string): string {
  return (type.split(":").pop() || type).replaceAll("_", " ");
}

function RecommendationCard({
  item,
  name,
  reaction,
  saved,
  featured,
  onReact,
  onSave,
}: {
  item: Recommendation;
  name: string;
  reaction?: Reaction;
  saved?: boolean;
  featured?: boolean;
  onReact: (reaction: Reaction, reason?: FeedbackReason) => void;
  onSave?: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const image = item.qlooEvidence.find((evidence) => evidence.imageUrl)?.imageUrl;
  const price =
    item.price.status === "verified" && item.price.amount != null && item.price.currency
      ? formatMoney(item.price.amount, item.price.currency)
      : "Price unavailable";

  return (
    <article className="rise rounded-[28px] border border-line bg-card p-5 shadow-[0_16px_40px_rgba(32,32,32,0.04)] sm:p-6">
      <div className="flex items-start gap-4">
        {image ? (
          // Qloo hosts the image. A plain img avoids pretending we generated a photo.
          <img
            src={image}
            alt=""
            className="h-16 w-16 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-soft font-display text-xl text-accent">
            {featured ? "✦" : String(item.rank).padStart(2, "0")}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            {featured ? "Cross-category" : String(item.rank).padStart(2, "0")} · {categoryLabel(item.category)}
          </p>
          <h3 className="mt-1 font-display text-2xl leading-tight">{item.title}</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-accent-deep">
              {SUITABILITY_LABELS[item.suitability]}
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

      {item.availabilityStatus === "verified_event" && item.externalSource ? (
        <p className="mt-4 text-sm">
          <a
            className="font-medium text-accent-deep underline-offset-4 hover:underline"
            href={item.externalSource.url}
            target="_blank"
            rel="noreferrer"
          >
            {item.externalSource.title}
          </a>
        </p>
      ) : null}
      {item.externalSource && item.availabilityStatus !== "verified_event" ? (
        <p className="mt-4 text-sm text-muted">
          Source to explore. We didn't verify that this is an upcoming event.{" "}
          <a className="text-accent-deep underline-offset-4 hover:underline" href={item.externalSource.url} target="_blank" rel="noreferrer">
            {item.externalSource.title}
          </a>
        </p>
      ) : null}

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

      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            ["love", "Love this"],
            ["maybe", "Maybe"],
            ["not", "Not for them"],
          ] as const
        ).map(([value, label]) => (
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
            className={`min-h-11 rounded-full px-4 text-sm ${
              reaction === value ? "chip-on" : "border border-line bg-card"
            }`}
          >
            {label}
          </button>
        ))}
        {onSave ? (
          <button
            type="button"
            aria-pressed={saved}
            onClick={onSave}
            className={`min-h-11 rounded-full px-4 text-sm ${saved ? "chip-on" : "border border-line bg-card"}`}
          >
            {saved ? "Saved" : "Save idea"}
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
  onCategorySearch,
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
  const [category, setCategory] = useState("all");
  const [count, setCount] = useState<5 | 10>(draft.count || 5);
  const [message, setMessage] = useState("");
  const [dismissedPrompt, setDismissedPrompt] = useState(false);
  const name = draft.name.trim() || "them";
  const reactions = new Map(draft.feedback.map((item) => [item.title, item.reaction]));
  const completeness = tasteCompleteness(draft);
  const guide = guidanceFor(draft);
  const categories = useMemo(() => {
    const selected = normalizeCategories(draft.categories).filter((id) => id !== "surprise");
    const present = result.recommendations.map((item) => item.category);
    return ["all", ...new Set([...selected, ...present])];
  }, [draft.categories, result.recommendations]);
  const visible = result.recommendations
    .filter((item) => category === "all" || item.category === category)
    .slice(0, count);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20">
      <p className="text-sm text-muted">Discoveries</p>
      <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
        We found a few things {name} might love.
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
        Based on what you've shared, we explored {name === "them" ? "their" : `${name}'s`} interests and found some possibilities worth considering.
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

      <section className="mt-8 rounded-[28px] border border-line bg-card p-5">
        <h2 className="font-display text-2xl">How we connected the dots</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-ivory px-4 py-3">
            <p className="text-xs text-muted">Known interests</p>
            <p className="mt-2 text-sm leading-6">
              {draft.interestChips.length
                ? draft.interestChips.join(" · ")
                : draft.interestsText.trim() || "Still a light picture"}
            </p>
          </div>
          <div className="rounded-2xl bg-ivory px-4 py-3">
            <p className="text-xs text-muted">Cultural connections</p>
            <p className="mt-2 text-sm leading-6">
              {result.trace.tagsUsed.length || result.trace.resolvedEntities.length
                ? [...result.trace.tagsUsed.map((tag) => tag.name), ...result.trace.resolvedEntities.map((entity) => entity.name)]
                    .slice(0, 6)
                    .join(" · ")
                : "Qloo didn't return a named connection this pass"}
            </p>
          </div>
          <div className="rounded-2xl bg-ivory px-4 py-3">
            <p className="text-xs text-muted">Potential discoveries</p>
            <p className="mt-2 text-sm leading-6">
              {[...new Set(result.recommendations.map((item) => categoryShortLabel(item.category)))].join(" · ") ||
                "Nothing held up yet"}
            </p>
          </div>
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">Explore the connections</summary>
          <div className="mt-3 space-y-2 text-sm leading-6 text-muted">
            {result.trace.insightCalls.length ? (
              result.trace.insightCalls.map((call, index) => (
                <p key={`${call.filterType}-${index}`}>
                  Qloo {prettyType(call.filterType)} affinities
                  {call.location ? ` near ${call.location}` : ""} from {call.signal}: {call.resultCount} results.
                </p>
              ))
            ) : (
              <p>No Qloo insights call returned entities for this pass.</p>
            )}
          </div>
        </details>
      </section>

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

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {categories.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={category === id}
            onClick={() => setCategory(id)}
            className={`min-h-10 rounded-full px-3 text-sm ${
              category === id ? "chip-on" : "bg-card ring-1 ring-line"
            }`}
          >
            {id === "all" ? "All" : categoryShortLabel(id)}
          </button>
        ))}
        <div className="ml-auto flex rounded-full bg-card p-1 ring-1 ring-line">
          {[5, 10].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={count === value}
              onClick={() => setCount(value as 5 | 10)}
              className={`min-h-9 rounded-full px-3 text-sm ${count === value ? "bg-ivory" : ""}`}
            >
              Top {value}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-line px-5 py-10 text-center">
          <p>Nothing in this category held up yet.</p>
          {category !== "all" ? (
            <Button className="mt-4" onClick={() => onCategorySearch(category)}>
              Search {categoryLabel(category)}
            </Button>
          ) : (
            <p className="mt-2 text-sm text-muted">Try refining with one interest or a wider location.</p>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visible.map((item) => (
            <RecommendationCard
              key={item.id}
              item={item}
              name={name}
              reaction={reactions.get(item.title)}
              saved={draft.savedIdeas.includes(item.title)}
              onReact={(reaction, reason) => onReact(item, reaction, reason)}
              onSave={onSave ? () => onSave(item) : undefined}
            />
          ))}
        </div>
      )}

      {category === "all" && result.unexpected ? (
        <section className="unexpected-wrap mt-8 p-2">
          <p className="px-3 pt-3 text-sm font-medium">Something you might not have considered</p>
          <p className="px-3 pb-2 text-sm leading-6 text-muted">
            Here's an idea that connects a few of their interests in a less obvious way.
          </p>
          <RecommendationCard
            item={result.unexpected}
            name={name}
            featured
            reaction={reactions.get(result.unexpected.title)}
            saved={draft.savedIdeas.includes(result.unexpected.title)}
            onReact={(reaction, reason) => onReact(result.unexpected as Recommendation, reaction, reason)}
            onSave={onSave ? () => onSave(result.unexpected as Recommendation) : undefined}
          />
        </section>
      ) : null}

      {count > visible.length && category === "all" && result.limitation?.kind !== "partial" ? (
        <p className="mt-4 text-sm text-muted">
          Showing {visible.length} that held up to the constraints.
        </p>
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
