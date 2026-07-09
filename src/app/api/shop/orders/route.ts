import { NextResponse } from "next/server";
import { getShopApiUser, isShopAdminUser } from "@/lib/shop/api-auth";
import { getShopOrders, getShopOrdersForSellerUser } from "@/lib/shop/orders";

export async function GET(request: Request) {
  const user = await getShopApiUser(request);

  if (!user) {
    return NextResponse.json({ error: "Sessão em falta." }, { status: 401 });
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");

  if (scope === "admin") {
    const isAdmin = await isShopAdminUser(user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: "Sem acesso admin." }, { status: 403 });
    }

    return NextResponse.json({ orders: await getShopOrders() });
  }

  const orders = await getShopOrdersForSellerUser(user.id);

  return NextResponse.json({ orders });
}
