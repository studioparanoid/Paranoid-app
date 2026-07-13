create table if not exists public.event_highlight_credit_packs (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid,
  user_id uuid references auth.users(id),
  payment_id uuid references public.billing_payments(id),
  total_credits integer not null default 3,
  remaining_credits integer not null default 3,
  status text not null default 'active',
  starts_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint event_highlight_credit_packs_status_check
    check (status in ('active', 'expired', 'cancelled'))
);

create unique index if not exists event_highlight_credit_packs_payment_idx
  on public.event_highlight_credit_packs(payment_id)
  where payment_id is not null;
create index if not exists event_highlight_credit_packs_organizer_idx
  on public.event_highlight_credit_packs(organizer_id);
create index if not exists event_highlight_credit_packs_expires_idx
  on public.event_highlight_credit_packs(expires_at);

create table if not exists public.event_highlight_credit_uses (
  id uuid primary key default gen_random_uuid(),
  credit_pack_id uuid references public.event_highlight_credit_packs(id),
  event_id uuid not null,
  organizer_id uuid,
  user_id uuid references auth.users(id),
  used_at timestamptz default now(),
  featured_until timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists event_highlight_credit_uses_event_idx
  on public.event_highlight_credit_uses(event_id);

create table if not exists public.sponsorship_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  sponsor_id uuid,
  product_code text not null,
  payment_id uuid references public.billing_payments(id),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'pending',
  sponsored_post_limit integer not null default 0,
  sponsored_posts_used integer not null default 0,
  founding_partner_number integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint sponsorship_campaigns_status_check
    check (status in ('pending', 'active', 'expired', 'cancelled'))
);

create unique index if not exists sponsorship_campaigns_payment_idx
  on public.sponsorship_campaigns(payment_id)
  where payment_id is not null;
create unique index if not exists sponsorship_campaigns_founder_idx
  on public.sponsorship_campaigns(founding_partner_number)
  where founding_partner_number is not null;
create index if not exists sponsorship_campaigns_status_idx
  on public.sponsorship_campaigns(status);
create index if not exists sponsorship_campaigns_ends_idx
  on public.sponsorship_campaigns(ends_at);

create table if not exists public.sponsorship_placements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.sponsorship_campaigns(id),
  placement text not null,
  status text not null default 'active',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists sponsorship_placements_campaign_idx
  on public.sponsorship_placements(campaign_id);
create index if not exists sponsorship_placements_status_idx
  on public.sponsorship_placements(status);

insert into public.billing_products (code, name, description, type, price_cents, vat_rate, active)
values
  ('event_feature_pack_3', 'Pack 3 Destaques', 'Três créditos de destaque para eventos do organizador.', 'event_feature_pack', 1800, 0.23, true),
  ('paranoid_signal', 'Paranoid Signal', 'Patrocínio básico durante 90 dias.', 'sponsorship', 9900, 0.23, true),
  ('paranoid_noise', 'Paranoid Noise', 'Patrocínio avançado durante 180 dias.', 'sponsorship', 24900, 0.23, true),
  ('paranoid_headliner', 'Paranoid Headliner', 'Patrocínio premium anual.', 'sponsorship', 99900, 0.23, true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  type = excluded.type,
  price_cents = excluded.price_cents,
  vat_rate = excluded.vat_rate,
  active = excluded.active,
  updated_at = now();

update public.billing_products
set active = false, updated_at = now()
where code in ('organizer_pack_wall_rip', 'organizer_pack_paranoid_crew');

alter table public.event_highlight_credit_packs enable row level security;
alter table public.event_highlight_credit_uses enable row level security;
alter table public.sponsorship_campaigns enable row level security;
alter table public.sponsorship_placements enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'event_highlight_credit_packs' and policyname = 'Service role manages event highlight credit packs') then
    create policy "Service role manages event highlight credit packs"
    on public.event_highlight_credit_packs for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'event_highlight_credit_uses' and policyname = 'Service role manages event highlight credit uses') then
    create policy "Service role manages event highlight credit uses"
    on public.event_highlight_credit_uses for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsorship_campaigns' and policyname = 'Active sponsorship campaigns are public') then
    create policy "Active sponsorship campaigns are public"
    on public.sponsorship_campaigns for select
    using (status = 'active' and ends_at > now());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsorship_campaigns' and policyname = 'Service role manages sponsorship campaigns') then
    create policy "Service role manages sponsorship campaigns"
    on public.sponsorship_campaigns for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsorship_placements' and policyname = 'Active sponsorship placements are public') then
    create policy "Active sponsorship placements are public"
    on public.sponsorship_placements for select
    using (status = 'active' and ends_at > now());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsorship_placements' and policyname = 'Service role manages sponsorship placements') then
    create policy "Service role manages sponsorship placements"
    on public.sponsorship_placements for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;
end
$$;
