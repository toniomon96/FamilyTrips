# Family Trips Roadmap

Family Trips is a casual shared planning hub for trips and family events. The goal is one clean link that helps the group chat, not a full event-management product.

## Now

- Run the Supabase SQL in `docs/SUPABASE.md`, then smoke-test checklist and packing sync across two browser sessions or devices.
- Use `docs/DEPLOY_SMOKE_TEST.md` after deploys, especially for `/`, a listed trip, `/logan-bachelor`, checklist, packing, budget, and mobile layout.
- Do a content review before sharing links more widely. Anything in trip data ships in the public JavaScript bundle, including unlisted trips, addresses, phone numbers, budgets, reservation details, passwords, and notes.
- Keep small copy/docs fixes current as behavior changes.

## Next

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
