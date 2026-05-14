# Family Trips Roadmap

Family Trips is a casual shared planning hub for trips and family events. The goal is one clean link that helps the group chat, not a full event-management product.

## Now

- Finish verification and deploy the Location-Aware Planner V1 working tree. V1 uses stay/location text, curated packs, and live search candidates to shape restaurants, activities, must-do mini-plans, logistics notes, and itinerary placement. It is not maps-backed routing and should not claim exact distance, travel time, hours, prices, or availability.
- Commit, push, and manually deploy the current local form-validation/progress/AI-research fixes before sending the app to Logan or other users.
- After deploy, run `npm run ready:production` and `npm run uat:production` against `https://thegroupchat.voyage`.
- Use `docs/TRIP_CREATION_FLOW.md` as the source of truth for how the self-serve form works and what the UAT reports prove.
- Keep using `docs/DEPLOY_SMOKE_TEST.md` after deploys, especially for `/`, `/trips/new`, a listed trip, `/logan-bachelor`, checklist, packing, budget, smart-trip creation, and mobile layout.
- Do one real-user manual smoke after deploy: create a disposable unlisted trip through the public site, confirm progress states are clear, accept the draft, open manage, and delete/hide the test data.
- Continue content/privacy review before sharing links more widely. Anything in static trip data ships in the public JavaScript bundle, and dynamic trip data remains casual direct-link privacy.
- Keep small copy/docs fixes current as behavior changes.

## Next

- Add a section-level Smart Assist diff UI so Toni/users can apply just restaurants, activities, logistics notes, checklist/packing, or itinerary pacing changes instead of applying a full preview all at once.
- Add section-level regeneration after the first smart draft: regenerate itinerary, dining ideas, things to do, checklist, or packing with a preview before replacing existing content.
- Add stronger post-accept guidance for first-time users: "review these 3 things first," "copy this link," and "send this summary."
- Expand destination packs beyond the Le Blanc Los Cabos pilot as real family/friend trips come up.
- Add lightweight event support for cookouts, birthdays, get-togethers, and family gatherings without changing the app into SaaS. Initial support is based on `kind: 'event'`, event food, supplies, tasks, and copy blocks.
- Keep event planning in the same vibe as trips: one shared link, simple pages, no accounts, no admin screens, and copy buttons for group chat.
- Add event-friendly content where it naturally helps:
  - Schedule or day-of plan
  - Food and drinks
  - Supplies and what to bring
  - Tasks for setup, cleanup, shopping, pickups, and decorations
  - People or households
  - Contacts for hosts, venues, or vendors
  - Optional casual budget
  - Copyable invite, food list, supply list, and day-of plan

## Later

- Keep route code-splitting healthy if more pages are added.
- Keep data validation current for duplicate IDs, malformed links, phone numbers, dates, and required trip/event fields.
- Add editable packing items if packing starts changing often during live planning.
- Expand starter templates for common plans like beach trip, road trip, cookout, birthday, and bachelor weekend as real examples emerge.
- Consider stronger privacy only if a specific trip or event needs it. Until then, keep sensitive details out of client-side trip data when needed.

## Principles

- Keep the app calm, readable, and mobile-first.
- Favor content clarity over advanced controls.
- Prefer small static data additions before database-backed editing.
- Treat group chat as the real planning surface and make copyable text useful.
- Avoid productized workflows like formal RSVP management, ticketing, payments, role-based permissions, or onboarding unless there is a clear family-use need.
