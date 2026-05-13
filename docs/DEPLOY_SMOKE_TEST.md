# Deploy Smoke Test

Run this after a production or preview deploy.

## Automated UAT

Run `npm run uat:smart-trip` when Vercel CLI is authenticated.

The script creates a temporary preview deployment with a one-time UAT edit PIN, verifies wrong-PIN rejection, generates a Le Blanc Los Cabos honeymoon draft, checks the direct trip and manage routes, deletes the generated `codex-uat-*` test row, confirms production still rejects a wrong PIN, and removes the temporary deployment.

To clean up older Codex-created UAT rows during the same run, set a comma-separated list first:

`$env:UAT_CLEANUP_SLUGS = 'codex-uat-le-blanc-20260513174343'; npm run uat:smart-trip`

## Routes

- Open `/` and confirm only listed trips appear.
- Open one listed trip, for example `/okc`.
- Open `/logan-bachelor` directly and confirm it loads even though it is unlisted.
- Open `/trips/new` and confirm **Build my trip** is the primary mode and **Start blank** is still available.
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
- In `/trips/new`, create a temporary unlisted smart draft with `TRIP_EDITOR_PIN`, confirm the generated manage-page panel appears, confirm the direct URL opens, and confirm it does not appear on `/`.
- In that dynamic trip's manage page, save a small edit with `TRIP_EDITOR_PIN`, switch visibility to listed, refresh `/`, and confirm the trip appears.
- Delete or hide the temporary dynamic trip after the smoke test if it should not remain visible. For Codex-created rows, `npm run uat:smart-trip` uses the `/api/trips` `deleteUat` cleanup action and only deletes dynamic rows with a `codex-uat-*` slug created by `Codex UAT`.

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
