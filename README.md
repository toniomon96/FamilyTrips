# Family Trips

A simple, shareable web hub for our family's trips — bookings, itinerary, stay info, who’s coming, and everything else in one link you can send to family and friends. One app, many trips.

**Design ethos**

- Static-first. No logins, no accounts, nothing for your family to set up.
- Big text, light theme, one-tap navigation — built to be easy for older family members.
- "Copy for text" buttons on every section: the group chat is how the trip actually gets planned, and this site feeds it with clean, formatted blocks ready to paste.

## Stack

Vite + React 19 + TypeScript + Tailwind v4 + React Router 7. Seed trips live in code, while trusted self-serve trips are stored in Supabase as dynamic trip rows.

## How it's organized

- `/` — **Trips index** (cards for every trip, upcoming first)
- `/trips/new` — Build a new unlisted smart trip draft, or start blank, with the shared trip edit PIN
- `/:tripSlug` — Home for that trip (hero/countdown/today/quick-links/share)
- `/:tripSlug/trip` — Itinerary + things to do
- `/:tripSlug/stay` — Stay details + bookings (flights, car, activities)
- `/:tripSlug/people` — Attendees + emergency contacts
- `/:tripSlug/checklist` — Trip-prep checklist, grouped by category
- `/:tripSlug/packing` — What to bring, grouped by category
- `/:tripSlug/budget` — Cost breakdown with per-person split

## Edit an existing trip

For early setup and big structural changes:

1. Open `src/data/trips/<slug>.ts` (e.g. `stpete.ts`, `okc.ts`).
2. Edit the `Trip` object — dates, stay, bookings, itinerary, people, checklist, packing, budget, contacts.
3. Commit and push. Vercel rebuilds and deploys.

For late trip updates after the owner-editing backend is configured:

1. Open `/<slug>/manage` directly, for example `/okc/manage` or `/logan-bachelor/manage`.
2. Enter the owner PIN.
3. Edit the fields, save live, and refresh the public trip page to confirm the update.

The manage route is intentionally hidden from the family-facing navigation. It saves Supabase overrides on top of the code-defined trip seed, so the source file remains the fallback.

Types live in `src/types/trip.ts` — your editor will guide you through the shape.

## Add a new trip

For trusted family/friends, use the app:

1. Open `/trips/new`.
2. Enter the shared trip edit PIN.
3. Use **Build my trip** for the smart draft path: add the destination/stay, dates, travelers, trip vibe, pace, and must-do items.
4. The planner now uses location/stay text, curated packs, and optional live search to build recommendation candidates and must-do mini-plans. It is search-first, not maps-backed routing, so it tells users to confirm transportation, current hours, prices, and availability instead of claiming exact logistics.
5. Use **Start blank** only when you want an empty starter shell.
6. The app opens the manage page next with itinerary, restaurants/activities, checklist, packing, bookings, budget placeholders, and copyable messages ready to review. Trusted editors can quick-edit travel details, booking status/next steps, and editable must-do timing/logistics from the command center before using the Advanced Editor.

Self-serve trips are Supabase-backed and default to unlisted direct links. They can be changed to listed from the manage page later.

For code-backed seed trips:

1. Copy an existing trip file to `src/data/trips/<new-slug>.ts`.
2. Change the `slug`, name, dates, and content.
   - Optional: set `visibility: 'unlisted'` for trips that should work by direct link but stay off the `/` trips index. Omit it for the default listed behavior.
3. Register it in `src/data/trips/index.ts`:
   ```ts
   import { newtrip } from './newtrip'
   export const trips: Record<string, Trip> = {
     [stpete.slug]: stpete,
     [okc.slug]: okc,
     [newtrip.slug]: newtrip,
   }
   ```
4. Visit `/<new-slug>` directly, or tap it on the trips index if it is listed.

The trips index sorts listed upcoming trips by start date and pushes listed past trips to the end, so ordering is automatic. Unlisted trips are still registered and can be opened by anyone with the direct URL; this is a casual privacy boundary, not authentication.

## Commands

```bash
npm install      # install dependencies
npm run dev      # dev server at http://localhost:5173
npm run build    # typecheck + production build into dist/
npm run lint     # eslint
npm run test     # focused unit tests for fragile trip rules
npm run validate:data # check trip/event data and destination packs for obvious mistakes
npm run uat      # full temporary-deployment UAT with cleanup
npm run preview  # preview the production build
```

## Configuration

The checklist and packing toggles are backed by Supabase so changes can sync across devices in real time. Two env vars are needed:

- `VITE_SUPABASE_URL` — `https://<project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY` — the project's **anon / publishable** key
- `TRIP_EDITOR_PIN` — shared server-only PIN for creating and editing dynamic self-serve trips
- `OPENAI_API_KEY` — optional server-only key for live research and AI-assisted smart drafts
- `TRIP_RESEARCH_MODEL` — optional OpenAI web-search model override; falls back to `gpt-5-mini`
- `TRIP_AI_PLANNER_ENABLED` — optional experimental AI composer toggle; defaults off so source-aware deterministic planning stays fast and reliable
- `TRIP_GENERATION_MODEL` — optional OpenAI composer model override; falls back to `gpt-5-mini`

Set them in Vercel → Project Settings → Environment Variables (Production + Preview + Development). Trigger a redeploy after saving — Vite bakes `VITE_` env vars at build time.

For local dev, copy `.env.example` to `.env.local` and fill in the same values. If the vars are missing, checkbox toggles and user-added checklist items still work in the current browser session but are not permanent. Session-only changes are not uploaded later if Supabase env vars are added.

The checklist uses two tables:

- `checklist_state` — one row per trip + checklist item, storing done state and the selected actor.
- `checklist_items` — user-added checklist items for a trip, including title, category, notes, and creator actor.
- `trip_overrides` — current owner-published trip edits, readable by the public app.
- `trip_override_history` — owner-only edit history used for restore.

Packing reuses `checklist_state` with namespaced item IDs like `packing:pk-docs-id`, so no third table is needed.

Owner saves go through `/api/trip-overrides`, and self-serve trip creation goes through `/api/trips`. These APIs require server-only `ADMIN_PIN`, `TRIP_EDITOR_PIN`, and `SUPABASE_SERVICE_ROLE_KEY` env vars. Smart trip generation optionally uses `OPENAI_API_KEY`; if it is missing or returns invalid data, the server still creates a curated/deterministic smart draft. Generated planner metadata is stored inside the trip JSON as `planner.brief`, `planner.recommendations`, `planner.miniPlans`, source refs, and location-awareness limitations. Use `vercel dev` when testing those APIs locally; plain `npm run dev` only starts the Vite client server.

The Supabase posture is intentionally casual: anon clients can read/write checklist rows for shared family links. Keep the app deployed only where that tradeoff is acceptable. Code should always query by the current registered trip slugs or direct trip slug, but this is not authentication.

See `docs/SUPABASE.md` for setup SQL, `docs/TRIP_CREATION_FLOW.md` for the self-serve form flow and proof reports, `docs/DEPLOY_SMOKE_TEST.md` for post-deploy checks, `docs/TEMPLATES.md` for starter outlines, and `ROADMAP.md` for the practical next-wave plan.

## Privacy model

This is a static client-side app with public Supabase reads for shared planning. Anything in `src/data/trips` is shipped in the built JavaScript bundle, and Supabase-backed dynamic trips are readable by slug from the public client. `visibility: 'unlisted'` only hides a trip from the rendered `/` index; anyone who has the direct URL can see the data.

That is fine for the current casual family-use case, especially while the site is not advertised. If a future trip needs real privacy, do not put sensitive details in trip objects; move that trip behind authenticated storage or keep those details in the group chat.

## Deploying

Vercel (recommended): connect the repo, no config needed — `vercel.json` already handles SPA rewrites. Any other static host (Netlify, Cloudflare Pages, GitHub Pages) works too; make sure it serves `index.html` for unmatched paths.

## Install to home screen

`public/manifest.webmanifest` is wired up so family can tap "Add to Home Screen" on iOS or Android and open the trips hub like an app.

## What’s explicitly not here (yet)

- Cost-splitting edits, live itinerary edits, "who booked what" comments. Those belong in the group chat for now.
