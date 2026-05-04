# Supabase Setup

Family Trips works without Supabase, but checklist and packing changes are only shared across devices when Supabase is configured.
Owner editing also uses Supabase. Public pages read the latest published trip override with the anon key, while writes go through the Vercel API using the service role key and `ADMIN_PIN`.

## Environment Variables

Set these in Vercel and in local `.env.local` when testing sync:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-or-publishable-key>
ADMIN_PIN=<private-owner-pin>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

`ADMIN_PIN` and `SUPABASE_SERVICE_ROLE_KEY` are server-only. Do not prefix either one with `VITE_`.

## Schema

Run this SQL in the Supabase SQL editor. The policies are intentionally open for a casual family app where anyone with the link is trusted.

```sql
create extension if not exists pgcrypto;

create table if not exists public.checklist_state (
  trip_slug text not null,
  item_id text not null,
  done boolean not null default false,
  user_id uuid null,
  actor_id text null,
  updated_at timestamptz not null default now(),
  primary key (trip_slug, item_id)
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_slug text not null,
  title text not null,
  category text not null default 'Other',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_actor_id text null
);

create index if not exists checklist_state_trip_slug_idx
  on public.checklist_state (trip_slug);

create index if not exists checklist_items_trip_slug_idx
  on public.checklist_items (trip_slug, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists checklist_state_set_updated_at on public.checklist_state;
create trigger checklist_state_set_updated_at
before update on public.checklist_state
for each row execute function public.set_updated_at();

drop trigger if exists checklist_items_set_updated_at on public.checklist_items;
create trigger checklist_items_set_updated_at
before update on public.checklist_items
for each row execute function public.set_updated_at();

alter table public.checklist_state enable row level security;
alter table public.checklist_items enable row level security;

grant usage on schema public to anon;
grant select, insert, update on public.checklist_state to anon;
grant select, insert, update, delete on public.checklist_items to anon;

drop policy if exists "anon can read checklist state" on public.checklist_state;
create policy "anon can read checklist state"
on public.checklist_state for select
to anon
using (true);

drop policy if exists "anon can upsert checklist state" on public.checklist_state;
create policy "anon can upsert checklist state"
on public.checklist_state for insert
to anon
with check (true);

drop policy if exists "anon can update checklist state" on public.checklist_state;
create policy "anon can update checklist state"
on public.checklist_state for update
to anon
using (true)
with check (true);

drop policy if exists "anon can read checklist items" on public.checklist_items;
create policy "anon can read checklist items"
on public.checklist_items for select
to anon
using (true);

drop policy if exists "anon can create checklist items" on public.checklist_items;
create policy "anon can create checklist items"
on public.checklist_items for insert
to anon
with check (true);

drop policy if exists "anon can update checklist items" on public.checklist_items;
create policy "anon can update checklist items"
on public.checklist_items for update
to anon
using (true)
with check (true);

drop policy if exists "anon can delete checklist items" on public.checklist_items;
create policy "anon can delete checklist items"
on public.checklist_items for delete
to anon
using (true);

create table if not exists public.trip_overrides (
  trip_slug text primary key,
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by text null
);

create table if not exists public.trip_override_history (
  id uuid primary key default gen_random_uuid(),
  trip_slug text not null,
  data jsonb not null,
  version integer not null check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by text null,
  restored_from_version integer null
);

create index if not exists trip_override_history_trip_version_idx
  on public.trip_override_history (trip_slug, version desc);

create index if not exists trip_override_history_trip_updated_idx
  on public.trip_override_history (trip_slug, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trip_overrides_set_updated_at on public.trip_overrides;
create trigger trip_overrides_set_updated_at
before update on public.trip_overrides
for each row execute function public.set_updated_at();

alter table public.trip_overrides enable row level security;
alter table public.trip_override_history enable row level security;

grant select on public.trip_overrides to anon;

drop policy if exists "anon can read trip overrides" on public.trip_overrides;
create policy "anon can read trip overrides"
on public.trip_overrides for select
to anon
using (true);
```

## State Conventions

- Code-defined checklist items use their checklist item ID directly in `checklist_state.item_id`.
- Packing items reuse `checklist_state` with namespaced IDs: `packing:<packingItemId>`.
- Event supplies reuse `checklist_state` with namespaced IDs: `supplies:<supplyItemId>`.
- Event tasks use their task ID directly in `checklist_state.item_id`, the same as checklist items.
- User-added checklist items live in `checklist_items`; their done state also lives in `checklist_state` by item ID.
- When Supabase is not configured, checklist and packing changes use `sessionStorage` for the current browser session. Those local changes are not uploaded later if Supabase env vars are added.
- Static trip files remain the seed source. `trip_overrides.data` stores the current editable fields for a trip without changing the immutable slug.
- `trip_override_history` is append-only history used by `/:tripSlug/manage` for restore. It is read through the owner API, not the public anon client.
- The owner API needs `ADMIN_PIN`, `SUPABASE_SERVICE_ROLE_KEY`, and either `SUPABASE_URL` or `VITE_SUPABASE_URL` in the Vercel environment.

This is not authentication. If a trip needs real privacy, do not put sensitive trip details in the static trip data or open Supabase tables.
