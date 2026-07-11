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
```

words: id, folder_id, term, translation, example (optional),
progress (0–100), correct_streak, last_reviewed

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
POST               /api/words/:id/review   {result: "correct" | "wrong"}
```

- review: correct → progress +20, wrong → −30, clamp 0–100, update streak and last_reviewed. Progress logic lives on the server
- `/api/ai/*` — stub for now. Later this becomes a proxy to the Anthropic API (key stored in Worker secrets, never call Anthropic from the frontend)

## UI

- LIGHT theme ONLY (no dark theme, no toggle)
- One accent color, calm palette, generous border radius, large touch targets on mobile
- Screens: secret input → dictionary picker → folders → words (list + quick add)
- Practice screen — a "Coming soon" stub: exercise types are not defined yet, Dzianis will share examples later. Future exercises will use progress (weak words appear more often)

## Status

- [x] Cloudflare account created
- [x] GitHub repo created
- [ ] Generate the project, run locally via wrangler dev
- [ ] Create the D1 database, apply the schema
- [ ] Set up auto-deploy and production secrets
- [ ] Exercise types (waiting for examples from Dzianis)
- [ ] AI features: generate sentences with words via Claude (haiku model, cheap)

## Working style with Dzianis

- 12 years of backend experience (Java/Spring), but frontend and Cloudflare are new topics: explain decisions simply, without condescension
- Hates over-engineering — always propose the minimal solution
- Values critical answers and honest trade-offs, no yes-manning
- Communicates in Russian, code and commits in English
