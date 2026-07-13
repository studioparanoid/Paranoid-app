create table if not exists public.organizer_visibility_passes (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null,
  user_id uuid references auth.users(id),
  product_code text not null default 'organizer_paranoid_frequency',
  payment_id uuid references public.billing_payments(id),
  starts_at timestamptz,
  ends_at timestamptz,
  status text default 'pending',
  auto_feature_events boolean default true,
  homepage_eligible boolean default true,
  agenda_priority integer default 1,
  map_priority integer default 1,
  editorial_inclusion boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint organizer_visibility_passes_status_check
    check (status in ('pending', 'active', 'expired', 'cancelled')),
  constraint organizer_visibility_passes_dates_check
    check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create index if not exists organizer_visibility_passes_organizer_id_idx
  on public.organizer_visibility_passes(organizer_id);
create index if not exists organizer_visibility_passes_payment_id_idx
  on public.organizer_visibility_passes(payment_id);
create index if not exists organizer_visibility_passes_status_idx
  on public.organizer_visibility_passes(status);
create index if not exists organizer_visibility_passes_ends_at_idx
  on public.organizer_visibility_passes(ends_at);

create unique index if not exists organizer_visibility_passes_payment_unique_idx
  on public.organizer_visibility_passes(payment_id)
  where payment_id is not null;

create unique index if not exists organizer_visibility_passes_one_active_idx
  on public.organizer_visibility_passes(organizer_id)
  where status = 'active';

insert into public.billing_products (code, name, description, type, price_cents, vat_rate, active)
values (
  'organizer_paranoid_frequency',
  'Paranoid Frequency',
  'Divulgação editorial dos teus eventos durante o período ativo, de acordo com o calendário e critérios da Paranoid.',
  'organizer_visibility_pass',
  4900,
  0.23,
  true
)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  type = excluded.type,
  price_cents = excluded.price_cents,
  vat_rate = excluded.vat_rate,
  active = excluded.active,
  updated_at = now();

alter table public.organizer_visibility_passes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'organizer_visibility_passes'
      and policyname = 'Organizer members read own visibility passes'
  ) then
    create policy "Organizer members read own visibility passes"
    on public.organizer_visibility_passes for select
    using (
      exists (
        select 1
        from public.organizer_members om
        where om.organizer_id = organizer_visibility_passes.organizer_id
          and om.user_id = auth.uid()
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'organizer_visibility_passes'
      and policyname = 'Service role manages visibility passes'
  ) then
    create policy "Service role manages visibility passes"
    on public.organizer_visibility_passes for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;
end
$$;
