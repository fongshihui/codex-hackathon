create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  context jsonb not null default '{}'::jsonb,
  ai_output jsonb not null default '{}'::jsonb,
  prep_memory jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "Users can read their own app state." on public.app_state;
create policy "Users can read their own app state."
on public.app_state
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own app state." on public.app_state;
create policy "Users can insert their own app state."
on public.app_state
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own app state." on public.app_state;
create policy "Users can update their own app state."
on public.app_state
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
