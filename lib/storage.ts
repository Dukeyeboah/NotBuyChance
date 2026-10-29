"use client";

import type { DiscoveryDraft, DiscoveryResult, FeedbackItem } from "@/types/discovery";
import { hydrateDraft } from "@/lib/draft";

const KEY = "nbc-people-v1";

export interface StoredSession {
  id: string;
  createdAt: string;
  recommendations: DiscoveryResult["recommendations"];
  unexpected?: DiscoveryResult["unexpected"];
  limitation?: DiscoveryResult["limitation"];
  trace: DiscoveryResult["trace"];
  summary?: string;
}

export interface StoredPerson {
  id: string;
  createdAt: string;
  updatedAt: string;
  draft: DiscoveryDraft;
  sessions: StoredSession[];
  /** One saved discovery can stand in for the homepage example. */
  featuredHomepagePreview?: boolean;
}

function read(): StoredPerson[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredPerson[]) : [];
  } catch {
    return [];
  }
}

function write(people: StoredPerson[]) {
  localStorage.setItem(KEY, JSON.stringify(people));
}

function withDraft(person: StoredPerson): StoredPerson {
  return { ...person, draft: hydrateDraft(person.draft) };
}

export function loadPeople(): StoredPerson[] {
  return read()
    .map(withDraft)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getPerson(id: string): StoredPerson | undefined {
  const person = read().find((entry) => entry.id === id);
  return person ? withDraft(person) : undefined;
}

export function deletePerson(id: string) {
  write(read().filter((person) => person.id !== id));
  void import("@/lib/firebase/client").then((firebase) => firebase.cloudDeletePerson(id));
}

export function saveDiscovery(draft: DiscoveryDraft, result: DiscoveryResult): StoredPerson {
  const people = read();
  const now = new Date().toISOString();
  const existing = people.find((person) => person.id === draft.personId);
  const session: StoredSession = {
    id: crypto.randomUUID(),
    createdAt: now,
    recommendations: result.recommendations,
    unexpected: result.unexpected,
    limitation: result.limitation,
    trace: result.trace,
    summary: result.summary,
  };
  const next: StoredPerson = {
    id: draft.personId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    draft,
    sessions: [session, ...(existing?.sessions ?? [])].slice(0, 12),
    featuredHomepagePreview: existing?.featuredHomepagePreview === true,
  };
  write([next, ...people.filter((person) => person.id !== draft.personId)]);
  void import("@/lib/firebase/client").then((firebase) => firebase.cloudSavePerson(next));
  return next;
}

export function updateDraft(personId: string, draft: DiscoveryDraft) {
  const people = read();
  const existing = people.find((person) => person.id === personId);
  if (!existing) return;
  const next: StoredPerson = {
    ...existing,
    updatedAt: new Date().toISOString(),
    draft,
  };
  write([next, ...people.filter((person) => person.id !== personId)]);
}

export function saveFeedback(personId: string, feedback: FeedbackItem, draft: DiscoveryDraft) {
  const people = read();
  const existing = people.find((person) => person.id === personId);
  if (!existing) return;
  const next: StoredPerson = {
    ...existing,
    updatedAt: new Date().toISOString(),
    draft,
  };
  write(people.map((person) => (person.id === personId ? next : person)));
  void import("@/lib/firebase/client").then((firebase) =>
    firebase.cloudSaveFeedback(personId, feedback),
  );
}

export function replacePeople(people: StoredPerson[]) {
  write(people);
}

/** Mark one saved discovery as the homepage example. Calling it again clears the mark. */
export function setFeaturedHomepagePreview(personId: string) {
  const people = read();
  const target = people.find((person) => person.id === personId);
  if (!target?.sessions.length) return;
  const enable = target.featuredHomepagePreview !== true;
  const next = people.map((person) => ({
    ...person,
    featuredHomepagePreview: enable && person.id === personId,
  }));
  write(next);
  const changed = next.filter(
    (person, index) => Boolean(person.featuredHomepagePreview) !== Boolean(people[index]?.featuredHomepagePreview),
  );
  void import("@/lib/firebase/client").then((firebase) => {
    for (const person of changed) void firebase.cloudSavePerson(person);
  });
}
