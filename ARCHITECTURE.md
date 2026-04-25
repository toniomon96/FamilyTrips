# Family Trips Architecture

Family Trips is a static-first Vite + React app. The production artifact is a client-side bundle served by a static host with SPA rewrites.

## Core Shape

- Trip content is typed data in `src/data/trips`.
- `src/data/trips/index.ts` registers trips, returns direct trip lookups, filters unlisted trips for `/`, and sorts listed trips by active/upcoming/past dates.
- React Router owns the route tree: `/` lists trips, and `/:tripSlug` plus child routes render one trip.
- Shared trip context is provided by `src/components/Layout.tsx` and consumed by trip pages.
- Packing is code-defined trip content. It is exposed as `/:tripSlug/packing` and linked from the trip home quick links, not the bottom nav.

## Dynamic State

Checklist done state, packing packed state, and user-added checklist items can sync through Supabase when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured. Without those env vars, changes are session-only in the current browser.

Packing reuses `checklist_state` with namespaced item IDs such as `packing:pk-docs-id`. User-added checklist items still live in `checklist_items`.

The Supabase integration is intentionally no-login and casual. It should remain scoped by trip slug in client queries, but it is not an access-control boundary.

## Privacy Boundary

`visibility: 'unlisted'` is index visibility only. Unlisted trip data remains in the JavaScript bundle and direct URLs still work. Do not store details in trip objects if a trip needs real privacy.

## Validation

Use these checks before shipping behavior changes:

```bash
npm run lint
npm run test
npm run build
```

Use `docs/DEPLOY_SMOKE_TEST.md` after deploys and `docs/SUPABASE.md` when creating or repairing the Supabase backend.
