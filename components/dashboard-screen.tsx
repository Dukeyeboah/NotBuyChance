"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDay } from "@/lib/format";
import {
  authErrorMessage,
  cloudLoadPeople,
  firebaseEnabled,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  useAuthUser,
} from "@/lib/firebase/client";
import { RELATIONSHIP_LABELS } from "@/lib/qloo/categories";
import { deletePerson, loadPeople, replacePeople, type StoredPerson } from "@/lib/storage";
import { Button, TextInput } from "@/components/ui";

export function DashboardScreen() {
  const { user, enabled } = useAuthUser();
  const [people, setPeople] = useState<StoredPerson[]>([]);
  const [ready, setReady] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState<"sign-in" | "create">("sign-in");

  useEffect(() => {
    setPeople(loadPeople());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    void cloudLoadPeople()
      .then((cloud) => {
        if (!cloud.length) return;
        const local = loadPeople();
        const merged = new Map(local.map((person) => [person.id, person]));
        for (const person of cloud) {
          const existing = merged.get(person.id);
          if (!existing || person.updatedAt > existing.updatedAt) merged.set(person.id, person);
        }
        const next = [...merged.values()];
        replacePeople(next);
        setPeople(next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      })
      .catch(() => {
        setAuthError("Saved profiles on this device are available. Cloud profiles didn't load.");
      });
  }, [user]);

  const mine = people.filter((person) => person.draft.forSelf || person.draft.relationship === "myself");
  const others = people.filter((person) => !mine.includes(person));

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20">
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Who are we discovering today?</h1>
      <p className="mt-3 max-w-xl text-muted">
        {enabled
          ? "Profiles you save while signed in stay with your account."
          : "Profiles stay on this device until a Firebase project is connected."}
      </p>
      <Link
        href="/discover"
        className="btn-primary mt-6 inline-flex min-h-12 items-center rounded-full px-5 font-medium"
      >
        + Discover Someone New
      </Link>

      {!ready ? <p className="mt-10 text-sm text-muted">Loading saved people...</p> : null}
      {ready && people.length === 0 ? (
        <div className="mt-10 rounded-[28px] border border-dashed border-line px-5 py-10">
          <p className="font-medium">No one is saved yet.</p>
          <p className="mt-2 text-sm text-muted">A discovery will appear here after you generate it.</p>
        </div>
      ) : null}

      {others.length ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-muted">People</h2>
          <div className="mt-4 grid gap-4">
            {others.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                pendingDelete={pendingDelete === person.id}
                onAskDelete={() => setPendingDelete(person.id)}
                onCancel={() => setPendingDelete(null)}
                onDelete={() => {
                  deletePerson(person.id);
                  setPeople(loadPeople());
                  setPendingDelete(null);
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {mine.length ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-muted">Your taste profile</h2>
          <div className="mt-4 grid gap-4">
            {mine.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                pendingDelete={pendingDelete === person.id}
                onAskDelete={() => setPendingDelete(person.id)}
                onCancel={() => setPendingDelete(null)}
                onDelete={() => {
                  deletePerson(person.id);
                  setPeople(loadPeople());
                  setPendingDelete(null);
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12 rounded-[28px] border border-line bg-card p-5">
        <h2 className="font-display text-2xl">Account</h2>
        {!firebaseEnabled() ? (
          <p className="mt-2 text-sm leading-6 text-muted">
            Cloud sign-in isn't configured in this environment. Judges can use the full discovery flow without an account.
          </p>
        ) : user ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">{user.email || "Signed in"}</p>
            <Button variant="secondary" onClick={() => void signOutUser()}>
              Sign out
            </Button>
          </div>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setAuthError("");
              const action = authMode === "create" ? registerWithEmail : signInWithEmail;
              void action(email, password).catch((error) => setAuthError(authErrorMessage(error)));
            }}
          >
            <TextInput type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" autoComplete="email" />
            <TextInput type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete={authMode === "create" ? "new-password" : "current-password"} />
            {authError ? <p className="text-sm text-muted">{authError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit">{authMode === "create" ? "Create account" : "Sign in"}</Button>
              <Button type="button" variant="secondary" onClick={() => void signInWithGoogle().catch((error) => setAuthError(authErrorMessage(error)))}>
                Google
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAuthMode(authMode === "create" ? "sign-in" : "create")}>
                {authMode === "create" ? "I already have an account" : "Create an account"}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function PersonCard({
  person,
  pendingDelete,
  onAskDelete,
  onCancel,
  onDelete,
}: {
  person: StoredPerson;
  pendingDelete: boolean;
  onAskDelete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const latest = person.sessions[0];
  const relationship = RELATIONSHIP_LABELS[person.draft.forSelf ? "myself" : person.draft.relationship] || "Profile";
  const initials = person.draft.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  const tones = ["tone-music", "tone-dining", "tone-books", "tone-fashion", "tone-experiences"];
  const tone = tones[person.draft.name.length % tones.length];
  return (
    <article className="rounded-[28px] border border-line bg-card p-5 shadow-[0_16px_40px_rgba(79,70,229,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl font-medium ${tone}`}>
            {initials || "?"}
          </span>
          <div>
          <h3 className="font-display text-3xl">{person.draft.name}</h3>
          <p className="mt-1 text-sm text-muted">{relationship}</p>
          </div>
        </div>
        <p className="text-sm text-muted">{latest ? `${latest.recommendations.length} discoveries` : "No discoveries yet"}</p>
      </div>
      <p className="mt-3 text-sm text-muted">Last explored: {formatDay(person.updatedAt)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/people/${person.id}`} className="chip-on inline-flex min-h-11 items-center rounded-full px-4 text-sm">
          Open profile
        </Link>
        <Link href={`/discover?person=${person.id}`} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm">
          New discovery
        </Link>
        <Link href={`/discover?person=${person.id}&step=edit`} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm">
          Edit
        </Link>
        <button type="button" onClick={onAskDelete} className="inline-flex min-h-11 items-center px-3 text-sm text-muted">
          Delete
        </button>
      </div>
      {pendingDelete ? (
        <div className="mt-4 rounded-2xl bg-ivory p-4">
          <p className="text-sm">Delete {person.draft.name}'s profile and discovery history from this device?</p>
          <div className="mt-3 flex gap-2">
            <Button onClick={onDelete}>Delete</Button>
            <Button variant="secondary" onClick={onCancel}>
              Keep
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
