import type { Metadata } from "next";
import { supabase } from "@/lib/supabase/public";
import { absoluteImageUrl, siteName, siteUrl, truncateDescription } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: venue } = await supabase
    .from("venues")
    .select("name,description,city,address,image_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!venue) return { title: "Espaço" };

  const location = venue.address || venue.city;
  const description = truncateDescription(venue.description, location ? `${venue.name} — ${location}.` : `${venue.name} na Paranoid.`);
  const image = absoluteImageUrl(venue.image_url);
  const url = `${siteUrl}/espacos/${slug}`;

  return {
    title: venue.name,
    description,
    alternates: { canonical: url },
    openGraph: { title: venue.name, description, url, siteName, type: "website", images: image ? [{ url: image }] : undefined },
    twitter: { title: venue.name, description, images: image ? [image] : undefined },
  };
}

export default function VenueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
