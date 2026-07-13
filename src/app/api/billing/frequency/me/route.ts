import { NextResponse } from "next/server";
import { createBillingPayment } from "@/lib/billing/payments";
import {
  FREQUENCY_PRODUCT_CODE,
  getActiveOrganizerFrequencyPass,
  getEligibleOrganizerEvents,
} from "@/lib/billing/frequency";
import {
  EVENT_FEATURE_PACK_PRODUCT_CODE,
  getActiveEventHighlightCreditPacks,
} from "@/lib/billing/highlights";
import { getRequiredSupabaseAdminClient } from "@/lib/supabase/admin";
import { getShopApiUser } from "@/lib/shop/api-auth";

type OrganizerMemberRow = {
  organizer_id: string;
  organizers:
    | {
        id: string;
        slug: string | null;
        name: string | null;
        city: string | null;
      }
    | null;
};

async function getOrganizerForUser(userId: string, organizerId?: string | null) {
  const supabase = getRequiredSupabaseAdminClient();
  let query = supabase
    .from("organizer_members")
    .select("organizer_id,organizers(id,slug,name,city)")
    .eq("user_id", userId)
    .limit(1);

  if (organizerId) {
    query = query.eq("organizer_id", organizerId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data as OrganizerMemberRow | null;
}

export async function GET(request: Request) {
  try {
    const user = await getShopApiUser(request);

    if (!user) {
      return NextResponse.json({ error: "Sem sessão." }, { status: 401 });
    }

    const url = new URL(request.url);
    const membership = await getOrganizerForUser(
      user.id,
      url.searchParams.get("organizerId")
    );

    if (!membership) {
      return NextResponse.json({
        organizer: null,
        pass: null,
        events: [],
      });
    }

    const [pass, events, creditPacks] = await Promise.all([
      getActiveOrganizerFrequencyPass(membership.organizer_id),
      getEligibleOrganizerEvents(membership.organizer_id),
      getActiveEventHighlightCreditPacks(membership.organizer_id),
    ]);

    return NextResponse.json({
      organizer: membership.organizers || { id: membership.organizer_id },
      pass,
      events,
      creditPacks,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro na Frequency." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getShopApiUser(request);

    if (!user) {
      return NextResponse.json({ error: "Sem sessão." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      organizerId?: string;
      productCode?: string;
    };
    const membership = await getOrganizerForUser(user.id, body.organizerId);

    if (!membership) {
      return NextResponse.json(
        { error: "Esta conta não está ligada a um organizador." },
        { status: 403 }
      );
    }

    const productCode =
      body.productCode === EVENT_FEATURE_PACK_PRODUCT_CODE
        ? EVENT_FEATURE_PACK_PRODUCT_CODE
        : FREQUENCY_PRODUCT_CODE;

    const result = await createBillingPayment({
      productCode,
      relatedType: "organizer",
      relatedId: membership.organizer_id,
      provider: "mock",
      userId: user.id,
      metadata: {
        source:
          productCode === EVENT_FEATURE_PACK_PRODUCT_CODE
            ? "event_feature_pack"
            : "organizer_frequency",
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no pagamento." },
      { status: 500 }
    );
  }
}
