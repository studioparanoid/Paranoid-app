import type { Metadata } from "next";
import { supabase } from "@/lib/supabase/public";
import { absoluteImageUrl, siteName, siteUrl, truncateDescription } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: event } = await supabase
    .from("events")
    .select("title,description,city,venue_name,image_url,status")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!event) return { title: "Evento" };

  const location = [event.venue_name, event.city].filter(Boolean).join(", ");
  const description = truncateDescription(event.description, location ? `${event.title} em ${location}.` : `${event.title} — agenda cultural Paranoid.`);
  const image = absoluteImageUrl(event.image_url);
  const url = `${siteUrl}/eventos/${slug}`;

  return {
    title: event.title,
    description,
    alternates: { canonical: url },
    openGraph: { title: event.title, description, url, siteName, type: "article", images: image ? [{ url: image }] : undefined },
    twitter: { title: event.title, description, images: image ? [image] : undefined },
  };
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return children;
}
