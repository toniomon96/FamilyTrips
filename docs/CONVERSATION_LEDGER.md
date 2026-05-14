# Conversation Ledger

Durable notes for product decisions, open questions, and why the app changed. Keep this human-readable; do not put secrets, PINs, private confirmation numbers, or raw client/family-sensitive details here.

## 2026-05-13 - Self-Serve Trip Creation

- Ask: Logan wants to use FamilyTrips for his Le Blanc Los Cabos honeymoon, and Toni wants trusted people to create their own trips so he does not have to add each one in code.
- Decision: add a self-serve `/trips/new` quick wizard that creates Supabase-backed dynamic trips.
- Access: use a shared server-only `TRIP_EDITOR_PIN`; `ADMIN_PIN` remains the master owner PIN for code-backed static trips.
- Visibility: new trips default to unlisted direct links and can be listed later from the manage page.
- Product posture: this stays a casual trusted-family/friends planner, not full account-based authentication.
- Implementation note: static trips remain code seeds with optional overrides; dynamic trips live in `trip_overrides` with `source = 'dynamic'`.
- Open follow-up: after deployment, create Logan and Morgan's July 19-23 honeymoon through the new wizard, then fill in the Le Blanc dining/activity plan from the manage page.

## 2026-05-13 - Product Quality Lock

- Ask: make sure the self-serve trip feature scales, feels seamless, and is formatted well for people who are not Toni.
- Decision: the create flow should expose a clean editable share URL, default to an unlisted direct link, and hand off immediately to the manage page for deeper planning.
- UX note: the trips index should make the Add trip path obvious and should quietly surface when live Supabase-backed trips are unavailable.
- Quality bar: a trusted friend should be able to create a shell, copy the URL, and continue planning without understanding static trip files or Supabase.

## 2026-05-13 - Smart Trip Drafting Product Spec

- Ask: Toni clarified that the real product promise is not manual trip entry; Logan should be able to provide a few details and get an automatically filled trip draft with itinerary, restaurants, activities, checklist, packing, and reminders.
- Decision: define the next build as "smart trip generation" on top of the self-serve trip creator, with "Build my trip" as the default path and "Start blank" as the secondary path.
- UX posture: ask plain-language questions, collect vibe and must-do anchors, generate a useful first draft, then use the manage page for review and edits.
- Implementation posture: ship deterministic template-based generation first if needed, add AI-assisted generation behind strict server-side validation, and add curated destination packs for high-quality resort-specific recommendations.
- Spec: see `docs/SMART_TRIP_GENERATION_SPEC.md`.

## 2026-05-13 - Smart Trip Generation Shipped

- Ask: finish the smart-trip product promise so Logan can enter a short Le Blanc honeymoon brief and get a useful generated trip instead of manually filling every section.
- Decision: implement the hybrid generation path now: curated destination pack, deterministic fallback, and optional server-side OpenAI structured output.
- UX shipped: `/trips/new` defaults to **Build my trip** with brief, destination/stay, dates, travelers, vibe chips, pace, must-dos, and optional creator name. **Start blank** remains available.
- Data behavior: generated trips are written as dynamic unlisted `trip_overrides` rows and open directly into `/<slug>/manage?created=1&draft=generated`.
- Le Blanc pilot: official Le Blanc Los Cabos dining/experience details are in a code destination pack; activity and restaurant suggestions are marked as needing confirmation where appropriate.
- Safety posture: AI never writes directly without validation; missing or malformed AI output falls back to deterministic generation.

## 2026-05-13 - UAT Smoke Automation

- Ask: Toni wants the UAT testing loop to be reliable and easy because he and Logan have limited time to manually test.
- Decision: add `npm run uat:smart-trip` as a one-command Le Blanc smart-trip smoke test.
- Test posture: the script creates a temporary Vercel deployment with a one-time UAT PIN, uses the real `/api/trips` generation path, checks wrong-PIN rejection, verifies generated trip content and routes, deletes the generated `codex-uat-*` row, checks production wrong-PIN behavior, and removes the temporary deployment.
- Cleanup boundary: the `deleteUat` API action only deletes dynamic rows whose slug starts with `codex-uat-` and whose creator is `Codex UAT`; it is not a general trip delete feature.

## 2026-05-13 - Full Lifecycle UAT Suite

- Ask: Toni wants UAT to catch more than the smart-trip API path before sending the app to Logan.
- Decision: expand the smoke into `npm run uat`, with scenario controls for smart generation, manage save/history/restore, visibility, checklist/packing persistence, browser rendering, and production smoke.
- Report posture: every run writes a machine-readable JSON report and a Toni-readable Markdown report under `uat-results/`.
- Cleanup posture: Codex-created UAT rows stay namespaced as `codex-uat-*`; cleanup now removes dynamic trip rows, history rows, checklist state, and UAT checklist items.
- Safety posture: the suite creates a one-time temporary UAT PIN for preview deployments and never needs to print or use the permanent edit PIN.

## 2026-05-13 - Travel Command Center Product Correction

- Ask: Toni called out that the smart-trip draft is not yet context-aware enough, the phone flow is too long, the suggestions are too generic, and must-dos are not being turned into real plans.
- Decision: treat the current smart-trip feature as infrastructure plus a pilot, not the final product bar.
- Product posture: FamilyTrips should become an all-in-one command center for trips and family events, focused on itinerary, shared planning, and travel-agent-like help.
- UX direction: replace the long form with a 5 to 7 minute mobile wizard, led by a big "Tell us everything" field, optional structured details, smart follow-up questions, and a review screen before manage.
- Intelligence direction: use hybrid generation with curated packs, live search, official sources, location/timing awareness, source notes, and weak-draft warnings when the brief is thin.
- Event direction: support birthdays, gatherings, game nights, sports games, pro/amusement outings, family gatherings, weddings, bachelor parties, and showers with event-native run-of-show, food, supplies, setup, cleanup, guest, and budget planning.
- Retroactive direction: add Smart Assist on existing trips/events to fill gaps or improve sections through previewed changes saved to history.
- Hotfix: public `/trips/new` examples should be neutral. Logan and Morgan remain a UAT/pilot case, not the public default example.
- Spec: see `docs/TRAVEL_COMMAND_CENTER_AUDIT.md`.

## 2026-05-14 - Travel Command Center Quality Vertical

- Ask: implement the first serious rebuild pass as a quality vertical, not a big-bang rewrite.
- Decision: `/trips/new` is now a compact wizard with start, progressive details, smart questions, and review-before-accept. The blank shell path stays available as a secondary mode.
- Intelligence posture: trip/event generation uses rich `PlanBrief` normalization, brief scoring, structured must-do anchors, curated packs, deterministic fallback, and optional server-side OpenAI Responses API web search.
- Data posture: planner metadata, source refs, warnings, statuses, `why`, and `nextStep` fields live inside the existing trip JSON stored in `trip_overrides.data`; no new tables were added.
- Event posture: the same create flow can generate event-native drafts with run-of-show, tasks, supplies, food, setup/cleanup, budget, and reminders.
- Retroactive posture: manage pages now expose Smart Assist previews for existing trips. Applying a preview uses the normal save path so version history remains the audit trail.
- UX posture: source/confidence notes are visible on generated public trip pages, and browser dictation is a progressive enhancement for the big context field.

## 2026-05-14 - Launch Handoff And Readiness Polish

- Ask: Toni wanted the best remaining closeout work knocked out after deploy.
- Decision: keep the shipped app live, add a trusted-planner handoff for Logan/future users, add a repeatable `npm run ready:production` check, and make the create form more explicit about the context that creates a strong draft.
- Environment posture: production has the required edit/admin/Supabase env names; live OpenAI research remains optional and should be enabled by adding `OPENAI_API_KEY` plus research envs when Toni wants stronger source-aware generation.

## 2026-05-14 - Command Center Quality Slice

- Ask: implement the brutal audit's highest-leverage fix so generated trips feel like a travel-agent command center instead of a giant manage form.
- Decision: keep the full owner editor, but move it behind an `Advanced Editor` tab. Normal users now land on compact command-center panels for overview, itinerary, must-dos, bookings, lists, budget, sharing, sources, and Smart Assist.
- Trust posture: `/trips/new` now surfaces draft strength, source mode, missing inputs, and booking/confirmation next steps before a preview is accepted.
- Privacy posture: the raw context field warns users not to paste passports, payment details, door codes, passwords, or private confirmation numbers; obvious sensitive-context patterns are flagged without echoing the private values.
- API posture: `/api/trips` and `/api/trip-overrides` now have basic request-size and rate-limit guardrails suitable for the current trusted PIN model.

## 2026-05-14 - P0 Privacy And AI UAT Closeout

- Ask: before logging off, add the tests and cleanup that make the app safer and easier to trust.
- Decision: broad-redact static seed trips so public bundles do not expose private phone numbers, confirmation codes, passwords/access instructions, or exact private home/rental addresses.
- Guardrail: add `npm run privacy:scan` and wire it into CI/readiness so public seed-data privacy regressions fail fast.
- UAT posture: live AI research verification is opt-in through `npm run uat:ai-production`; normal UAT remains safe and predictable.
- Cleanup posture: old ignored UAT report folders can be pruned with a dry-run-first `npm run clean:uat-results -- --keep 10`.
