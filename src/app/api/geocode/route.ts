import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type GeocodeRequestBody = {
  venue?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  district?: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
  type?: string;
  class?: string;
  importance?: number;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function POST(request: Request) {
  let body: GeocodeRequestBody;

  try {
    body = (await request.json()) as GeocodeRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Pedido inválido." },
      { status: 400 }
    );
  }

  const venue = cleanText(body.venue);
  const address = cleanText(body.address);
  const postalCode = cleanText(body.postal_code);
  const city = cleanText(body.city);
  const district = cleanText(body.district);

  if (!address || !city) {
    return NextResponse.json(
      { error: "Mete pelo menos morada e cidade para localizar." },
      { status: 400 }
    );
  }

  const query = [venue, address, postalCode, city, district, "Portugal"]
    .filter(Boolean)
    .join(", ");

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "pt");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "ParanoidApp/1.0 (https://paranoid.pt)",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.7",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "O serviço de localização não respondeu bem." },
        { status: 502 }
      );
    }

    const results = (await response.json()) as NominatimResult[];
    const bestResult = results[0];

    if (!bestResult) {
      return NextResponse.json(
        {
          error:
            "Não consegui encontrar coordenadas para essa morada. Confirma rua, número, código postal e cidade.",
        },
        { status: 404 }
      );
    }

    const latitude = Number(bestResult.lat);
    const longitude = Number(bestResult.lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json(
        { error: "A localização encontrada veio inválida." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      latitude,
      longitude,
      display_name: bestResult.display_name || query,
      provider: "nominatim",
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao tentar localizar a morada." },
      { status: 500 }
    );
  }
}