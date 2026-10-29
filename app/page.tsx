import Link from "next/link";
import { HomePreview } from "@/components/home-preview";

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto grid w-full max-w-[1440px] items-center gap-14 px-5 pb-20 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pt-10">
        <div className="relative">
          <span className="sparkle -left-3 top-10 text-lg" aria-hidden>✦</span>
          <span className="sparkle left-40 -top-3 text-sm" style={{ animationDelay: "0.8s" }} aria-hidden>✦</span>
          <p className="text-sm font-medium tracking-wide text-accent-deep">Personal taste discovery</p>
          <h1 className="mt-4 max-w-xl font-display text-5xl leading-[1.05] sm:text-6xl">
            The perfect gift isn't by chance.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-muted">
            Discover what someone might love. Tell us a little about them, and our AI taste agent will help you find thoughtful gifts, unforgettable experiences, and unexpected discoveries.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/discover"
              className="btn-primary inline-flex min-h-12 items-center rounded-full px-5 font-medium"
            >
              Find Something They'll Love
            </Link>
            <a
              href="#how"
              className="inline-flex min-h-12 items-center rounded-full border border-line bg-card px-5 font-medium"
            >
              How It Works
            </a>
          </div>
          <Link href="/discover?sample=1" className="mt-4 inline-flex min-h-11 items-center text-sm text-accent-deep">
            Try the demo
          </Link>
        </div>

        <HomePreview />
      </section>

      <section id="how" className="mx-auto w-full max-w-[1440px] px-5 pb-20 lg:px-10">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "Tell us about them", "Share a few details about the person you have in mind."],
            ["2", "Let us connect the dots", "Our AI agent explores their potential tastes using cultural intelligence and the information you provide."],
            ["3", "Discover something meaningful", "Receive personalized gift and experience ideas, with explanations of why they might be a good match."],
          ].map(([number, title, copy]) => (
            <article key={number} className="rounded-[28px] border border-line bg-card p-6">
              <p className="bg-clip-text font-display text-3xl text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
                {number}
              </p>
              <h2 className="mt-4 text-xl font-medium">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
            </article>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-sm leading-6 text-muted">
          Cultural connections come from Qloo's taste graph — affinities across music, books, places, brands, film, and more — kept separate from what you already know about the person.
        </p>
      </section>

      <footer className="mx-auto w-full max-w-[1440px] px-5 pb-10 text-sm text-muted lg:px-10">
        NotBuyChance · The perfect gift isn't by chance.
      </footer>
    </div>
  );
}
