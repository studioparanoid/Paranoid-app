import { NextResponse } from "next/server";
import { getBillingPayments } from "@/lib/billing/payments";
import { getShopApiUser, isShopAdminUser } from "@/lib/shop/api-auth";

export async function GET(request: Request) {
  const user = await getShopApiUser(request);

  if (!user || !(await isShopAdminUser(user.id))) {
    return NextResponse.json({ error: "Sem acesso admin." }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  return NextResponse.json({ payments: await getBillingPayments(status) });
}
