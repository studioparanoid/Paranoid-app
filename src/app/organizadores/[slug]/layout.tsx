import type { Metadata } from "next";
import { supabase } from "@/lib/supabase/public";
import { absoluteImageUrl, siteName, siteUrl, truncateDescription } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: organizer } = await supabase
    .from("organizers")
    .select("name,description,city,image_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!organizer) return { title: "Organizador" };

  const description = truncateDescription(organizer.description, organizer.city ? `${organizer.name} — ${organizer.city}, na Paranoid.` : `${organizer.name} na Paranoid.`);
  const image = absoluteImageUrl(organizer.image_url);
  const url = `${siteUrl}/organizadores/${slug}`;

  return {
    title: organizer.name,
    description,
    alternates: { canonical: url },
    openGraph: { title: organizer.name, description, url, siteName, type: "profile", images: image ? [{ url: image }] : undefined },
    twitter: { title: organizer.name, description, images: image ? [image] : undefined },
  };
}

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
