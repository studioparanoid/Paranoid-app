import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase/public";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

const staticRoutes: Array<{ path: string; changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>; priority: number }> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/agenda", changeFrequency: "hourly", priority: 0.9 },
  { path: "/mapa", changeFrequency: "daily", priority: 0.6 },
  { path: "/descobrir", changeFrequency: "daily", priority: 0.6 },
  { path: "/loja", changeFrequency: "daily", priority: 0.6 },
  { path: "/destaques", changeFrequency: "weekly", priority: 0.4 },
  { path: "/parceiros", changeFrequency: "monthly", priority: 0.3 },
  { path: "/patrocinar", changeFrequency: "monthly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const [eventsResponse, artistsResponse, venuesResponse, organizersResponse, productsResponse] = await Promise.all([
    supabase.from("events").select("slug,created_at").eq("status", "published").limit(1000),
    supabase.from("artists").select("slug,created_at").limit(500),
    supabase.from("venues").select("slug,created_at").limit(500),
    supabase.from("organizers").select("slug,created_at").limit(500),
    supabase.from("shop_products").select("slug,created_at").eq("status", "active").limit(500),
  ]);

  for (const event of eventsResponse.data || []) {
    entries.push({ url: `${siteUrl}/eventos/${event.slug}`, lastModified: event.created_at || now, changeFrequency: "daily", priority: 0.8 });
  }
  for (const artist of artistsResponse.data || []) {
    entries.push({ url: `${siteUrl}/artistas/${artist.slug}`, lastModified: artist.created_at || now, changeFrequency: "weekly", priority: 0.5 });
  }
  for (const venue of venuesResponse.data || []) {
    entries.push({ url: `${siteUrl}/espacos/${venue.slug}`, lastModified: venue.created_at || now, changeFrequency: "weekly", priority: 0.5 });
  }
  for (const organizer of organizersResponse.data || []) {
    entries.push({ url: `${siteUrl}/organizadores/${organizer.slug}`, lastModified: organizer.created_at || now, changeFrequency: "weekly", priority: 0.5 });
  }
  for (const product of productsResponse.data || []) {
    entries.push({ url: `${siteUrl}/loja/${product.slug}`, lastModified: product.created_at || now, changeFrequency: "weekly", priority: 0.4 });
  }

  return entries;
}
