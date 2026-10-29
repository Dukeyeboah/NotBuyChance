# NotBuyChance

The perfect gift isn't by chance.

The interface uses indigo, violet, coral, and warm cream, with the gift logo. Taste, Cosmic, and Fusion share the same layout and only change the accent wash.

NotBuyChance is a taste-discovery app for gifts and experiences. You describe a person. An agent resolves what it can in [Qloo](https://docs.qloo.com/), looks for a real-world source when place and time matter, and explains why an idea might fit. It does not pretend to know someone from their birthday, gender, or a numerology number.

## What Qloo does here

Qloo is the cultural evidence, not a caption on a generic gift list.

1. The planner picks proper names and short taste themes from the profile. It does not invent entity ids.
2. `GET /search` resolves a name only when the returned entity name actually matches.
3. `GET /v2/tags` resolves themes such as jazz or photography to Qloo tag ids.
4. `GET /v2/insights` asks for affinities in the categories the person selected. The on-screen categories map to Qloo types like this: dining and experiences to places (dining also adds the restaurant tag), experiences may also ask for destinations, music to artists, books to books, movies and TV to movie and tv show, fashion and electronics to brands. Electronics stay brand affinities. Qloo does not return a product catalog, prices, or stock. Supported types are artist, book, brand, destination, movie, place, podcast, tv show, and video game.
5. Place and destination queries can include `filter.location.query` when the profile has a city and the search is local or nearby. Books, films, and brands are not given a fake location filter. A restaurant tag is added only for a dining-only place query. Each taste tag is queried on its own; combining several tags in one insights call returned unrelated affinities. Qloo still decides what comes back. Insight entities are typed from `subtype` (`urn:entity:book`, and so on), which is what the API returns instead of a `types` array.
6. Every Qloo id shown on a card was present in those responses. If a call fails, comes back empty, or is too thin for the city, the screen says so and offers a nearby search, another category, or a wider search. Local-only is never widened unless the person chooses that. A short list stays short instead of being padded. Gender is not sent as a Qloo filter. A cultural label is not treated as a taste. Free-text cultural notes are ordinary preferences.

Hackathon keys use `https://hackathon.api.qloo.com`. The key available in this workspace is a production key: the hackathon host returns 401, and `https://api.qloo.com` returns live entities. Set `QLOO_API_BASE` to the host your key belongs to.

## How the agent works

The server does not ask a model for a gift list and hope for the best.

1. **Profile interpreter.** The form becomes a validated profile. Sun sign, life path, and expression number are calculated in code. The model never does the arithmetic.
2. **Planner.** A structured model call chooses entity searches, tag searches, and whether a local web query is worth making.
3. **Qloo researcher.** The server runs those searches, then category-mapped insights.
4. **External researcher.** If Serper is configured, the person wants something local, and the category is time- or place-sensitive, one web search runs. Snippets are treated as untrusted data.
5. **Writer.** A second structured call may only cite evidence ids and source URLs from that research.
6. **Guard and ranker.** Code drops dislikes, out-of-budget verified prices, romantic ideas that don't fit the relationship, and any date or price that is not in the source. Ranking weights are below. Labels are Strong match, Worth exploring, and Unexpected discovery. There is no made-up compatibility percentage.

Feedback is stored on the profile. "Not for them" removes that card and excludes the title from the next run, so the next shortlist is a different selection.

Cosmic and Fusion modes can add a small score bonus. They cannot override a dislike, a budget, or a local constraint, and a weak preference cannot become a strong match on symbolism alone. Taste mode strips cosmic notes. A reading marked "not really" is left out even if Fusion was selected.

### Ranking weights

| Signal | Weight |
| --- | --- |
| Known preferences | 35% |
| Qloo affinity | 25% |
| Occasion fit | 15% |
| Budget and location | 15% |
| Novelty | 10% |

Fusion adds 0.03 or 0.06 after that sum when cosmic influence is allowed. Friendly / moderate / premium budgets are rough bands in the selected currency (up to 50, 50–150, 150–500). They are not a cost-of-living conversion. Unknown prices are left unknown.

### Cosmic math

Documented in `lib/cosmic/calculate.ts`.

- Western tropical sun sign from month and day. No ascendant, houses, or moon sign.
- Life path: digit sum of `YYYYMMDD`, reduced, keeping 11, 22, and 33. `2000-01-08` is 11.
- Expression number: Pythagorean letter values on the name that was typed, reduced the same way.

The reading is a template over those numbers. It is labeled as entertainment.

## Run it

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). **Try the demo** runs Maya in Accra without an account. She is fictional, and the button runs this same agent.

```bash
npm run check
npm run lint
```

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `QLOO_API_KEY` | Yes | Server-side Qloo key. Never exposed to the browser. |
| `QLOO_API_BASE` | Yes | `https://api.qloo.com` for this production key. A hackathon key needs `https://hackathon.api.qloo.com` instead. If the variable is missing, the app calls `https://api.qloo.com`. |
| `OPENAI_API_KEY` | Yes | Planner, explanations, refinement |
| `OPENAI_MODEL` | No | Defaults to `gpt-4.1-mini` |
| `SERPER_API_KEY` | No | Live event and place lookup |
| `REPLICATE_API_TOKEN` | No | Cartoon illustrations on finding cards, via Replicate `openai/gpt-image-2` |
| `NEXT_PUBLIC_FIREBASE_*` | No | Google and email sign-in, plus Firestore sync |

Without Firebase, profiles stay in the browser. Rules for a connected project are in `firestore.rules`: a signed-in user can read and write only `users/{their uid}/**`.

## Demo script

1. From the landing page, choose **Try a Sample Discovery**.
2. Skim Maya: partner, Accra, birthday, jazz and art, dislikes loud crowds, $50–$200.
3. Generate. The loading lines match work the server is actually doing.
4. Open **Why this match?** and **How this discovery was made**. Qloo entities, tags, and insight calls are listed there.
5. Mark one card **Not for them**, then **Show me something different**.
6. Optional: compare with basic AI. That column does not call Qloo.
7. Optional: go back, add a birth date, and switch to Fusion if you want the cosmic layer.

## Devpost description

NotBuyChance helps you find a gift or experience for a specific person, not a product search. You share a little of what they love, and an agent uses Qloo's taste graph to find cultural affinities across music, books, places, brands, and film, then explains which part came from you, which part came from Qloo, and which part is only an idea. Optional sun-sign and life-path themes stay symbolic and never outrank a real preference. The demo profile, Maya, runs without an account.

## Limits

- Electronics are Qloo brand affinities, not a catalog of gadgets. Classes and many live experiences are not native entity types. Those stay ideas, or a web source when one is configured.
- A Qloo place result is a known place, not a reservation. An event is "verified" only when the source text contains a date on or after today.
- Accra place coverage can be thin. Nearby mode is allowed to offer ideas that are not in the city, and local-only mode drops places that are clearly somewhere else.
- Prices are shown only when the source states the amount and the currency. Budget bands are labeled in US dollars, or in the currency that matches the selected country.
- Finding cards include a web or maps search link so a gift can be looked up. Those are search links, not verified shops. A language model is a poor source of URLs, so the links are built from the title or copied from a real search result. `gpt-4.1-mini` is still the right planner.
- Illustrations are cartoons from Replicate's GPT Image model when `REPLICATE_API_TOKEN` is set. They are imagined scenes, not photos of the person or proof the place looks that way.
- Astrology and numerology are not personality assessments.
- There is no checkout, social graph, or public directory of the people you profile.

## Status

Implemented: landing page, sample profile, guided discovery, eight Qloo-aligned categories, Taste / Cosmic / Fusion, deterministic cosmic math, Qloo search and insights, optional Serper lookup, ranked explanations, a cross-category card when the evidence supports one, sparse-result prompts, feedback reasons, refinement, category focus, top 5 / top 10, basic-AI comparison, device profiles, optional cultural context, gender-open recommendations, optional Firebase auth, a homepage preview that can feature one saved discovery, and a single PDF download of a discovery session.

Checked in this workspace:

- `npm run check` covers life path, sun sign, expression number, dislikes, category mapping, sparse local dining, partial lists, unexpected-card selection, budget feedback that does not drop a category, cosmic rejection, and the absence of a Qloo gender filter.
- A live Maya discovery (`POST /api/discover`) previously returned Qloo-grounded cards across books, places, and artists. Places were labeled as known places, not ticketed events.
- In the browser: landing copy, sample review, loading phases, results, explanations, feedback that removes a card, Top 10, dashboard, and a phone-width landing page.

Working APIs: Qloo at `https://api.qloo.com`, OpenAI (`gpt-4.1-mini`), Serper. The hackathon host rejects this production key with 401.

Still open: a Firebase project is not connected, the app is not deployed, and screenshots are not in the repo. The newest category and sparse-result screens need a pass in the browser after this update.
