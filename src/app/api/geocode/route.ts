import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type GeocodeRequestBody = {
  venue?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  municipality?: string;
  district?: string;
};

type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  postcode?: string;
  country?: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
  type?: string;
  class?: string;
  importance?: number;
  address?: NominatimAddress;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function firstCleanValue(values: Array<string | undefined>) {
  for (const value of values) {
    const cleanValue = cleanText(value);

    if (cleanValue) {
      return cleanValue;
    }
  }

  return "";
}

export async function POST(request: Request) {
  let body: GeocodeRequestBody;

  try {
    body = (await request.json()) as GeocodeRequestBody;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const venue = cleanText(body.venue);
  const address = cleanText(body.address);
  const postalCode = cleanText(body.postal_code);
  const city = cleanText(body.city);
  const municipality = cleanText(body.municipality);
  const district = cleanText(body.district);

  if (!address || (!city && !municipality)) {
    return NextResponse.json(
      {
        error:
          "Mete pelo menos morada e cidade/localidade ou concelho para localizar.",
      },
      { status: 400 }
    );
  }

  const query = [
    venue,
    address,
    postalCode,
    city,
    municipality,
    district,
    "Portugal",
  ]
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
            "Não consegui encontrar coordenadas para essa morada. Confirma rua, número, código postal, localidade e concelho.",
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

    const resolvedCity = firstCleanValue([
      city,
      bestResult.address?.city,
      bestResult.address?.town,
      bestResult.address?.village,
      bestResult.address?.suburb,
    ]);

    const resolvedMunicipality = firstCleanValue([
      municipality,
      bestResult.address?.municipality,
      bestResult.address?.county,
    ]);

    const resolvedDistrict = firstCleanValue([
      district,
      bestResult.address?.state,
      bestResult.address?.region,
    ]);

    const resolvedPostalCode = firstCleanValue([
      postalCode,
      bestResult.address?.postcode,
    ]);

    return NextResponse.json({
      latitude,
      longitude,
      display_name: bestResult.display_name || query,
      provider: "nominatim",
      city: resolvedCity,
      municipality: resolvedMunicipality,
      district: resolvedDistrict,
      postal_code: resolvedPostalCode,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao tentar localizar a morada." },
      { status: 500 }
    );
  }
}