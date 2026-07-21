import type {
  DiscoveryEventCandidate,
  DiscoveryIntent,
  DiscoveryItem,
  DiscoveryRankingInput,
} from "@/lib/discovery/types";

const diningTerms = ["sede", "beber", "bar", "cerveja", "copo", "fome", "comer", "jantar", "almocar", "restaurante", "happy hour"];
const eventTerms = ["evento", "concerto", "festival", "festa", "agenda", "musica", "dj", "noite", "sair", "programa"];
const shopTerms = ["loja", "merch", "t-shirt", "tshirt", "camisola", "vinil", "comprar"];
const communityTerms = ["comunidade", "coletivo", "associacao", "grupo", "clube"];
const nearbyTerms = ["perto", "proximo", "a minha volta", "mapa", "distancia"];
const ticketTerms = ["bilhete", "bilhetes", "entrada", "entradas"];
const ignoredTerms = new Set(["quero", "quais", "qual", "posso", "mostrar", "mostra", "procuro", "procurar", "para", "com", "sem", "uma", "uns", "das", "dos", "que", "estou", "tenho", "hoje", "agora"]);

export function normalizeDiscoveryText(value: string | null | undefined) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9€\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function classifyDiscoveryIntent(value: string, hubIntent?: DiscoveryRankingInput["hubIntent"]): DiscoveryIntent {
  const query = normalizeDiscoveryText(value);
  if (hubIntent === "dining" || includesAny(query, diningTerms)) return "dining";
  if (hubIntent === "shop" || includesAny(query, shopTerms)) return "shop";
  if (includesAny(query, communityTerms)) return "community";
  if (hubIntent === "tickets" || includesAny(query, ticketTerms)) return "tickets";
  if (hubIntent === "nearby" || hubIntent === "map" || includesAny(query, nearbyTerms)) return "nearby";
  if (hubIntent === "agenda" || hubIntent === "lineup" || includesAny(query, eventTerms)) return "events";
  return "general";
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}

export function discoveryDistanceKm(first: { latitude: number; longitude: number }, second: { latitude: number; longitude: number }) {
  const earthRadiusKm = 6371;
  const latitudeDistance = toRadians(second.latitude - first.latitude);
  const longitudeDistance = toRadians(second.longitude - first.longitude);
  const startLatitude = toRadians(first.latitude);
  const endLatitude = toRadians(second.latitude);
  const haversine = Math.sin(latitudeDistance / 2) ** 2 + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDistance / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistance(value: number) {
  return value < 1 ? `${Math.round(value * 1000)} m` : `${value.toFixed(1)} km`;
}

function compact(value: string | null | undefined, limit = 180) {
  const clean = (value || "").trim().replace(/\s+/g, " ");
  return clean.length > limit ? `${clean.slice(0, limit - 1).trimEnd()}…` : clean;
}

function parsePrice(value: string | null | undefined, freeEntry = false) {
  if (freeEntry || /gratuito|gratis|grátis|free/i.test(value || "")) return 0;
  const match = (value || "").replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function displayPrice(value: string | null | undefined, freeEntry = false) {
  if (freeEntry || /gratuito|gratis|grátis|free/i.test(value || "")) return "Gratuito";
  const clean = (value || "").trim();
  return /^\d+(?:[.,]\d+)?$/.test(clean) ? `${clean} €` : clean || null;
}

function displayTime(value: string | null | undefined) {
  const match = (value || "").match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : value || null;
}

function displayEnum(value: string | null | undefined, fallback: string) {
  const clean = (value || "").trim().toLowerCase();
  if (!clean || clean === "other") return fallback;
  const labels: Record<string, string> = {
    bar: "Bar",
    restaurant: "Restaurante",
    cafe: "Café",
    food_truck: "Food truck",
    club: "Clube",
    concert_hall: "Sala de concertos",
    festival_site: "Recinto",
    gallery: "Galeria",
    association: "Associação",
    collective: "Coletivo",
    promoter: "Promotora",
    cultural_project: "Projeto cultural",
  };
  if (labels[clean]) return labels[clean];
  const label = clean.replace(/_/g, " ");
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function usefulTerms(query: string) {
  return normalizeDiscoveryText(query).split(" ").filter((term) => term.length > 2 && !ignoredTerms.has(term) && !/^\d+$/.test(term));
}

function eventSearchText(event: DiscoveryEventCandidate) {
  return normalizeDiscoveryText([event.title, event.shortDescription, event.description, event.category, event.venueName, event.city, event.municipality, event.district].filter(Boolean).join(" "));
}

function formatEventDate(event: DiscoveryEventCandidate, now: Date) {
  if (event.displayDate) return event.displayDate;
  if (!event.startsAt) return null;
  const date = new Date(event.startsAt);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const eventDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  if (eventDay === today) return "Hoje";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", timeZone: "Europe/Lisbon" }).format(date);
}

function eventItem(event: DiscoveryEventCandidate, reason: string | null, distance: number | null, intent: DiscoveryIntent, now: Date): DiscoveryItem {
  const location = unique([event.venueName, event.municipality || event.city]).join(" · ");
  const price = displayPrice(event.price || event.ticketPrice, Boolean(event.freeEntry));
  return {
    id: event.id,
    kind: "event",
    title: event.title,
    eyebrow: event.category || "Evento",
    description: compact(event.shortDescription || event.description),
    imageUrl: event.coverImageUrl || event.imageUrl,
    reason,
    meta: unique([formatEventDate(event, now), displayTime(event.displayTime), location, distance == null ? null : formatDistance(distance), price, event.hasBar ? "Bar confirmado" : null, event.hasTickets ? "Bilhetes publicados" : null]),
    primaryAction: { label: intent === "tickets" && event.hasTickets ? "Ver bilhetes" : "Ver evento", href: `/eventos/${event.slug}` },
    secondaryAction: { label: "Mapa", href: "/mapa" },
  };
}

function resultHeading(intent: DiscoveryIntent, hasArea: boolean) {
  if (intent === "dining") return hasArea ? "O que está confirmado por perto" : "O que está confirmado";
  if (intent === "events") return "Próximos planos";
  if (intent === "nearby") return "Perto de ti";
  if (intent === "tickets") return "Eventos com bilhetes";
  if (intent === "shop") return "Da cena para ti";
  if (intent === "community") return "Comunidades para conhecer";
  return "Para ti agora";
}

export function rankDiscoveryContent(input: DiscoveryRankingInput) {
  const now = input.now || new Date();
  const intent = classifyDiscoveryIntent(input.query, input.hubIntent);
  const queryTerms = usefulTerms(input.query);
  const contextCity = normalizeDiscoveryText(input.context.city);
  const preferredCities = new Set(input.preferredCities.map(normalizeDiscoveryText));
  if (contextCity) preferredCities.add(contextCity);
  const preferredCategories = new Set([...input.preferredCategories, ...input.favoriteGenres, ...(input.context.preferredGenres || [])].map(normalizeDiscoveryText));
  const avoided = (input.context.avoidTerms || []).map(normalizeDiscoveryText);
  const followedOrganizers = new Set(input.followedOrganizerIds);
  const followedVenues = new Set(input.followedVenueIds);
  const savedEvents = new Set(input.savedEventIds);
  const dismissed = new Set(input.interactions.filter((item) => item.action === "dismiss").map((item) => `${item.itemType}:${item.itemId}`));
  const openedEvents = new Set(input.interactions.filter((item) => item.action === "open" && item.itemType === "event").map((item) => item.itemId));
  const openedCategories = new Set(input.events.filter((event) => openedEvents.has(event.id)).map((event) => normalizeDiscoveryText(event.category)).filter(Boolean));
  const maxBudget = input.context.budgetMax ?? input.preferredPriceMax;
  const radius = input.preferredRadiusKm ?? 50;
  const scored: Array<{ score: number; item: DiscoveryItem }> = [];

  for (const event of input.events) {
    if (dismissed.has(`event:${event.id}`)) continue;
    const searchText = eventSearchText(event);
    if (avoided.some((term) => term && searchText.includes(term))) continue;
    const price = parsePrice(event.price || event.ticketPrice, Boolean(event.freeEntry));
    if (maxBudget != null && price != null && price > maxBudget) continue;

    let score = 20;
    const reasons: string[] = [];
    const city = normalizeDiscoveryText(event.municipality || event.city);
    const category = normalizeDiscoveryText(event.category);
    if ((intent === "dining" || intent === "nearby") && contextCity && !input.location && city !== contextCity) continue;
    const followed = savedEvents.has(event.id) || followedOrganizers.has(event.organizerId || "") || followedVenues.has(event.venueId || "") || event.followedArtist;
    if (savedEvents.has(event.id)) { score += 130; reasons.push("Guardaste este evento"); }
    else if (followed) { score += 100; reasons.push("Ligado a um perfil que segues"); }
    if (city && preferredCities.has(city)) { score += contextCity === city ? 80 : 55; reasons.push(`Em ${event.municipality || event.city}`); }
    const matchedInterest = Array.from(preferredCategories).find((interest) => interest && searchText.includes(interest));
    if (matchedInterest) { score += 48; reasons.push(event.category || matchedInterest); }
    if (category && openedCategories.has(category)) score += 14;
    const matchedTerms = queryTerms.filter((term) => searchText.includes(term));
    if (matchedTerms.length) { score += Math.min(90, matchedTerms.length * 34); reasons.push("Corresponde ao que pediste"); }
    if (intent === "dining" && event.hasBar) { score += 75; reasons.push("Tem bar confirmado"); }
    if (intent === "tickets" && event.hasTickets) { score += 85; reasons.push("Tem bilhetes publicados"); }
    if (intent === "tickets" && !event.hasTickets) score -= 35;
    if (event.featured) score += 8;
    if (maxBudget != null && price != null) { score += 25; reasons.push(`Dentro dos ${maxBudget.toFixed(0)} €`); }

    let distance: number | null = null;
    if (input.location && event.latitude != null && event.longitude != null) {
      distance = discoveryDistanceKm(input.location, { latitude: event.latitude, longitude: event.longitude });
      if (distance > radius) continue;
      score += Math.max(0, 55 - distance);
      reasons.push("Dentro do teu raio");
    }
    if (event.startsAt) {
      const days = Math.max(0, (new Date(event.startsAt).getTime() - now.getTime()) / 86_400_000);
      score += Math.max(0, 35 - days / 2);
    }
    scored.push({ score, item: eventItem(event, reasons[0] || null, distance, intent, now) });
  }

  if (intent === "dining" || intent === "nearby" || intent === "general") {
    for (const venue of input.venues) {
      if (dismissed.has(`venue:${venue.id}`)) continue;
      const searchText = normalizeDiscoveryText([venue.name, venue.venueType, venue.shortDescription, venue.description, venue.city, venue.municipality, venue.district].filter(Boolean).join(" "));
      const city = normalizeDiscoveryText(venue.municipality || venue.city);
      const diningVenue = ["bar", "restaurant", "cafe", "food_truck"].includes(normalizeDiscoveryText(venue.venueType));
      if (intent === "dining" && !diningVenue) continue;
      if ((intent === "dining" || intent === "nearby") && contextCity && !input.location && city !== contextCity) continue;
      let score = intent === "dining" ? 70 : 10;
      const reasons: string[] = [];
      if (followedVenues.has(venue.id)) { score += 90; reasons.push("Segues este espaço"); }
      if (city && preferredCities.has(city)) { score += contextCity === city ? 75 : 45; reasons.push(`Em ${venue.municipality || venue.city}`); }
      const matches = queryTerms.filter((term) => searchText.includes(term));
      if (matches.length) { score += matches.length * 30; reasons.push("Corresponde ao que pediste"); }
      if (venue.openNow === true) { score += 100; reasons.push("Aberto agora"); }
      if (venue.openNow === false && intent === "dining") score -= 80;
      let distance: number | null = null;
      if (input.location && venue.latitude != null && venue.longitude != null) {
        distance = discoveryDistanceKm(input.location, { latitude: venue.latitude, longitude: venue.longitude });
        if (distance > radius) continue;
        score += Math.max(0, 60 - distance);
        reasons.push("Dentro do teu raio");
      }
      scored.push({
        score,
        item: {
          id: venue.id,
          kind: "venue",
          title: venue.name,
          eyebrow: displayEnum(venue.venueType, "Espaço"),
          description: compact(venue.shortDescription || venue.description),
          imageUrl: venue.coverUrl || venue.imageUrl || venue.logoUrl,
          reason: reasons[0] || null,
          meta: unique([venue.openNow === true ? "Aberto agora" : venue.openNow === false ? "Fechado agora" : null, venue.municipality || venue.city, distance == null ? null : formatDistance(distance)]),
          primaryAction: { label: "Ver espaço", href: `/espacos/${venue.slug}` },
          secondaryAction: { label: "Mapa", href: "/mapa" },
        },
      });
    }
  }

  if (intent === "dining" || intent === "general") {
    for (const promotion of input.promotions) {
      if (!promotion.href || dismissed.has(`promotion:${promotion.id}`)) continue;
      const promotionCity = normalizeDiscoveryText(promotion.city);
      if (contextCity && !input.location && promotionCity !== contextCity) continue;
      let distance: number | null = null;
      if (input.location && promotion.latitude != null && promotion.longitude != null) {
        distance = discoveryDistanceKm(input.location, { latitude: promotion.latitude, longitude: promotion.longitude });
        if (distance > radius) continue;
      }
      const endsAt = new Date(promotion.endsAt);
      scored.push({
        score: intent === "dining" ? 230 : 75,
        item: {
          id: promotion.id,
          kind: "promotion",
          title: promotion.title,
          eyebrow: promotion.promotionType === "happy_hour" ? "Happy hour" : "Promoção ativa",
          description: compact(promotion.description),
          imageUrl: promotion.imageUrl,
          reason: "Está ativa neste momento",
          meta: unique([promotion.entityName, distance == null ? null : formatDistance(distance), Number.isNaN(endsAt.getTime()) ? null : `Até às ${new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }).format(endsAt)}`]),
          primaryAction: { label: promotion.eventId ? "Ver evento" : "Ver espaço", href: promotion.href },
          secondaryAction: { label: "Mapa", href: "/mapa" },
        },
      });
    }
  }

  if (intent === "shop") {
    for (const product of input.products) {
      if (product.stockQuantity <= 0 || dismissed.has(`product:${product.id}`)) continue;
      const searchText = normalizeDiscoveryText([product.name, product.description, product.category].filter(Boolean).join(" "));
      const matches = queryTerms.filter((term) => searchText.includes(term));
      scored.push({
        score: 100 + matches.length * 35,
        item: {
          id: product.id,
          kind: "product",
          title: product.name,
          eyebrow: product.category || "Loja",
          description: compact(product.description),
          imageUrl: product.imageUrl,
          reason: matches.length ? "Corresponde ao que pediste" : null,
          meta: [new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(product.finalPriceCents / 100)],
          primaryAction: { label: "Ver produto", href: `/loja/${product.slug}` },
        },
      });
    }
  }

  if (intent === "community") {
    for (const album of input.albums) {
      if (dismissed.has(`album:${album.id}`)) continue;
      const matches = queryTerms.filter((term) => normalizeDiscoveryText(album.title).includes(term));
      scored.push({
        score: 70 + matches.length * 40,
        item: {
          id: album.id,
          kind: "album",
          title: album.title,
          eyebrow: "Álbum",
          description: "",
          imageUrl: album.coverImageUrl,
          reason: matches.length ? "Corresponde ao que pediste" : null,
          meta: [],
          primaryAction: { label: "Ver álbum", href: `/albuns/${album.id}` },
        },
      });
    }
    for (const community of input.communities) {
      const href = community.websiteUrl || community.instagramUrl;
      if (!href || dismissed.has(`community:${community.id}`)) continue;
      const searchText = normalizeDiscoveryText([community.name, community.communityType, community.shortDescription, community.city, community.municipality, community.district].filter(Boolean).join(" "));
      const matches = queryTerms.filter((term) => searchText.includes(term));
      scored.push({
        score: 80 + matches.length * 40,
        item: {
          id: community.id,
          kind: "community",
          title: community.name,
          eyebrow: displayEnum(community.communityType, "Comunidade"),
          description: compact(community.shortDescription),
          imageUrl: community.coverUrl || community.logoUrl,
          reason: matches.length ? "Corresponde ao que pediste" : null,
          meta: unique([community.municipality || community.city, community.district]),
          primaryAction: { label: "Conhecer comunidade", href, external: true },
        },
      });
    }
  }

  const limits: Record<DiscoveryItem["kind"], number> = { event: 8, venue: 4, promotion: 2, product: 8, community: 6, album: 4 };
  const counts = new Map<DiscoveryItem["kind"], number>();
  const items = scored.sort((first, second) => second.score - first.score).filter(({ item }) => {
    const count = counts.get(item.kind) || 0;
    if (count >= limits[item.kind]) return false;
    counts.set(item.kind, count + 1);
    return true;
  }).slice(0, 12).map(({ item }) => item);

  const signals = unique([
    input.context.city ? input.context.city : null,
    input.context.nightStyle || input.context.preferredGenres?.[0] || null,
    input.savedEventIds.length ? "eventos guardados" : null,
    input.followedOrganizerIds.length || input.followedVenueIds.length ? "perfis seguidos" : null,
    input.location ? input.location.label || "localização do Mapa" : null,
  ]).slice(0, 4);
  const countLabel = items.length === 1 ? "1 possibilidade" : `${items.length} possibilidades`;
  return {
    intent,
    heading: resultHeading(intent, Boolean(contextCity || input.location)),
    summary: items.length ? `${countLabel} com dados publicados pela Paranoid.` : "Ainda não há conteúdo publicado que corresponda a este contexto.",
    items,
    signals,
  };
}
