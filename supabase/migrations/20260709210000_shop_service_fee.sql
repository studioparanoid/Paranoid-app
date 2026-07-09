alter table public.shop_settings
add column if not exists minimum_service_fee_cents integer default 100;

update public.shop_settings
set
  commission_rate = 0.10,
  minimum_service_fee_cents = 100,
  updated_at = now();

update public.shop_products
set
  commission_rate = 0.10,
  commission_cents = greatest(round(base_price_cents * 0.10)::integer, 100),
  final_price_cents = base_price_cents + greatest(round(base_price_cents * 0.10)::integer, 100),
  updated_at = now();

update public.shop_product_variants
set
  final_price_cents = case
    when base_price_cents is null then final_price_cents
    else base_price_cents + greatest(round(base_price_cents * 0.10)::integer, 100)
  end;
