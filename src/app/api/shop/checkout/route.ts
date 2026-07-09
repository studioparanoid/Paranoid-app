import { NextResponse } from "next/server";
import { buildOrderPayload, createPaymeCheckout } from "@/lib/shop/payments";
import { type ShopOrderDraft } from "@/lib/shop";

export async function POST(request: Request) {
  const order = (await request.json()) as Partial<ShopOrderDraft>;

  if (
    !order.buyerName ||
    !order.buyerEmail ||
    !order.shippingAddress ||
    !order.items ||
    order.items.length === 0
  ) {
    return NextResponse.json(
      { error: "Dados de checkout incompletos." },
      { status: 400 }
    );
  }

  const normalizedOrder: ShopOrderDraft = {
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    buyerPhone: order.buyerPhone || "",
    shippingAddress: order.shippingAddress,
    items: order.items,
  };
  const payment = await createPaymeCheckout(normalizedOrder);

  return NextResponse.json({
    order: buildOrderPayload(normalizedOrder),
    paymentReference: payment.paymentReference,
    checkoutUrl: payment.checkoutUrl,
    sandbox: payment.status === "sandbox",
  });
}

