import {
  portugalDistricts,
  portugalMunicipalities,
  portugalMunicipalitiesByDistrict,
} from "@/lib/portugalLocations";

export type GeocodingProviderAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  region?: string;
  postcode?: string;
};

type NormalizeGeocodingInput = {
  latitude: number;
  longitude: number;
  displayName: string;
  address?: GeocodingProviderAddress;
  venueName?: string;
  fallbackAddress?: string;
  fallbackPostalCode?: string;
  fallbackCity?: string;
  fallbackMunicipality?: string;
  fallbackDistrict?: string;
};

export type NormalizedGeocodingResult = {
  venueName: string;
  address: string;
  postalCode: string;
  locality: string;
  city: string;
  municipality: string;
  district: string;
  latitude: number;
  longitude: number;
  displayName: string;
};

function cleanText(value: string | null | undefined) {
  return String(value || "").trim();
}

export function normalizeGeographicComparison(value: string | null | undefined) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(distrito|district|municipio|municipality|concelho|county)\s+(de|do|da|of)\b/g, " ")
    .replace(/\b(distrito|district|municipio|municipality|concelho|county)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getCanonicalGeocodingDistrict(
  value: string | null | undefined
) {
  const normalized = normalizeGeographicComparison(value);

  if (!normalized) return "";

  return (
    portugalDistricts.find(
      (district) => normalizeGeographicComparison(district) === normalized
    ) || ""
  );
}

export function getCanonicalGeocodingMunicipality(
  value: string | null | undefined,
  district?: string | null
) {
  const normalized = normalizeGeographicComparison(value);

  if (!normalized) return "";

  const canonicalDistrict = getCanonicalGeocodingDistrict(district);
  const source = canonicalDistrict
    ? portugalMunicipalitiesByDistrict[canonicalDistrict] || []
    : portugalMunicipalities;

  return (
    source.find(
      (municipality) =>
        normalizeGeographicComparison(municipality) === normalized
    ) || ""
  );
}

export function findDistrictForGeocodingMunicipality(
  value: string | null | undefined
) {
  const canonicalMunicipality = getCanonicalGeocodingMunicipality(value);

  if (!canonicalMunicipality) return "";

  for (const district of portugalDistricts) {
    if (
      (portugalMunicipalitiesByDistrict[district] || []).includes(
        canonicalMunicipality
      )
    ) {
      return district;
    }
  }

  return "";
}

function firstValue(values: Array<string | null | undefined>) {
  for (const value of values) {
    const cleanValue = cleanText(value);
    if (cleanValue) return cleanValue;
  }

  return "";
}

export function normalizeGeocodingResult({
  latitude,
  longitude,
  displayName,
  address = {},
  venueName,
  fallbackAddress,
  fallbackPostalCode,
  fallbackCity,
  fallbackMunicipality,
  fallbackDistrict,
}: NormalizeGeocodingInput): NormalizedGeocodingResult {
  const municipalityCandidates = [
    address.municipality,
    address.city,
    address.town,
    fallbackMunicipality,
    address.county,
  ];

  let municipality = "";
  for (const candidate of municipalityCandidates) {
    municipality = getCanonicalGeocodingMunicipality(candidate);
    if (municipality) break;
  }

  const districtCandidates = [
    address.state_district,
    address.state,
    address.region,
    fallbackDistrict,
  ];

  let district = "";
  for (const candidate of districtCandidates) {
    district = getCanonicalGeocodingDistrict(candidate);
    if (district) break;
  }

  if (!district && municipality) {
    district = findDistrictForGeocodingMunicipality(municipality);
  }

  if (district && municipality) {
    municipality =
      getCanonicalGeocodingMunicipality(municipality, district) || "";
  }

  const locality = firstValue([
    address.village,
    address.town,
    address.city,
    address.suburb,
    address.neighbourhood,
    fallbackCity,
    municipality,
  ]);
  const normalizedAddress = firstValue([
    [address.road, address.house_number].filter(Boolean).join(" "),
    fallbackAddress,
  ]);

  return {
    venueName: cleanText(venueName),
    address: normalizedAddress,
    postalCode: firstValue([address.postcode, fallbackPostalCode]),
    locality,
    city: locality,
    municipality,
    district,
    latitude,
    longitude,
    displayName: cleanText(displayName),
  };
}
