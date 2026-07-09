create table if not exists public.shop_sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  display_name text not null,
  slug text unique not null,
  bio text,
  payout_name text,
  payout_iban text,
  payout_email text,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.shop_sellers(id),
  name text not null,
  slug text unique not null,
  description text,
  base_price_cents integer not null,
  commission_rate numeric default 0.10,
  commission_cents integer not null default 0,
  final_price_cents integer not null,
  category text,
  stock_quantity integer default 0,
  status text default 'pending',
  weight_grams integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.shop_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.shop_products(id) on delete cascade,
  image_url text not null,
  sort_order integer default 0
);

create table if not exists public.shop_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.shop_products(id) on delete cascade,
  name text not null,
  value text not null,
  stock_quantity integer default 0,
  base_price_cents integer,
  final_price_cents integer
);

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_email text not null,
  buyer_name text not null,
  buyer_phone text,
  shipping_address jsonb,
  subtotal_cents integer not null default 0,
  shipping_cents integer not null default 0,
  commission_total_cents integer not null default 0,
  total_cents integer not null default 0,
  payment_status text default 'pending',
  order_status text default 'pending_payment',
  payment_provider text default 'payme',
  payment_reference text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.shop_orders(id) on delete cascade,
  product_id uuid references public.shop_products(id),
  seller_id uuid references public.shop_sellers(id),
  product_name text not null,
  quantity integer not null default 1,
  base_price_cents integer not null,
  commission_cents integer not null default 0,
  final_price_cents integer not null,
  payout_amount_cents integer not null
);

create table if not exists public.shop_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.shop_orders(id) on delete cascade,
  seller_id uuid references public.shop_sellers(id),
  status text default 'awaiting_shipment',
  carrier text default 'CTT',
  tracking_code text,
  shipping_label_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.shop_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.shop_sellers(id),
  order_id uuid references public.shop_orders(id),
  amount_cents integer not null,
  status text default 'pending',
  paid_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.shop_settings (
  id uuid primary key default gen_random_uuid(),
  commission_rate numeric default 0.10,
  minimum_service_fee_cents integer default 100,
  default_shipping_cents integer default 399,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.shop_order_emails (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.shop_orders(id) on delete cascade,
  type text not null,
  recipient text not null,
  subject text,
  status text default 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz default now()
);

alter table public.shop_sellers add column if not exists user_id uuid references auth.users(id);
alter table public.shop_settings add column if not exists minimum_service_fee_cents integer default 100;
alter table public.shop_orders add column if not exists shipping_address jsonb;
alter table public.shop_shipments add column if not exists created_at timestamptz default now();
alter table public.shop_shipments add column if not exists updated_at timestamptz default now();
alter table public.shop_payouts add column if not exists created_at timestamptz default now();
alter table public.shop_payouts add column if not exists updated_at timestamptz default now();

create index if not exists shop_sellers_user_id_idx on public.shop_sellers(user_id);
create index if not exists shop_sellers_status_idx on public.shop_sellers(status);
create index if not exists shop_products_seller_id_idx on public.shop_products(seller_id);
create index if not exists shop_products_status_idx on public.shop_products(status);
create index if not exists shop_product_images_product_id_idx on public.shop_product_images(product_id);
create index if not exists shop_product_variants_product_id_idx on public.shop_product_variants(product_id);
create index if not exists shop_orders_payment_status_idx on public.shop_orders(payment_status);
create index if not exists shop_orders_order_status_idx on public.shop_orders(order_status);
create index if not exists shop_order_items_order_id_idx on public.shop_order_items(order_id);
create index if not exists shop_order_items_product_id_idx on public.shop_order_items(product_id);
create index if not exists shop_order_items_seller_id_idx on public.shop_order_items(seller_id);
create index if not exists shop_shipments_order_id_idx on public.shop_shipments(order_id);
create index if not exists shop_shipments_seller_id_idx on public.shop_shipments(seller_id);
create index if not exists shop_shipments_status_idx on public.shop_shipments(status);
create index if not exists shop_payouts_seller_id_idx on public.shop_payouts(seller_id);
create index if not exists shop_payouts_order_id_idx on public.shop_payouts(order_id);
create index if not exists shop_payouts_status_idx on public.shop_payouts(status);
create index if not exists shop_order_emails_order_id_idx on public.shop_order_emails(order_id);
create index if not exists shop_order_emails_status_idx on public.shop_order_emails(status);
create index if not exists shop_order_emails_type_idx on public.shop_order_emails(type);

insert into public.shop_settings (commission_rate, minimum_service_fee_cents, default_shipping_cents)
select 0.10, 100, 399
where not exists (select 1 from public.shop_settings);

alter table public.shop_sellers enable row level security;
alter table public.shop_products enable row level security;
alter table public.shop_product_images enable row level security;
alter table public.shop_product_variants enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
alter table public.shop_shipments enable row level security;
alter table public.shop_payouts enable row level security;
alter table public.shop_settings enable row level security;
alter table public.shop_order_emails enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_products' and policyname = 'Active products are public') then
    create policy "Active products are public"
    on public.shop_products for select
    using (status = 'active');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_product_images' and policyname = 'Images for active products are public') then
    create policy "Images for active products are public"
    on public.shop_product_images for select
    using (
      exists (
        select 1
        from public.shop_products
        where shop_products.id = shop_product_images.product_id
        and shop_products.status = 'active'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_product_variants' and policyname = 'Variants for active products are public') then
    create policy "Variants for active products are public"
    on public.shop_product_variants for select
    using (
      exists (
        select 1
        from public.shop_products
        where shop_products.id = shop_product_variants.product_id
        and shop_products.status = 'active'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_sellers' and policyname = 'Sellers read own seller profile') then
    create policy "Sellers read own seller profile"
    on public.shop_sellers for select
    using (auth.uid() = user_id or auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_sellers' and policyname = 'Sellers update own seller profile') then
    create policy "Sellers update own seller profile"
    on public.shop_sellers for update
    using (auth.uid() = user_id or auth.role() = 'service_role')
    with check (auth.uid() = user_id or auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_products' and policyname = 'Sellers manage own products') then
    create policy "Sellers manage own products"
    on public.shop_products for all
    using (
      auth.role() = 'service_role'
      or exists (
        select 1
        from public.shop_sellers
        where shop_sellers.id = shop_products.seller_id
        and shop_sellers.user_id = auth.uid()
      )
    )
    with check (
      auth.role() = 'service_role'
      or exists (
        select 1
        from public.shop_sellers
        where shop_sellers.id = shop_products.seller_id
        and shop_sellers.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_orders' and policyname = 'Checkout service creates and manages orders') then
    create policy "Checkout service creates and manages orders"
    on public.shop_orders for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_order_items' and policyname = 'Checkout service manages order items') then
    create policy "Checkout service manages order items"
    on public.shop_order_items for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_shipments' and policyname = 'Checkout service manages shipments') then
    create policy "Checkout service manages shipments"
    on public.shop_shipments for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_payouts' and policyname = 'Checkout service manages payouts') then
    create policy "Checkout service manages payouts"
    on public.shop_payouts for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_settings' and policyname = 'Checkout service reads settings') then
    create policy "Checkout service reads settings"
    on public.shop_settings for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_order_emails' and policyname = 'Checkout service manages email logs') then
    create policy "Checkout service manages email logs"
    on public.shop_order_emails for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_orders' and policyname = 'Sellers read own orders') then
    create policy "Sellers read own orders"
    on public.shop_orders for select
    using (
      exists (
        select 1
        from public.shop_order_items
        join public.shop_sellers on shop_sellers.id = shop_order_items.seller_id
        where shop_order_items.order_id = shop_orders.id
        and shop_sellers.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_order_items' and policyname = 'Sellers read own order items') then
    create policy "Sellers read own order items"
    on public.shop_order_items for select
    using (
      exists (
        select 1
        from public.shop_sellers
        where shop_sellers.id = shop_order_items.seller_id
        and shop_sellers.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_shipments' and policyname = 'Sellers read own shipments') then
    create policy "Sellers read own shipments"
    on public.shop_shipments for select
    using (
      exists (
        select 1
        from public.shop_sellers
        where shop_sellers.id = shop_shipments.seller_id
        and shop_sellers.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_shipments' and policyname = 'Sellers update own shipments') then
    create policy "Sellers update own shipments"
    on public.shop_shipments for update
    using (
      exists (
        select 1
        from public.shop_sellers
        where shop_sellers.id = shop_shipments.seller_id
        and shop_sellers.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.shop_sellers
        where shop_sellers.id = shop_shipments.seller_id
        and shop_sellers.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_payouts' and policyname = 'Sellers read own payouts') then
    create policy "Sellers read own payouts"
    on public.shop_payouts for select
    using (
      exists (
        select 1
        from public.shop_sellers
        where shop_sellers.id = shop_payouts.seller_id
        and shop_sellers.user_id = auth.uid()
      )
    );
  end if;

  if to_regclass('public.app_admins') is not null then
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_sellers' and policyname = 'Admins manage sellers') then
      create policy "Admins manage sellers"
      on public.shop_sellers for all
      using (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()))
      with check (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()));
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_products' and policyname = 'Admins manage products') then
      create policy "Admins manage products"
      on public.shop_products for all
      using (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()))
      with check (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()));
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_orders' and policyname = 'Admins manage orders') then
      create policy "Admins manage orders"
      on public.shop_orders for all
      using (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()))
      with check (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()));
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_order_items' and policyname = 'Admins manage order items') then
      create policy "Admins manage order items"
      on public.shop_order_items for all
      using (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()))
      with check (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()));
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_shipments' and policyname = 'Admins manage shipments') then
      create policy "Admins manage shipments"
      on public.shop_shipments for all
      using (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()))
      with check (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()));
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_payouts' and policyname = 'Admins manage payouts') then
      create policy "Admins manage payouts"
      on public.shop_payouts for all
      using (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()))
      with check (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()));
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_settings' and policyname = 'Admins manage settings') then
      create policy "Admins manage settings"
      on public.shop_settings for all
      using (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()))
      with check (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()));
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_order_emails' and policyname = 'Admins read email logs') then
      create policy "Admins read email logs"
      on public.shop_order_emails for select
      using (exists (select 1 from public.app_admins where app_admins.user_id = auth.uid()));
    end if;
  end if;
end
$$;
