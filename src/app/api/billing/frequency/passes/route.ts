import { NextResponse } from "next/server";
import {
  expireOrganizerFrequencyPasses,
  getEligibleOrganizerEvents,
  getOrganizerFrequencyPasses,
  updateOrganizerFrequencyPass,
} from "@/lib/billing/frequency";
import { getShopApiUser, isShopAdminUser } from "@/lib/shop/api-auth";

async function requireAdmin(request: Request) {
  const user = await getShopApiUser(request);

  if (!user || !(await isShopAdminUser(user.id))) {
    return null;
  }

  return user;
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);

    if (!admin) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const passes = await getOrganizerFrequencyPasses();
    const rows = await Promise.all(
      passes.map(async (pass) => {
        const events = await getEligibleOrganizerEvents(pass.organizerId);

        return {
          ...pass,
          eligibleEventsCount: events.length,
          publishedDuringPeriodCount: events.filter((event) => {
            const date = event.start_at ? new Date(event.start_at) : null;
            const startsAt = pass.startsAt ? new Date(pass.startsAt) : null;
            const endsAt = pass.endsAt ? new Date(pass.endsAt) : null;

            return (
              date &&
              startsAt &&
              endsAt &&
              date >= startsAt &&
              date <= endsAt
            );
          }).length,
        };
      })
    );

    return NextResponse.json({ passes: rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro nos passes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);

    if (!admin) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const body = (await request.json()) as {
      action?: "cancel" | "expire" | "set_end" | "expire_due";
      passId?: string;
      endsAt?: string;
    };

    if (body.action === "expire_due") {
      const expired = await expireOrganizerFrequencyPasses();

      return NextResponse.json({ expired });
    }

    if (!body.passId) {
      return NextResponse.json(
        { error: "ID do passe obrigatório." },
        { status: 400 }
      );
    }

    if (body.action === "cancel") {
      const pass = await updateOrganizerFrequencyPass(body.passId, {
        status: "cancelled",
      });

      return NextResponse.json({ pass });
    }

    if (body.action === "expire") {
      const pass = await updateOrganizerFrequencyPass(body.passId, {
        status: "expired",
      });

      return NextResponse.json({ pass });
    }

    if (body.action === "set_end" && body.endsAt) {
      const pass = await updateOrganizerFrequencyPass(body.passId, {
        endsAt: body.endsAt,
      });

      return NextResponse.json({ pass });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro nos passes." },
      { status: 500 }
    );
  }
}
