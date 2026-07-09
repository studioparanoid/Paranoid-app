import { NextResponse } from "next/server";
import { createPaymeCheckout } from "@/lib/shop/payments";
import { type ShopOrderDraft } from "@/lib/shop";

export async function POST(request: Request) {
  const order = (await request.json()) as ShopOrderDraft;

  if (!order.items || order.items.length === 0) {
    return NextResponse.json(
      { error: "Não há produtos para pagamento." },
      { status: 400 }
    );
  }

  const payment = await createPaymeCheckout(order);

  return NextResponse.json(payment);
}

