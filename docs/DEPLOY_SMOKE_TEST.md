# Deploy Smoke Test

Run this after a production or preview deploy.

## Routes

- Open `/` and confirm only listed trips appear.
- Open one listed trip, for example `/okc`.
- Open `/logan-bachelor` directly and confirm it loads even though it is unlisted.
- Open `/okc/manage` and `/logan-bachelor/manage` directly and confirm the hidden owner editor loads.
- Open an invalid slug and confirm it redirects to `/`.

## Trip Pages

For a listed trip and `/logan-bachelor`, check:

- Home quick links route to Itinerary, Stay, People, Checklist, Packing, and Budget.
- Itinerary copy buttons include links when a plan item has one.
- Stay and People links open safely in a new tab where appropriate.
- Budget shows `TBD` instead of `$0` for unknown costs.
- Packing shows grouped items, progress, and copy buttons.
- `/family-cookout` opens by direct URL, stays off `/`, and shows event labels, food, supplies, tasks, and copy buttons.

## Checklist And Packing State

With Supabase configured:

- Toggle a checklist item and confirm progress changes.
- Add a checklist item and confirm it appears after refresh.
- Toggle a packing item and confirm it remains checked after refresh.
- In `/okc/manage`, enter the owner PIN, make a small itinerary or budget edit, save live, refresh `/okc`, and confirm the public page uses the update.
- Load owner history from `/okc/manage`, restore the previous version, and confirm `/okc` returns to the prior content.

Without Supabase configured:

- Checklist and packing toggles work and survive a refresh in the current browser session.
- User-added checklist items are clearly marked as non-permanent.
- Session-only checklist and packing changes are not expected to upload later when Supabase env vars are added.
- Offline/status copy is understandable.

## Mobile

At roughly 390px wide:

- No horizontal scrolling on `/`, a trip home, `/checklist`, `/packing`, or `/budget`.
- Bottom navigation does not overlap important page actions.
- Long names, addresses, notes, and packing items wrap cleanly.
- Tap targets are easy to hit.

## PWA

- Confirm `manifest.webmanifest` loads.
- Confirm Vercel SPA rewrites serve direct URLs like `/okc/packing`.
- Confirm Vercel SPA rewrites serve unlisted event URLs like `/family-cookout`.
