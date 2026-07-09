import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json();

  // TODO: validar assinatura PAYME_WEBHOOK_SECRET e atualizar encomenda.
  return NextResponse.json({
    received: true,
    provider: "payme",
    event: payload?.event || "sandbox",
  });
}

