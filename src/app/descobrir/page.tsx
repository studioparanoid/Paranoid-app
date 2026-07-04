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
    artists: !artistsResult.error
      ? ((artistsResult.data || []) as ArtistRow[])
      : [],
    venues: !venuesResult.error ? ((venuesResult.data || []) as VenueRow[]) : [],
    organizers: !organizersResult.error
      ? ((organizersResult.data || []) as OrganizerRow[])
      : [],
  };
}

export default async function DiscoverPage() {
  const { artists, venues, organizers } = await getDiscoverData();

  const total = artists.length + venues.length + organizers.length;

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Descobrir
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
              A rede por trás da noite.
            </h1>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-base leading-relaxed text-zinc-400 lg:text-lg">
              Artistas, espaços e organizadores ligados aos eventos da
              Paranoid. Encontra quem toca, quem abre portas e quem monta a
              cena.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                <p className="text-3xl font-black">{artists.length}</p>

                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Artistas
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                <p className="text-3xl font-black">{venues.length}</p>

                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Espaços
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                <p className="text-3xl font-black">{organizers.length}</p>

                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Orgs.
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-zinc-600">
              {total} perfis na rede.
            </p>
          </div>
        </section>

        <DiscoverClient
          artists={artists}
          venues={venues}
          organizers={organizers}
        />
      </section>
    </main>
  );
}