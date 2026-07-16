-- Reversible behavioral signals for the shared Discovery Engine.

create table if not exists public.discovery_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null,
  item_id text not null,
  action text not null,
  intent text,
  created_at timestamptz not null default now(),
  constraint discovery_interactions_item_type_check check (item_type in ('event', 'venue', 'promotion', 'product', 'community')),
  constraint discovery_interactions_action_check check (action in ('open', 'dismiss'))
);

create index if not exists discovery_interactions_user_created_idx
  on public.discovery_interactions(user_id, created_at desc);
create index if not exists discovery_interactions_user_item_idx
  on public.discovery_interactions(user_id, item_type, item_id);

alter table public.discovery_interactions enable row level security;

create policy "Users read own discovery interactions" on public.discovery_interactions
for select to authenticated using (user_id = auth.uid());

create policy "Users create own discovery interactions" on public.discovery_interactions
for insert to authenticated with check (user_id = auth.uid());

create policy "Users delete own discovery interactions" on public.discovery_interactions
for delete to authenticated using (user_id = auth.uid());
