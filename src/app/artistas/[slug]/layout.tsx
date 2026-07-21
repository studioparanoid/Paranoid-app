import type { Metadata } from "next";
import { supabase } from "@/lib/supabase/public";
import { absoluteImageUrl, siteName, siteUrl, truncateDescription } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: artist } = await supabase
    .from("artists")
    .select("name,description,city,image_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!artist) return { title: "Artista" };

  const description = truncateDescription(artist.description, artist.city ? `${artist.name} — ${artist.city}, na Paranoid.` : `${artist.name} na Paranoid.`);
  const image = absoluteImageUrl(artist.image_url);
  const url = `${siteUrl}/artistas/${slug}`;

  return {
    title: artist.name,
    description,
    alternates: { canonical: url },
    openGraph: { title: artist.name, description, url, siteName, type: "profile", images: image ? [{ url: image }] : undefined },
    twitter: { title: artist.name, description, images: image ? [image] : undefined },
  };
}

export default function ArtistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
