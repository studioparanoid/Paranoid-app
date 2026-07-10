import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_SHIPPING_CENTS,
  calculateInternalShopLine,
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
const UNDEFINED_COLUMN_CODE = "42703";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message);
  }

  return "Erro desconhecido.";
}

function isMissingColumnError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === UNDEFINED_COLUMN_CODE
  );
}

type ProductValidationRow = {
  id: string;
  seller_id: string;
  name: string;
  base_price_cents: number;
  commission_cents: number;
  final_price_cents: number;
  ownership_model: "paranoid_owned" | "paranoid_managed" | null;
  partner_payout_type: "fixed_per_unit" | "percentage" | "none" | null;
  partner_payout_cents: number | null;
  partner_payout_rate: number | string | null;
  production_cost_cents: number | null;
  vat_rate: number | string | null;
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
  vat_total_cents?: number | null;
  partner_payout_total_cents?: number | null;
  paranoid_margin_total_cents?: number | null;
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
    partner_payout_type?: "fixed_per_unit" | "percentage" | "none" | null;
    partner_payout_cents?: number | null;
    partner_payout_rate?: number | string | null;
    partner_payout_amount_cents?: number | null;
    production_cost_cents?: number | null;
    vat_rate?: number | string | null;
    vat_cents?: number | null;
    paranoid_margin_cents?: number | null;
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
  shop_payouts?: {
    id: string;
    order_id: string | null;
    seller_id: string | null;
    amount_cents: number;
    status: string;
    paid_at: string | null;
    fiscal_document_status?: string | null;
    fiscal_document_reference?: string | null;
    fiscal_document_url?: string | null;
    fiscal_document_notes?: string | null;
    approved_for_payment_at?: string | null;
    blocked_reason?: string | null;
    shop_sellers?: { display_name: string | null } | { display_name: string | null }[] | null;
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
    vatTotalCents: row.vat_total_cents ?? 0,
    partnerPayoutTotalCents: row.partner_payout_total_cents ?? 0,
    paranoidMarginTotalCents: row.paranoid_margin_total_cents ?? 0,
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
          partnerPayoutType: item.partner_payout_type || null,
          partnerPayoutCents: item.partner_payout_cents ?? 0,
          partnerPayoutRate: Number(item.partner_payout_rate ?? 0),
          partnerPayoutAmountCents:
            item.partner_payout_amount_cents ?? item.payout_amount_cents,
          productionCostCents: item.production_cost_cents ?? 0,
          vatRate: Number(item.vat_rate ?? 0.23),
          vatCents: item.vat_cents ?? 0,
          paranoidMarginCents: item.paranoid_margin_cents ?? 0,
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
    payouts:
      row.shop_payouts?.map((payout) => {
        const seller = Array.isArray(payout.shop_sellers)
          ? payout.shop_sellers[0]
          : payout.shop_sellers;

        return {
          id: payout.id,
          orderId: payout.order_id,
          sellerId: payout.seller_id,
          sellerName: seller?.display_name || null,
          amountCents: payout.amount_cents,
          status: payout.status,
          fiscalDocumentStatus: payout.fiscal_document_status || "pending",
          fiscalDocumentReference: payout.fiscal_document_reference || null,
          fiscalDocumentUrl: payout.fiscal_document_url || null,
          fiscalDocumentNotes: payout.fiscal_document_notes || null,
          blockedReason: payout.blocked_reason || null,
          approvedForPaymentAt: payout.approved_for_payment_at || null,
          paidAt: payout.paid_at,
        };
      }) || [],
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
    vatTotalCents: totals.vatTotalCents,
    partnerPayoutTotalCents: totals.partnerPayoutTotalCents,
    paranoidMarginTotalCents: totals.paranoidMarginTotalCents,
    totalCents: totals.totalCents,
    paymentStatus: "pending",
    orderStatus: "pending_payment",
    paymentProvider: "payme",
    paymentReference,
    createdAt: new Date().toISOString(),
    items: order.items.map((item) => {
      const line = calculateInternalShopLine(item);

      return {
        id: `${paymentReference}-${item.productId}`,
        productId: item.productId,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        productName: item.name,
        quantity: item.quantity,
        basePriceCents: item.basePriceCents,
        commissionCents: item.commissionCents,
        finalPriceCents: item.finalPriceCents,
        payoutAmountCents: line.partnerPayoutAmountCents,
        partnerPayoutType: item.partnerPayoutType || null,
        partnerPayoutCents: item.partnerPayoutCents ?? 0,
        partnerPayoutRate: item.partnerPayoutRate ?? 0,
        partnerPayoutAmountCents: line.partnerPayoutAmountCents,
        productionCostCents: item.productionCostCents ?? 0,
        vatRate: item.vatRate ?? 0.23,
        vatCents: line.vatCents,
        paranoidMarginCents: line.paranoidMarginCents,
      };
    }),
    shipments: [],
    emails: [],
    payouts: [],
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

  const productResponse = await supabase
    .from("shop_products")
    .select(
      "id,seller_id,name,base_price_cents,commission_cents,final_price_cents,ownership_model,partner_payout_type,partner_payout_cents,partner_payout_rate,production_cost_cents,vat_rate,stock_quantity,status,shop_sellers(display_name)"
    )
    .in("id", productIds);
  let data = productResponse.data as unknown[] | null;
  let error: unknown = productResponse.error;

  if (isMissingColumnError(error)) {
    const legacyResponse = await supabase
      .from("shop_products")
      .select(
        "id,seller_id,name,base_price_cents,commission_cents,final_price_cents,stock_quantity,status,shop_sellers(display_name)"
      )
      .in("id", productIds);

    data = legacyResponse.data as unknown[] | null;
    error = legacyResponse.error;
  }

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
      ownershipModel: product.ownership_model || "paranoid_managed",
      partnerPayoutType: product.partner_payout_type || "fixed_per_unit",
      partnerPayoutCents: product.partner_payout_cents ?? product.base_price_cents,
      partnerPayoutRate: Number(product.partner_payout_rate ?? 0),
      productionCostCents: product.production_cost_cents ?? 0,
      vatRate: Number(product.vat_rate ?? 0.23),
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

    const orderPayload = {
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
      vat_total_cents: totals.vatTotalCents,
      partner_payout_total_cents: totals.partnerPayoutTotalCents,
      paranoid_margin_total_cents: totals.paranoidMarginTotalCents,
      payment_status: "pending",
      order_status: "pending_payment",
      payment_provider: "payme",
      payment_reference: paymentReference,
      total_cents: totals.totalCents,
    };
    const legacyOrderPayload = {
      buyer_email: orderPayload.buyer_email,
      buyer_name: orderPayload.buyer_name,
      buyer_phone: orderPayload.buyer_phone,
      shipping_address: orderPayload.shipping_address,
      subtotal_cents: orderPayload.subtotal_cents,
      shipping_cents: orderPayload.shipping_cents,
      commission_total_cents: orderPayload.commission_total_cents,
      total_cents: orderPayload.total_cents,
      payment_status: orderPayload.payment_status,
      order_status: orderPayload.order_status,
      payment_provider: orderPayload.payment_provider,
      payment_reference: orderPayload.payment_reference,
    };
    let { data: orderData, error: orderError } = await supabase
      .from("shop_orders")
      .insert(orderPayload)
      .select("*")
      .single();

    if (isMissingColumnError(orderError)) {
      const legacyResponse = await supabase
        .from("shop_orders")
        .insert(legacyOrderPayload)
        .select("*")
        .single();

      orderData = legacyResponse.data;
      orderError = legacyResponse.error;
    }

    if (orderError || !orderData) {
      throw orderError || new Error("Não foi possível criar encomenda.");
    }

    const orderId = orderData.id as string;
    const frozenItems = validatedItems.map((item) => {
      const line = calculateInternalShopLine(item);

      return {
        item,
        line,
      };
    });
    const itemPayload = frozenItems.map(({ item, line }) => ({
      order_id: orderId,
      product_id: item.productId,
      seller_id: item.sellerId,
      product_name: item.name,
      quantity: item.quantity,
      base_price_cents: item.basePriceCents,
      commission_cents: item.commissionCents,
      final_price_cents: item.finalPriceCents,
      payout_amount_cents: line.partnerPayoutAmountCents,
      partner_payout_type: item.partnerPayoutType || "none",
      partner_payout_cents: item.partnerPayoutCents ?? 0,
      partner_payout_rate: item.partnerPayoutRate ?? 0,
      partner_payout_amount_cents: line.partnerPayoutAmountCents,
      production_cost_cents: item.productionCostCents ?? 0,
      vat_rate: item.vatRate ?? 0.23,
      vat_cents: line.vatCents,
      paranoid_margin_cents: line.paranoidMarginCents,
    }));
    const legacyItemPayload = frozenItems.map(({ item, line }) => ({
      order_id: orderId,
      product_id: item.productId,
      seller_id: item.sellerId,
      product_name: item.name,
      quantity: item.quantity,
      base_price_cents: item.basePriceCents,
      commission_cents: item.commissionCents,
      final_price_cents: item.finalPriceCents,
      payout_amount_cents: line.partnerPayoutAmountCents,
    }));
    let { error: itemsError } = await supabase
      .from("shop_order_items")
      .insert(itemPayload);

    if (isMissingColumnError(itemsError)) {
      const legacyResponse = await supabase
        .from("shop_order_items")
        .insert(legacyItemPayload);

      itemsError = legacyResponse.error;
    }

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

    const payoutRows = sellerIds
      .map((sellerId) => ({
        order_id: orderId,
        seller_id: sellerId,
        amount_cents: frozenItems
          .filter(({ item }) => item.sellerId === sellerId)
          .reduce((total, { line }) => total + line.partnerPayoutAmountCents, 0),
        status: "pending",
        fiscal_document_status: "pending",
        blocked_reason: "Documento fiscal ainda não aprovado.",
      }))
      .filter((payout) => payout.amount_cents > 0);

    if (payoutRows.length > 0) {
      let { error: payoutsError } = await supabase
        .from("shop_payouts")
        .insert(payoutRows);

      if (isMissingColumnError(payoutsError)) {
        const legacyResponse = await supabase.from("shop_payouts").insert(
          payoutRows.map((payout) => ({
            order_id: payout.order_id,
            seller_id: payout.seller_id,
            amount_cents: payout.amount_cents,
            status: payout.status,
          }))
        );

        payoutsError = legacyResponse.error;
      }

      if (payoutsError) {
        throw payoutsError;
      }
    }

    const created = await getShopOrder(orderId);
    const finalOrder = created || buildMockOrder(normalizedOrder, paymentReference);
    await logEmails(finalOrder.id, await buildOrderCreatedEmails(finalOrder));

    return { order: finalOrder, persisted: true };
  } catch (error) {
    const message = getErrorMessage(error);

    if (process.env.NODE_ENV !== "production") {
      console.error("[shop-checkout:create-order]", error);
    }

    const mockOrder = buildMockOrder(order, paymentReference);
    await buildOrderCreatedEmails(mockOrder);

    return { order: mockOrder, persisted: false, error: message };
  }
}

export async function getShopOrders() {
  try {
    const { data, error } = await supabase
      .from("shop_orders")
      .select(
        "*,shop_order_items(*,shop_sellers(display_name)),shop_shipments(*),shop_order_emails(*),shop_payouts(*,shop_sellers(display_name))"
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
        "*,shop_order_items(*,shop_sellers(display_name)),shop_shipments(*),shop_order_emails(*),shop_payouts(*,shop_sellers(display_name))"
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
    status === "paid" || status === "awaiting_shipment" ? "paid" : undefined;
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
  const { data: payouts, error } = await supabase
    .from("shop_payouts")
    .select(
      "id,seller_id,amount_cents,fiscal_document_status,shop_sellers(fiscal_status,contract_status)"
    )
    .eq("order_id", orderId)
    .gt("amount_cents", 0);

  if (error) {
    throw error;
  }

  const blocked = (payouts || []).find((payout) => {
    const seller = Array.isArray(payout.shop_sellers)
      ? payout.shop_sellers[0]
      : payout.shop_sellers;

    return (
      payout.fiscal_document_status !== "approved" ||
      seller?.fiscal_status !== "valid" ||
      seller?.contract_status !== "signed"
    );
  });

  if (blocked) {
    await supabase
      .from("shop_payouts")
      .update({
        blocked_reason:
          "Não é possível pagar este parceiro sem documento fiscal aprovado, fiscal válido e contrato assinado.",
      })
      .eq("order_id", orderId);
    throw new Error(
      "Não é possível pagar este parceiro sem documento fiscal aprovado."
    );
  }

  await supabase
    .from("shop_payouts")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      blocked_reason: null,
    })
    .eq("order_id", orderId)
    .gt("amount_cents", 0);

  return getShopOrder(orderId);
}

export async function updateShopPayoutFiscalDocument(
  orderId: string,
  status: string,
  approvedBy?: string
) {
  const updatePayload: Record<string, string | null> = {
    fiscal_document_status: status,
    blocked_reason:
      status === "approved"
        ? null
        : "Documento fiscal ainda não aprovado.",
  };

  if (status === "approved") {
    updatePayload.approved_for_payment_at = new Date().toISOString();
    updatePayload.approved_for_payment_by = approvedBy || null;
  }

  const { error } = await supabase
    .from("shop_payouts")
    .update(updatePayload)
    .eq("order_id", orderId);

  if (error) {
    throw error;
  }

  return getShopOrder(orderId);
}

export async function approveSellerForShopPayment(orderId: string) {
  const { data: payouts, error } = await supabase
    .from("shop_payouts")
    .select("seller_id")
    .eq("order_id", orderId)
    .gt("amount_cents", 0);

  if (error) {
    throw error;
  }

  const sellerIds = Array.from(
    new Set((payouts || []).map((payout) => payout.seller_id).filter(Boolean))
  );

  if (sellerIds.length > 0) {
    await supabase
      .from("shop_sellers")
      .update({
        fiscal_status: "valid",
        contract_status: "signed",
        contract_signed_at: new Date().toISOString(),
      })
      .in("id", sellerIds);
  }

  return getShopOrder(orderId);
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
