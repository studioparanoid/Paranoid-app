import {
  getCanonicalDistrict,
  getCanonicalMunicipality,
  getMunicipalitiesForDistrict,
  normalizeLocationText,
  portugalDistricts,
  portugalMunicipalities,
} from "@/lib/portugalLocations";

export const ALL_DISTRICTS = "Todos";
export const ALL_MUNICIPALITIES = "Todos";
export const ALL_CITIES = "Todas";
export const ALL_CATEGORIES = "Todas";

export const fallbackEventCategories = [
  "Concertos",
  "Festivais",
  "DJ Sets",
  "Cinema",
  "Exposições",
  "Mercados",
  "Workshops",
  "Teatro",
  "Outros",
];

export const eventDateFilterOptions = [
  { value: "all", label: "Todas as datas" },
  { value: "today", label: "Hoje" },
  { value: "weekend", label: "Este fim de semana" },
  { value: "7d", label: "Próximos 7 dias" },
  { value: "30d", label: "Próximos 30 dias" },
] as const;

export const eventPriceFilterOptions = [
  { value: "all", label: "Todos os preços" },
  { value: "free", label: "Gratuito" },
  { value: "up-to-10", label: "Até 10€" },
  { value: "up-to-20", label: "Até 20€" },
  { value: "paid", label: "Pago" },
] as const;

export type EventDateFilter = (typeof eventDateFilterOptions)[number]["value"];
export type EventPriceFilter = (typeof eventPriceFilterOptions)[number]["value"];

export type EventFilterable = {
  title: string;
  city: string | null;
  municipality: string | null;
  district: string | null;
  address: string | null;
  postal_code: string | null;
  venue_name: string | null;
  organizer_name: string | null;
  display_date: string | null;
  start_at: string | null;
  start_date: string | null;
  end_date: string | null;
  category: string | null;
  price: string | null;
  description: string | null;
  featured: boolean | null;
  ticket_price: string | null;
};

export type IndexedEvent<T extends EventFilterable> = {
  event: T;
  district: string;
  municipality: string;
  city: string;
  normalizedDistrict: string;
  normalizedMunicipality: string;
  normalizedCity: string;
  normalizedCategory: string;
  searchableText: string;
  startTime: number | null;
  endTime: number | null;
  priceValue: number | null;
  isFree: boolean;
};

export type EventFilterState = {
  searchQuery: string;
  districtFilter: string;
  municipalityFilter: string;
  cityFilter: string;
  categoryFilter: string;
  dateFilter: EventDateFilter;
  priceFilter: EventPriceFilter;
  onlyFeatured?: boolean;
};

type BuildIndexOptions<T extends EventFilterable> = {
  getDistrict?: (event: T) => string;
  getMunicipality?: (event: T) => string;
  getCity?: (event: T) => string;
  extraSearchText?: (event: T) => Array<string | null | undefined>;
};

export function normalizeEventText(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim() || "").filter(Boolean))).sort(
    (first, second) => first.localeCompare(second, "pt-PT")
  );
}

export function getDistrictOptions() {
  return [ALL_DISTRICTS, ...portugalDistricts];
}

export function getMunicipalityOptions(districtFilter: string) {
  if (districtFilter === ALL_DISTRICTS) {
    return [ALL_MUNICIPALITIES, ...portugalMunicipalities];
  }

  return [ALL_MUNICIPALITIES, ...getMunicipalitiesForDistrict(districtFilter)];
}

export function getEventDistrict(event: EventFilterable) {
  return getCanonicalDistrict(event.district) || event.district?.trim() || "";
}

export function getEventMunicipality(event: EventFilterable) {
  const district = getEventDistrict(event);
  const explicitMunicipality =
    getCanonicalMunicipality(event.municipality, district) ||
    event.municipality?.trim() ||
    "";

  if (explicitMunicipality) {
    return explicitMunicipality;
  }

  return getCanonicalMunicipality(event.city, district);
}

function parseEventDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleanValue = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(cleanValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toDayStart(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function toDayEnd(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

function getDateWindow(dateFilter: EventDateFilter) {
  const today = toDayStart(new Date());

  if (dateFilter === "today") {
    return {
      start: today.getTime(),
      end: toDayEnd(today).getTime(),
    };
  }

  if (dateFilter === "weekend") {
    const day = today.getDay();
    const daysUntilSaturday = day === 0 ? -1 : day === 6 ? 0 : 6 - day;
    const saturday = toDayStart(new Date(today));
    saturday.setDate(today.getDate() + daysUntilSaturday);

    const sunday = toDayEnd(new Date(saturday));
    sunday.setDate(saturday.getDate() + 1);

    return {
      start: saturday.getTime(),
      end: sunday.getTime(),
    };
  }

  if (dateFilter === "7d" || dateFilter === "30d") {
    const end = toDayEnd(new Date(today));
    end.setDate(today.getDate() + (dateFilter === "7d" ? 6 : 29));

    return {
      start: today.getTime(),
      end: end.getTime(),
    };
  }

  return null;
}

function getEventStartTime(event: EventFilterable) {
  return parseEventDate(event.start_at || event.start_date || null)?.getTime() ?? null;
}

function getEventEndTime(event: EventFilterable) {
  return (
    parseEventDate(event.end_date || event.start_at || event.start_date || null)?.getTime() ??
    null
  );
}

function parsePriceText(value: string | null | undefined) {
  const cleanValue = normalizeEventText(value);

  if (!cleanValue) {
    return {
      value: null,
      isFree: false,
    };
  }

  if (
    /\b(gratis|gratuito|gratuita|livre|free)\b/.test(cleanValue) ||
    /(^|\D)0\s*(€|eur|euros)?\b/.test(cleanValue)
  ) {
    return {
      value: 0,
      isFree: true,
    };
  }

  const match = cleanValue.match(/\d+(?:[,.]\d{1,2})?/);
  const parsedPrice = match ? Number(match[0].replace(",", ".")) : null;

  return {
    value: parsedPrice === null || Number.isNaN(parsedPrice) ? null : parsedPrice,
    isFree: parsedPrice === 0,
  };
}

function getPriceIndex(event: EventFilterable) {
  const ticketPrice = parsePriceText(event.ticket_price);

  if (ticketPrice.value !== null || ticketPrice.isFree) {
    return ticketPrice;
  }

  return parsePriceText(event.price);
}

export function buildEventFilterIndex<T extends EventFilterable>(
  event: T,
  options: BuildIndexOptions<T> = {}
): IndexedEvent<T> {
  const district = options.getDistrict?.(event) || getEventDistrict(event);
  const municipality = options.getMunicipality?.(event) || getEventMunicipality(event);
  const city = options.getCity?.(event) || event.city?.trim() || "";
  const price = getPriceIndex(event);
  const searchableText = normalizeEventText(
    [
      event.title,
      event.venue_name,
      event.organizer_name,
      event.description,
      event.city,
      municipality,
      district,
      event.address,
      event.postal_code,
      event.category,
      event.price,
      event.ticket_price,
      ...(options.extraSearchText?.(event) || []),
    ]
      .filter(Boolean)
      .join(" ")
  );

  return {
    event,
    district,
    municipality,
    city,
    normalizedDistrict: normalizeLocationText(district),
    normalizedMunicipality: normalizeLocationText(municipality),
    normalizedCity: normalizeLocationText(city),
    normalizedCategory: normalizeEventText(event.category),
    searchableText,
    startTime: getEventStartTime(event),
    endTime: getEventEndTime(event),
    priceValue: price.value,
    isFree: price.isFree,
  };
}

export function filterIndexedEvents<T extends EventFilterable>(
  indexedEvents: Array<IndexedEvent<T>>,
  filters: EventFilterState
) {
  const cleanSearch = normalizeEventText(filters.searchQuery);
  const cleanDistrict = normalizeLocationText(filters.districtFilter);
  const cleanMunicipality = normalizeLocationText(filters.municipalityFilter);
  const cleanCity = normalizeLocationText(filters.cityFilter);
  const cleanCategory = normalizeEventText(filters.categoryFilter);
  const dateWindow = getDateWindow(filters.dateFilter);

  return indexedEvents.filter((indexedEvent) => {
    if (
      filters.districtFilter !== ALL_DISTRICTS &&
      indexedEvent.normalizedDistrict !== cleanDistrict
    ) {
      return false;
    }

    if (
      filters.municipalityFilter !== ALL_MUNICIPALITIES &&
      indexedEvent.normalizedMunicipality !== cleanMunicipality
    ) {
      return false;
    }

    if (filters.cityFilter !== ALL_CITIES && indexedEvent.normalizedCity !== cleanCity) {
      return false;
    }

    if (
      filters.categoryFilter !== ALL_CATEGORIES &&
      indexedEvent.normalizedCategory !== cleanCategory
    ) {
      return false;
    }

    if (filters.onlyFeatured && !indexedEvent.event.featured) {
      return false;
    }

    if (cleanSearch && !indexedEvent.searchableText.includes(cleanSearch)) {
      return false;
    }

    if (dateWindow) {
      if (indexedEvent.startTime === null) {
        return false;
      }

      const eventEndTime = indexedEvent.endTime ?? indexedEvent.startTime;

      if (indexedEvent.startTime > dateWindow.end || eventEndTime < dateWindow.start) {
        return false;
      }
    }

    if (filters.priceFilter === "free" && !indexedEvent.isFree) {
      return false;
    }

    if (filters.priceFilter === "up-to-10") {
      if (indexedEvent.priceValue === null || indexedEvent.priceValue > 10) {
        return false;
      }
    }

    if (filters.priceFilter === "up-to-20") {
      if (indexedEvent.priceValue === null || indexedEvent.priceValue > 20) {
        return false;
      }
    }

    if (
      filters.priceFilter === "paid" &&
      (indexedEvent.priceValue === null || indexedEvent.priceValue <= 0)
    ) {
      return false;
    }

    return true;
  });
}

export function getCityOptionsForIndexedEvents<T extends EventFilterable>(
  indexedEvents: Array<IndexedEvent<T>>,
  districtFilter: string,
  municipalityFilter: string
) {
  const cleanDistrict = normalizeLocationText(districtFilter);
  const cleanMunicipality = normalizeLocationText(municipalityFilter);

  const cities = indexedEvents
    .filter((indexedEvent) => {
      if (
        districtFilter !== ALL_DISTRICTS &&
        indexedEvent.normalizedDistrict !== cleanDistrict
      ) {
        return false;
      }

      if (
        municipalityFilter !== ALL_MUNICIPALITIES &&
        indexedEvent.normalizedMunicipality !== cleanMunicipality
      ) {
        return false;
      }

      return true;
    })
    .map((indexedEvent) => indexedEvent.city);

  return [ALL_CITIES, ...uniqueSorted(cities)];
}

export function getCategoryOptionsForIndexedEvents<T extends EventFilterable>(
  indexedEvents: Array<IndexedEvent<T>>
) {
  return [
    ALL_CATEGORIES,
    ...uniqueSorted([
      ...fallbackEventCategories,
      ...indexedEvents.map((indexedEvent) => indexedEvent.event.category),
    ]),
  ];
}
