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
  ownershipModel: "paranoid_owned" | "paranoid_managed";
  partnerPayoutType: "fixed_per_unit" | "percentage" | "none";
  partnerPayoutCents: number;
  partnerPayoutRate: number;
  productionCostCents: number;
  vatRate: number;
  priceIncludesVat: boolean;
  officialMerch: boolean;
  contractRequired: boolean;
  category: string;
  stockQuantity: number;
  status: ShopProductStatus;
  weightGrams: number | null;
  images: string[];
  variants: { name: string; value: string; stockQuantity: number }[];
};

export type ShopCartItem = {
  productId: string;
  sellerId: string;
  slug: string;
  name: string;
  sellerName: string;
  imageUrl: string | null;
  category: string;
  quantity: number;
  basePriceCents: number;
  commissionCents: number;
  finalPriceCents: number;
  ownershipModel?: "paranoid_owned" | "paranoid_managed";
  partnerPayoutType?: "fixed_per_unit" | "percentage" | "none";
  partnerPayoutCents?: number;
  partnerPayoutRate?: number;
  productionCostCents?: number;
  vatRate?: number;
  stockQuantity: number;
  variant?: string;
};

export type ShopOrderDraft = {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingAddress: string;
  postalCode: string;
  city: string;
  country: string;
  notes: string;
  items: ShopCartItem[];
};

export type ShopOrderStatus =
  | "pending_payment"
  | "paid"
  | "awaiting_shipment"
  | "shipped"
  | "completed"
  | "cancelled";

export type ShopPaymentStatus = "pending" | "paid" | "paid_mock" | "failed";

export type ShopOrder = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  shippingAddress: string;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  subtotalCents: number;
  shippingCents: number;
  commissionTotalCents: number;
  vatTotalCents: number;
  partnerPayoutTotalCents: number;
  paranoidMarginTotalCents: number;
  totalCents: number;
  paymentStatus: ShopPaymentStatus;
  orderStatus: ShopOrderStatus;
  paymentProvider: string | null;
  paymentReference: string | null;
  createdAt: string;
  items: ShopOrderItem[];
  shipments: ShopShipment[];
  emails: ShopOrderEmail[];
  payouts: ShopPayout[];
};

export type ShopOrderItem = {
  id: string;
  productId: string | null;
  sellerId: string | null;
  sellerName: string | null;
  productName: string;
  quantity: number;
  basePriceCents: number;
  commissionCents: number;
  finalPriceCents: number;
  payoutAmountCents: number;
  partnerPayoutType: "fixed_per_unit" | "percentage" | "none" | null;
  partnerPayoutCents: number;
  partnerPayoutRate: number;
  partnerPayoutAmountCents: number;
  productionCostCents: number;
  vatRate: number;
  vatCents: number;
  paranoidMarginCents: number;
};

export type ShopPayout = {
  id: string;
  orderId: string | null;
  sellerId: string | null;
  sellerName: string | null;
  amountCents: number;
  status: string;
  fiscalDocumentStatus: string;
  fiscalDocumentReference: string | null;
  fiscalDocumentUrl: string | null;
  fiscalDocumentNotes: string | null;
  blockedReason: string | null;
  approvedForPaymentAt: string | null;
  paidAt: string | null;
};

export type ShopShipment = {
  id: string;
  orderId: string;
  sellerId: string | null;
  status: string;
  carrier: string;
  trackingCode: string | null;
  shippingLabelUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
};

export type ShopOrderEmail = {
  id: string;
  orderId: string;
  type: string;
  recipient: string;
  subject: string;
  status: string;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export const DEFAULT_COMMISSION_RATE = 0.1;
export const DEFAULT_MINIMUM_SERVICE_FEE_CENTS = 100;
export const DEFAULT_SHIPPING_CENTS = 399;

export function calculateShopPrice(
  basePriceCents: number,
  commissionRate = DEFAULT_COMMISSION_RATE,
  minimumServiceFeeCents = DEFAULT_MINIMUM_SERVICE_FEE_CENTS
) {
  const commissionCents = Math.max(
    Math.round(basePriceCents * commissionRate),
    minimumServiceFeeCents
  );

  return {
    basePriceCents,
    commissionRate,
    commissionCents,
    finalPriceCents: basePriceCents + commissionCents,
  };
}

export function calculateIncludedVat(finalPriceCents: number, vatRate = 0.23) {
  if (vatRate <= 0) {
    return { priceExVatCents: finalPriceCents, vatCents: 0 };
  }

  const priceExVatCents = Math.round(finalPriceCents / (1 + vatRate));

  return {
    priceExVatCents,
    vatCents: finalPriceCents - priceExVatCents,
  };
}

export function calculatePartnerPayoutAmount({
  finalPriceCents,
  quantity,
  ownershipModel = "paranoid_managed",
  partnerPayoutType = "fixed_per_unit",
  partnerPayoutCents = 0,
  partnerPayoutRate = 0,
  vatRate = 0.23,
}: {
  finalPriceCents: number;
  quantity: number;
  ownershipModel?: "paranoid_owned" | "paranoid_managed";
  partnerPayoutType?: "fixed_per_unit" | "percentage" | "none";
  partnerPayoutCents?: number;
  partnerPayoutRate?: number;
  vatRate?: number;
}) {
  if (ownershipModel === "paranoid_owned" || partnerPayoutType === "none") {
    return 0;
  }

  if (partnerPayoutType === "percentage") {
    const { priceExVatCents } = calculateIncludedVat(finalPriceCents, vatRate);

    return Math.round(priceExVatCents * partnerPayoutRate) * quantity;
  }

  return partnerPayoutCents * quantity;
}

export function calculateInternalShopLine(item: {
  finalPriceCents: number;
  quantity: number;
  ownershipModel?: "paranoid_owned" | "paranoid_managed";
  partnerPayoutType?: "fixed_per_unit" | "percentage" | "none";
  partnerPayoutCents?: number;
  partnerPayoutRate?: number;
  productionCostCents?: number;
  vatRate?: number;
}) {
  const vatRate = item.vatRate ?? 0.23;
  const lineFinalCents = item.finalPriceCents * item.quantity;
  const unitVat = calculateIncludedVat(item.finalPriceCents, vatRate);
  const partnerPayoutAmountCents = calculatePartnerPayoutAmount({
    finalPriceCents: item.finalPriceCents,
    quantity: item.quantity,
    ownershipModel: item.ownershipModel,
    partnerPayoutType: item.partnerPayoutType,
    partnerPayoutCents: item.partnerPayoutCents,
    partnerPayoutRate: item.partnerPayoutRate,
    vatRate,
  });
  const vatCents = unitVat.vatCents * item.quantity;
  const productionTotalCents = (item.productionCostCents ?? 0) * item.quantity;

  return {
    vatCents,
    partnerPayoutAmountCents,
    paranoidMarginCents:
      lineFinalCents -
      vatCents -
      productionTotalCents -
      partnerPayoutAmountCents,
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
  const internalTotals = items.reduce(
    (total, item) => {
      const line = calculateInternalShopLine(item);

      return {
        vatTotalCents: total.vatTotalCents + line.vatCents,
        partnerPayoutTotalCents:
          total.partnerPayoutTotalCents + line.partnerPayoutAmountCents,
        paranoidMarginTotalCents:
          total.paranoidMarginTotalCents + line.paranoidMarginCents,
      };
    },
    {
      vatTotalCents: 0,
      partnerPayoutTotalCents: 0,
      paranoidMarginTotalCents: 0,
    }
  );
  const shippingCents = items.length > 0 ? DEFAULT_SHIPPING_CENTS : 0;

  return {
    subtotalCents,
    commissionTotalCents,
    ...internalTotals,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
}

export function getOrderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_payment: "Pagamento pendente",
    paid: "Pago",
    awaiting_shipment: "A preparar",
    shipped: "Enviado",
    completed: "Concluído",
    cancelled: "Cancelado",
  };

  return labels[status] || status;
}

export function normalizeOrderId(value: string | null | undefined) {
  if (!value) {
    return "PARANOID";
  }

  return value.slice(0, 8).toUpperCase();
}

const productSeeds = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    sellerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
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
    ownershipModel: "paranoid_owned" as const,
    partnerPayoutType: "none" as const,
    partnerPayoutCents: 0,
    partnerPayoutRate: 0,
    productionCostCents: 250,
    images: [
      "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80",
    ],
    variants: [{ name: "Edição", value: "Preto e branco", stockQuantity: 18 }],
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    sellerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
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
    ownershipModel: "paranoid_managed" as const,
    partnerPayoutType: "fixed_per_unit" as const,
    partnerPayoutCents: 2000,
    partnerPayoutRate: 0,
    productionCostCents: 800,
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
    id: "33333333-3333-4333-8333-333333333333",
    sellerId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
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
    ownershipModel: "paranoid_managed" as const,
    partnerPayoutType: "percentage" as const,
    partnerPayoutCents: 0,
    partnerPayoutRate: 0.5,
    productionCostCents: 900,
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
    ownershipModel: seed.ownershipModel,
    partnerPayoutType: seed.partnerPayoutType,
    partnerPayoutCents: seed.partnerPayoutCents,
    partnerPayoutRate: seed.partnerPayoutRate,
    productionCostCents: seed.productionCostCents,
    vatRate: 0.23,
    priceIncludesVat: true,
    officialMerch: true,
    contractRequired: seed.ownershipModel === "paranoid_managed",
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
  ownership_model: "paranoid_owned" | "paranoid_managed" | null;
  partner_payout_type: "fixed_per_unit" | "percentage" | "none" | null;
  partner_payout_cents: number | null;
  partner_payout_rate: number | string | null;
  production_cost_cents: number | null;
  vat_rate: number | string | null;
  price_includes_vat: boolean | null;
  official_merch: boolean | null;
  contract_required: boolean | null;
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
    ownershipModel: row.ownership_model || "paranoid_managed",
    partnerPayoutType: row.partner_payout_type || "fixed_per_unit",
    partnerPayoutCents: row.partner_payout_cents ?? row.base_price_cents,
    partnerPayoutRate: Number(row.partner_payout_rate ?? 0),
    productionCostCents: row.production_cost_cents ?? 0,
    vatRate: Number(row.vat_rate ?? 0.23),
    priceIncludesVat: row.price_includes_vat ?? true,
    officialMerch: row.official_merch ?? true,
    contractRequired: row.contract_required ?? true,
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
        "id,seller_id,name,slug,description,base_price_cents,commission_rate,commission_cents,final_price_cents,ownership_model,partner_payout_type,partner_payout_cents,partner_payout_rate,production_cost_cents,vat_rate,price_includes_vat,official_merch,contract_required,category,stock_quantity,status,weight_grams,shop_sellers(display_name,slug),shop_product_images(image_url,sort_order),shop_product_variants(name,value,stock_quantity)"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(60);

    if (error || !data || data.length === 0) {
      return fallbackShopProducts;
    }

    return (data as unknown as ProductRow[]).map(mapProductRow);
  } catch {
    return fallbackShopProducts;
  }
}

export async function getShopProductBySlug(slug: string) {
  try {
    const { data, error } = await supabase
      .from("shop_products")
      .select(
        "id,seller_id,name,slug,description,base_price_cents,commission_rate,commission_cents,final_price_cents,ownership_model,partner_payout_type,partner_payout_cents,partner_payout_rate,production_cost_cents,vat_rate,price_includes_vat,official_merch,contract_required,category,stock_quantity,status,weight_grams,shop_sellers(display_name,slug),shop_product_images(image_url,sort_order),shop_product_variants(name,value,stock_quantity)"
      )
      .eq("status", "active")
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data) {
      return mapProductRow(data as unknown as ProductRow);
    }
  } catch {
    // Fall back to seeded products when the public shop tables are unavailable.
  }

  return fallbackShopProducts.find((product) => product.slug === slug) || null;
}
