import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProgramItems,
  getEventFoodOptions,
  getEventProgram,
  getEventTickets,
  getEventZones,
  getNextProgramItems,
  searchArtists,
  searchEvents,
  searchVenues,
} from "@/lib/data/hub-tools";
import { boundedLimit, cleanSearchTerm } from "@/lib/data/validators";

type SearchArgs = { query: string; limit?: number };

export const hubToolDefinitions = [
  { name: "searchEvents", description: "Procura eventos publicados por nome, cidade ou tipo.", required: ["query"] },
  { name: "searchArtists", description: "Procura artistas registados.", required: ["query"] },
  { name: "searchVenues", description: "Procura espaços registados.", required: ["query"] },
  { name: "searchRestaurants", description: "Procura espaços de comida reais registados na Paranoid.", required: ["query"] },
  { name: "searchFood", description: "Procura opções de comida disponíveis num evento.", required: ["event"] },
  { name: "searchProgram", description: "Obtém o programa estruturado de um evento.", required: ["event"] },
  { name: "getCurrentProgram", description: "Obtém o que está a acontecer agora num evento.", required: ["event"] },
  { name: "getNextProgram", description: "Obtém os próximos momentos do programa.", required: ["event"] },
  { name: "getTickets", description: "Obtém produtos e canais de bilheteira publicados.", required: ["event"] },
  { name: "getVenue", description: "Obtém o espaço registado mais próximo do nome pedido.", required: ["query"] },
  { name: "searchCommunities", description: "Procura comunidades públicas e ativas.", required: ["query"] },
] as const;

export { searchEvents, searchArtists, searchVenues };
export const searchFood = getEventFoodOptions;
export const searchProgram = getEventProgram;
export const getCurrentProgram = getCurrentProgramItems;
export const getNextProgram = getNextProgramItems;
export const getTickets = getEventTickets;

export async function getVenue(args: { query: string }) {
  return searchVenues({ query: args.query, limit: 1 });
}

export async function searchRestaurants(args: SearchArgs) {
  const query = cleanSearchTerm(args.query);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select("id,slug,name,venue_type,city,municipality,address,latitude,longitude,verified,updated_at")
    .in("venue_type", ["restaurant", "cafe", "bar", "food_truck"])
    .or(`name.ilike.%${query}%,city.ilike.%${query}%,municipality.ilike.%${query}%`)
    .eq("status", "active")
    .limit(boundedLimit(args.limit));
  if (error?.code && ["42703", "PGRST204", "PGRST205"].includes(error.code)) return { data: [], source: "legacy" as const, lastUpdatedAt: null, isLive: false };
  if (error) throw new Error(error.message);
  const rows = data || [];
  return { data: rows, source: "venue" as const, lastUpdatedAt: rows.map((row) => row.updated_at).filter(Boolean).sort().at(-1) || null, isLive: false };
}

export async function searchCommunities(args: SearchArgs) {
  const query = cleanSearchTerm(args.query);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communities")
    .select("id,slug,name,community_type,short_description,city,municipality,district,logo_url,verified,updated_at")
    .eq("visibility", "public")
    .eq("status", "active")
    .or(`name.ilike.%${query}%,short_description.ilike.%${query}%,city.ilike.%${query}%,municipality.ilike.%${query}%`)
    .limit(boundedLimit(args.limit));
  if (error?.code && ["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code)) return { data: [], source: "legacy" as const, lastUpdatedAt: null, isLive: false };
  if (error) throw new Error(error.message);
  const rows = data || [];
  return { data: rows, source: "community" as const, lastUpdatedAt: rows.map((row) => row.updated_at).filter(Boolean).sort().at(-1) || null, isLive: false };
}

export const hubTools = {
  searchEvents,
  searchArtists,
  searchVenues,
  searchRestaurants,
  searchFood,
  searchProgram,
  getCurrentProgram,
  getNextProgram,
  getTickets,
  getVenue,
  searchCommunities,
  getMap: getEventZones,
} as const;
