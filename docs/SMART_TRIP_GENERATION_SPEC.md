# Smart Trip Generation Spec

> Product note: this spec captured the Le Blanc pilot and the first smart-trip generation layer. The broader command-center rebuild bar now lives in `docs/TRAVEL_COMMAND_CENTER_AUDIT.md`. Public create-flow examples should stay neutral; Logan and Morgan are a test/pilot scenario, not the default public sample.

## Product Intent

FamilyTrips should feel like a trusted person helping the group chat, not a blank database form.

The self-serve trip creator should ask for the few details a traveler already knows, generate a useful first draft, and then hand the traveler to the manage page only for tweaks. A busy friend should be able to go from "we are going to Le Blanc Los Cabos July 19-23 for our honeymoon" to a shareable trip with restaurants, activities, checklist, packing, and a loose itinerary without manually building every section.

## Current Implementation

- `/trips/new` now defaults to **Build my trip**, with **Start blank** preserved as the secondary path.
- `POST /api/trips` supports `action: "generate"` for smart drafts and keeps `action: "create"` for blank shells.
- Smart generation uses a hybrid path: curated destination packs first, optional server-side OpenAI structured output, and deterministic fallback when AI is unavailable or invalid.
- The first curated destination pack is Le Blanc Spa Resort Los Cabos, sourced from official Le Blanc pages for resort dining and experiences.
- Generated trips are dynamic Supabase-backed trips, default to `visibility: "unlisted"`, and redirect to `/<slug>/manage?created=1&draft=generated`.
- The manage page shows a generated-draft handoff panel with next review actions and a copy-link button.

## Experience Goal

The app should do three jobs:

1. Ask simple questions in plain language.
2. Create a trip plan that is already useful.
3. Make the next edit obvious.

The editor remains important, but it should be the second step. The first step is "draft my trip."

## Primary User Story

Logan opens the add-trip page with the shared edit PIN. He enters:

- Trip name: Logan + Morgan Honeymoon
- Destination or stay: Le Blanc Spa Resort Los Cabos
- Dates: July 19-23
- Travelers: Logan, Morgan
- Trip vibe: honeymoon, relaxed, romantic, resort-heavy
- Must-do items: golf, horseback riding on the beach, Lovers Beach
- Optional notes: keep it loose, not over-scheduled

The app creates an unlisted trip and pre-fills:

- A daily loose itinerary
- Resort dining suggestions
- Resort activities and downtime
- Outside activities with booking reminders
- Checklist items
- Packing items
- Contacts and placeholders
- Budget placeholders
- A short "share with Morgan" copy block

Then Logan lands on `/<slug>/manage` with a clear generated draft he can accept, edit, or regenerate section by section.

## UX Principles

- One obvious path: "Create a planned trip" should be the default, with "Start blank" as a secondary option.
- Plain English first: use a short trip brief field plus a few structured helpers, not a long intimidating form.
- Mobile-first: the flow must be comfortable on a phone while someone is texting.
- Suggest, then let them edit: generated content should be editable immediately and never feel locked.
- No hidden AI ceremony: do not make the user think about prompts, models, schemas, or database records.
- Be honest about confidence: when a recommendation is generic or needs verification, mark it as "Confirm before booking."
- Keep privacy casual but clear: unlisted is a share-link behavior, not true security.

## Proposed Flow

### Step 1: Trip Basics

Fields:

- Trip edit PIN
- Trip name
- Destination, resort, city, or stay name
- Start date
- End date
- Travelers

Smart behavior:

- Auto-generate the share URL from the trip name.
- Infer likely template from text, but keep template editable.
- If destination includes a known stay or resort, treat the stay as the anchor.

### Step 2: Trip Style

Use fast controls, not a wall of text:

- Vibe chips: relaxed, romantic, adventure, food-focused, family, party, budget-conscious, luxury, resort-heavy, kid-friendly
- Pace control: very loose, balanced, packed
- Planning help: "Mostly plan for me", "Give me options", "Start simple"

Optional text:

- "Anything important?" placeholder: "Golf one day, horses on the beach, Lovers Beach, nice dinners, no early mornings."

### Step 3: Must-Dos

Let users add priority items as simple rows:

- Title
- Type: dining, activity, travel, reservation, reminder, other
- Timing preference: any day, first day, middle, last full day, specific date
- Required or nice-to-have

Smart behavior:

- Convert must-dos into itinerary anchors and checklist reminders.
- Spread higher-energy activities across the trip.
- Avoid stacking every special thing on the same day.

### Step 4: Generate Draft

Primary button: "Build my trip"

The result should show a generation progress state with human labels:

- Reading trip details
- Building a loose schedule
- Adding restaurants and activities
- Creating checklist and packing

On success, redirect to `/<slug>/manage?created=1&draft=generated`.

On failure, keep the entered form values and offer:

- Try again
- Create a simple starter trip

## Generated Trip Shape

The generator should produce a full valid `Trip` object using the existing data model.

### Basics

- `name`, `slug`, `location`, `startDate`, `endDate`
- `visibility: "unlisted"`
- `currency`
- `tagline`
- `kind` omitted for normal trips

### Stay

- Use the destination/stay as the stay name when likely.
- Use destination as address placeholder when no exact address is known.
- Add check-in/check-out placeholders.
- Add notes that separate confirmed facts from planning suggestions.

### Bookings

Suggested booking rows:

- Stay/resort
- Each required outside activity
- Special dinners or priority reservations
- Airport transportation when relevant

Every unconfirmed booking should say "Confirm details before relying on this."

### Itinerary

Rules:

- First day: arrival, settle in, easy dinner.
- Last day: breakfast, pack, checkout, travel buffer.
- Middle days: alternate active blocks and rest.
- Keep a honeymoon/resort trip loose: morning, afternoon, dinner is enough unless the user asks for more.
- Required must-dos should become named itinerary items.
- Do not invent confirmation numbers, exact booking times, or private details.

### Things To Do

Include:

- Must-dos
- Resort activities
- Dining options
- Rainy-day or low-energy alternatives
- Nearby outside options only when user asked for them or when clearly relevant

Fields:

- `name`
- `category`
- `notes`
- `url` when known and allowed
- `address` when known and confidence is high

### People

- Create traveler rows from names.
- Default role: Traveler
- Do not require phone numbers.

### Contacts

Useful placeholders:

- Resort main line
- Concierge
- Transportation
- Emergency

Only include real contact values when sourced or entered.

### Checklist

Must include:

- Confirm stay details
- Confirm flight/transportation
- Book required activities
- Reserve priority dinners
- Confirm dress codes
- Share trip link
- Confirm passports/IDs if international

Trip-specific checklist items should be generated from must-dos.

### Packing

Generate from destination, activities, and vibe:

- Travel documents
- Chargers
- Dinner outfits
- Swimwear
- Sun protection
- Activity-specific gear
- Medications/toiletries

### Budget

Keep casual:

- Stay
- Airport transportation
- Outside activities
- Golf
- Tips
- Souvenirs/miscellaneous

Use estimates only when the user provides amounts. Otherwise use `0` and `status: "tbd"` or `estimate`.

### Copy Blocks

Add at least one copyable summary:

- "Trip link message"
- Optional "Reservation call list"
- Optional "Loose plan for the week"

## Smart Draft Review Screen

After generation, the manage page should show a lightweight "Draft created" panel.

Actions:

- Review itinerary
- Review restaurants and activities
- Add missing booking details
- Copy trip link
- Regenerate sections

Section status:

- Ready
- Needs confirmation
- Empty

This makes it clear what the app did and what still needs human confirmation.

## Regeneration Model

Generation should not be all-or-nothing after the first draft.

Support section-level regeneration:

- Regenerate itinerary
- Regenerate dining ideas
- Regenerate things to do
- Regenerate checklist
- Regenerate packing

Each regeneration should show a preview diff:

- Added
- Changed
- Removed

The user confirms before replacing existing content.

## Data And Architecture

### New Server Action

Add `POST /api/trips` action:

- `action: "generate"`
- `pin`
- `brief`
- `tripBasics`
- `preferences`
- `mustDos`

Response:

- `ok: true`
- `trip`
- `row`
- `generationSummary`
- `needsConfirmation`

Keep existing `action: "create"` for blank/simple shells.

### Generation Pipeline

Recommended pipeline:

1. Normalize input into a `TripGenerationBrief`.
2. Build deterministic anchors from dates, travelers, must-dos, and template.
3. Generate section drafts.
4. Normalize and sanitize generated output into the `Trip` schema.
5. Validate with `validateTripForSave`.
6. Store as a dynamic `trip_overrides` row with `source = "dynamic"` and `visibility = "unlisted"`.
7. Store generation metadata in a non-public field or companion table only if needed.

### Types

Add:

- `TripGenerationBrief`
- `TripPreference`
- `TripMustDo`
- `GeneratedTripDraft`
- `GenerationConfidence`
- `GeneratedSectionSummary`

Generated confidence can be simple:

- `confirmed`: user supplied it
- `suggested`: generated from user context
- `needs_confirmation`: useful, but should be checked

### Database

No schema change is required for v1 if generated content is stored inside the existing trip `data`.

Optional future table:

```sql
create table public.trip_generation_runs (
  id uuid primary key default gen_random_uuid(),
  trip_slug text not null,
  input jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text null
);
```

Only add this table if we need generation history, debugging, or restore-by-generation.

## AI And Source Strategy

The app can ship this in two levels.

### Level 1: Template-Based Smart Draft

No external AI required.

Use:

- Destination text
- Dates
- trip template
- vibe chips
- must-dos
- deterministic itinerary rules

Pros:

- Fast
- Cheap
- Easy to test
- No hallucinated restaurant details

Cons:

- Recommendations are useful but generic unless destination packs exist.

### Level 2: AI-Assisted Draft

Use an AI call to transform the brief into structured trip sections.

Rules:

- AI output must be JSON only.
- Validate every trip before save.
- Strip unsupported fields.
- Never include made-up confirmation numbers, private phone numbers, or exact pricing.
- Mark uncertain recommendations as needs confirmation.
- Fail closed into Level 1 template generation.

### Level 3: Destination Packs

For places Toni/family use repeatedly, add curated packs:

- Resorts
- Restaurants
- Activity vendors
- Booking links
- notes
- categories

This is the best long-term quality path because it mixes automation with trustworthy local knowledge.

## Logan And Morgan Example Draft Behavior

Input:

- Resort: Le Blanc Spa Resort Los Cabos
- Dates: July 19-23
- Travelers: Logan, Morgan
- Vibe: honeymoon, relaxed, romantic, resort-heavy
- Must-dos: golf, horseback riding on the beach, Lovers Beach

Expected draft:

- Arrival evening is light.
- Golf gets its own morning or early afternoon block.
- Horseback riding is not stacked on the same day as golf.
- Lovers Beach is on the final full day or a flexible outing day.
- Dinner suggestions include resort-dining slots, but specific restaurant names should be sourced or marked for confirmation.
- Checklist includes booking golf tee time, booking horseback ride, confirming boat/water taxi for Lovers Beach, dinner reservations, airport transport, travel documents, sunscreen, dinner clothes, and swimwear.

## UX Copy Direction

Use friendly action copy:

- "Build my trip"
- "Start with a smart draft"
- "Add anything they absolutely want to do"
- "Keep it loose"
- "Needs confirmation"
- "Looks good, create trip"

Avoid technical copy:

- "Generate JSON"
- "Hydrate trip data"
- "Persist override"
- "Call model"

## Acceptance Criteria

- A user can create a generated trip from `/trips/new` without opening the manage editor first.
- The generated trip is valid according to existing trip validation.
- New generated trips remain unlisted by default.
- Wrong PIN rejects generation.
- Duplicate slug rejects generation.
- Invalid dates reject generation.
- If generation fails, the user can still create a simple starter trip.
- The generated itinerary has one day per date.
- Required must-dos appear in itinerary, things to do, and checklist.
- Packing reflects trip type and activities.
- Manage page clearly shows what needs confirmation.
- Static seed trips still require `ADMIN_PIN` for edits.
- Dynamic generated trips can be edited with `TRIP_EDITOR_PIN` or `ADMIN_PIN`.

## Build Plan

### Phase 1: Seamless Non-AI Draft

- Redesign `/trips/new` into a quick guided flow.
- Add vibe chips, pace, must-dos, and a brief field.
- Add deterministic smart draft builder.
- Keep "Start blank" as a secondary path.
- Redirect to manage with generated draft state.
- Add tests for generation mapping and validation.

### Phase 2: Review And Regenerate

- Add generated-draft review panel on manage page.
- Add section status badges.
- Add section-level regenerate actions using deterministic generation.
- Add preview-before-apply for section replacements.

### Phase 3: AI-Assisted Planning

- Add server-only AI generation behind env configuration.
- Add strict JSON schema and validation.
- Add fallback to deterministic builder.
- Add tests for malformed output and fallback behavior.

### Phase 4: Curated Destination Packs

- Add destination pack format.
- Add resort/destination matching.
- Allow curated packs to override generic suggestions.
- Add Le Blanc Los Cabos as the first high-quality pack after sourcing current restaurant/activity details.

## Open Questions

- Should generated trips use AI immediately, or should v1 ship template-based generation first and layer AI after?
- Should the app ask one natural-language question first, or keep structured fields first with natural-language notes below?
- Should created trips show a "needs confirmation" dashboard before the full manage page?
- Should destination packs live in code first, Supabase later, or both?
