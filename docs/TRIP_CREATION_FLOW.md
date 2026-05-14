# Trip Creation Flow

This is the plain-English handoff for how self-serve trip creation works, what the user sees, and which tests prove it.

Last verified locally against a temporary Vercel deployment on 2026-05-14:

- Full lifecycle UAT: `uat-results/uat-20260514160018-39aa9215/uat-report.md`
- Live AI research UAT: `uat-results/ai-production-20260514210257-31773734/ai-production-report.md`
- Production readiness: `uat-results/production-readiness-2026-05-14T21-02-43-052Z/readiness-report.md`

Important: these reports prove the current local working tree in a temporary deployment. Production gets the latest behavior only after commit, push, and deploy.

## User Flow

1. The trusted user opens `/trips/new`.
2. They enter the shared trip edit PIN.
3. They choose **Build my trip** for a planned draft, or **Start blank** for an empty shell.
4. In the smart path, they enter the basics:
   - trip or event type
   - destination, stay, venue, or location
   - start and end date
   - trip name or event name
   - the big "Tell us everything" context field
5. The form validates obvious issues before contacting the server:
   - PIN is required
   - name and destination/location are required
   - dates must be real calendar dates
   - end date cannot be earlier than start date
   - generated share slug must be valid
6. The user can add richer context:
   - travelers or guests
   - lodging or venue details
   - arrival and departure notes
   - vibe and pace
   - food preferences
   - budget posture
   - kids, mobility, or accessibility notes
   - confirmed bookings
   - must-dos and nice-to-haves
7. The user clicks the planning action.
8. The app shows a visible progress panel instead of looking frozen:
   - validates the request
   - checks the share URL
   - researches or uses trusted destination packs
   - builds itinerary, booking tasks, checklist, packing, and budget placeholders
   - prepares the review
9. If the brief is thin, the app asks follow-up questions and labels the draft as weaker.
10. The review screen shows:
   - draft confidence
   - source mode, such as live search, curated pack, or deterministic fallback
   - warnings and missing inputs
   - day-by-day plan
   - must-do mini-plans
   - booking and confirmation tasks
   - checklist and packing items
   - budget placeholders
   - copyable summary blocks
   - source notes
11. The user accepts the draft.
12. The app saves a dynamic Supabase-backed trip in `trip_overrides`.
13. The trip starts as `visibility = 'unlisted'`.
14. The app redirects to `/<slug>/manage?created=1&draft=generated`.
15. The manage page opens in command-center mode first, with the full editor tucked behind Advanced Editor.

## What Gets Saved

Generated trips are dynamic rows in `trip_overrides` with:

- `source = 'dynamic'`
- `visibility = 'unlisted'`
- full trip JSON in `data`
- planner metadata inside `data.planner`
  - original normalized planning brief
  - recommendation candidates from curated packs and/or live search
  - must-do mini-plans with suggested day/window, next step, logistics note, packing implication, checklist link, booking link, and budget placeholder
  - source refs and location-awareness limits
- version/history rows for accepted saves

Static trips stay code-backed and can still be edited through owner overrides. Shared edit PIN users can edit dynamic trips, while static trip mutation remains owner/admin controlled.

## AI And Research Behavior

The reliable path is:

1. Normalize the brief.
2. Match a curated destination pack when one exists.
3. Use OpenAI web search when configured.
4. Merge source refs, planning notes, and source-backed recommendation candidates.
5. Convert must-dos into mini-plans.
6. Build the actual saved draft with deterministic app logic.

The experimental AI composer is controlled by `TRIP_AI_PLANNER_ENABLED` and is off by default. This keeps the app from hanging or producing invalid drafts while still allowing live research to improve source-aware planning.

When live research is unavailable, times out, or returns unusable output, the app still creates a draft from curated packs and deterministic rules, and the UI says that the draft is weaker.

Location-aware V1 is search-first, not maps-backed routing. It uses the stay/location text, destination pack, user brief, and live search candidates to influence restaurants, activities, logistics notes, and itinerary placement. It intentionally says "confirm transportation," "ask concierge," and "flexible block" instead of claiming exact distance, drive time, live hours, live prices, or availability.

## What The Tests Prove

`npm run test` proves the core rules:

- date validation rejects invalid ranges and impossible calendar dates
- brief normalization and slug generation work
- weak briefs return follow-up questions
- Le Blanc destination matching works
- deterministic trip/event drafts validate
- must-dos become mini-plans and appear in itinerary, bookings, checklist, packing, and budget surfaces
- Le Blanc candidates produce source-aware restaurants, activities, golf, horseback riding, and Lovers Beach planning surfaces
- generated planning language does not claim exact distance, travel time, prices, hours, or availability without a maps/availability provider
- malformed AI output falls back safely
- live-search source mode stays visible even if the composer is disabled or falls back
- destination packs validate for duplicate IDs, required matchers/source URLs, and malformed URLs
- Smart Assist previews expose changed sections so a user can apply only itinerary, recommendations, bookings, checklist, packing, budget, event details, share messages, or planner notes
- Smart Assist can rebuild share-ready group text from the saved brief, recommendations, mini-plans, event tasks, and booking/confirmation items

`npm run uat` proves the traveler lifecycle against a real temporary Vercel deployment:

- `/trips/new` renders on mobile and desktop
- wrong PIN rejects
- duplicate slug rejects
- real form submission works against `/api/trips`
- slow planning progress UI appears
- generated trip opens by direct URL
- generated manage page opens
- generated manage Share tab exposes copy buttons for stored summary messages
- generated manage Smart Assist tab exposes the group-chat summary action
- generated manage Bookings tab lets a trusted editor add arrival/departure flight details and timing from the command center
- generated manage Bookings and Must-dos tabs let a trusted editor quick-edit booking status/next steps and must-do timing/logistics without opening Advanced Editor
- manage save/history/restore works
- visibility can switch listed/unlisted
- checklist and packing state persists after refresh
- production smoke remains non-mutating
- generated `codex-uat-*` data is cleaned up
- temporary deployment is removed

`npm run uat:ai-production` proves the live research lane:

- creates a temporary production-shaped Vercel deployment
- uses a one-time UAT PIN
- verifies live OpenAI web research was used
- verifies source refs exist
- verifies required Le Blanc must-dos appear
- deletes the generated UAT row
- removes the temporary deployment

`npm run ready:production` proves the public deployment is reachable and configured well enough to send, while warning if the working tree has local changes.

## Current Known Limits

- Unlisted is a convenience/privacy-by-link behavior, not authentication.
- Location-aware V1 does not have real maps, distance routing, live availability, exact hours, exact prices, or weather-aware packing yet.
- Destination intelligence is strongest where curated packs or live search produce good source refs.
- Destination packs are code-backed in this version. `npm run validate:data` checks the pack file for duplicate IDs and malformed URLs, and unit tests validate the pack shape, but adding a new pack is still a developer task.
- The normal UAT proves the deterministic/curated path by default; `uat:ai-production` is the separate proof for live research because it spends OpenAI tokens.
- After any new local fixes, commit, push, deploy, and rerun production smoke before assuming the public site reflects them.
