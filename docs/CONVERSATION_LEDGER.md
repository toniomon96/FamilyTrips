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
