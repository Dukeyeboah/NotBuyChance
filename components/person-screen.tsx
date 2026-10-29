"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { DiscoveryResult, FeedbackReason, Reaction, Recommendation } from "@/types/discovery";
import { formatDay } from "@/lib/format";
import { getPerson, saveFeedback, setFeaturedHomepagePreview, type StoredPerson } from "@/lib/storage";
import { DiscoveryPreviewCard } from "@/components/discovery-preview-card";
import { previewFromPerson } from "@/lib/preview";
import { ResultsView } from "@/components/results-view";
import { Button } from "@/components/ui";

export function PersonScreen() {
  const params = useParams<{ personId: string }>();
  const [person, setPerson] = useState<StoredPerson | null | undefined>(undefined);
  const [basic, setBasic] = useState<Recommendation[] | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState("");

  useEffect(() => {
    setPerson(getPerson(params.personId) ?? null);
  }, [params.personId]);

  if (person === undefined) return <p className="px-5 text-sm text-muted">Loading profile...</p>;
  if (!person) {
    return (
      <div className="mx-auto max-w-xl px-5">
        <h1 className="font-display text-4xl">We couldn't find that profile.</h1>
        <Link href="/dashboard" className="mt-6 inline-flex min-h-12 items-center text-accent-deep">
          Back to saved people
        </Link>
      </div>
    );
  }

  const latest = person.sessions[0];
  const preview = previewFromPerson(person);
  const result: DiscoveryResult | null = latest
    ? {
        recommendations: latest.recommendations,
        unexpected: latest.unexpected,
        limitation: latest.limitation,
        trace: latest.trace,
        summary: latest.summary,
      }
    : null;

  function reactTo(item: Recommendation, reaction: Reaction, _reason?: FeedbackReason) {
    const feedback = {
      id: crypto.randomUUID(),
      title: item.title,
      reaction,
      category: item.category,
      createdAt: new Date().toISOString(),
    };
    const draft = {
      ...person!.draft,
      feedback: [...person!.draft.feedback.filter((entry) => entry.title !== item.title), feedback],
      excludeTitles:
        reaction === "not" && !person!.draft.excludeTitles.includes(item.title)
          ? [...person!.draft.excludeTitles, item.title]
          : person!.draft.excludeTitles,
    };
    const next = { ...person!, draft };
    if (reaction === "not" && latest) {
      next.sessions = [
        {
          ...latest,
          recommendations: latest.recommendations.filter((entry) => entry.id !== item.id),
        },
        ...person!.sessions.slice(1),
      ];
    }
    setPerson(next);
    saveFeedback(person!.id, feedback, draft);
  }

  return (
    <div className="pb-12">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 lg:px-10">
        <div>
          <p className="text-sm text-muted">Saved {formatDay(person.updatedAt)}</p>
          <h1 className="font-display text-4xl">{person.draft.name}</h1>
        </div>
        <Link href={`/discover?person=${person.id}`}>
          <Button>New discovery</Button>
        </Link>
      </div>
      {preview ? (
        <div className="mx-auto mt-8 w-full max-w-xl px-5">
          <DiscoveryPreviewCard preview={preview} />
          <div className="mt-3 flex justify-center">
            <Button
              variant="secondary"
              onClick={() => {
                setFeaturedHomepagePreview(person.id);
                setPerson(getPerson(person.id) ?? person);
              }}
            >
              {person.featuredHomepagePreview ? "Showing on the homepage" : "Use as the homepage example"}
            </Button>
          </div>
        </div>
      ) : null}
      {result ? (
        <div className="mt-8">
          <ResultsView
            draft={person.draft}
            result={result}
            onReact={reactTo}
            onRefine={() => {
              window.location.href = `/discover?person=${person.id}`;
            }}
            onCategorySearch={() => {
              window.location.href = `/discover?person=${person.id}`;
            }}
            onReplace={() => {
              window.location.href = `/discover?person=${person.id}`;
            }}
            comparing={comparing}
            basic={basic}
            compareError={compareError}
            onCompare={() => {
              setComparing(true);
              setCompareError("");
              void fetch("/api/compare", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ draft: person.draft }),
              })
                .then(async (response) => {
                  const payload = (await response.json()) as {
                    recommendations?: Recommendation[];
                    error?: string;
                  };
                  if (!response.ok) throw new Error(payload.error || "The comparison didn't finish.");
                  setBasic(payload.recommendations || []);
                })
                .catch((error: unknown) => {
                  setCompareError(error instanceof Error ? error.message : "The comparison didn't finish.");
                })
                .finally(() => setComparing(false));
            }}
          />
        </div>
      ) : (
        <p className="mx-auto mt-8 max-w-3xl px-5 text-muted">No discoveries yet.</p>
      )}
    </div>
  );
}
