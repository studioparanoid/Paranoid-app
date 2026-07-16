import "server-only";

import { rankDiscoveryContent, classifyDiscoveryIntent } from "@/lib/discovery/ranking";
import type {
  DiscoveryCommunityCandidate,
  DiscoveryEventCandidate,
  DiscoveryInteraction,
  DiscoveryProductCandidate,
  DiscoveryPromotionCandidate,
  DiscoveryRequest,
  DiscoveryResponse,
  DiscoveryVenueCandidate,
} from "@/lib/discovery/types";
import { createClient } from "@/lib/supabase/server";

const missingSchemaCodes = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

type QueryError = { code?: string; message?: string } | null;
type Row = Record<string, unknown>;

function isMissingSchema(error: QueryError) {
  return Boolean(error?.code && missingSchemaCodes.has(error.code));
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function discoveryInteraction(row: Row): DiscoveryInteraction | null {
  const itemType = text(row.item_type);
  const itemId = text(row.item_id);
  const action = text(row.action);
  if (!itemId || !itemType || !["event", "venue", "promotion", "product", "community"].includes(itemType)) return null;
  if (action !== "open" && action !== "dismiss") return null;
  return { itemType: itemType as DiscoveryInteraction["itemType"], itemId, action };
}

function lisbonDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function startOfLisbonDayIso(date = new Date()) {
  const [year, month, day] = lisbonDay(date).split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, 0));
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", hourCycle: "h23" }).format(probe));
  return new Date(probe.getTime() - hour * 60 * 60 * 1000).toISOString();
}

function eventCandidate(row: Row): DiscoveryEventCandidate {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    shortDescription: text(row.short_description),
    description: text(row.description),
    city: text(row.city),
    municipality: text(row.municipality),
    district: text(row.district),
    venueId: text(row.primary_venue_id) || text(row.venue_id),
    venueName: text(row.venue_name),
    organizerId: text(row.organizer_id),
    displayDate: text(row.display_date),
    displayTime: text(row.display_time),
    startsAt: text(row.starts_at) || text(row.start_at) || text(row.start_date),
    category: text(row.category) || text(row.event_type),
    price: text(row.price),
    ticketPrice: text(row.ticket_price),
    imageUrl: text(row.image_url),
    coverImageUrl: text(row.cover_image_url),
    featured: Boolean(row.featured || row.is_featured),
    freeEntry: typeof row.free_entry === "boolean" ? row.free_entry : null,
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    hasBar: false,
    hasTickets: Boolean(text(row.ticket_mode) && text(row.ticket_mode) !== "none"),
    followedArtist: false,
  };
}

async function loadEvents(supabase: Awaited<ReturnType<typeof createClient>>) {
  const now = new Date();
  const today = lisbonDay(now);
  const todayStart = startOfLisbonDayIso(now);
  const nowIso = now.toISOString();
  const structured = await supabase
    .from("events")
    .select("id,slug,title,short_description,description,city,municipality,district,primary_venue_id,venue_id,venue_name,organizer_id,display_date,display_time,starts_at,ends_at,start_at,start_date,end_date,category,event_type,price,ticket_price,ticket_mode,image_url,cover_image_url,featured,is_featured,free_entry,latitude,longitude,publication_status,visibility")
    .eq("publication_status", "published")
    .eq("visibility", "public")
    .or(`ends_at.gte.${nowIso},and(ends_at.is.null,starts_at.gte.${todayStart}),and(starts_at.is.null,end_date.gte.${today}),and(starts_at.is.null,end_date.is.null,start_date.gte.${today})`)
    .order("starts_at", { ascending: true, nullsFirst: false })
    .limit(160);
  if (!structured.error) return ((structured.data || []) as Row[]).map(eventCandidate);
  if (!isMissingSchema(structured.error)) throw new Error(structured.error.message);

  const legacy = await supabase
    .from("events")
    .select("id,slug,title,description,city,municipality,district,venue_id,venue_name,organizer_id,display_date,display_time,start_at,start_date,end_date,category,price,ticket_price,ticket_mode,image_url,featured,latitude,longitude,status")
    .eq("status", "published")
    .or(`end_date.gte.${today},and(end_date.is.null,start_at.gte.${todayStart}),and(end_date.is.null,start_at.is.null,start_date.gte.${today})`)
    .order("start_at", { ascending: true, nullsFirst: false })
    .limit(160);
  if (legacy.error) throw new Error(legacy.error.message);
  return ((legacy.data || []) as Row[]).map(eventCandidate);
}

function venueCandidate(row: Row): DiscoveryVenueCandidate {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    venueType: text(row.venue_type),
    shortDescription: text(row.short_description),
    description: text(row.description),
    city: text(row.city),
    municipality: text(row.municipality),
    district: text(row.district),
    imageUrl: text(row.image_url),
    coverUrl: text(row.cover_url),
    logoUrl: text(row.logo_url),
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    openNow: null,
  };
}

async function loadVenues(supabase: Awaited<ReturnType<typeof createClient>>) {
  const structured = await supabase
    .from("venues")
    .select("id,slug,name,venue_type,short_description,description,city,municipality,district,image_url,cover_url,logo_url,latitude,longitude,status")
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(160);
  if (!structured.error) return ((structured.data || []) as Row[]).map(venueCandidate);
  if (!isMissingSchema(structured.error)) throw new Error(structured.error.message);
  const legacy = await supabase.from("venues").select("id,slug,name,description,city,municipality,district,image_url,latitude,longitude").order("name", { ascending: true }).limit(160);
  if (legacy.error) return [];
  return ((legacy.data || []) as Row[]).map(venueCandidate);
}

function minutes(value: unknown) {
  const match = text(value)?.match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function lisbonClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { weekday: weekdays[values.weekday], currentMinutes: Number(values.hour) * 60 + Number(values.minute) };
}

function scheduleIsOpen(row: Row | undefined, currentMinutes: number) {
  if (!row) return null;
  if (row.is_closed === true) return false;
  const opens = minutes(row.opens_at);
  const closes = minutes(row.closes_at);
  if (opens == null || closes == null) return null;
  return closes > opens ? currentMinutes >= opens && currentMinutes < closes : currentMinutes >= opens || currentMinutes < closes;
}

async function attachOpeningStatus(supabase: Awaited<ReturnType<typeof createClient>>, venues: DiscoveryVenueCandidate[], now: Date) {
  if (!venues.length) return venues;
  const ids = venues.map((venue) => venue.id);
  const { weekday, currentMinutes } = lisbonClock(now);
  const [hours, exceptions] = await Promise.all([
    supabase.from("venue_opening_hours").select("venue_id,weekday,opens_at,closes_at,is_closed,valid_from,valid_until").in("venue_id", ids).eq("weekday", weekday),
    supabase.from("venue_opening_exceptions").select("venue_id,date,opens_at,closes_at,is_closed").in("venue_id", ids).eq("date", lisbonDay(now)),
  ]);
  if (hours.error && !isMissingSchema(hours.error)) throw new Error(hours.error.message);
  if (exceptions.error && !isMissingSchema(exceptions.error)) throw new Error(exceptions.error.message);
  const hourRows = (hours.data || []) as Row[];
  const exceptionRows = (exceptions.data || []) as Row[];
  return venues.map((venue) => {
    const exception = exceptionRows.find((row) => row.venue_id === venue.id);
    const schedule = exception || hourRows.find((row) => row.venue_id === venue.id);
    return { ...venue, openNow: scheduleIsOpen(schedule, currentMinutes) };
  });
}

async function optionalRows(response: PromiseLike<{ data: unknown[] | null; error: QueryError }>) {
  const result = await response;
  if (result.error && !isMissingSchema(result.error)) throw new Error(result.error.message || "Falha ao consultar dados de descoberta.");
  return (result.data || []) as Row[];
}

export async function buildDiscoveryResponse(request: DiscoveryRequest): Promise<DiscoveryResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const intent = classifyDiscoveryIntent(request.query, request.intent);
  const now = new Date();

  let profile: Row | null = null;
  let preferences: Row | null = null;
  let follows: Row[] = [];
  let saved: Row[] = [];
  let interactions: Row[] = [];
  if (user) {
    const profileResponse = await supabase.from("profiles").select("city,preferred_city,preferred_municipality,preferred_district,preferred_radius_km,preferred_cities,preferred_categories").eq("id", user.id).maybeSingle();
    if (!profileResponse.error) profile = profileResponse.data as Row | null;
    const preferencesResponse = await supabase.from("user_preferences").select("favorite_categories,favorite_genres,preferred_price_max,preferred_event_distance_km,allow_personalized_recommendations").eq("user_id", user.id).maybeSingle();
    if (!preferencesResponse.error || isMissingSchema(preferencesResponse.error)) preferences = preferencesResponse.data as Row | null;
    const personalizationAllowed = preferences?.allow_personalized_recommendations !== false;
    if (personalizationAllowed) {
      [follows, saved, interactions] = await Promise.all([
        optionalRows(supabase.from("follows").select("target_type,target_id").eq("user_id", user.id)),
        optionalRows(supabase.from("saved_events").select("event_id").eq("user_id", user.id)),
        optionalRows(supabase.from("discovery_interactions").select("item_type,item_id,action").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200)),
      ]);
    }
  }

  const personalized = Boolean(user && preferences?.allow_personalized_recommendations !== false);
  const followedOrganizerIds = personalized ? follows.filter((row) => row.target_type === "organizer").map((row) => String(row.target_id)) : [];
  const followedVenueIds = personalized ? follows.filter((row) => row.target_type === "venue").map((row) => String(row.target_id)) : [];
  const followedArtistIds = personalized ? follows.filter((row) => row.target_type === "artist").map((row) => String(row.target_id)) : [];
  const savedEventIds = personalized ? saved.map((row) => String(row.event_id)) : [];

  let events = await loadEvents(supabase);
  const eventIds = events.map((event) => event.id);
  const [barRows, ticketRows, followedArtistRows] = await Promise.all([
    intent === "dining" && eventIds.length ? optionalRows(supabase.from("event_vendors").select("event_id").in("event_id", eventIds).eq("vendor_type", "bar").eq("status", "active")) : Promise.resolve([]),
    eventIds.length ? optionalRows(supabase.from("ticket_products").select("event_id").in("event_id", eventIds).eq("active", true)) : Promise.resolve([]),
    followedArtistIds.length ? optionalRows(supabase.from("event_artists").select("event_id,artist_id").in("artist_id", followedArtistIds)) : Promise.resolve([]),
  ]);
  const eventsWithBars = new Set(barRows.map((row) => String(row.event_id)));
  const eventsWithTickets = new Set(ticketRows.map((row) => String(row.event_id)));
  const eventsWithFollowedArtists = new Set(followedArtistRows.map((row) => String(row.event_id)));
  events = events.map((event) => ({ ...event, hasBar: eventsWithBars.has(event.id), hasTickets: event.hasTickets || eventsWithTickets.has(event.id), followedArtist: eventsWithFollowedArtists.has(event.id) }));

  const needsVenues = intent === "dining" || intent === "nearby" || intent === "general" || Boolean(request.location);
  let venues = needsVenues ? await loadVenues(supabase) : [];
  if (intent === "dining") venues = await attachOpeningStatus(supabase, venues, now);
  const venueById = new Map(venues.map((venue) => [venue.id, venue]));
  events = events.map((event) => {
    const venue = event.venueId ? venueById.get(event.venueId) : undefined;
    return {
      ...event,
      latitude: event.latitude ?? venue?.latitude ?? null,
      longitude: event.longitude ?? venue?.longitude ?? null,
    };
  });
  const eventById = new Map(events.map((event) => [event.id, event]));

  let promotions: DiscoveryPromotionCandidate[] = [];
  if (intent === "dining" || intent === "general") {
    const rows = await optionalRows(supabase.from("promotions").select("id,title,description,promotion_type,ends_at,venue_id,event_id,vendor_id").eq("active", true).lte("starts_at", now.toISOString()).gt("ends_at", now.toISOString()).order("ends_at", { ascending: true }).limit(24));
    promotions = rows.map((row) => {
      const event = eventById.get(String(row.event_id || ""));
      const venue = venueById.get(String(row.venue_id || ""));
      return {
        id: String(row.id),
        title: String(row.title),
        description: text(row.description),
        promotionType: String(row.promotion_type || "other"),
        endsAt: String(row.ends_at),
        venueId: text(row.venue_id),
        eventId: text(row.event_id),
        entityName: event?.title || venue?.name || null,
        imageUrl: event?.coverImageUrl || event?.imageUrl || venue?.coverUrl || venue?.imageUrl || null,
        href: event ? `/eventos/${event.slug}` : venue ? `/espacos/${venue.slug}` : null,
        city: event?.municipality || event?.city || venue?.municipality || venue?.city || null,
        latitude: event?.latitude ?? venue?.latitude ?? null,
        longitude: event?.longitude ?? venue?.longitude ?? null,
      };
    });
  }

  let products: DiscoveryProductCandidate[] = [];
  if (intent === "shop") {
    const rows = await optionalRows(supabase.from("shop_products").select("id,slug,name,description,category,final_price_cents,base_price_cents,stock_quantity,shop_product_images(image_url,sort_order)").eq("status", "active").gt("stock_quantity", 0).order("created_at", { ascending: false }).limit(40));
    products = rows.map((row) => {
      const images = Array.isArray(row.shop_product_images) ? row.shop_product_images as Row[] : [];
      const image = [...images].sort((first, second) => Number(first.sort_order || 0) - Number(second.sort_order || 0))[0];
      return { id: String(row.id), slug: String(row.slug), name: String(row.name), description: text(row.description), category: text(row.category), finalPriceCents: Number(row.final_price_cents || row.base_price_cents || 0), stockQuantity: Number(row.stock_quantity || 0), imageUrl: text(image?.image_url) };
    });
  }

  let communities: DiscoveryCommunityCandidate[] = [];
  if (intent === "community") {
    const rows = await optionalRows(supabase.from("communities").select("id,name,community_type,short_description,city,municipality,district,logo_url,cover_url,website_url,instagram_url").eq("visibility", "public").eq("status", "active").limit(60));
    communities = rows.map((row) => ({ id: String(row.id), name: String(row.name), communityType: String(row.community_type || "Comunidade"), shortDescription: text(row.short_description), city: text(row.city), municipality: text(row.municipality), district: text(row.district), logoUrl: text(row.logo_url), coverUrl: text(row.cover_url), websiteUrl: text(row.website_url), instagramUrl: text(row.instagram_url) }));
  }

  const preferredCities = personalized ? [...strings(profile?.preferred_cities), text(profile?.preferred_municipality), text(profile?.preferred_city), text(profile?.city)].filter((value): value is string => Boolean(value)) : [];
  const preferredCategories = personalized ? [...strings(profile?.preferred_categories), ...strings(preferences?.favorite_categories)] : [];
  const favoriteGenres = personalized ? strings(preferences?.favorite_genres) : [];
  const ranking = rankDiscoveryContent({
    query: request.query,
    hubIntent: request.intent,
    context: request.context || {},
    events,
    venues,
    promotions,
    products,
    communities,
    followedOrganizerIds,
    followedVenueIds,
    savedEventIds,
    preferredCities,
    preferredCategories,
    favoriteGenres,
    preferredPriceMax: personalized ? numberOrNull(preferences?.preferred_price_max) : null,
    preferredRadiusKm: personalized ? numberOrNull(preferences?.preferred_event_distance_km) || numberOrNull(profile?.preferred_radius_km) : null,
    location: request.location || null,
    interactions: personalized ? interactions.map(discoveryInteraction).filter((item): item is DiscoveryInteraction => item !== null) : [],
    personalized,
    now,
  });

  return { heading: ranking.heading, summary: ranking.summary, items: ranking.items, signals: ranking.signals, personalized, generatedAt: now.toISOString() };
}
