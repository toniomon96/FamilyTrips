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
- Environment posture at that point: production had the required edit/admin/Supabase env names; live OpenAI research was still optional and needed OpenAI research envs before stronger source-aware generation. Later entries record the live-research configuration and UAT proof.

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

## 2026-05-14 - End-To-End Form Proof And AI Research Fix

- Ask: Toni caught real form bugs: end date could be earlier than start date, and the planning action looked stuck without progress or recovery guidance.
- Decision: treat this as a real end-to-end product bug, not a cosmetic issue.
- Fix: add shared strict date validation, inline form errors, manage-page validation guardrails, visible planning progress stages, elapsed-time copy, timeouts, and recovery links for create flows.
- AI posture: live OpenAI web research is configured with `gpt-5-mini`; the experimental AI composer is off by default through `TRIP_AI_PLANNER_ENABLED=0` so source-aware deterministic generation stays reliable.
- Proof: `npm run uat` passed against a temporary Vercel deployment and exercised real form submission, generated trip routing, manage save/history/restore, visibility, checklist/packing persistence, browser screenshots, production smoke, and cleanup.
- Proof: `npm run uat:ai-production` passed with `sourceMode = search`, live research notes, source refs, required Le Blanc must-dos, UAT row cleanup, and temp deployment cleanup.
- Documentation: `docs/TRIP_CREATION_FLOW.md` is the human-readable source of truth for how `/trips/new` works and what the tests prove.

## 2026-05-14 - Location-Aware Planner V1

- Ask: Toni clarified that the planner must actually use stay/location context and must-dos to produce useful restaurants, activities, entertainment, logistics notes, and itinerary placements.
- Decision: implement search-first location awareness on top of the existing wizard and deterministic builder, without claiming maps/routing capability.
- Data posture: generated dynamic trips now persist `planner.brief`, `planner.recommendations`, `planner.miniPlans`, `planner.researchMode`, and `planner.locationLimitations` inside the existing trip JSON. No new database table or migration was added.
- Planning posture: Le Blanc pack items and live-search recommendations become normalized recommendation candidates. Each must-do becomes a mini-plan with suggested day/window, booking or confirmation next step, logistics note, packing implication, checklist link, booking link, and budget placeholder.
- Honesty posture: generated copy should say "confirm transportation," "ask concierge," and "flexible block" instead of exact drive times, distances, prices, live hours, or availability. V1 is source/search aware, not maps-backed routing.
- UX posture: `/trips/new` review and the manage command center now surface the saved brief, recommended places, must-do mini-plans, needs-booking/needs-confirmation tasks, and source/location limitation notes.

## 2026-05-14 - Smart Assist Section Apply And Event Assist

- Ask: roll forward on the natural next enhancements without overstating what was built, and keep extending location-aware planning wherever the existing data supports it.
- Decision: keep the current V1 honest and incremental. Smart Assist previews now expose changed sections so users can apply only the itinerary, recommendations, bookings, checklist, packing, budget, event details, share messages, or planner notes they actually want.
- Post-accept posture: generated trips now show compact next-action cards that jump to itinerary, bookings/event tasks, must-dos/moments, or share instead of leaving first-time users to guess what to review first.
- Destination-pack posture: destination packs now have validation guardrails for IDs, matchers, source URLs, item names/categories, notes, and item URLs. This does not make packs editable in the app; adding packs is still a developer task.
- Event posture: Smart Assist now has event-native actions for run-of-show and supplies/assignments, so cookouts and family gatherings do not have to route every improvement through trip-style booking language.

## 2026-05-14 - Share Summary Assist

- Ask: continue down the travel-agent command-center path and keep building on location-aware capabilities without overstating the result.
- Decision: add a `share-summary` Smart Assist action that rebuilds copyable group-chat summaries from the currently saved plan.
- Trip posture: the generated summary uses the saved home base/location anchor, must-do mini-plans, recommended restaurants/activities, and booking/confirmation items. It includes the honest reminder that V1 is not live routing or availability.
- Event posture: the generated summary uses event date, venue/home base, run-of-show items, tasks, food, and supplies so event sharing does not read like a trip itinerary.
- Limitation: this is deterministic from saved planner data; it does not rerun live research or create new recommendations.

## 2026-05-14 - Stop/Go Audit Prep

- Ask: Toni wanted another blunt audit before deciding whether this is a good stopping point for Logan/friends.
- Fix found during audit: the manage command center Share tab showed generated summaries but did not expose per-message copy buttons, even though the public trip page did. The manage Share tab now has `Copy message` buttons.
- Test posture: browser UAT now verifies generated manage pages can reach the Share tab, see a copy button for summary messages, reach Smart Assist, and find the group-chat summary action.
- Verification: `npm run test`, `npm run validate:data`, `npm run privacy:scan`, `npm run lint`, `npm run build`, `npm run uat`, `npm run ready:production`, `npm run uat:production`, `npm run uat:ai-production`, and `npm audit --omit=dev --audit-level=moderate` passed locally on 2026-05-14.
- Honest limitation: passing tests do not prove the app is effortless for every nontechnical user. The strongest evidence is for the Le Blanc / Logan-style path, not every destination or event subtype.

## 2026-05-14 - Command Center Travel Details Edit

- Ask: Toni tested the live flow and noted that Logan may need to add flight info and arrival times later, and mobile scrolling/spacing still felt wonky.
- Decision: add the first command-center quick edit instead of forcing normal users into Advanced Editor.
- UX change: mobile manage pages now use a `Workspace section` picker instead of horizontal chip scrolling, and primary page containers have slightly more side padding with horizontal overflow hidden.
- Edit change: the Bookings command-center section for trips now has a `Travel details` card where trusted editors can add arrival flight/time, departure flight/time, check-in/departure timing, and travel notes, then save live.
- Test posture: browser UAT now fills the mobile travel-details quick edit and saves it with the temporary UAT PIN.

## 2026-05-14 - Command Center Booking And Must-Do Quick Edits

- Ask: continue reviewing for bugs and improve what comes next without overstating the result.
- Fix found during UAT: visible must-do cards could look actionable while only planner-native mini-plans were editable. Browser UAT caught this when a generated Lovers Beach card did not expose `Quick edit`.
- UX change: generated manage pages now let trusted editors quick-edit trip booking cards and editable must-do mini-plan cards from the command center.
- Data posture: must-do quick edits update planner mini-plan metadata and, when the card comes from an underlying booking or activity, also patch that booking/activity's status, next step, date, or notes where the current data model supports it.
- Honest limit: itinerary-only cards remain display-only in the command center until a dedicated day-item editor is built.
- Test posture: browser UAT now edits travel details, a Golf booking card, and a Lovers Beach must-do card on mobile, then verifies save feedback and cleanup.
