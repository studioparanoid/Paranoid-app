import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_SHIPPING_CENTS,
  getCartTotals,
  type ShopCartItem,
  type ShopOrder,
  type ShopOrderDraft,
} from "@/lib/shop";
import {
  buildCompletedEmails,
  buildOrderCreatedEmails,
  buildPaymentConfirmedEmails,
  buildSellerPaidOrderEmails,
  buildShippedEmails,
  type ShopEmailResult,
} from "@/lib/shop/email";

const supabase = getSupabaseAdminClient();

type ProductValidationRow = {
  id: string;
  seller_id: string;
  name: string;
  base_price_cents: number;
  commission_cents: number;
  final_price_cents: number;
  stock_quantity: number | null;
  status: string | null;
  shop_sellers?: { display_name: string | null } | { display_name: string | null }[] | null;
};

type OrderRow = {
  id: string;
  buyer_email: string;
  buyer_name: string;
  buyer_phone: string | null;
  shipping_address:
    | {
        address?: string | null;
        postalCode?: string | null;
        city?: string | null;
        country?: string | null;
        notes?: string | null;
      }
    | string
    | null;
  subtotal_cents: number;
  shipping_cents: number;
  commission_total_cents: number;
  total_cents: number;
  payment_status: "pending" | "paid" | "paid_mock" | "failed";
  order_status:
    | "pending_payment"
    | "paid"
    | "awaiting_shipment"
    | "shipped"
    | "completed"
    | "cancelled";
  payment_provider: string | null;
  payment_reference: string | null;
  created_at: string;
  shop_order_items?: {
    id: string;
    product_id: string | null;
    seller_id: string | null;
    product_name: string;
    quantity: number;
    base_price_cents: number;
    commission_cents: number;
    final_price_cents: number;
    payout_amount_cents: number;
    shop_sellers?: { display_name: string | null } | { display_name: string | null }[] | null;
  }[];
  shop_shipments?: {
    id: string;
    order_id: string;
    seller_id: string | null;
    status: string;
    carrier: string;
    tracking_code: string | null;
    shipping_label_url: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
  }[];
  shop_order_emails?: {
    id: string;
    order_id: string;
    type: string;
    recipient: string;
    subject: string;
    status: string;
    sent_at: string | null;
    error_message: string | null;
    created_at: string;
  }[];
};

function normalizeShippingAddress(value: OrderRow["shipping_address"]) {
  if (!value) {
    return {
      address: "",
      postalCode: null,
      city: null,
      country: null,
      notes: null,
    };
  }

  if (typeof value === "string") {
    return {
      address: value,
      postalCode: null,
      city: null,
      country: null,
      notes: null,
    };
  }

  return {
    address: value.address || "",
    postalCode: value.postalCode || null,
    city: value.city || null,
    country: value.country || null,
    notes: value.notes || null,
  };
}

function mapOrder(row: OrderRow): ShopOrder {
  const shippingAddress = normalizeShippingAddress(row.shipping_address);

  return {
    id: row.id,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    buyerPhone: row.buyer_phone,
    shippingAddress: shippingAddress.address,
    postalCode: shippingAddress.postalCode,
    city: shippingAddress.city,
    country: shippingAddress.country,
    notes: shippingAddress.notes,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    commissionTotalCents: row.commission_total_cents,
    totalCents: row.total_cents,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    paymentProvider: row.payment_provider,
    paymentReference: row.payment_reference,
    createdAt: row.created_at,
    items:
      row.shop_order_items?.map((item) => {
        const seller = Array.isArray(item.shop_sellers)
          ? item.shop_sellers[0]
          : item.shop_sellers;

        return {
          id: item.id,
          productId: item.product_id,
          sellerId: item.seller_id,
          sellerName: seller?.display_name || null,
          productName: item.product_name,
          quantity: item.quantity,
          basePriceCents: item.base_price_cents,
          commissionCents: item.commission_cents,
          finalPriceCents: item.final_price_cents,
          payoutAmountCents: item.payout_amount_cents,
        };
      }) || [],
    shipments:
      row.shop_shipments?.map((shipment) => ({
        id: shipment.id,
        orderId: shipment.order_id,
        sellerId: shipment.seller_id,
        status: shipment.status,
        carrier: shipment.carrier,
        trackingCode: shipment.tracking_code,
        shippingLabelUrl: shipment.shipping_label_url,
        shippedAt: shipment.shipped_at,
        deliveredAt: shipment.delivered_at,
      })) || [],
    emails:
      row.shop_order_emails?.map((email) => ({
        id: email.id,
        orderId: email.order_id,
        type: email.type,
        recipient: email.recipient,
        subject: email.subject,
        status: email.status,
        sentAt: email.sent_at,
        errorMessage: email.error_message,
        createdAt: email.created_at,
      })) || [],
  };
}

function buildMockOrder(order: ShopOrderDraft, paymentReference: string): ShopOrder {
  const totals = getCartTotals(order.items);

  return {
    id: paymentReference,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    buyerPhone: order.buyerPhone,
    shippingAddress: order.shippingAddress,
    postalCode: order.postalCode,
    city: order.city,
    country: order.country,
    notes: order.notes,
    subtotalCents: totals.subtotalCents,
    shippingCents: totals.shippingCents,
    commissionTotalCents: totals.commissionTotalCents,
    totalCents: totals.totalCents,
    paymentStatus: "pending",
    orderStatus: "pending_payment",
    paymentProvider: "payme",
    paymentReference,
    createdAt: new Date().toISOString(),
    items: order.items.map((item) => ({
      id: `${paymentReference}-${item.productId}`,
      productId: item.productId,
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      productName: item.name,
      quantity: item.quantity,
      basePriceCents: item.basePriceCents,
      commissionCents: item.commissionCents,
      finalPriceCents: item.finalPriceCents,
      payoutAmountCents: item.basePriceCents * item.quantity,
    })),
    shipments: [],
    emails: [],
  };
}

async function logEmails(orderId: string, results: ShopEmailResult[]) {
  try {
    await supabase.from("shop_order_emails").insert(
      results.map((result) => ({
        order_id: orderId,
        type: result.type,
        recipient: result.recipient,
        subject: result.subject,
        status: result.status,
        sent_at: result.status === "sent" ? new Date().toISOString() : null,
        error_message: result.errorMessage,
      }))
    );
  } catch {
    // O email não deve bloquear a encomenda.
  }
}

async function validateOrderItems(items: ShopCartItem[]) {
  const productIds = Array.from(new Set(items.map((item) => item.productId)));

  if (productIds.length === 0) {
    throw new Error("Carrinho vazio.");
  }

  const { data, error } = await supabase
    .from("shop_products")
    .select(
      "id,seller_id,name,base_price_cents,commission_cents,final_price_cents,stock_quantity,status,shop_sellers(display_name)"
    )
    .in("id", productIds);

  if (error) {
    throw error;
  }

  const productMap = new Map(
    ((data || []) as unknown as ProductValidationRow[]).map((product) => [
      product.id,
      product,
    ])
  );

  return items.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new Error(`Produto indisponível: ${item.name}`);
    }

    if (product.status !== "active") {
      throw new Error(`Produto não está ativo: ${product.name}`);
    }

    const stock = product.stock_quantity ?? 0;

    if (item.quantity > stock) {
      throw new Error(`Stock insuficiente: ${product.name}`);
    }

    const seller = Array.isArray(product.shop_sellers)
      ? product.shop_sellers[0]
      : product.shop_sellers;

    return {
      ...item,
      sellerId: product.seller_id,
      sellerName: seller?.display_name || item.sellerName,
      name: product.name,
      basePriceCents: product.base_price_cents,
      commissionCents: product.commission_cents,
      finalPriceCents: product.final_price_cents,
      stockQuantity: stock,
    };
  });
}

export async function createShopOrder(
  order: ShopOrderDraft,
  paymentReference: string
) {
  try {
    const validatedItems = await validateOrderItems(order.items);
    const normalizedOrder = { ...order, items: validatedItems };
    const totals = getCartTotals(validatedItems);

    const { data: orderData, error: orderError } = await supabase
      .from("shop_orders")
      .insert({
        buyer_email: normalizedOrder.buyerEmail,
        buyer_name: normalizedOrder.buyerName,
        buyer_phone: normalizedOrder.buyerPhone,
        shipping_address: {
          address: normalizedOrder.shippingAddress,
          postalCode: normalizedOrder.postalCode,
          city: normalizedOrder.city,
          country: normalizedOrder.country,
          notes: normalizedOrder.notes,
        },
        subtotal_cents: totals.subtotalCents,
        shipping_cents: totals.shippingCents || DEFAULT_SHIPPING_CENTS,
        commission_total_cents: totals.commissionTotalCents,
        total_cents: totals.totalCents,
        payment_status: "pending",
        order_status: "pending_payment",
        payment_provider: "payme",
        payment_reference: paymentReference,
      })
      .select("*")
      .single();

    if (orderError || !orderData) {
      throw orderError || new Error("Não foi possível criar encomenda.");
    }

    const orderId = orderData.id as string;
    const { error: itemsError } = await supabase.from("shop_order_items").insert(
      validatedItems.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        seller_id: item.sellerId,
        product_name: item.name,
        quantity: item.quantity,
        base_price_cents: item.basePriceCents,
        commission_cents: item.commissionCents,
        final_price_cents: item.finalPriceCents,
        payout_amount_cents: item.basePriceCents * item.quantity,
      }))
    );

    if (itemsError) {
      throw itemsError;
    }

    const sellerIds = Array.from(
      new Set(validatedItems.map((item) => item.sellerId))
    );
    const { error: shipmentsError } = await supabase.from("shop_shipments").insert(
      sellerIds.map((sellerId) => ({
        order_id: orderId,
        seller_id: sellerId,
        status: "awaiting_shipment",
        carrier: "CTT",
      }))
    );

    if (shipmentsError) {
      throw shipmentsError;
    }

    const { error: payoutsError } = await supabase.from("shop_payouts").insert(
      sellerIds.map((sellerId) => ({
        order_id: orderId,
        seller_id: sellerId,
        amount_cents: validatedItems
          .filter((item) => item.sellerId === sellerId)
          .reduce(
            (total, item) => total + item.basePriceCents * item.quantity,
            0
          ),
        status: "pending",
      }))
    );

    if (payoutsError) {
      throw payoutsError;
    }

    const created = await getShopOrder(orderId);
    const finalOrder = created || buildMockOrder(normalizedOrder, paymentReference);
    await logEmails(finalOrder.id, await buildOrderCreatedEmails(finalOrder));

    return { order: finalOrder, persisted: true };
  } catch {
    const mockOrder = buildMockOrder(order, paymentReference);
    await buildOrderCreatedEmails(mockOrder);

    return { order: mockOrder, persisted: false };
  }
}

export async function getShopOrders() {
  try {
    const { data, error } = await supabase
      .from("shop_orders")
      .select(
        "*,shop_order_items(*,shop_sellers(display_name)),shop_shipments(*),shop_order_emails(*)"
      )
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return (data as unknown as OrderRow[]).map(mapOrder);
  } catch {
    return [];
  }
}

export async function getShopOrdersForSellerUser(userId: string) {
  try {
    const { data: sellers } = await supabase
      .from("shop_sellers")
      .select("id")
      .eq("user_id", userId);
    const sellerIds = new Set((sellers || []).map((seller) => seller.id as string));

    if (sellerIds.size === 0) {
      return [];
    }

    const orders = await getShopOrders();

    return orders.filter((order) =>
      order.items.some((item) => item.sellerId && sellerIds.has(item.sellerId))
    );
  } catch {
    return [];
  }
}

export async function userCanShipShopOrder(orderId: string, userId: string) {
  const orders = await getShopOrdersForSellerUser(userId);

  return orders.some((order) => order.id === orderId);
}

export async function getShopOrder(id: string) {
  try {
    const { data, error } = await supabase
      .from("shop_orders")
      .select(
        "*,shop_order_items(*,shop_sellers(display_name)),shop_shipments(*),shop_order_emails(*)"
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      return null;
    }

    return mapOrder(data as unknown as OrderRow);
  } catch {
    return null;
  }
}

export async function updateShopOrderStatus(id: string, status: string) {
  const previousOrder = await getShopOrder(id);
  const nextPaymentStatus =
    status === "paid" || status === "awaiting_shipment" ? "paid_mock" : undefined;
  const updatePayload: Record<string, string> = {
    order_status: status,
  };

  if (nextPaymentStatus) {
    updatePayload.payment_status = nextPaymentStatus;
  }

  const { error } = await supabase
    .from("shop_orders")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    throw error;
  }

  const order = await getShopOrder(id);

  if (order) {
    if (
      (status === "paid" || status === "awaiting_shipment") &&
      previousOrder?.paymentStatus === "pending"
    ) {
      await Promise.all(
        order.items.map(async (item) => {
          if (!item.productId) {
            return;
          }

          const { data } = await supabase
            .from("shop_products")
            .select("stock_quantity")
            .eq("id", item.productId)
            .single();
          const currentStock = Number(data?.stock_quantity ?? 0);
          const nextStock = Math.max(0, currentStock - item.quantity);

          await supabase
            .from("shop_products")
            .update({
              stock_quantity: nextStock,
              status: nextStock === 0 ? "sold_out" : "active",
            })
            .eq("id", item.productId);
        })
      );

      await logEmails(order.id, await buildPaymentConfirmedEmails(order));
      const sellerIds = Array.from(
        new Set(order.items.map((item) => item.sellerId).filter(Boolean))
      ) as string[];
      const { data: sellers } = await supabase
        .from("shop_sellers")
        .select("id,payout_email")
        .in("id", sellerIds);
      const sellerEmails = new Map(
        (sellers || [])
          .filter((seller) => seller.payout_email)
          .map((seller) => [seller.id as string, seller.payout_email as string])
      );

      await logEmails(
        order.id,
        await buildSellerPaidOrderEmails(order, sellerEmails)
      );
    }

    if (status === "completed") {
      await logEmails(order.id, await buildCompletedEmails(order));
    }
  }

  return order;
}

export async function markShopPayoutPaid(orderId: string) {
  const order = await getShopOrder(orderId);

  if (!order) {
    return null;
  }

  const sellerTotals = new Map<string, number>();

  order.items.forEach((item) => {
    if (!item.sellerId) {
      return;
    }

    sellerTotals.set(
      item.sellerId,
      (sellerTotals.get(item.sellerId) || 0) + item.payoutAmountCents
    );
  });

  await Promise.all(
    Array.from(sellerTotals.entries()).map(([sellerId, amountCents]) =>
      supabase
        .from("shop_payouts")
        .update({
          amount_cents: amountCents,
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("order_id", orderId)
        .eq("seller_id", sellerId)
    )
  );

  return order;
}

export async function markShopOrderShipped(
  id: string,
  trackingCode: string,
  carrier = "CTT"
) {
  await supabase
    .from("shop_shipments")
    .update({
      status: "shipped",
      carrier,
      tracking_code: trackingCode,
      shipped_at: new Date().toISOString(),
    })
    .eq("order_id", id);

  await supabase
    .from("shop_orders")
    .update({ order_status: "shipped" })
    .eq("id", id);

  const order = await getShopOrder(id);

  if (order) {
    await logEmails(order.id, await buildShippedEmails(order, trackingCode));
  }

  return order;
}
