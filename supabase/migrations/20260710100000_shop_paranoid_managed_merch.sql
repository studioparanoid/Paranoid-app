alter table public.shop_sellers add column if not exists legal_name text;
alter table public.shop_sellers add column if not exists tax_number text;
alter table public.shop_sellers add column if not exists fiscal_email text;
alter table public.shop_sellers add column if not exists iban text;
alter table public.shop_sellers add column if not exists seller_type text default 'artist';
alter table public.shop_sellers add column if not exists legal_entity_type text default 'individual';
alter table public.shop_sellers add column if not exists can_issue_invoice boolean default false;
alter table public.shop_sellers add column if not exists fiscal_status text default 'pending';
alter table public.shop_sellers add column if not exists contract_status text default 'pending';
alter table public.shop_sellers add column if not exists contract_signed_at timestamptz;
alter table public.shop_sellers add column if not exists contract_notes text;
alter table public.shop_sellers add column if not exists payout_terms text;
alter table public.shop_sellers add column if not exists created_at timestamptz default now();
alter table public.shop_sellers add column if not exists updated_at timestamptz default now();

alter table public.shop_products add column if not exists ownership_model text default 'paranoid_managed';
alter table public.shop_products add column if not exists partner_payout_type text default 'fixed_per_unit';
alter table public.shop_products add column if not exists partner_payout_cents integer default 0;
alter table public.shop_products add column if not exists partner_payout_rate numeric default 0;
alter table public.shop_products add column if not exists production_cost_cents integer default 0;
alter table public.shop_products add column if not exists vat_rate numeric default 0.23;
alter table public.shop_products add column if not exists price_includes_vat boolean default true;
alter table public.shop_products add column if not exists official_merch boolean default true;
alter table public.shop_products add column if not exists contract_required boolean default true;

alter table public.shop_order_items add column if not exists partner_payout_type text;
alter table public.shop_order_items add column if not exists partner_payout_cents integer default 0;
alter table public.shop_order_items add column if not exists partner_payout_rate numeric default 0;
alter table public.shop_order_items add column if not exists partner_payout_amount_cents integer default 0;
alter table public.shop_order_items add column if not exists production_cost_cents integer default 0;
alter table public.shop_order_items add column if not exists vat_rate numeric default 0.23;
alter table public.shop_order_items add column if not exists vat_cents integer default 0;
alter table public.shop_order_items add column if not exists paranoid_margin_cents integer default 0;

alter table public.shop_orders add column if not exists vat_total_cents integer default 0;
alter table public.shop_orders add column if not exists partner_payout_total_cents integer default 0;
alter table public.shop_orders add column if not exists paranoid_margin_total_cents integer default 0;

alter table public.shop_payouts add column if not exists fiscal_document_status text default 'pending';
alter table public.shop_payouts add column if not exists fiscal_document_reference text;
alter table public.shop_payouts add column if not exists fiscal_document_url text;
alter table public.shop_payouts add column if not exists fiscal_document_notes text;
alter table public.shop_payouts add column if not exists approved_for_payment_at timestamptz;
alter table public.shop_payouts add column if not exists approved_for_payment_by uuid;
alter table public.shop_payouts add column if not exists blocked_reason text;

alter table public.shop_settings add column if not exists minimum_service_fee_cents integer default 100;

update public.shop_settings
set
  commission_rate = 0.10,
  minimum_service_fee_cents = 100,
  updated_at = now();

update public.shop_sellers
set seller_type = 'paranoid'
where slug = 'paranoid-crew'
and (seller_type is null or seller_type <> 'paranoid');

update public.shop_products
set
  ownership_model = case
    when seller_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then 'paranoid_owned'
    else coalesce(ownership_model, 'paranoid_managed')
  end,
  partner_payout_type = case
    when seller_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then 'none'
    else coalesce(partner_payout_type, 'fixed_per_unit')
  end,
  partner_payout_cents = case
    when seller_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then 0
    when partner_payout_cents is null or partner_payout_cents = 0 then base_price_cents
    else partner_payout_cents
  end,
  vat_rate = coalesce(vat_rate, 0.23),
  price_includes_vat = coalesce(price_includes_vat, true),
  official_merch = coalesce(official_merch, true),
  contract_required = case
    when seller_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then false
    else coalesce(contract_required, true)
  end,
  updated_at = now();

create index if not exists shop_products_ownership_model_idx on public.shop_products(ownership_model);
create index if not exists shop_payouts_fiscal_document_status_idx on public.shop_payouts(fiscal_document_status);
