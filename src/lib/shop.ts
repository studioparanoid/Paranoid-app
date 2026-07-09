import { supabase } from "@/lib/supabase/public";

export type ShopProductStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "sold_out";

export type ShopProduct = {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerSlug: string;
  name: string;
  slug: string;
  description: string;
  basePriceCents: number;
  commissionRate: number;
  commissionCents: number;
  finalPriceCents: number;
  category: string;
  stockQuantity: number;
  status: ShopProductStatus;
  weightGrams: number | null;
  images: string[];
  variants: { name: string; value: string; stockQuantity: number }[];
};

export type ShopCartItem = {
  productId: string;
  slug: string;
  name: string;
  sellerName: string;
  imageUrl: string | null;
  category: string;
  quantity: number;
  basePriceCents: number;
  commissionCents: number;
  finalPriceCents: number;
  variant?: string;
};

export type ShopOrderDraft = {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingAddress: string;
  items: ShopCartItem[];
};

export const DEFAULT_COMMISSION_RATE = 0.05;
export const DEFAULT_SHIPPING_CENTS = 399;

export function calculateShopPrice(
  basePriceCents: number,
  commissionRate = DEFAULT_COMMISSION_RATE
) {
  const commissionCents = Math.round(basePriceCents * commissionRate);

  return {
    basePriceCents,
    commissionRate,
    commissionCents,
    finalPriceCents: basePriceCents + commissionCents,
  };
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function getCartTotals(items: ShopCartItem[]) {
  const subtotalCents = items.reduce(
    (total, item) => total + item.finalPriceCents * item.quantity,
    0
  );
  const commissionTotalCents = items.reduce(
    (total, item) => total + item.commissionCents * item.quantity,
    0
  );
  const shippingCents = items.length > 0 ? DEFAULT_SHIPPING_CENTS : 0;

  return {
    subtotalCents,
    commissionTotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
}

const productSeeds = [
  {
    id: "sample-zine",
    sellerId: "paranoid-crew",
    sellerName: "Paranoid Crew",
    sellerSlug: "paranoid-crew",
    name: "Zine Noite Interior",
    slug: "zine-noite-interior",
    description:
      "Edição curta com fotografia, texto e cartazes da cena alternativa centro.",
    basePriceCents: 900,
    category: "Zines",
    stockQuantity: 18,
    weightGrams: 120,
    images: [
      "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80",
    ],
    variants: [{ name: "Edição", value: "Preto e branco", stockQuantity: 18 }],
  },
  {
    id: "sample-shirt",
    sellerId: "noise-club",
    sellerName: "Noise Club",
    sellerSlug: "noise-club",
    name: "T-shirt Paranoid Signal",
    slug: "tshirt-paranoid-signal",
    description:
      "Algodão pesado, impressão frontal pequena e costas com arte vermelha.",
    basePriceCents: 2000,
    category: "T-shirts",
    stockQuantity: 9,
    weightGrams: 240,
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    ],
    variants: [
      { name: "Tamanho", value: "S", stockQuantity: 2 },
      { name: "Tamanho", value: "M", stockQuantity: 4 },
      { name: "Tamanho", value: "L", stockQuantity: 3 },
    ],
  },
  {
    id: "sample-vinyl",
    sellerId: "subsolo",
    sellerName: "Subsolo",
    sellerSlug: "subsolo",
    name: "Vinil Subsolo Live",
    slug: "vinil-subsolo-live",
    description:
      "Registo ao vivo em edição limitada. Inclui insert numerado à mão.",
    basePriceCents: 2600,
    category: "Vinis",
    stockQuantity: 6,
    weightGrams: 320,
    images: [
      "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=1200&q=80",
    ],
    variants: [{ name: "Cor", value: "Preto", stockQuantity: 6 }],
  },
];

export const fallbackShopProducts: ShopProduct[] = productSeeds.map((seed) => {
  const price = calculateShopPrice(seed.basePriceCents);

  return {
    ...seed,
    ...price,
    status: "active",
  };
});

type ProductRow = {
  id: string;
  seller_id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price_cents: number;
  commission_rate: number | null;
  commission_cents: number | null;
  final_price_cents: number | null;
  category: string | null;
  stock_quantity: number | null;
  status: ShopProductStatus | null;
  weight_grams: number | null;
  shop_sellers?:
    | {
        display_name: string | null;
        slug: string | null;
      }
    | {
        display_name: string | null;
        slug: string | null;
      }[]
    | null;
  shop_product_images?: { image_url: string; sort_order: number | null }[];
  shop_product_variants?: {
    name: string;
    value: string;
    stock_quantity: number | null;
  }[];
};

function mapProductRow(row: ProductRow): ShopProduct {
  const price = calculateShopPrice(
    row.base_price_cents,
    row.commission_rate ?? DEFAULT_COMMISSION_RATE
  );
  const seller = Array.isArray(row.shop_sellers)
    ? row.shop_sellers[0]
    : row.shop_sellers;

  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerName: seller?.display_name || "Artista Paranoid",
    sellerSlug: seller?.slug || "artista",
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    basePriceCents: row.base_price_cents,
    commissionRate: row.commission_rate ?? price.commissionRate,
    commissionCents: row.commission_cents ?? price.commissionCents,
    finalPriceCents: row.final_price_cents ?? price.finalPriceCents,
    category: row.category || "Merch",
    stockQuantity: row.stock_quantity ?? 0,
    status: row.status || "pending",
    weightGrams: row.weight_grams,
    images:
      row.shop_product_images
        ?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((image) => image.image_url) || [],
    variants:
      row.shop_product_variants?.map((variant) => ({
        name: variant.name,
        value: variant.value,
        stockQuantity: variant.stock_quantity ?? 0,
      })) || [],
  };
}

export async function getActiveShopProducts() {
  try {
    const { data, error } = await supabase
      .from("shop_products")
      .select(
        "id,seller_id,name,slug,description,base_price_cents,commission_rate,commission_cents,final_price_cents,category,stock_quantity,status,weight_grams,shop_sellers(display_name,slug),shop_product_images(image_url,sort_order),shop_product_variants(name,value,stock_quantity)"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return fallbackShopProducts;
    }

    return (data as unknown as ProductRow[]).map(mapProductRow);
  } catch {
    return fallbackShopProducts;
  }
}

export async function getShopProductBySlug(slug: string) {
  const products = await getActiveShopProducts();

  return products.find((product) => product.slug === slug) || null;
}
