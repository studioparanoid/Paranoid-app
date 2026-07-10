import { NextResponse } from "next/server";
import { handlePaymeWebhook } from "@/lib/billing/payme";

export async function POST() {
  return NextResponse.json(await handlePaymeWebhook());
}
