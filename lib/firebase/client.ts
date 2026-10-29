"use client";

import { initializeApp, getApps } from "firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  setDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import type { FeedbackItem } from "@/types/discovery";
import type { StoredPerson } from "@/lib/storage";

export function firebaseEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  );
}

function firebaseApp() {
  if (!firebaseEnabled()) throw new Error("Firebase is not configured.");
  return (
    getApps()[0] ??
    initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    })
  );
}

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!firebaseEnabled());

  useEffect(() => {
    if (!firebaseEnabled()) return;
    return onAuthStateChanged(getAuth(firebaseApp()), (next) => {
      setUser(next);
      setReady(true);
    });
  }, []);

  return { user, ready, enabled: firebaseEnabled() };
}

export async function signInWithGoogle() {
  await signInWithPopup(getAuth(firebaseApp()), new GoogleAuthProvider());
}

export async function signInWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(getAuth(firebaseApp()), email, password);
}

export async function registerWithEmail(email: string, password: string) {
  await createUserWithEmailAndPassword(getAuth(firebaseApp()), email, password);
}

export async function signOutUser() {
  await signOut(getAuth(firebaseApp()));
}

export function authErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  if (code.includes("invalid-email")) return "That email doesn't look right.";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) {
    return "That email and password didn't match.";
  }
  if (code.includes("email-already-in-use")) {
    return "An account with that email already exists. Try signing in.";
  }
  if (code.includes("weak-password")) return "Use at least 6 characters.";
  if (code.includes("popup-closed")) return "The sign-in window was closed.";
  return "Sign-in didn't work. Try again.";
}

async function uid(): Promise<string | null> {
  if (!firebaseEnabled()) return null;
  return getAuth(firebaseApp()).currentUser?.uid ?? null;
}

export async function cloudSavePerson(person: StoredPerson) {
  const userId = await uid();
  if (!userId) return;
  const db = getFirestore(firebaseApp());
  await setDoc(doc(db, "users", userId, "people", person.id), {
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
    draft: plain(person.draft),
  });
  const latest = person.sessions[0];
  if (latest) {
    await setDoc(
      doc(db, "users", userId, "people", person.id, "sessions", latest.id),
      plain(latest),
    );
  }
}

export async function cloudSaveFeedback(personId: string, feedback: FeedbackItem) {
  const userId = await uid();
  if (!userId) return;
  const db = getFirestore(firebaseApp());
  await setDoc(
    doc(db, "users", userId, "people", personId, "feedback", feedback.id),
    plain(feedback),
  );
}

export async function cloudDeletePerson(personId: string) {
  const userId = await uid();
  if (!userId) return;
  const db = getFirestore(firebaseApp());
  const sessions = await getDocs(
    collection(db, "users", userId, "people", personId, "sessions"),
  );
  await Promise.all(sessions.docs.map((item) => deleteDoc(item.ref)));
  const feedback = await getDocs(
    collection(db, "users", userId, "people", personId, "feedback"),
  );
  await Promise.all(feedback.docs.map((item) => deleteDoc(item.ref)));
  await deleteDoc(doc(db, "users", userId, "people", personId));
}

export async function cloudLoadPeople(): Promise<StoredPerson[]> {
  const userId = await uid();
  if (!userId) return [];
  const db = getFirestore(firebaseApp());
  const people = await getDocs(collection(db, "users", userId, "people"));
  const loaded = await Promise.all(
    people.docs.map(async (item) => {
      const data = item.data() as Omit<StoredPerson, "sessions" | "id">;
      const sessions = await getDocs(
        collection(db, "users", userId, "people", item.id, "sessions"),
      );
      return {
        id: item.id,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        draft: data.draft,
        sessions: sessions.docs
          .map((session) => session.data() as StoredPerson["sessions"][number])
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      } satisfies StoredPerson;
    }),
  );
  return loaded.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
