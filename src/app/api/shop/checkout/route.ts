import { NextResponse } from "next/server";
import { createShopOrder } from "@/lib/shop/orders";
import { createPaymeCheckout } from "@/lib/shop/payments";
import { type ShopOrderDraft } from "@/lib/shop";

export async function POST(request: Request) {
  const order = (await request.json()) as Partial<ShopOrderDraft>;

  if (
    !order.buyerName ||
    !order.buyerEmail ||
    !order.shippingAddress ||
    !order.postalCode ||
    !order.city ||
    !order.country ||
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
    postalCode: order.postalCode,
    city: order.city,
    country: order.country,
    notes: order.notes || "",
    items: order.items,
  };
  const payment = await createPaymeCheckout(normalizedOrder);
  const createdOrder = await createShopOrder(
    normalizedOrder,
    payment.paymentReference
  );

  if (!createdOrder.persisted) {
    return NextResponse.json(
      { error: "Não foi possível guardar a encomenda na base de dados." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    order: createdOrder.order,
    paymentReference: payment.paymentReference,
    checkoutUrl: payment.checkoutUrl,
    sandbox: payment.status === "sandbox",
    persisted: createdOrder.persisted,
  });
}
