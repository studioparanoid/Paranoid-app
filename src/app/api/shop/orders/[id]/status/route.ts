import { NextResponse } from "next/server";
import { getShopApiUser, isShopAdminUser } from "@/lib/shop/api-auth";
import {
  markShopOrderShipped,
  markShopPayoutPaid,
  updateShopOrderStatus,
  userCanShipShopOrder,
} from "@/lib/shop/orders";

type StatusRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: StatusRouteProps) {
  const user = await getShopApiUser(request);

  if (!user) {
    return NextResponse.json({ error: "Sessão em falta." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    status?: string;
    trackingCode?: string;
    carrier?: string;
  };

  if (!body.status) {
    return NextResponse.json({ error: "Estado em falta." }, { status: 400 });
  }

  try {
    const isAdmin = await isShopAdminUser(user.id);

    if (body.status === "shipped") {
      const canShip = isAdmin || (await userCanShipShopOrder(id, user.id));

      if (!canShip) {
        return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
      }

      const order = await markShopOrderShipped(
        id,
        body.trackingCode || "",
        body.carrier || "CTT"
      );

      return NextResponse.json({ order });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Sem acesso admin." }, { status: 403 });
    }

    const order =
      body.status === "payout_paid"
        ? await markShopPayoutPaid(id)
        : await updateShopOrderStatus(id, body.status);

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível atualizar a encomenda." },
      { status: 400 }
    );
  }
}
