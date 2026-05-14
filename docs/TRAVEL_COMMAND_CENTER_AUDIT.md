# Travel Command Center Audit And Rebuild Spec

## Why This Exists

The current self-serve trip flow is useful infrastructure, but it is not yet the product promise Toni wants.

It can create a valid dynamic trip. It can generate a rough Le Blanc draft. It can hand off to the manage page. That is a start, but it does not yet feel like the way Toni planned the stronger trips with Codex: rich context, follow-up questions, location awareness, clear priorities, and a plan that already understands the stay, the dates, the people, and the tradeoffs.

This spec is the product correction: FamilyTrips should become an all-in-one command center for travel and family events, with itinerary and shared planning as the core. It should feel closer to a trusted travel agent plus family planner than a database form.

## Current Audit

### What Works

- Dynamic trips can be created without code changes.
- The edit PIN model fits the trusted family/friends posture.
- New trips are unlisted by default.
- The manage page can edit generated trips and preserve history.
- The UAT suite now checks more of the lifecycle than the original smart-trip smoke.
- The Le Blanc pilot proves the app can carry curated destination knowledge.

### What Is Not Good Enough

- The form asks for too little context to make a great plan.
- The mobile flow is too long and reads like one big form instead of a guided planner.
- The generator does not ask follow-up questions when the brief is weak.
- The generator does not perform live research or cite sources.
- The generator does not understand actual stay location, travel distances, or timing constraints.
- Must-dos are treated like plain text items instead of priority anchors that need timing, booking, logistics, and reminders.
- Generated plans do not clearly separate confirmed items, suggestions, and things that need booking.
- Weak drafts are not honest enough about being weak.
- Existing trips do not have a Smart Assist path to fill gaps or improve stale sections.
- Events are not first-class, even though the same command-center idea should support birthdays, gatherings, game nights, sports events, weddings, showers, and bachelor parties.
- Public examples should be neutral. Logan and Morgan are a pilot use case, not the default face of the product.

## Product Bar

A trusted person should be able to make a trip or event in 5 to 7 minutes.

The app should:

- Capture the messy context people already have.
- Ask a few smart follow-up questions when the input is thin.
- Research the destination, stay, venue, or event context when needed.
- Build a useful first draft with morning, afternoon, and evening cards.
- Turn must-dos into mini-plans, not lonely checklist items.
- Show what is confirmed, suggested, and needs booking.
- Explain why major suggestions are in the plan without cluttering the main view.
- Keep the output editable and preview changes before applying them.
- Save AI-assisted changes to the existing version history.

The core feeling should be: "I told it what we know, it asked what mattered, and now we have a real plan we can tweak."

## Recommended Product Shape

### Main Surface

FamilyTrips should be one command center with two primary plan types:

- Trip
- Event

The language, sections, and defaults should change by plan type. A beach trip should not feel like a birthday party form. A youth sports weekend should not feel like a resort honeymoon.

### Create Flow

Use a mobile-first wizard with compact cards, not one long form.

Recommended steps:

1. Start
   - Edit PIN
   - Trip or event type
   - Destination, stay, venue, or location
   - Dates
   - One large "Tell us everything" box

2. Details
   - Travelers or guests
   - Lodging or venue address
   - Arrival/departure timing
   - Food preferences
   - Kids/ages
   - Mobility needs
   - Budget posture
   - Confirmed bookings
   - Must-dos

3. Smart Questions
   - The app asks 3 to 6 questions only when answers would materially improve the plan.
   - If the user skips, the app can continue with a clear weak-draft warning.

4. Review Draft
   - Show a generated plan before dropping into manage.
   - Let the user accept, regenerate, or edit the brief.
   - Show source and confidence notes separately from the main plan.

5. Manage
   - Full command center for itinerary, restaurants, activities, checklist, packing, budget, bookings, contacts, notes, and sharing.

### First Mobile Screen

The first screen should ask only for the highest-signal information:

- PIN
- Plan type
- Destination/stay/venue
- Dates
- "Tell us everything you already know"

Everything else should be progressive. The user should feel momentum immediately.

### Voice Capture

Voice capture is worth doing, but it should start simple.

Recommended v1:

- Browser speech-to-text dictation into the "Tell us everything" field.
- Keep text editable after capture.
- Fallback gracefully when speech APIs are unavailable.

Later:

- Audio upload and server-side transcription.
- Screenshot/image parsing.
- Email, invite, and link import.

## Context Capture Model

The planner needs a richer brief than the current implementation.

Recommended `PlanBrief` fields:

- `planType`: trip, event, sportsWeekend, wedding, bachelorParty, shower, birthday, gathering, gameNight, proSportsEvent, amusementDay
- `name`
- `destination`
- `locationText`
- `stayName`
- `stayAddress`
- `venueName`
- `venueAddress`
- `startDate`
- `endDate`
- `arrivalWindow`
- `departureWindow`
- `travelers`
- `guestCount`
- `kidsAndAges`
- `mobilityNotes`
- `foodPreferences`
- `budgetStyle`
- `confirmedItems`
- `mustDos`
- `niceToHaves`
- `planningStyle`
- `pace`
- `vibe`
- `rawContext`
- `links`
- `sourceText`
- `createdBy`

Must-dos should become structured anchors:

- Title
- Type
- Required or optional
- Preferred timing
- Estimated duration
- Booking status
- Location/address if known
- People involved
- Constraints
- Why it matters

## Search And Source Intelligence

The current generator should not be treated as the final intelligence layer.

Recommended hybrid model:

- Curated packs for destinations, resorts, venues, and event patterns we know well.
- Live search for unknown destinations, venues, restaurants, weather-sensitive activities, and current availability-sensitive details.
- Official sources first for resorts, venues, restaurants, ticketed attractions, hours, policies, and maps.
- AI as planner/composer, not the source of truth.
- Every generated recommendation should carry source posture:
  - Official source
  - User-provided
  - Search result
  - Inferred suggestion
  - Needs confirmation

The app should avoid inventing:

- Exact availability
- Exact prices unless sourced
- Confirmation numbers
- Private phone numbers
- Guaranteed hours
- Transportation times without a map source

## Location And Timing Awareness

Planning quality depends on location.

The system should:

- Anchor the plan around the stay, venue, or main gathering location.
- Prefer suggestions near that anchor unless the user asks otherwise.
- Avoid stacking far-apart activities in the same block.
- Add travel buffers.
- Respect arrival and departure days.
- Spread high-energy must-dos across full days.
- Keep the plan loose when the user chooses a loose pace.

Recommendation:

- Use deterministic distance buckets first when exact map APIs are unavailable.
- Add a real maps/places provider when the product is ready for more dependable distance, neighborhood, and hours logic.

## Output Model

Generated trips should use simple, digestible cards:

- Morning
- Afternoon
- Evening
- Notes

Each major item should have:

- Title
- Status: confirmed, suggested, needs booking, needs confirmation
- Why it is here
- Booking next step
- Source posture
- Editable notes

Must-do mini-plans should include:

- Best day/time recommendation
- What to book
- What to bring
- Travel/location note
- Backup option
- Checklist items
- Budget placeholder

## Event Mode

Events should not be trips wearing a different label.

Supported event types:

- Birthday
- Party or gathering
- Game night
- Family gathering
- Youth sports game or tournament
- Pro sports or amusement outing
- Wedding
- Bachelor party
- Shower

Event drafts should generate:

- Run-of-show
- Guest list or people groups
- Food and drinks
- Supplies
- Shopping list
- Setup plan
- Cleanup plan
- Budget
- Assignments
- Venue notes
- Weather/backup plan when relevant
- Reminders

Event language should say "guests", "host", "venue", "setup", and "run-of-show" instead of "travelers", "stay", and "itinerary" where appropriate.

## Retroactive Smart Assist

Existing trips and events should get the same intelligence through the manage page.

Recommended actions:

- Fill missing sections
- Improve itinerary
- Turn loose notes into checklist items
- Build packing list from destination/date/activities
- Add dining/activity suggestions
- Rewrite a day to be looser or tighter
- Generate event run-of-show
- Create booking reminders from must-dos

Rules:

- Trusted PIN users only.
- Preview changes before applying.
- Save applied changes to trip history.
- Allow section-level regeneration.
- Never overwrite confirmed details without explicit approval.

Static trips can keep their code-backed seed data. Smart Assist can save improvements as overrides, so older trips do not need to be migrated immediately.

## Weak Draft Behavior

Weak input should not silently produce confident garbage.

If the app lacks destination, dates, stay/venue, must-dos, or people context, it should say:

"This draft is a starter. Add lodging, arrival details, must-dos, or food/activity preferences to make it much stronger."

Then it should offer:

- Answer 3 quick questions
- Build starter draft anyway
- Start blank

## Privacy And Trust

- Keep the trusted edit PIN model for now.
- Warn users not to paste confirmation numbers, passports, payment cards, or sensitive personal details.
- Make it clear that AI/search providers may process planning details.
- Do not print or expose permanent PINs in tests or docs.
- Treat unlisted as share-link privacy, not true security.

## Implementation Plan

### P0 - Neutral Public Hotfix

Status: shipped.

- Remove Logan and Morgan as public default examples.
- Use neutral placeholders on `/trips/new`.
- Keep UAT able to exercise the Logan and Morgan pilot through test-only data.
- Deploy after normal validation.

### P1 - Mobile Wizard And Rich Brief

Status: shipped in the quality vertical.

- Replace the long create form with wizard cards.
- Add the large "Tell us everything" field as the primary input.
- Add progressive detail sections.
- Add weak-draft warnings.
- Normalize the richer `PlanBrief`.
- Keep "Start blank" available.

### P2 - Follow-Up Questions And Review Screen

Status: shipped in the quality vertical.

- Add a server-side brief quality scorer.
- Generate 3 to 6 follow-up questions when context is thin.
- Add a review screen before manage.
- Support accept, regenerate, and edit brief.

### P3 - Source-Aware Research

Status: shipped with optional server-side OpenAI web search plus deterministic fallback.

- Add live search from server-side generation only.
- Store source posture in generated notes/copy blocks.
- Prefer official sources and user-provided context.
- Add citation and "needs confirmation" UI on the review/manage surfaces.

### P4 - Better Planning Engine

Status: shipped as the first planning-engine pass. Real maps/distance APIs remain deferred.

- Convert must-dos into structured anchors and mini-plans.
- Add location/distance awareness.
- Add schedule balancing by pace, arrival/departure, and activity intensity.
- Generate better checklist, packing, budget, and booking placeholders from the actual plan.

### P5 - Smart Assist For Existing Plans

Status: shipped as basic preview/apply Smart Assist.

- Add manage-page Smart Assist actions.
- Generate preview diffs before applying.
- Save applied changes to history.
- Support fill-missing and rewrite/improve modes.

### P6 - First-Class Events

Status: shipped as first-pass event intake and event-native draft generation.

- Add event plan types and event-specific fields.
- Generate run-of-show, supplies, food/drink, setup, cleanup, assignments, guest notes, and budgets.
- Add event examples and UAT scenarios.

### P7 - Import And Voice

Status: partially shipped with browser dictation. Rich import, screenshots, and audio upload remain later work.

- Add browser dictation to the raw context field.
- Add paste/import from text messages, emails, invites, and links.
- Later add screenshot/image parsing and audio upload transcription.

## Acceptance Criteria

- A neutral user can create a trip without seeing Logan/Morgan defaults.
- A mobile user can complete the core intake in 5 to 7 minutes.
- A weak brief produces an honest weak-draft warning and follow-up questions.
- A rich Le Blanc brief produces a plan that is materially better than the current draft.
- Must-dos become itinerary anchors, booking tasks, checklist items, and budget placeholders.
- Generated items clearly show confirmed, suggested, needs booking, or needs confirmation.
- Source-backed suggestions show where they came from.
- Existing trips can use Smart Assist without migrating static seed data.
- Events generate event-native planning sections, not trip-flavored filler.
- UAT covers trip creation, event creation, weak brief, rich brief, mobile layout, source notes, Smart Assist preview, and cleanup.
