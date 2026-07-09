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

alter table public.shop_orders add column if not exists postal_code text;
alter table public.shop_orders add column if not exists city text;
alter table public.shop_orders add column if not exists country text not null default 'Portugal';
alter table public.shop_orders add column if not exists notes text;

alter table public.shop_order_emails enable row level security;

drop policy if exists "Anyone can create shop orders" on public.shop_orders;
drop policy if exists "Anyone can create shop order items" on public.shop_order_items;
drop policy if exists "Anyone can create shop shipments" on public.shop_shipments;
drop policy if exists "Order buyers can read their order by email" on public.shop_orders;
drop policy if exists "Order items are readable with orders" on public.shop_order_items;
drop policy if exists "Shipments are readable with orders" on public.shop_shipments;
drop policy if exists "Email logs can be inserted by checkout" on public.shop_order_emails;
drop policy if exists "Email logs readable for admin tooling" on public.shop_order_emails;
drop policy if exists "Shop orders can be updated by admin tooling" on public.shop_orders;
drop policy if exists "Shipments can be updated by seller tooling" on public.shop_shipments;
drop policy if exists "Shop payouts can be managed by admin tooling" on public.shop_payouts;

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

create policy "Shop payouts can be managed by admin tooling"
on public.shop_payouts for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

