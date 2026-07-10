create table if not exists public.billing_products (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  type text not null,
  price_cents integer not null default 0,
  vat_rate numeric default 0.23,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  product_code text,
  related_type text,
  related_id uuid,
  amount_cents integer not null,
  vat_cents integer default 0,
  total_cents integer not null,
  provider text default 'mock',
  provider_reference text,
  status text default 'pending',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  paid_at timestamptz
);

create table if not exists public.billing_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  related_type text not null,
  related_id uuid,
  entitlement_type text not null,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  status text default 'active',
  payment_id uuid references public.billing_payments(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  organizer_id uuid,
  plan_code text not null,
  status text default 'pending',
  current_period_start timestamptz,
  current_period_end timestamptz,
  payment_provider text default 'mock',
  provider_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.events add column if not exists is_featured boolean default false;
alter table public.events add column if not exists featured_until timestamptz;
alter table public.events add column if not exists featured_payment_id uuid;

create index if not exists billing_products_code_idx on public.billing_products(code);
create index if not exists billing_payments_user_id_idx on public.billing_payments(user_id);
create index if not exists billing_payments_status_idx on public.billing_payments(status);
create index if not exists billing_payments_related_idx on public.billing_payments(related_type, related_id);
create index if not exists billing_entitlements_related_idx on public.billing_entitlements(related_type, related_id);
create index if not exists billing_subscriptions_user_id_idx on public.billing_subscriptions(user_id);
create index if not exists events_featured_idx on public.events(is_featured, featured_until);

insert into public.billing_products (code, name, description, type, price_cents, vat_rate, active)
values
  ('event_feature_basic', 'Destaque de Evento', 'Destaque simples de evento na Paranoid.', 'event_feature', 700, 0.23, true),
  ('organizer_pack_wall_rip', 'Wall Rip', 'Pack mensal básico para organizadores.', 'subscription', 700, 0.23, true),
  ('organizer_pack_paranoid_crew', 'Paranoid Crew', 'Pack mensal avançado para organizadores.', 'subscription', 2000, 0.23, true),
  ('shop_order', 'Encomenda da loja', 'Pagamento dinâmico de encomenda da loja.', 'shop_order', 0, 0.23, true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  type = excluded.type,
  price_cents = excluded.price_cents,
  vat_rate = excluded.vat_rate,
  active = excluded.active,
  updated_at = now();

alter table public.billing_products enable row level security;
alter table public.billing_payments enable row level security;
alter table public.billing_entitlements enable row level security;
alter table public.billing_subscriptions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_products' and policyname = 'Active billing products are public') then
    create policy "Active billing products are public"
    on public.billing_products for select
    using (active = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_payments' and policyname = 'Users read own billing payments') then
    create policy "Users read own billing payments"
    on public.billing_payments for select
    using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_entitlements' and policyname = 'Users read own billing entitlements') then
    create policy "Users read own billing entitlements"
    on public.billing_entitlements for select
    using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_subscriptions' and policyname = 'Users read own billing subscriptions') then
    create policy "Users read own billing subscriptions"
    on public.billing_subscriptions for select
    using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_products' and policyname = 'Service role manages billing products') then
    create policy "Service role manages billing products"
    on public.billing_products for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_payments' and policyname = 'Service role manages billing payments') then
    create policy "Service role manages billing payments"
    on public.billing_payments for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_entitlements' and policyname = 'Service role manages billing entitlements') then
    create policy "Service role manages billing entitlements"
    on public.billing_entitlements for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'billing_subscriptions' and policyname = 'Service role manages billing subscriptions') then
    create policy "Service role manages billing subscriptions"
    on public.billing_subscriptions for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;
end
$$;
