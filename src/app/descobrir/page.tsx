import { DiscoverClient } from "@/components/DiscoverClient";
import { supabase } from "@/lib/supabase/public";

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  genres: string[] | null;
  description: string | null;
};

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  description: string | null;
};

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  description: string | null;
  pack: string | null;
  verified: boolean | null;
};

async function getDiscoverData() {
  const [artistsResult, venuesResult, organizersResult] = await Promise.all([
    supabase
      .from("artists")
      .select("id,slug,name,city,genres,description")
      .order("name", { ascending: true }),
    supabase
      .from("venues")
      .select("id,slug,name,city,address,description")
      .order("name", { ascending: true }),
    supabase
      .from("organizers")
      .select("id,slug,name,city,description,pack,verified")
      .order("name", { ascending: true }),
  ]);

  return {
    artists: !artistsResult.error ? ((artistsResult.data || []) as ArtistRow[]) : [],
    venues: !venuesResult.error ? ((venuesResult.data || []) as VenueRow[]) : [],
    organizers: !organizersResult.error
      ? ((organizersResult.data || []) as OrganizerRow[])
      : [],
  };
}

export default async function DiscoverPage() {
  const { artists, venues, organizers } = await getDiscoverData();

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Descobrir
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          A rede por trás da noite.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Artistas, espaços e organizadores ligados aos eventos da Paranoid.
          Encontra quem faz a cena mexer.
        </p>

        <DiscoverClient
          artists={artists}
          venues={venues}
          organizers={organizers}
        />
      </section>
    </main>
  );
}