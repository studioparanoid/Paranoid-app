"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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

type DiscoverClientProps = {
  artists?: ArtistRow[];
  venues?: VenueRow[];
  organizers?: OrganizerRow[];
};

type Tab = "Tudo" | "Artistas" | "Espaços" | "Organizadores";

const tabs: Tab[] = ["Tudo", "Artistas", "Espaços", "Organizadores"];

function normalize(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesSearch(values: Array<string | null | undefined>, search: string) {
  const cleanSearch = normalize(search);

  if (!cleanSearch) {
    return true;
  }

  return normalize(values.join(" ")).includes(cleanSearch);
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
      <p className="text-zinc-500">{text}</p>
    </div>
  );
}

function ArtistCard({ artist }: { artist: ArtistRow }) {
  return (
    <Link
      href={`/artistas/${artist.slug}`}
      className="block h-full rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 transition hover:border-red-950"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-red-700">
        Artista
      </p>

      <h3 className="mt-2 text-2xl font-black leading-tight text-[#f2f1ec]">
        {artist.name}
      </h3>

      <div className="mt-3 space-y-2 text-sm text-zinc-500">
        {artist.city && <p>{artist.city}</p>}

        {artist.genres && artist.genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {artist.genres.slice(0, 4).map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs font-bold text-zinc-400"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>

      {artist.description && (
        <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-zinc-500">
          {artist.description}
        </p>
      )}
    </Link>
  );
}

function VenueCard({ venue }: { venue: VenueRow }) {
  return (
    <Link
      href={`/espacos/${venue.slug}`}
      className="block h-full rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 transition hover:border-red-950"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-red-700">
        Espaço
      </p>

      <h3 className="mt-2 text-2xl font-black leading-tight text-[#f2f1ec]">
        {venue.name}
      </h3>

      <div className="mt-3 space-y-1 text-sm text-zinc-500">
        {venue.city && <p>{venue.city}</p>}
        {venue.address && <p>{venue.address}</p>}
      </div>

      {venue.description && (
        <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-zinc-500">
          {venue.description}
        </p>
      )}
    </Link>
  );
}

function OrganizerCard({ organizer }: { organizer: OrganizerRow }) {
  return (
    <Link
      href={`/organizadores/${organizer.slug}`}
      className="block h-full rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 transition hover:border-red-950"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">
            Organizador
          </p>

          <h3 className="mt-2 text-2xl font-black leading-tight text-[#f2f1ec]">
            {organizer.name}
          </h3>
        </div>

        {organizer.verified && (
          <span className="shrink-0 rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
            Verificado
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1 text-sm text-zinc-500">
        {organizer.city && <p>{organizer.city}</p>}
        {organizer.pack && <p>{organizer.pack}</p>}
      </div>

      {organizer.description && (
        <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-zinc-500">
          {organizer.description}
        </p>
      )}
    </Link>
  );
}

export function DiscoverClient({
  artists = [],
  venues = [],
  organizers = [],
}: DiscoverClientProps) {
  const safeArtists = Array.isArray(artists) ? artists : [];
  const safeVenues = Array.isArray(venues) ? venues : [];
  const safeOrganizers = Array.isArray(organizers) ? organizers : [];

  const [activeTab, setActiveTab] = useState<Tab>("Tudo");
  const [search, setSearch] = useState("");

  const filteredArtists = useMemo(() => {
    return safeArtists.filter((artist) =>
      matchesSearch(
        [artist.name, artist.city, artist.description, ...(artist.genres || [])],
        search
      )
    );
  }, [safeArtists, search]);

  const filteredVenues = useMemo(() => {
    return safeVenues.filter((venue) =>
      matchesSearch(
        [venue.name, venue.city, venue.address, venue.description],
        search
      )
    );
  }, [safeVenues, search]);

  const filteredOrganizers = useMemo(() => {
    return safeOrganizers.filter((organizer) =>
      matchesSearch(
        [
          organizer.name,
          organizer.city,
          organizer.description,
          organizer.pack,
        ],
        search
      )
    );
  }, [safeOrganizers, search]);

  const totalResults =
    filteredArtists.length + filteredVenues.length + filteredOrganizers.length;

  const showArtists = activeTab === "Tudo" || activeTab === "Artistas";
  const showVenues = activeTab === "Tudo" || activeTab === "Espaços";
  const showOrganizers =
    activeTab === "Tudo" || activeTab === "Organizadores";

  function clearSearch() {
    setSearch("");
    setActiveTab("Tudo");
  }

  return (
    <div className="mt-8 lg:mt-12">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <aside className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:sticky lg:top-8">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Pesquisa
          </p>

          <h2 className="mt-3 text-3xl font-black">Encontra a cena.</h2>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Procurar
              </label>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Artista, espaço, cidade..."
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
              />
            </div>

            <div>
              <p className="mb-2 block text-sm font-bold text-zinc-300">
                Tipo
              </p>

              <div className="flex flex-wrap gap-2 lg:grid">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full border px-4 py-2 text-sm font-black ${
                      activeTab === tab
                        ? "border-[#f2f1ec] bg-[#f2f1ec] text-black"
                        : "border-zinc-800 bg-black text-zinc-400"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={clearSearch}
              className="w-full rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
            >
              Limpar
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{totalResults}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Result.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">
                {safeArtists.length + safeVenues.length + safeOrganizers.length}
              </p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Total
              </p>
            </div>
          </div>
        </aside>

        <section className="space-y-10">
          {totalResults === 0 && (
            <EmptyCard text="Não encontrei nada com essa pesquisa." />
          )}

          {showArtists && (
            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                    Artistas
                  </p>

                  <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                    Quem mexe
                  </h2>
                </div>

                <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
                  {filteredArtists.length}
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {filteredArtists.length === 0 && (
                  <EmptyCard text="Nenhum artista encontrado." />
                )}

                {filteredArtists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </section>
          )}

          {showVenues && (
            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                    Espaços
                  </p>

                  <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                    Onde acontece
                  </h2>
                </div>

                <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
                  {filteredVenues.length}
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {filteredVenues.length === 0 && (
                  <EmptyCard text="Nenhum espaço encontrado." />
                )}

                {filteredVenues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </div>
            </section>
          )}

          {showOrganizers && (
            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                    Organizadores
                  </p>

                  <h2 className="mt-2 text-3xl font-black lg:text-5xl">
                    Quem monta
                  </h2>
                </div>

                <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
                  {filteredOrganizers.length}
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {filteredOrganizers.length === 0 && (
                  <EmptyCard text="Nenhum organizador encontrado." />
                )}

                {filteredOrganizers.map((organizer) => (
                  <OrganizerCard key={organizer.id} organizer={organizer} />
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}