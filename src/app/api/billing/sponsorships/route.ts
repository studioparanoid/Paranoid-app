import { NextResponse } from "next/server";
import { getAllSponsorshipCampaigns } from "@/lib/billing/sponsorships";
import { getShopApiUser, isShopAdminUser } from "@/lib/shop/api-auth";

export async function GET(request: Request) {
  const user = await getShopApiUser(request);

  if (!user || !(await isShopAdminUser(user.id))) {
    return NextResponse.json({ error: "Sem acesso admin." }, { status: 403 });
  }

  return NextResponse.json({
    campaigns: await getAllSponsorshipCampaigns(),
  });
}
