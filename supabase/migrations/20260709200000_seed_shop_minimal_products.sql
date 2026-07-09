insert into public.shop_sellers (
  id,
  display_name,
  slug,
  bio,
  payout_email,
  status
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Paranoid Crew',
    'paranoid-crew',
    'Merch editorial da Paranoid.',
    'info@paranoid.pt',
    'active'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Noise Club',
    'noise-club',
    'Merch de teste para a loja Paranoid.',
    'info@paranoid.pt',
    'active'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'Subsolo',
    'subsolo',
    'Edições físicas e música independente.',
    'info@paranoid.pt',
    'active'
  )
on conflict (id) do nothing;

insert into public.shop_products (
  id,
  seller_id,
  name,
  slug,
  description,
  base_price_cents,
  commission_rate,
  commission_cents,
  final_price_cents,
  category,
  stock_quantity,
  status,
  weight_grams
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Zine Noite Interior',
    'zine-noite-interior',
    'Edição curta com fotografia, texto e cartazes da cena alternativa centro.',
    900,
    0.10,
    100,
    1000,
    'Zines',
    18,
    'active',
    120
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'T-shirt Paranoid Signal',
    'tshirt-paranoid-signal',
    'Algodão pesado, impressão frontal pequena e costas com arte vermelha.',
    2000,
    0.10,
    200,
    2200,
    'T-shirts',
    9,
    'active',
    240
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'Vinil Subsolo Live',
    'vinil-subsolo-live',
    'Registo ao vivo em edição limitada. Inclui insert numerado à mão.',
    2600,
    0.10,
    260,
    2860,
    'Vinis',
    6,
    'active',
    320
  )
on conflict (id) do nothing;

insert into public.shop_product_images (
  product_id,
  image_url,
  sort_order
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80',
    0
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
    0
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=1200&q=80',
    0
  )
on conflict do nothing;

insert into public.shop_product_variants (
  product_id,
  name,
  value,
  stock_quantity,
  base_price_cents,
  final_price_cents
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Edição',
    'Preto e branco',
    18,
    900,
    1000
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Tamanho',
    'S',
    2,
    2000,
    2200
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Tamanho',
    'M',
    4,
    2000,
    2200
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Tamanho',
    'L',
    3,
    2000,
    2200
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Cor',
    'Preto',
    6,
    2600,
    2860
  )
on conflict do nothing;
