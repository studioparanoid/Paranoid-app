import { NextResponse } from "next/server";
import { getOrganizerVisibilityStatus } from "@/lib/billing/frequency";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const organizerId = url.searchParams.get("organizerId");

  if (!organizerId) {
    return NextResponse.json({ active: false });
  }

  try {
    const status = await getOrganizerVisibilityStatus(organizerId);

    return NextResponse.json({
      active: status.active,
      daysRemaining: status.daysRemaining,
    });
  } catch {
    return NextResponse.json({ active: false });
  }
}
