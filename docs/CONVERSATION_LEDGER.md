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
