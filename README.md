# TripHub

A simple, shareable web hub for a family trip — bookings, itinerary, stay info, who’s coming, and everything else in one link you can send to family and friends.

**Design ethos**

- Static-first. No logins, no accounts, nothing for your family to set up.
- Big text, light theme, one-tap navigation — built to be easy for older family members.
- "Copy for text" buttons on every section: the group chat is how the trip actually gets planned, and this site feeds it with clean, formatted blocks ready to paste.

## Stack

Vite + React 19 + TypeScript + Tailwind v4 + React Router 7. All content lives in code — one `Trip` object per trip.

## How to edit a trip

1. Open `src/data/trips/<slug>.ts` (e.g. `stpete.ts`).
2. Edit the `Trip` object — dates, stay, bookings, itinerary, people, checklist, budget, contacts.
3. Commit and push. Vercel (or any static host) rebuilds and deploys.

Types live in `src/types/trip.ts` — your editor will guide you through the shape.

## Add a new trip

1. Copy `src/data/trips/stpete.ts` to a new file like `src/data/trips/mexico.ts`.
2. Change the `slug` and fill in the content.
3. Register it in `src/data/trips/index.ts`:
   ```ts
   import { mexico } from './mexico'
   export const trips = { [stpete.slug]: stpete, [mexico.slug]: mexico }
   ```
4. Visit `/<slug>` — e.g. `/mexico`.

The default trip (loaded at `/`) is controlled by `DEFAULT_TRIP_SLUG` in `src/data/trips/index.ts`.

## Commands

```bash
npm install      # install dependencies
npm run dev      # dev server at http://localhost:5173
npm run build    # typecheck + production build into dist/
npm run lint     # eslint
npm run preview  # preview the production build
```

## Pages

- `/` — Home (hero, countdown, today’s schedule, quick links, share-trip button)
- `/trip` — Itinerary + Things to do
- `/stay` — Stay details (address, Wi-Fi, amenities, host) + Bookings (flights, car, activities)
- `/people` — Guests + emergency contacts
- `/checklist` — Static trip-prep checklist, grouped by category
- `/budget` — Cost breakdown with per-person split

Also works under `/<tripSlug>/*` — e.g. `/tuscany/stay`.

## Deploying

Vercel (recommended): connect the repo, no config needed — `vercel.json` already handles SPA rewrites. Any other static host (Netlify, Cloudflare Pages, GitHub Pages) works too; make sure it serves `index.html` for unmatched paths.

## Install to home screen

`public/manifest.webmanifest` is wired up so family can tap "Add to Home Screen" on iOS or Android and open the trip like an app. A full service worker / offline support is on the v1.1 roadmap once `vite-plugin-pwa` ships Vite 8 support.

## What’s explicitly not here

- Interactive polls, live-updating checklists, cost-splitting edits. Those belong in the group text thread and would break cleanly as "static" anyway. The app tells you what’s true; the group chat is where people react.
