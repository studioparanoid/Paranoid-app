import { NextResponse } from "next/server";
import { expireOrganizerFrequencyPasses } from "@/lib/billing/frequency";
import { expireEventHighlightProducts } from "@/lib/billing/highlights";
import { expireSponsorships } from "@/lib/billing/sponsorships";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não está configurado." },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization") || "";

  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 401 });
  }

  try {
    await expireEventHighlightProducts();
    const expiredFrequency = await expireOrganizerFrequencyPasses();
    await expireSponsorships();

    return NextResponse.json({
      ok: true,
      expiredFrequencyCount: expiredFrequency.length,
      expiredFrequency,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no cron." },
      { status: 500 }
    );
  }
}
