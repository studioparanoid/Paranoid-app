import { NextResponse } from "next/server";
import { updateBillingPaymentStatus } from "@/lib/billing/payments";
import { getShopApiUser, isShopAdminUser } from "@/lib/shop/api-auth";

export async function POST(request: Request) {
  const user = await getShopApiUser(request);

  if (!user || !(await isShopAdminUser(user.id))) {
    return NextResponse.json({ error: "Sem acesso admin." }, { status: 403 });
  }

  const body = (await request.json()) as {
    paymentId?: string;
    status?: "failed" | "cancelled";
  };

  if (!body.paymentId) {
    return NextResponse.json({ error: "Pagamento em falta." }, { status: 400 });
  }

  try {
    const payment = await updateBillingPaymentStatus(
      body.paymentId,
      body.status || "cancelled"
    );

    return NextResponse.json({ payment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao cancelar." },
      { status: 400 }
    );
  }
}
