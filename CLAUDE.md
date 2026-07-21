# Vocabulary App — Project Context

A vocabulary learning app (like Quizlet, but simpler). Two users: Dzianis and his girlfriend Yulia. Everything must be free and as simple as possible — no over-engineering.

## Stack (final decisions, do not change without discussion)

- **Frontend:** React + Vite + Tailwind + shadcn/ui. SPA + PWA manifest (used from phone and laptop, mobile-first layout)
- **Backend:** a single Cloudflare Worker — serves the frontend static assets AND the REST API at `/api/*`
- **Database:** Cloudflare D1 (SQLite)
- **Deploy:** GitHub → auto-deploy to Cloudflare (Workers Builds or GitHub Actions — to be set up later)
- **Local development:** `wrangler dev`, local secrets in `.dev.vars` (gitignored)

Rejected options (do not suggest again): Spring Boot, PostgreSQL, Supabase, Firebase, GitHub Pages + separate database.

## Data model

```
profiles (Dzianis, Yulia)
  └── dictionaries (English, Polski, ...)  — a dictionary has a target language
        └── folders (thematic word folders)
              └── words
                    └── cards (one per exercise type — holds the SM-2 progress)
```

words: id, folder_id, term, translation, example (optional). Words hold NO
progress — a word is just vocabulary.

Progress uses **SM-2 spaced repetition** (the Anki engine), tracked **per
exercise type**: recognition and production are separate skills, so a word is
"fully learned" only when all of its cards mature.

cards: id, word_id, exercise_type, due_at (NULL = due now), interval_days,
ease (default 2.5, floor 1.3), reps, lapses, last_reviewed.
UNIQUE(word_id, exercise_type). Active types: recognition, production.
The worker creates one card per active type when a word is added.

## Auth (intentionally primitive, a full auth system is NOT needed)

- Two secrets in Worker env: `SECRET_DZIANIS`, `SECRET_YULIA`
- Worker resolves profile_id from the `X-Secret` header; invalid secret → 401
- ALL SQL queries are filtered by profile_id (data isolation between profiles)
- Frontend: on first visit show a secret input screen → store in localStorage → send the header with every request

## API

```
GET/POST           /api/dictionaries
GET/POST           /api/dictionaries/:id/folders
PATCH/DELETE       /api/folders/:id
GET/POST           /api/folders/:id/words
PATCH/DELETE       /api/words/:id
POST               /api/cards/:id/review   {grade: "again"|"hard"|"good"|"easy"}
```

- review runs one SM-2 step on the card (not the word). again → interval 0 (due again this session), lapses+1, ease−0.2; hard → interval ×1.2, ease−0.15; good → interval ×ease; easy → interval ×ease×1.3, ease+0.15. ease floors at 1.3; due_at = now + interval. All SM-2 math lives on the server
- `/api/ai/*` — stub for now. Later this becomes a proxy to the Anthropic API (key stored in Worker secrets, never call Anthropic from the frontend)

## UI

- LIGHT theme ONLY (no dark theme, no toggle)
- One accent color, calm palette, generous border radius, large touch targets on mobile
- Screens: secret input → dictionary picker → folders → words (list + quick add)
- Practice screen — not built yet. Two exercise types decided: recognition (term → recall translation) and production (translation → type term). A session = cards due today (SM-2) plus a quota of new cards; the server picks which cards, the folder stays a whole theme

## Status

- [x] Cloudflare account created
- [x] GitHub repo created
- [ ] Generate the project, run locally via wrangler dev
- [ ] Create the D1 database, apply the schema
- [ ] Set up auto-deploy and production secrets
- [ ] Practice: SM-2 backend done (cards + review); session selection + exercise UI (recognition, production) still to build
- [ ] AI features: generate sentences with words via Claude (haiku model, cheap)

## Working style with Dzianis

- 12 years of backend experience (Java/Spring), but frontend and Cloudflare are new topics: explain decisions simply, without condescension
- Hates over-engineering — always propose the minimal solution
- Values critical answers and honest trade-offs, no yes-manning
- Communicates in Russian, code and commits in English
