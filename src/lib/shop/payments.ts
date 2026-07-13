import {
  DEFAULT_SHIPPING_CENTS,
  getCartTotals,
  type ShopOrderDraft,
} from "@/lib/shop";

export type PaymentCreateResult = {
  provider: "payme";
  status: "sandbox" | "ready";
  paymentReference: string;
  checkoutUrl: string | null;
};

function hasPaymeConfig() {
  return Boolean(
    process.env.PAYME_MERCHANT_ID &&
      process.env.PAYME_TERMINAL_ID &&
      process.env.PAYME_API_KEY &&
      process.env.PAYME_WEBHOOK_SECRET
  );
}

export async function createPaymeCheckout(
  order: ShopOrderDraft
): Promise<PaymentCreateResult> {
  void order;

  const paymentReference = `PARANOID-${Date.now()}`;

  if (!hasPaymeConfig()) {
    return {
      provider: "payme",
      status: "sandbox",
      paymentReference,
      checkoutUrl: null,
    };
  }

  // TODO: ligar à API hosted checkout P@Y.ME Millennium quando houver
  // documentação e credenciais reais. Não guardar dados de cartão na Paranoid.
  return {
    provider: "payme",
    status: "ready",
    paymentReference,
    checkoutUrl: null,
  };
}

export function buildOrderPayload(order: ShopOrderDraft) {
  const totals = getCartTotals(order.items);

  return {
    buyer_name: order.buyerName,
    buyer_email: order.buyerEmail,
    buyer_phone: order.buyerPhone,
    shipping_address: {
      address: order.shippingAddress,
      postalCode: order.postalCode,
      city: order.city,
      country: order.country,
      notes: order.notes,
    },
    subtotal_cents: totals.subtotalCents,
    shipping_cents: totals.shippingCents || DEFAULT_SHIPPING_CENTS,
    commission_total_cents: totals.commissionTotalCents,
    total_cents: totals.totalCents,
    payment_status: "pending",
    order_status: "pending_payment",
    payment_provider: "payme",
  };
}
