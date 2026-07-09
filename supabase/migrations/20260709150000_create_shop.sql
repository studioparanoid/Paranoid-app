create table if not exists public.shop_sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  slug text not null unique,
  bio text,
  payout_name text,
  payout_iban text,
  payout_email text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.shop_sellers(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  base_price_cents integer not null check (base_price_cents >= 0),
  commission_rate numeric(5,4) not null default 0.05,
  commission_cents integer not null default 0,
  final_price_cents integer not null default 0,
  category text,
  stock_quantity integer not null default 0,
  status text not null default 'pending',
  weight_grams integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0
);

create table if not exists public.shop_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products(id) on delete cascade,
  name text not null,
  value text not null,
  stock_quantity integer not null default 0,
  base_price_cents integer,
  final_price_cents integer
);

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_email text not null,
  buyer_name text not null,
  buyer_phone text,
  shipping_address text not null,
  postal_code text,
  city text,
  country text not null default 'Portugal',
  notes text,
  subtotal_cents integer not null default 0,
  shipping_cents integer not null default 0,
  commission_total_cents integer not null default 0,
  total_cents integer not null default 0,
  payment_status text not null default 'pending',
  order_status text not null default 'pending_payment',
  payment_provider text,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shop_orders add column if not exists postal_code text;
alter table public.shop_orders add column if not exists city text;
alter table public.shop_orders add column if not exists country text not null default 'Portugal';
alter table public.shop_orders add column if not exists notes text;

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id uuid references public.shop_products(id) on delete set null,
  seller_id uuid references public.shop_sellers(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  base_price_cents integer not null default 0,
  commission_cents integer not null default 0,
  final_price_cents integer not null default 0,
  payout_amount_cents integer not null default 0
);

create table if not exists public.shop_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  seller_id uuid references public.shop_sellers(id) on delete set null,
  status text not null default 'awaiting_shipping',
  carrier text not null default 'ctt',
  tracking_code text,
  shipping_label_url text,
  shipped_at timestamptz,
  delivered_at timestamptz
);

create table if not exists public.shop_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.shop_sellers(id) on delete cascade,
  order_id uuid references public.shop_orders(id) on delete set null,
  amount_cents integer not null default 0,
  status text not null default 'pending',
  paid_at timestamptz,
  notes text
);

create table if not exists public.shop_settings (
  id uuid primary key default gen_random_uuid(),
  commission_rate numeric(5,4) not null default 0.05,
  default_shipping_cents integer not null default 399,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_order_emails (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  type text not null,
  recipient text not null,
  subject text not null,
  status text not null default 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

insert into public.shop_settings (commission_rate, default_shipping_cents)
select 0.05, 399
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

create policy "Active products are public"
on public.shop_products for select
using (status = 'active');

create policy "Product images are public for active products"
on public.shop_product_images for select
using (
  exists (
    select 1 from public.shop_products
    where shop_products.id = shop_product_images.product_id
    and shop_products.status = 'active'
  )
);

create policy "Product variants are public for active products"
on public.shop_product_variants for select
using (
  exists (
    select 1 from public.shop_products
    where shop_products.id = shop_product_variants.product_id
    and shop_products.status = 'active'
  )
);

create policy "Sellers can read own seller profile"
on public.shop_sellers for select
using (auth.uid() = user_id);

create policy "Sellers can update own seller profile"
on public.shop_sellers for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Sellers can read own products"
on public.shop_products for select
using (
  exists (
    select 1 from public.shop_sellers
    where shop_sellers.id = shop_products.seller_id
    and shop_sellers.user_id = auth.uid()
  )
);

create policy "Sellers can create own products"
on public.shop_products for insert
with check (
  exists (
    select 1 from public.shop_sellers
    where shop_sellers.id = shop_products.seller_id
    and shop_sellers.user_id = auth.uid()
  )
);

create policy "Sellers can update own draft products"
on public.shop_products for update
using (
  status in ('draft', 'pending', 'rejected')
  and exists (
    select 1 from public.shop_sellers
    where shop_sellers.id = shop_products.seller_id
    and shop_sellers.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shop_sellers
    where shop_sellers.id = shop_products.seller_id
    and shop_sellers.user_id = auth.uid()
  )
);

create policy "Anyone can create shop orders"
on public.shop_orders for insert
with check (auth.role() = 'service_role');

create policy "Anyone can create shop order items"
on public.shop_order_items for insert
with check (auth.role() = 'service_role');

create policy "Anyone can create shop shipments"
on public.shop_shipments for insert
with check (auth.role() = 'service_role');

create policy "Order buyers can read their order by email"
on public.shop_orders for select
using (auth.role() = 'service_role');

create policy "Order items are readable with orders"
on public.shop_order_items for select
using (auth.role() = 'service_role');

create policy "Shipments are readable with orders"
on public.shop_shipments for select
using (auth.role() = 'service_role');

create policy "Email logs can be inserted by checkout"
on public.shop_order_emails for insert
with check (auth.role() = 'service_role');

create policy "Email logs readable for admin tooling"
on public.shop_order_emails for select
using (auth.role() = 'service_role');

create policy "Shop orders can be updated by admin tooling"
on public.shop_orders for update
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Shipments can be updated by seller tooling"
on public.shop_shipments for update
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
