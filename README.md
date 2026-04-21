# Family Trips

A simple, shareable web hub for our family's trips — bookings, itinerary, stay info, who’s coming, and everything else in one link you can send to family and friends. One app, many trips.

**Design ethos**

- Static-first. No logins, no accounts, nothing for your family to set up.
- Big text, light theme, one-tap navigation — built to be easy for older family members.
- "Copy for text" buttons on every section: the group chat is how the trip actually gets planned, and this site feeds it with clean, formatted blocks ready to paste.

## Stack

Vite + React 19 + TypeScript + Tailwind v4 + React Router 7. All content lives in code — one `Trip` object per trip, registered in a central index.

## How it's organized

- `/` — **Trips index** (cards for every trip, upcoming first)
- `/:tripSlug` — Home for that trip (hero/countdown/today/quick-links/share)
- `/:tripSlug/trip` — Itinerary + things to do
- `/:tripSlug/stay` — Stay details + bookings (flights, car, activities)
- `/:tripSlug/people` — Attendees + emergency contacts
- `/:tripSlug/checklist` — Trip-prep checklist, grouped by category
- `/:tripSlug/budget` — Cost breakdown with per-person split

## Edit an existing trip

1. Open `src/data/trips/<slug>.ts` (e.g. `stpete.ts`, `okc.ts`).
2. Edit the `Trip` object — dates, stay, bookings, itinerary, people, checklist, budget, contacts.
3. Commit and push. Vercel rebuilds and deploys.

Types live in `src/types/trip.ts` — your editor will guide you through the shape.

## Add a new trip

1. Copy an existing trip file to `src/data/trips/<new-slug>.ts`.
2. Change the `slug`, name, dates, and content.
3. Register it in `src/data/trips/index.ts`:
   ```ts
   import { newtrip } from './newtrip'
   export const trips: Record<string, Trip> = {
     [stpete.slug]: stpete,
     [okc.slug]: okc,
     [newtrip.slug]: newtrip,
   }
   ```
4. Visit `/<new-slug>` directly, or tap it on the trips index.

The trips index sorts upcoming trips by start date and pushes past trips to the end, so ordering is automatic.

## Commands

```bash
npm install      # install dependencies
npm run dev      # dev server at http://localhost:5173
npm run build    # typecheck + production build into dist/
npm run lint     # eslint
npm run preview  # preview the production build
```

## Deploying

Vercel (recommended): connect the repo, no config needed — `vercel.json` already handles SPA rewrites. Any other static host (Netlify, Cloudflare Pages, GitHub Pages) works too; make sure it serves `index.html` for unmatched paths.

## Install to home screen

`public/manifest.webmanifest` is wired up so family can tap "Add to Home Screen" on iOS or Android and open the trips hub like an app.

## What’s explicitly not here

- Interactive polls, live-updating checklists, cost-splitting edits. Those belong in the group text thread and would break cleanly as "static" anyway. The app tells you what’s true; the group chat is where people react.
