import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type GeocodeRequestBody = {
  query?: string;
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

function buildQuery(values: string[]) {
  return [...values.filter(Boolean), "Portugal"].join(", ");
}

function uniqueQueries(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeLookupText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const fallbackLocations = [
  {
    keys: ["pombal", "pombal leiria", "pombal portugal"],
    latitude: 39.9167,
    longitude: -8.6333,
    display_name: "Pombal, Leiria, Portugal",
    city: "Pombal",
    municipality: "Pombal",
    district: "Leiria",
  },
  {
    keys: ["catela", "catela pombal", "catela pombal leiria"],
    latitude: 39.907,
    longitude: -8.584,
    display_name: "Catela, Pombal, Leiria, Portugal",
    city: "Catela",
    municipality: "Pombal",
    district: "Leiria",
  },
];

function getFallbackLocation(query: string) {
  const cleanQuery = normalizeLookupText(query);

  return fallbackLocations.find((location) =>
    location.keys.some((key) => cleanQuery === key)
  );
}

function pickBestResult(results: NominatimResult[]) {
  return (
    results.find((result) => {
      const resultType = `${result.class || ""}:${result.type || ""}`;

      return ![
        "boundary:administrative",
        "place:district",
        "place:county",
      ].includes(resultType);
    }) || results[0]
  );
}

async function searchNominatim(query: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "pt");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": "ParanoidApp/1.0 (https://paranoid.pt)",
      "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.7",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("O serviço de localização não respondeu bem.");
  }

  return (await response.json()) as NominatimResult[];
}

export async function POST(request: Request) {
  let body: GeocodeRequestBody;

  try {
    body = (await request.json()) as GeocodeRequestBody;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const manualQuery = cleanText(body.query);
  const address = cleanText(body.address);
  const postalCode = cleanText(body.postal_code);
  const city = cleanText(body.city);
  const municipality = cleanText(body.municipality);
  const district = cleanText(body.district);

  if (!manualQuery && (!address || (!postalCode && !city && !municipality && !district))) {
    return NextResponse.json(
      {
        error:
          "Mete uma morada com código postal, localidade ou concelho para localizar.",
      },
      { status: 400 }
    );
  }

  const queries = manualQuery
    ? uniqueQueries([
        buildQuery([manualQuery]),
        buildQuery([manualQuery, postalCode]),
        buildQuery([manualQuery, municipality || city || district]),
        buildQuery([manualQuery, "Leiria"]),
        buildQuery([manualQuery, "Portugal"]),
      ])
    : uniqueQueries([
        buildQuery([address, postalCode]),
        buildQuery([address, postalCode, municipality, district]),
        buildQuery([address, postalCode, city, municipality, district]),
        buildQuery([address, city, municipality, district]),
        buildQuery([postalCode, city, municipality, district]),
      ]);

  try {
    let bestResult: NominatimResult | undefined;
    let usedQuery = queries[0] || "";
    let lastError: unknown;

    for (const query of queries) {
      try {
        const results = await searchNominatim(query);
        bestResult = pickBestResult(results);
      } catch (error) {
        lastError = error;
        continue;
      }

      if (bestResult) {
        usedQuery = query;
        break;
      }
    }

    if (!bestResult) {
      const fallback = getFallbackLocation(manualQuery || address);

      if (fallback) {
        return NextResponse.json({
          latitude: fallback.latitude,
          longitude: fallback.longitude,
          display_name: fallback.display_name,
          provider: "fallback",
          city: fallback.city,
          municipality: fallback.municipality,
          district: fallback.district,
          postal_code: postalCode,
        });
      }

      if (lastError) {
        return NextResponse.json(
          {
            error:
              "Não consegui contactar o serviço de localização agora. Tenta uma morada mais completa ou volta a tentar daqui a pouco.",
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Não consegui encontrar coordenadas para essa localização. Confirma rua, número, código postal, localidade ou concelho.",
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
      bestResult.address?.city,
      bestResult.address?.town,
      bestResult.address?.village,
      bestResult.address?.suburb,
      city,
    ]);

    const resolvedMunicipality = firstCleanValue([
      bestResult.address?.municipality,
      bestResult.address?.county,
      municipality,
    ]);

    const resolvedDistrict = firstCleanValue([
      bestResult.address?.state,
      bestResult.address?.region,
      district,
    ]);

    const resolvedPostalCode = firstCleanValue([
      postalCode,
      bestResult.address?.postcode,
    ]);

    return NextResponse.json({
      latitude,
      longitude,
      display_name: bestResult.display_name || usedQuery,
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
