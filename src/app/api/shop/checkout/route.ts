import { NextResponse } from "next/server";
import { createBillingPayment } from "@/lib/billing/payments";
import { createShopOrder } from "@/lib/shop/orders";
import { createPaymeCheckout } from "@/lib/shop/payments";
import { type ShopOrderDraft } from "@/lib/shop";

export async function POST(request: Request) {
  let order: Partial<ShopOrderDraft>;

  try {
    order = (await request.json()) as Partial<ShopOrderDraft>;
  } catch {
    return NextResponse.json(
      { error: "Pedido de checkout inválido." },
      { status: 400 }
    );
  }

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
  try {
    const payment = await createPaymeCheckout(normalizedOrder);
    const createdOrder = await createShopOrder(
      normalizedOrder,
      payment.paymentReference
    );

    if (!createdOrder.persisted) {
      const error =
        createdOrder.error ||
        "Não foi possível guardar a encomenda na base de dados.";

      if (process.env.NODE_ENV !== "production") {
        console.error("[shop-checkout]", error);
      }

      return NextResponse.json(
        {
          error,
          developerHint:
            process.env.NODE_ENV !== "production"
              ? "Verifica migrations shop_* e colunas novas da loja."
              : undefined,
        },
        { status: 500 }
      );
    }

    await createBillingPayment({
      productCode: "shop_order",
      relatedType: "shop_order",
      relatedId: createdOrder.order.id,
      amountCents: createdOrder.order.totalCents,
      provider: payment.status === "sandbox" ? "mock" : "payme",
      metadata: {
        paymentReference: payment.paymentReference,
        buyerEmail: createdOrder.order.buyerEmail,
      },
    });

    return NextResponse.json({
      order: createdOrder.order,
      paymentReference: payment.paymentReference,
      checkoutUrl: payment.checkoutUrl,
      sandbox: payment.status === "sandbox",
      persisted: createdOrder.persisted,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível preparar a encomenda.";

    if (process.env.NODE_ENV !== "production") {
      console.error("[shop-checkout]", error);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
