import { NextResponse } from "next/server";
import { consumeEventHighlightCredit } from "@/lib/billing/highlights";
import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";
import { getShopApiUser } from "@/lib/shop/api-auth";

export async function POST(request: Request) {
  try {
    const user = await getShopApiUser(request);

    if (!user) {
      return NextResponse.json({ error: "Sem sessão." }, { status: 401 });
    }

    const body = (await request.json()) as {
      organizerId?: string;
      eventId?: string;
    };

    if (!body.organizerId || !body.eventId) {
      return NextResponse.json(
        { error: "Organizador e evento são obrigatórios." },
        { status: 400 }
      );
    }

    const supabase = getRequiredSupabaseAdminClient();
    const { data: membership } = await supabase
      .from("organizer_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("organizer_id", body.organizerId)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const result = await consumeEventHighlightCredit({
      organizerId: body.organizerId,
      eventId: body.eventId,
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no crédito." },
      { status: 500 }
    );
  }
}
