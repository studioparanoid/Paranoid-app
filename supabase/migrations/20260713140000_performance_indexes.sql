create index if not exists events_status_start_at_idx
  on public.events(status, start_at);

create index if not exists events_status_featured_until_idx
  on public.events(status, featured_until)
  where featured_until is not null;

create index if not exists events_organizer_status_start_at_idx
  on public.events(organizer_id, status, start_at);

create index if not exists events_venue_id_idx
  on public.events(venue_id);

create index if not exists events_location_filters_idx
  on public.events(status, district, municipality, city);

create index if not exists shop_products_status_created_at_idx
  on public.shop_products(status, created_at desc);

create index if not exists shop_products_seller_status_idx
  on public.shop_products(seller_id, status);

create index if not exists shop_products_category_status_idx
  on public.shop_products(category, status);

create index if not exists shop_orders_payment_status_created_at_idx
  on public.shop_orders(payment_status, created_at desc);

create index if not exists shop_orders_order_status_created_at_idx
  on public.shop_orders(order_status, created_at desc);

create index if not exists shop_orders_buyer_email_idx
  on public.shop_orders(buyer_email);

create index if not exists shop_order_items_seller_id_idx
  on public.shop_order_items(seller_id);

create index if not exists billing_payments_product_status_created_at_idx
  on public.billing_payments(product_code, status, created_at desc);

create index if not exists billing_payments_provider_reference_idx
  on public.billing_payments(provider_reference);

create index if not exists billing_entitlements_status_ends_at_idx
  on public.billing_entitlements(status, ends_at);

create index if not exists billing_entitlements_user_status_idx
  on public.billing_entitlements(user_id, status);

create index if not exists event_highlight_credit_packs_status_expires_idx
  on public.event_highlight_credit_packs(status, expires_at);

create index if not exists event_highlight_credit_packs_organizer_status_expires_idx
  on public.event_highlight_credit_packs(organizer_id, status, expires_at);

create index if not exists organizer_visibility_passes_active_idx
  on public.organizer_visibility_passes(status, ends_at, organizer_id);

create index if not exists sponsorship_campaigns_status_ends_at_idx
  on public.sponsorship_campaigns(status, ends_at);

create index if not exists sponsorship_campaigns_payment_id_idx
  on public.sponsorship_campaigns(payment_id);

create index if not exists sponsorship_placements_status_ends_at_idx
  on public.sponsorship_placements(status, ends_at);

create index if not exists sponsorship_placements_campaign_placement_idx
  on public.sponsorship_placements(campaign_id, placement);
