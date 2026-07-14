import { NextResponse } from "next/server";
import {
  normalizeGeocodingResult,
  type GeocodingProviderAddress,
} from "@/lib/location/normalizeGeocodingResult";

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

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
  type?: string;
  class?: string;
  importance?: number;
  address?: GeocodingProviderAddress;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function buildQuery(values: string[]) {
  const cleanValues = values
    .map((value) => cleanText(value))
    .filter(Boolean)
    .filter((value) => normalizeLookupText(value) !== "portugal");

  return [...cleanValues, "Portugal"].join(", ");
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
  const venue = cleanText(body.venue);
  const address = cleanText(body.address);
  const postalCode = cleanText(body.postal_code);
  const city = cleanText(body.city);
  const municipality = cleanText(body.municipality);
  const district = cleanText(body.district);

  if (
    !manualQuery &&
    !venue &&
    !address &&
    !postalCode &&
    !city &&
    !municipality &&
    !district
  ) {
    return NextResponse.json(
      {
        error: "Mete o nome do espaço, uma morada ou uma localidade.",
      },
      { status: 400 }
    );
  }

  const queries = manualQuery
    ? uniqueQueries([
        buildQuery([
          manualQuery,
          postalCode,
          city,
          municipality,
          district,
        ]),
        buildQuery([manualQuery, postalCode]),
        buildQuery([manualQuery, municipality || city || district]),
        buildQuery([manualQuery]),
      ])
    : uniqueQueries([
        buildQuery([
          venue,
          address,
          postalCode,
          city,
          municipality,
          district,
        ]),
        buildQuery([venue, city, municipality, district]),
        buildQuery([address, city, municipality, district]),
        buildQuery([address, postalCode, municipality, district]),
        buildQuery([venue, address, postalCode]),
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
      const fallback = getFallbackLocation(
        manualQuery || [venue, address, city, municipality, district].filter(Boolean).join(" ")
      );

      if (fallback) {
        const normalized = normalizeGeocodingResult({
          latitude: fallback.latitude,
          longitude: fallback.longitude,
          displayName: fallback.display_name,
          venueName: venue,
          fallbackAddress: address,
          fallbackPostalCode: postalCode,
          fallbackCity: fallback.city,
          fallbackMunicipality: fallback.municipality,
          fallbackDistrict: fallback.district,
        });

        return NextResponse.json({
          latitude: normalized.latitude,
          longitude: normalized.longitude,
          display_name: normalized.displayName,
          provider: "fallback",
          venue_name: normalized.venueName,
          address: normalized.address,
          locality: normalized.locality,
          city: normalized.city,
          municipality: normalized.municipality,
          district: normalized.district,
          postal_code: normalized.postalCode,
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

    const normalized = normalizeGeocodingResult({
      latitude,
      longitude,
      displayName: bestResult.display_name || usedQuery,
      address: bestResult.address,
      venueName: venue,
      fallbackAddress: address,
      fallbackPostalCode: postalCode,
      fallbackCity: city,
      fallbackMunicipality: municipality,
      fallbackDistrict: district,
    });

    return NextResponse.json({
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      display_name: normalized.displayName,
      provider: "nominatim",
      venue_name: normalized.venueName,
      address: normalized.address,
      locality: normalized.locality,
      city: normalized.city,
      municipality: normalized.municipality,
      district: normalized.district,
      postal_code: normalized.postalCode,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao tentar localizar a morada." },
      { status: 500 }
    );
  }
}
