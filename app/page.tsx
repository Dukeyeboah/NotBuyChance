import Link from "next/link";

const examples = [
  "Intimate jazz concert",
  "Contemporary art exhibition",
  "Design-inspired coffee-table book",
  "Weekend cultural getaway",
];

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-20 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-10">
        <div>
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
            Try a Sample Discovery
          </Link>
        </div>

        <aside className="relative mx-auto w-full max-w-md" aria-label="Illustrative example, not a live recommendation">
          <img
            src="/logo.png"
            alt=""
            className="mx-auto mb-6 h-40 w-auto sm:h-48"
          />
          <p className="absolute -top-3 left-6 z-10 rounded-full border border-line bg-ivory px-3 py-1 text-xs text-muted">
            Illustrative example
          </p>
          <div className="rounded-[32px] border border-line bg-card p-6 shadow-[0_24px_60px_rgba(32,32,32,0.06)] sm:p-8">
            <p className="text-sm text-muted">Discovering for</p>
            <h2 className="mt-1 font-display text-5xl">Maya</h2>
            <p className="mt-6 text-sm text-muted">Interests</p>
            <p className="mt-1">Jazz · Art · Travel</p>
            <p className="mt-6 text-sm text-muted">Potential discoveries</p>
            <ul className="mt-3 space-y-3">
              {examples.map((example, index) => (
                <li
                  key={example}
                  className={`rounded-2xl px-4 py-3 text-sm ${["tone-music", "tone-experiences", "tone-books", "tone-dining"][index]}`}
                >
                  {example}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-center text-xs text-muted">A preview of the feeling. Not a live recommendation.</p>
        </aside>
      </section>

      <section id="how" className="mx-auto w-full max-w-6xl px-5 pb-20">
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

      <footer className="mx-auto w-full max-w-6xl px-5 pb-10 text-sm text-muted">
        NotBuyChance · The perfect gift isn't by chance.
      </footer>
    </div>
  );
}
