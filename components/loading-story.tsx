"use client";

import { useEffect, useState } from "react";

const STORIES = [
  {
    kicker: "What NotBuyChance does",
    title: "It skips the obvious candle.",
    body: "A love of jazz can point to a late table, a photo book, or a small live room. The point is a gift that feels like the person, not a catalog.",
  },
  {
    kicker: "A real example",
    title: "Korean food and quiet design.",
    body: "That pairing can become a refined dinner, a beautiful book about craft, or a calm afternoon somewhere well made. Specific beats generic.",
  },
  {
    kicker: "Places",
    title: "A restaurant is a known place, not a booking.",
    body: "When dining is in the mix, we look for restaurants too. You'll get a way to look them up. We won't pretend a table is reserved.",
  },
  {
    kicker: "The chart, for fun",
    title: "A 3 wants color and conversation.",
    body: "Cosmic mode is a playful sun-sign and life-path sketch. It can dress an idea up. You can ignore it, and a real dislike still wins.",
  },
  {
    kicker: "You stay in charge",
    title: "Too far or too expensive actually changes the next pass.",
    body: "Love it, maybe, or not for them. Tell us why and the list moves. Surprise Me only crosses categories when there's a real connection.",
  },
  {
    kicker: "Demo",
    title: "Maya is ready if you want a head start.",
    body: "The demo profile runs the same discovery. Notes stay on this device unless you connect sign-in later.",
  },
];

export function LoadingStory({
  name,
  phases,
  slow,
}: {
  name: string;
  phases: { id: string; message: string }[];
  slow: boolean;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % STORIES.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  const story = STORIES[index];
  const who = name === "them" ? "them" : name;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1f2937]/35 px-4 py-8" role="dialog" aria-modal="true" aria-label={`Connecting the dots for ${who}`}>
      <div className="card-pop w-full max-w-3xl rounded-[32px] bg-card p-6 shadow-[0_30px_80px_rgba(31,41,55,0.18)] sm:p-8">
        <img src="/assets/icons/taste.png" alt="" className="icon-float mb-4 h-16 w-16 object-contain" />
        <div className="connect-dots" aria-hidden>
          <span /><i /><span /><i /><span /><i /><span />
        </div>
        <p className="mt-4 text-sm font-medium text-accent-deep">Connecting the dots for {who}...</p>
        <div key={story.title} className="card-pop mt-5 rounded-[28px] bg-ivory px-5 py-6">
          <p className="text-xs font-medium uppercase tracking-wide text-coral">{story.kicker}</p>
          <h2 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{story.title}</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{story.body}</p>
        </div>
        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {STORIES.map((item, itemIndex) => (
            <span
              key={item.title}
              className={`h-1.5 flex-1 rounded-full ${itemIndex === index ? "progress-on" : "bg-line"}`}
            />
          ))}
        </div>
        <ul className="mt-6 flex flex-wrap gap-2">
          {phases.map((phase) => (
            <li key={phase.id} className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-sm text-accent-deep">
              <span className="pulse-dot h-2 w-2 rounded-full bg-accent" />
              {phase.message}
            </li>
          ))}
        </ul>
        {slow ? <p className="mt-4 text-sm text-muted">Still working. Taste search can take a moment.</p> : null}
      </div>
    </div>
  );
}
