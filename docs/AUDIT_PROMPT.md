# Family Trips Full Audit Prompt

Use this prompt to audit the entire Family Trips codebase, product behavior, data model, web design, privacy posture, and maintainability. The expected output is a prioritized audit report with concrete findings, file references, recommended fixes, and a suggested implementation order.

```text
You are auditing the Family Trips repository end to end.

Context:
- This is a casual family trip planning web app, not an enterprise product.
- The app is intentionally static-first and no-login: one link family/friends can open without accounts.
- The core user need is a simple mobile-friendly trip hub for itinerary, stay info, bookings, people, contacts, checklist progress, and budget.
- The group chat remains the real planning surface, so the app heavily uses "copy for text" buttons to generate clean blocks people can paste into messages.
- Trip content lives in code as typed `Trip` objects under `src/data/trips`.
- The `/` route lists trips, while `/:tripSlug` and child routes show one trip.
- Trips may be `visibility: 'unlisted'`, which means they should not appear on `/` but should still open by direct URL. Treat this as casual direct-link privacy only, not security.
- Checklist state and user-added checklist items use Supabase when configured, but should degrade gracefully when env vars are absent.
- The target users include family members and older relatives, so clarity, large touch targets, readable text, and low cognitive load matter more than dense power-user controls.

Audit goals:
1. Find correctness bugs, runtime risks, TypeScript/data-shape problems, routing flaws, stale assumptions, and edge cases.
2. Review all app functionality against the stated goals: trip index, trip home, itinerary, stay/bookings, people/contacts, checklist, budget, copy buttons, direct links, and PWA basics.
3. Review privacy and access boundaries for a casual app, especially listed vs unlisted trips, public bundle exposure, phone/address/budget data, and Supabase anon permissions.
4. Review UI/UX and web design quality on mobile and desktop: layout, hierarchy, readability, touch targets, scrolling, empty states, long text, copy affordances, and visual consistency.
5. Review maintainability: adding trips, editing trip data, duplication, type design, docs accuracy, test/build confidence, Supabase schema assumptions, and future scaling issues.
6. Identify documentation drift between README/docs and actual behavior.

Required exploration:
- Read `README.md`, `docs/PLAYBOOK.md`, `package.json`, `src/types/trip.ts`, `src/data/trips/index.ts`, every file in `src/data/trips/`, main route/page components, hooks, Supabase client code, formatter utilities, and core shared components.
- Search for every use of `listTrips`, `listTripsSorted`, `trips`, `visibility`, Supabase table names, localStorage keys, copy-button formatters, and checklist add/edit/delete flows.
- Run `npm run lint` and `npm run build`.
- If feasible, run the app locally and manually/browser-test at least these routes:
  - `/`
  - one listed trip home and child pages
  - `/logan-bachelor` and child pages if present
  - an invalid trip slug
- Test or inspect mobile viewport behavior around 390px wide and desktop behavior around 1280px wide.

Functional review checklist:
- Trips index shows only listed trips, sorted correctly by active/upcoming/past dates.
- Direct URLs still resolve unlisted trips.
- Invalid slugs redirect safely.
- Trip home countdown and "today" behavior are correct across date boundaries.
- Itinerary items render times, addresses, notes, and copy text cleanly.
- Stay and booking cards handle missing optional fields without awkward blank space.
- People and contacts avoid broken tel/url/text links.
- Checklist works with and without Supabase env vars.
- Checklist actor selection, sync status, optimistic updates, add/edit/delete behavior, and merge of code-defined plus DB-defined items are coherent.
- Budget handles TBD/zero values, split counts, pluralization, and per-person math gracefully.
- Copy buttons produce useful text and do not omit important context.
- PWA manifest and SPA rewrites are coherent for deployment.

UI/UX and design review checklist:
- Mobile-first layout has no horizontal overflow, clipped text, or overlapping bottom nav.
- Long venue names, addresses, notes, and checklist items wrap cleanly.
- Touch targets are large enough and obvious.
- Visual hierarchy is calm and readable for casual family use.
- Icons/emoji are helpful and not confusing.
- Empty, loading, offline, saving, and error states are understandable.
- Direct-link/private trips should not accidentally signal stronger security than they provide.
- The app should remain easy to use without onboarding, accounts, or admin screens.

Privacy/security review checklist:
- Confirm that unlisted trips are hidden only from the rendered trips index, not from the built JS bundle.
- Flag any sensitive data that should not live in client-side trip objects if stronger privacy is desired.
- Review Supabase anon read/write assumptions, table access patterns, and whether trip/user-added checklist data can leak across trips.
- Review localStorage actor handling and whether it stores anything sensitive.
- Review external links and phone links for correctness and safe attributes.

Maintainability review checklist:
- Is the `Trip` type sufficient but not overcomplicated?
- Are trip objects easy to copy, edit, and validate?
- Are repeated categories, checklist IDs, and activity IDs likely to drift or collide?
- Are docs accurate about current functionality, especially checklist add/edit/delete support?
- Are there small helper abstractions that would reduce real duplication without overengineering?
- Are there tests missing for the most fragile behavior, especially trip visibility sorting and checklist merge logic?
- Are validation scripts sufficient for a casual app?

Output format:
1. Start with findings, ordered by severity: Critical, High, Medium, Low, Nit.
2. Each finding must include:
   - Severity
   - Title
   - Evidence with file path and line number when possible
   - Why it matters for this app
   - Recommended fix
3. Include a short "What is working well" section.
4. Include a "Suggested implementation order" section grouped into P0, P1, and P2.
5. Include a "Verification performed" section with commands run and browser/device checks performed.
6. Include "Open questions" only for decisions that cannot be answered from the repo.

Audit stance:
- Be practical. Do not recommend heavy authentication, database redesign, or large framework changes unless the current code creates a real risk.
- Treat this as a family tool where simplicity is a feature.
- Prefer small, clear fixes over architecture churn.
- Call out when something is acceptable for casual use but not for real privacy/security.
- Do not rewrite code during the audit unless explicitly asked; this is an audit report request.
```

