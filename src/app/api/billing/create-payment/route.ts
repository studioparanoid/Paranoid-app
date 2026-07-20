import { NextResponse } from "next/server";
import { createBillingPayment } from "@/lib/billing/payments";
import { getShopApiUser, isShopAdminUser } from "@/lib/shop/api-auth";
import { type BillingPaymentDraft } from "@/lib/billing/types";

export async function POST(request: Request) {
  const user = await getShopApiUser(request);
  if (!user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  if (!(await isShopAdminUser(user.id))) {
    return NextResponse.json({ error: "Sem permissão para concluir esta ação." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Partial<BillingPaymentDraft>;

    if (!body.productCode || !body.relatedType) {
      return NextResponse.json(
        { error: "Produto e relação são obrigatórios." },
        { status: 400 }
      );
    }

    const result = await createBillingPayment({
      productCode: body.productCode,
      relatedType: body.relatedType,
      relatedId: body.relatedId || null,
      amountCents: body.amountCents,
      provider: body.provider || "mock",
      metadata: body.metadata || {},
      userId: body.userId || null,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no pagamento." },
      { status: 500 }
    );
  }
}
