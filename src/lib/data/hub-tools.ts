import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ActivePromotion,
  DataSource,
  EventService,
  EventSummary,
  EventTicket,
  EventZone,
  FoodOption,
  LiveStatus,
  ProgramItem,
  ToolResult,
  TransportRoute,
} from "@/lib/data/contracts";
import {
  boundedLimit,
  cleanSearchTerm,
  requireCoordinate,
  requireIsoDate,
  requireUuid,
  requireUuidOrSlug,
} from "@/lib/data/validators";

type QueryError = { code?: string; message: string } | null;

const structuredSchemaErrors = new Set(["42P01", "42703", "PGRST200", "PGRST204", "PGRST205"]);

function canFallback(error: QueryError) {
  return Boolean(error?.code && structuredSchemaErrors.has(error.code));
}

function throwQueryError(error: QueryError) {
  if (error) throw new Error(error.message);
}

function latestTimestamp(rows: Array<Record<string, unknown>>) {
  const values = rows
    .flatMap((row) => [row.updated_at, row.last_confirmed_at, row.verified_at, row.created_at])
    .filter((value): value is string => typeof value === "string")
    .sort();
  return values.at(-1) || null;
}

function sourceFromRows(rows: Array<Record<string, unknown>>, fallback: DataSource = "unknown") {
  const source = rows.find((row) => typeof row.source_type === "string")?.source_type;
  return typeof source === "string" ? source as DataSource : fallback;
}

function result<T>(data: T, rows: Array<Record<string, unknown>>, fallback: DataSource, isLive = false): ToolResult<T> {
  return { data, source: sourceFromRows(rows, fallback), lastUpdatedAt: latestTimestamp(rows), isLive };
}

function mapEvent(row: Record<string, unknown>): EventSummary {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    eventType: typeof row.event_type === "string" ? row.event_type : typeof row.category === "string" ? row.category : null,
    startsAt: typeof row.starts_at === "string" ? row.starts_at : typeof row.start_at === "string" ? row.start_at : null,
    endsAt: typeof row.ends_at === "string" ? row.ends_at : typeof row.end_at === "string" ? row.end_at : null,
    displayDate: typeof row.display_date === "string" ? row.display_date : null,
    displayTime: typeof row.display_time === "string" ? row.display_time : null,
    venueName: typeof row.venue_name === "string" ? row.venue_name : null,
    city: typeof row.municipality === "string" ? row.municipality : typeof row.city === "string" ? row.city : null,
    freeEntry: typeof row.free_entry === "boolean" ? row.free_entry : null,
    legacyPrice: typeof row.ticket_price === "string" ? row.ticket_price : typeof row.price === "string" ? row.price : null,
  };
}

async function resolveEvent(value: string) {
  const key = requireUuidOrSlug(value);
  const supabase = await createClient();
  let query = supabase.from("events").select("id,slug,title,status,publication_status,visibility,updated_at");
  query = key.includes("-") && key.length === 36 ? query.eq("id", key) : query.eq("slug", key);
  const { data, error } = await query.maybeSingle();
  throwQueryError(error);
  return data as Record<string, unknown> | null;
}

export async function searchEvents(args: { query: string; limit?: number; city?: string; from?: string; to?: string }) {
  const query = cleanSearchTerm(args.query);
  const limit = boundedLimit(args.limit);
  const supabase = await createClient();
  const pattern = `%${query.replace(/[%_]/g, "")}%`;
  let structured = supabase
    .from("events")
    .select("id,slug,title,event_type,starts_at,ends_at,display_date,display_time,venue_name,city,municipality,free_entry,price,ticket_price,publication_status,visibility,updated_at")
    .eq("publication_status", "published")
    .eq("visibility", "public")
    .ilike("title", pattern)
    .order("starts_at", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (args.city) structured = structured.ilike("municipality", `%${cleanSearchTerm(args.city, 60).replace(/[%_]/g, "")}%`);
  if (args.from) structured = structured.gte("starts_at", requireIsoDate(args.from, "data inicial"));
  if (args.to) structured = structured.lte("starts_at", requireIsoDate(args.to, "data final"));
  const structuredResponse = await structured;
  if (!structuredResponse.error) {
    const rows = (structuredResponse.data || []) as Array<Record<string, unknown>>;
    if (rows.length) return result(rows.map(mapEvent), rows, "organizer");
  }
  if (structuredResponse.error && !canFallback(structuredResponse.error)) throwQueryError(structuredResponse.error);

  let legacy = supabase
    .from("events")
    .select("id,slug,title,category,start_at,end_at,display_date,display_time,venue_name,city,municipality,price,ticket_price,created_at")
    .eq("status", "published")
    .ilike("title", pattern)
    .order("start_at", { ascending: true, nullsFirst: false })
    .limit(limit);
  if (args.city) legacy = legacy.ilike("municipality", `%${cleanSearchTerm(args.city, 60).replace(/[%_]/g, "")}%`);
  const legacyResponse = await legacy;
  throwQueryError(legacyResponse.error);
  const rows = (legacyResponse.data || []) as Array<Record<string, unknown>>;
  return result(rows.map(mapEvent), rows, "legacy");
}

export async function getEventDetails(args: { event: string }) {
  const event = await resolveEvent(args.event);
  if (!event) return result(null, [], "unknown");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id,slug,title,short_description,description,event_type,organizer_id,primary_venue_id,starts_at,ends_at,doors_open_at,timezone,is_multi_day,is_online,online_url,minimum_age,language,capacity,free_entry,publication_status,visibility,updated_at,venue_name,organizer_name,display_date,display_time,price,ticket_price,start_at,end_at")
    .eq("id", String(event.id))
    .maybeSingle();
  if (error && canFallback(error)) return result(event, [event], "legacy");
  throwQueryError(error);
  return result(data as Record<string, unknown> | null, data ? [data as Record<string, unknown>] : [], "organizer");
}

function mapProgramItem(row: Record<string, unknown>): ProgramItem {
  const zone = row.event_zones as { name?: string } | null;
  const relations = Array.isArray(row.program_item_artists) ? row.program_item_artists : [];
  return {
    id: String(row.id), eventId: String(row.event_id),
    dayId: typeof row.event_day_id === "string" ? row.event_day_id : null,
    zoneId: typeof row.zone_id === "string" ? row.zone_id : null,
    zoneName: typeof zone?.name === "string" ? zone.name : null,
    title: String(row.title), programType: String(row.program_type),
    scheduledStartAt: String(row.scheduled_start_at),
    scheduledEndAt: typeof row.scheduled_end_at === "string" ? row.scheduled_end_at : null,
    actualStartAt: typeof row.actual_start_at === "string" ? row.actual_start_at : null,
    actualEndAt: typeof row.actual_end_at === "string" ? row.actual_end_at : null,
    status: String(row.status), delayMinutes: Number(row.delay_minutes || 0),
    artists: relations.flatMap((relation) => {
      const item = relation as { role?: string | null; artists?: { id?: string; slug?: string; name?: string } | null };
      return item.artists?.id ? [{ id: item.artists.id, slug: String(item.artists.slug), name: String(item.artists.name), role: item.role || null }] : [];
    }),
  };
}

export async function getEventProgram(args: { event: string; day?: string; zoneId?: string; limit?: number }) {
  const event = await resolveEvent(args.event);
  if (!event) return result<ProgramItem[]>([], [], "unknown");
  const limit = boundedLimit(args.limit, 25, 100);
  const supabase = await createClient();
  let query = supabase
    .from("event_program_items")
    .select("id,event_id,event_day_id,zone_id,title,program_type,scheduled_start_at,scheduled_end_at,actual_start_at,actual_end_at,status,delay_minutes,source_type,last_confirmed_at,updated_at,event_zones(name),program_item_artists(role,artists(id,slug,name))")
    .eq("event_id", String(event.id))
    .neq("status", "draft")
    .order("scheduled_start_at", { ascending: true })
    .limit(limit);
  if (args.zoneId) query = query.eq("zone_id", requireUuid(args.zoneId, "zoneId"));
  if (args.day) {
    const start = requireIsoDate(`${args.day}T00:00:00`, "dia");
    const end = requireIsoDate(`${args.day}T23:59:59`, "dia");
    query = query.gte("scheduled_start_at", start).lte("scheduled_start_at", end);
  }
  const { data, error } = await query;
  if (error && canFallback(error)) return result<ProgramItem[]>([], [], "legacy");
  throwQueryError(error);
  const rows = (data || []) as unknown as Array<Record<string, unknown>>;
  return result(rows.map(mapProgramItem), rows, "organizer");
}

export async function getCurrentProgramItems(args: { event: string; at?: string; zoneId?: string }) {
  const at = new Date(args.at ? requireIsoDate(args.at) : new Date().toISOString());
  const response = await getEventProgram({ event: args.event, zoneId: args.zoneId, limit: 100 });
  const data = response.data.filter((item) => {
    if (["cancelled", "finished"].includes(item.status)) return false;
    if (item.status === "live") return true;
    const start = new Date(item.actualStartAt || item.scheduledStartAt);
    const end = item.actualEndAt || item.scheduledEndAt;
    return start <= at && (!end || new Date(end) > at);
  });
  return { ...response, data, isLive: data.some((item) => item.status === "live") };
}

export async function getNextProgramItems(args: { event: string; after?: string; zoneId?: string; limit?: number }) {
  const after = new Date(args.after ? requireIsoDate(args.after) : new Date().toISOString());
  const response = await getEventProgram({ event: args.event, zoneId: args.zoneId, limit: 100 });
  return { ...response, data: response.data.filter((item) => new Date(item.scheduledStartAt) > after && item.status !== "cancelled").slice(0, boundedLimit(args.limit, 5, 20)) };
}

export async function getEventZones(args: { event: string; type?: string }) {
  const event = await resolveEvent(args.event);
  if (!event) return result<EventZone[]>([], [], "unknown");
  const supabase = await createClient();
  let query = supabase.from("event_zones").select("id,name,slug,zone_type,parent_zone_id,map_label,latitude,longitude,map_x,map_y,accessibility_notes,updated_at").eq("event_id", String(event.id)).eq("status", "active").order("sort_order");
  if (args.type) query = query.eq("zone_type", cleanSearchTerm(args.type, 40).replace(/\s/g, "_"));
  const { data, error } = await query;
  if (error && canFallback(error)) return result<EventZone[]>([], [], "legacy");
  throwQueryError(error);
  const rows = (data || []) as Array<Record<string, unknown>>;
  const mapped = rows.map((row) => ({
    id: String(row.id), name: String(row.name), slug: String(row.slug), zoneType: String(row.zone_type),
    parentZoneId: typeof row.parent_zone_id === "string" ? row.parent_zone_id : null,
    mapLabel: typeof row.map_label === "string" ? row.map_label : null,
    latitude: typeof row.latitude === "number" ? row.latitude : null, longitude: typeof row.longitude === "number" ? row.longitude : null,
    mapX: typeof row.map_x === "number" ? row.map_x : null, mapY: typeof row.map_y === "number" ? row.map_y : null,
    accessible: Boolean(row.accessibility_notes) || row.zone_type === "accessible_toilet",
  }));
  return result(mapped, rows, "organizer");
}

export async function getEventFoodOptions(args: { event: string; vegan?: boolean; vegetarian?: boolean; availableOnly?: boolean; limit?: number }) {
  const event = await resolveEvent(args.event);
  if (!event) return result<FoodOption[]>([], [], "unknown");
  const supabase = await createClient();
  const vendorsResponse = await supabase.from("event_vendors").select("id,name,vendor_type,zone_id,source_type,updated_at").eq("event_id", String(event.id)).eq("status", "active");
  if (vendorsResponse.error && canFallback(vendorsResponse.error)) return result<FoodOption[]>([], [], "legacy");
  throwQueryError(vendorsResponse.error);
  const vendors = (vendorsResponse.data || []) as Array<Record<string, unknown>>;
  if (!vendors.length) return result<FoodOption[]>([], [], "organizer");
  let itemQuery = supabase.from("menu_items").select("id,vendor_id,name,description,price_amount,currency,available,sold_out,vegetarian,vegan,gluten_free,allergen_information_confirmed,estimated_wait_minutes,source_type,last_confirmed_at,updated_at").in("vendor_id", vendors.map((vendor) => String(vendor.id))).limit(boundedLimit(args.limit, 20, 50));
  if (args.vegan) itemQuery = itemQuery.eq("vegan", true);
  if (args.vegetarian) itemQuery = itemQuery.eq("vegetarian", true);
  if (args.availableOnly !== false) itemQuery = itemQuery.eq("available", true).eq("sold_out", false);
  const itemResponse = await itemQuery;
  throwQueryError(itemResponse.error);
  const rows = (itemResponse.data || []) as Array<Record<string, unknown>>;
  const vendorById = new Map(vendors.map((vendor) => [String(vendor.id), vendor]));
  const mapped = rows.flatMap((row) => {
    const vendor = vendorById.get(String(row.vendor_id));
    return vendor ? [{
      id: String(row.id), vendorId: String(vendor.id), vendorName: String(vendor.name), vendorType: String(vendor.vendor_type),
      zoneId: typeof vendor.zone_id === "string" ? vendor.zone_id : null, name: String(row.name),
      description: typeof row.description === "string" ? row.description : null, priceAmount: Number(row.price_amount), currency: String(row.currency),
      available: Boolean(row.available), soldOut: Boolean(row.sold_out), vegetarian: Boolean(row.vegetarian), vegan: Boolean(row.vegan),
      glutenFree: Boolean(row.gluten_free), allergenInformationConfirmed: Boolean(row.allergen_information_confirmed),
      estimatedWaitMinutes: typeof row.estimated_wait_minutes === "number" ? row.estimated_wait_minutes : null,
    }] : [];
  });
  return result(mapped, [...vendors, ...rows], "organizer");
}

export async function getActivePromotions(args: { event: string; at?: string }) {
  const event = await resolveEvent(args.event);
  if (!event) return result<ActivePromotion[]>([], [], "unknown");
  const at = args.at ? requireIsoDate(args.at) : new Date().toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase.from("promotions").select("id,title,description,promotion_type,starts_at,ends_at,vendor_id,terms,source_type,last_confirmed_at,updated_at").eq("event_id", String(event.id)).eq("active", true).lte("starts_at", at).gt("ends_at", at).order("ends_at");
  if (error && canFallback(error)) return result<ActivePromotion[]>([], [], "legacy");
  throwQueryError(error);
  const rows = (data || []) as Array<Record<string, unknown>>;
  return result(rows.map((row) => ({ id: String(row.id), title: String(row.title), description: typeof row.description === "string" ? row.description : null, promotionType: String(row.promotion_type), startsAt: String(row.starts_at), endsAt: String(row.ends_at), vendorId: typeof row.vendor_id === "string" ? row.vendor_id : null, terms: typeof row.terms === "string" ? row.terms : null })), rows, "organizer", rows.length > 0);
}

export async function getEventServices(args: { event: string; type?: string; accessible?: boolean }) {
  const event = await resolveEvent(args.event);
  if (!event) return result<EventService[]>([], [], "unknown");
  const supabase = await createClient();
  let query = supabase.from("event_services").select("id,service_type,name,description,zone_id,accessible,status,opens_at,closes_at,source_type,last_confirmed_at,updated_at").eq("event_id", String(event.id)).eq("status", "active").order("sort_order");
  if (args.type) query = query.eq("service_type", cleanSearchTerm(args.type, 40).replace(/\s/g, "_"));
  if (args.accessible) query = query.eq("accessible", true);
  const { data, error } = await query;
  if (error && canFallback(error)) return result<EventService[]>([], [], "legacy");
  throwQueryError(error);
  const rows = (data || []) as Array<Record<string, unknown>>;
  return result(rows.map((row) => ({ id: String(row.id), serviceType: String(row.service_type), name: String(row.name), description: typeof row.description === "string" ? row.description : null, zoneId: typeof row.zone_id === "string" ? row.zone_id : null, accessible: Boolean(row.accessible), status: String(row.status), opensAt: typeof row.opens_at === "string" ? row.opens_at : null, closesAt: typeof row.closes_at === "string" ? row.closes_at : null })), rows, "organizer");
}

export async function getEventTransport(args: { event: string; after?: string }) {
  const event = await resolveEvent(args.event);
  if (!event) return result<TransportRoute[]>([], [], "unknown");
  const supabase = await createClient();
  const routesResponse = await supabase.from("event_transport_routes").select("id,transport_type,operator_name,origin_name,destination_name,accessible,reservation_required,reservation_url,price_amount,currency,source_type,last_confirmed_at,updated_at").eq("event_id", String(event.id)).eq("active", true);
  if (routesResponse.error && canFallback(routesResponse.error)) return result<TransportRoute[]>([], [], "legacy");
  throwQueryError(routesResponse.error);
  const routes = (routesResponse.data || []) as Array<Record<string, unknown>>;
  if (!routes.length) return result<TransportRoute[]>([], [], "organizer");
  const after = args.after ? requireIsoDate(args.after) : new Date().toISOString();
  const departuresResponse = await supabase.from("event_transport_departures").select("id,route_id,scheduled_departure_at,actual_departure_at,scheduled_arrival_at,status,available_capacity,live_notes,updated_at").in("route_id", routes.map((route) => String(route.id))).gte("scheduled_departure_at", after).neq("status", "cancelled").order("scheduled_departure_at").limit(50);
  throwQueryError(departuresResponse.error);
  const departures = (departuresResponse.data || []) as Array<Record<string, unknown>>;
  const mapped = routes.map((route) => ({
    id: String(route.id), transportType: String(route.transport_type), operatorName: typeof route.operator_name === "string" ? route.operator_name : null,
    originName: String(route.origin_name), destinationName: String(route.destination_name), accessible: Boolean(route.accessible),
    reservationRequired: Boolean(route.reservation_required), reservationUrl: typeof route.reservation_url === "string" ? route.reservation_url : null,
    priceAmount: typeof route.price_amount === "number" ? route.price_amount : null, currency: String(route.currency),
    departures: departures.filter((departure) => departure.route_id === route.id).map((departure) => ({
      id: String(departure.id), scheduledDepartureAt: String(departure.scheduled_departure_at),
      actualDepartureAt: typeof departure.actual_departure_at === "string" ? departure.actual_departure_at : null,
      scheduledArrivalAt: typeof departure.scheduled_arrival_at === "string" ? departure.scheduled_arrival_at : null,
      status: String(departure.status), availableCapacity: typeof departure.available_capacity === "number" ? departure.available_capacity : null,
      liveNotes: typeof departure.live_notes === "string" ? departure.live_notes : null,
    })),
  }));
  return result(mapped, [...routes, ...departures], "organizer", departures.some((departure) => ["boarding", "delayed"].includes(String(departure.status))));
}

export async function getLiveStatus(args: { event: string; targetType?: string; targetId?: string }) {
  const event = await resolveEvent(args.event);
  if (!event) return result<LiveStatus[]>([], [], "unknown");
  const now = new Date().toISOString();
  const supabase = await createClient();
  let query = supabase.from("live_status_updates").select("id,target_type,target_id,status_type,status_value,message,severity,starts_at,expires_at,source_type,verified,created_at").eq("event_id", String(event.id)).lte("starts_at", now).gt("expires_at", now).order("severity", { ascending: false }).limit(25);
  if (args.targetType) query = query.eq("target_type", cleanSearchTerm(args.targetType, 40).replace(/\s/g, "_"));
  if (args.targetId) query = query.eq("target_id", requireUuid(args.targetId, "targetId"));
  const { data, error } = await query;
  if (error && canFallback(error)) return result<LiveStatus[]>([], [], "legacy");
  throwQueryError(error);
  const rows = (data || []) as Array<Record<string, unknown>>;
  return result(rows.map((row) => ({ id: String(row.id), targetType: String(row.target_type), targetId: typeof row.target_id === "string" ? row.target_id : null, statusType: String(row.status_type), statusValue: typeof row.status_value === "string" ? row.status_value : null, message: typeof row.message === "string" ? row.message : null, severity: String(row.severity), startsAt: String(row.starts_at), expiresAt: String(row.expires_at), verified: Boolean(row.verified) })), rows, "organizer", rows.length > 0);
}

export async function searchArtists(args: { query: string; limit?: number }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("artists").select("id,slug,name,city,description,image_url,verified,status,updated_at,created_at").ilike("name", `%${cleanSearchTerm(args.query).replace(/[%_]/g, "")}%`).order("name").limit(boundedLimit(args.limit));
  throwQueryError(error);
  const rows = (data || []) as Array<Record<string, unknown>>;
  return result(rows, rows, "artist");
}

export async function searchVenues(args: { query: string; limit?: number }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("venues").select("id,slug,name,city,municipality,address,latitude,longitude,verified,status,updated_at,created_at").ilike("name", `%${cleanSearchTerm(args.query).replace(/[%_]/g, "")}%`).order("name").limit(boundedLimit(args.limit));
  throwQueryError(error);
  const rows = (data || []) as Array<Record<string, unknown>>;
  return result(rows, rows, "venue");
}

export async function getUserTickets() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return result<Array<Record<string, unknown>>>([], [], "unknown");
  const { data, error } = await supabase.from("ticket_reservations").select("id,event_id,quantity,status,check_in_code,created_at,updated_at,events(id,slug,title,starts_at,start_at,venue_name)").eq("user_id", user.id).neq("status", "cancelled").order("created_at", { ascending: false }).limit(25);
  if (error && canFallback(error)) {
    const legacy = await supabase.from("ticket_reservations").select("id,event_id,quantity,status,check_in_code,created_at,updated_at,events(id,slug,title,start_at,venue_name)").eq("user_id", user.id).neq("status", "cancelled").order("created_at", { ascending: false }).limit(25);
    throwQueryError(legacy.error);
    const rows = (legacy.data || []) as unknown as Array<Record<string, unknown>>;
    return result(rows, rows, "legacy");
  }
  throwQueryError(error);
  const rows = (data || []) as unknown as Array<Record<string, unknown>>;
  return result(rows, rows, "paranoid_admin");
}

export async function getEventTickets(args: { event: string }) {
  const event = await resolveEvent(args.event);
  if (!event) return result<EventTicket[]>([], [], "unknown");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ticket_products")
    .select("id,name,description,product_type,price_amount,currency,service_fee_amount,capacity,sold_count,sales_start_at,sales_end_at,updated_at,ticket_channels(name,channel_type,external_url,active)")
    .eq("event_id", String(event.id))
    .eq("active", true)
    .order("price_amount");
  if (error && canFallback(error)) {
    const legacy = await supabase.from("events").select("id,ticket_price,price,ticket_url,ticket_mode,updated_at,created_at").eq("id", String(event.id)).maybeSingle();
    throwQueryError(legacy.error);
    if (!legacy.data || (!legacy.data.ticket_price && !legacy.data.price && !legacy.data.ticket_url)) return result<EventTicket[]>([], [], "legacy");
    const numericPrice = Number(String(legacy.data.ticket_price || legacy.data.price || "").replace(",", ".").match(/\d+(?:\.\d+)?/)?.[0]);
    const rows = [legacy.data as Record<string, unknown>];
    return result<EventTicket[]>([{ id: String(legacy.data.id), name: "Bilhete", description: typeof legacy.data.ticket_price === "string" ? legacy.data.ticket_price : typeof legacy.data.price === "string" ? legacy.data.price : null, productType: "general", priceAmount: Number.isFinite(numericPrice) ? numericPrice : null, currency: "EUR", serviceFeeAmount: 0, availableCapacity: null, salesStartAt: null, salesEndAt: null, channelName: null, channelType: typeof legacy.data.ticket_mode === "string" ? legacy.data.ticket_mode : null, purchaseUrl: typeof legacy.data.ticket_url === "string" ? legacy.data.ticket_url : null }], rows, "legacy");
  }
  throwQueryError(error);
  const rows = (data || []) as unknown as Array<Record<string, unknown>>;
  const tickets = rows.map((row): EventTicket => {
    const channel = row.ticket_channels as { name?: string; channel_type?: string; external_url?: string; active?: boolean } | null;
    const capacity = typeof row.capacity === "number" ? row.capacity : row.capacity == null ? null : Number(row.capacity);
    const soldCount = Number(row.sold_count || 0);
    return { id: String(row.id), name: String(row.name), description: typeof row.description === "string" ? row.description : null, productType: String(row.product_type), priceAmount: Number(row.price_amount), currency: String(row.currency), serviceFeeAmount: Number(row.service_fee_amount || 0), availableCapacity: capacity == null ? null : Math.max(0, capacity - soldCount), salesStartAt: typeof row.sales_start_at === "string" ? row.sales_start_at : null, salesEndAt: typeof row.sales_end_at === "string" ? row.sales_end_at : null, channelName: channel?.name || null, channelType: channel?.channel_type || null, purchaseUrl: channel?.active === false ? null : channel?.external_url || null };
  });
  return result(tickets, rows, "organizer");
}

function distanceKm(latitude: number, longitude: number, eventLatitude: number, eventLongitude: number) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = toRadians(eventLatitude - latitude);
  const longitudeDelta = toRadians(eventLongitude - longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(latitude)) * Math.cos(toRadians(eventLatitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getNearbyEvents(args: { latitude: number; longitude: number; radiusKm?: number; limit?: number }) {
  const latitude = requireCoordinate(args.latitude, "latitude");
  const longitude = requireCoordinate(args.longitude, "longitude");
  const radius = Math.min(Math.max(args.radiusKm || 25, 1), 200);
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select("id,slug,title,event_type,starts_at,ends_at,start_at,end_at,display_date,display_time,venue_name,city,municipality,free_entry,price,ticket_price,latitude,longitude,updated_at,created_at").eq("publication_status", "published").eq("visibility", "public").not("latitude", "is", null).not("longitude", "is", null).limit(200);
  if (error && canFallback(error)) {
    const legacy = await supabase.from("events").select("id,slug,title,category,start_at,end_at,display_date,display_time,venue_name,city,municipality,price,ticket_price,latitude,longitude,created_at").eq("status", "published").not("latitude", "is", null).not("longitude", "is", null).limit(200);
    throwQueryError(legacy.error);
    const rows = (legacy.data || []) as Array<Record<string, unknown>>;
    const data = rows.map((row) => ({ event: mapEvent(row), distanceKm: distanceKm(latitude, longitude, Number(row.latitude), Number(row.longitude)) })).filter((item) => item.distanceKm <= radius).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, boundedLimit(args.limit));
    return result(data, rows, "legacy");
  }
  throwQueryError(error);
  const rows = (data || []) as Array<Record<string, unknown>>;
  const nearby = rows.map((row) => ({ event: mapEvent(row), distanceKm: distanceKm(latitude, longitude, Number(row.latitude), Number(row.longitude)) })).filter((item) => item.distanceKm <= radius).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, boundedLimit(args.limit));
  return result(nearby, rows, "organizer");
}
