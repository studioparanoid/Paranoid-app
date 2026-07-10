import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Pay.Me real ainda não está ligado.",
      todo: [
        "PAYME_MERCHANT_ID",
        "PAYME_TERMINAL_ID",
        "PAYME_API_KEY",
        "PAYME_WEBHOOK_SECRET",
        "PAYME_ENV",
      ],
    },
    { status: 501 }
  );
}
