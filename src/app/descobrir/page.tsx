"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type NetworkType = "all" | "artist" | "organizer" | "venue";

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  genres: string | string[] | null;
  description: string | null;
  instagram: string | null;
  bandcamp: string | null;
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

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  description: string | null;
  instagram: string | null;
};

type FollowRow = {
  id: string;
  target_type: "artist" | "organizer" | "venue";
  target_id: string;
};

type NetworkItem = {
  id: string;
  type: "artist" | "organizer" | "venue";
  slug: string;
  name: string;
  city: string | null;
  description: string | null;
  tags: string[];
  meta: string | null;
  href: string;
};

function typeLabel(type: NetworkType | "artist" | "organizer" | "venue") {
  if (type === "artist") {
    return "Artista";
  }

  if (type === "organizer") {
    return "Organizador";
  }

  if (type === "venue") {
    return "Espaço";
  }

  return "Tudo";
}

function typeClasses(type: "artist" | "organizer" | "venue") {
  if (type === "artist") {
    return "border-red-900 bg-red-950/20 text-red-300";
  }

  if (type === "organizer") {
    return "border-yellow-900 bg-yellow-950/20 text-yellow-500";
  }

  return "border-green-900 bg-green-950/20 text-green-400";
}

function formatGenres(value: string | string[] | null) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildFollowKey(type: "artist" | "organizer" | "venue", id: string) {
  return `${type}:${id}`;
}

function EmptyState() {
  return (
    <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:p-10">
      <p className="text-xs uppercase tracking-[0.35em] text-red-700">
        Sem resultados
      </p>

      <h2 className="mt-4 text-5xl font-black leading-none">
        Não encontramos nada.
      </h2>

      <p className="mt-5 text-base leading-relaxed text-zinc-400">
        Tenta limpar a pesquisa, mudar a cidade ou ver todos os tipos da rede.
      </p>

      <Link
        href="/submeter"
        className="mt-8 inline-block rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
      >
        Submeter entidade/evento
      </Link>
    </section>
  );
}

export default function DiscoverPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoadingKey, setActionLoadingKey] = useState("");
  const [message, setMessage] = useState("");

  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [follows, setFollows] = useState<Record<string, string>>({});

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<NetworkType>("all");
  const [cityFilter, setCityFilter] = useState("Todas");

  const networkItems = useMemo<NetworkItem[]>(() => {
    const artistItems: NetworkItem[] = artists.map((artist) => {
      const genres = formatGenres(artist.genres);

      return {
        id: artist.id,
        type: "artist",
        slug: artist.slug,
        name: artist.name,
        city: artist.city,
        description: artist.description,
        tags: genres,
        meta: genres.length > 0 ? genres.join(", ") : "Artista",
        href: `/artistas/${artist.slug}`,
      };
    });

    const organizerItems: NetworkItem[] = organizers.map((organizer) => {
      const tags = [
        organizer.verified ? "Verificado" : "",
        organizer.pack || "",
      ].filter(Boolean);

      return {
        id: organizer.id,
        type: "organizer",
        slug: organizer.slug,
        name: organizer.name,
        city: organizer.city,
        description: organizer.description,
        tags,
        meta: organizer.verified ? "Organizador verificado" : "Organizador",
        href: `/organizadores/${organizer.slug}`,
      };
    });

    const venueItems: NetworkItem[] = venues.map((venue) => {
      const tags = [venue.address || ""].filter(Boolean);

      return {
        id: venue.id,
        type: "venue",
        slug: venue.slug,
        name: venue.name,
        city: venue.city,
        description: venue.description,
        tags,
        meta: venue.address || "Espaço",
        href: `/espacos/${venue.slug}`,
      };
    });

    return [...artistItems, ...organizerItems, ...venueItems].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-PT")
    );
  }, [artists, organizers, venues]);

  const cityOptions = useMemo(() => {
    const cities = networkItems
      .map((item) => item.city)
      .filter(Boolean) as string[];

    return ["Todas", ...Array.from(new Set(cities)).sort()];
  }, [networkItems]);

  const filteredItems = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return networkItems.filter((item) => {
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesCity = cityFilter === "Todas" || item.city === cityFilter;

      const searchableText = [
        item.name,
        item.city || "",
        item.description || "",
        item.meta || "",
        item.tags.join(" "),
        typeLabel(item.type),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !cleanSearch || searchableText.includes(cleanSearch);

      return matchesType && matchesCity && matchesSearch;
    });
  }, [networkItems, search, typeFilter, cityFilter]);

  const counts = useMemo(() => {
    return {
      all: networkItems.length,
      artists: artists.length,
      organizers: organizers.length,
      venues: venues.length,
      filtered: filteredItems.length,
    };
  }, [networkItems.length, artists.length, organizers.length, venues.length, filteredItems.length]);

  async function loadNetwork() {
    setLoading(true);
    setMessage("");

    const [
      artistsResponse,
      organizersResponse,
      venuesResponse,
      userResponse,
    ] = await Promise.all([
      supabase
        .from("artists")
        .select("id,slug,name,city,genres,description,instagram,bandcamp")
        .order("name", { ascending: true }),

      supabase
        .from("organizers")
        .select("id,slug,name,city,description,pack,verified")
        .order("name", { ascending: true }),

      supabase
        .from("venues")
        .select("id,slug,name,city,address,description,instagram")
        .order("name", { ascending: true }),

      supabase.auth.getUser(),
    ]);

    if (artistsResponse.error) {
      setMessage(artistsResponse.error.message);
    }

    if (organizersResponse.error) {
      setMessage(organizersResponse.error.message);
    }

    if (venuesResponse.error) {
      setMessage(venuesResponse.error.message);
    }

    setArtists((artistsResponse.data || []) as ArtistRow[]);
    setOrganizers((organizersResponse.data || []) as OrganizerRow[]);
    setVenues((venuesResponse.data || []) as VenueRow[]);

    const user = userResponse.data.user;

    if (user) {
      const { data: followData, error: followError } = await supabase
        .from("follows")
        .select("id,target_type,target_id")
        .eq("user_id", user.id);

      if (followError) {
        setMessage(followError.message);
      }

      const followMap: Record<string, string> = {};

      ((followData || []) as FollowRow[]).forEach((follow) => {
        followMap[buildFollowKey(follow.target_type, follow.target_id)] =
          follow.id;
      });

      setFollows(followMap);
    } else {
      setFollows({});
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadNetwork(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function toggleFollow(item: NetworkItem) {
    setMessage("");

    const followKey = buildFollowKey(item.type, item.id);
    setActionLoadingKey(followKey);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Tens de iniciar sessão para seguir elementos da rede.");
      setActionLoadingKey("");
      return;
    }

    const existingFollowId = follows[followKey];

    if (existingFollowId) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("id", existingFollowId);

      if (error) {
        setMessage(error.message);
        setActionLoadingKey("");
        return;
      }

      setFollows((current) => {
        const next = { ...current };
        delete next[followKey];
        return next;
      });

      setActionLoadingKey("");
      return;
    }

    const { data, error } = await supabase
      .from("follows")
      .insert({
        user_id: user.id,
        target_type: item.type,
        target_id: item.id,
      })
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
      setActionLoadingKey("");
      return;
    }

    setFollows((current) => ({
      ...current,
      [followKey]: data.id,
    }));

    setActionLoadingKey("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
        <section className="mx-auto max-w-md lg:max-w-7xl">
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-500">A carregar rede cultural...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Descobrir
            </p>

            <h1 className="text-6xl font-black leading-none tracking-tight lg:text-9xl">
              Rede cultural.
            </h1>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-base leading-relaxed text-zinc-400 lg:text-lg">
              Artistas, organizadores e espaços ligados à Paranoid. Pesquisa,
              segue e entra no mapa cultural alternativo.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                <p className="text-3xl font-black">{counts.all}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Total
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
                <p className="text-3xl font-black">{counts.filtered}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Visíveis
                </p>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-8 rounded-[2rem] border border-red-900 bg-red-950/20 p-5">
            <p className="text-sm font-bold text-red-300">{message}</p>
          </div>
        )}

        <section className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-[340px_1fr] lg:items-start">
          <aside className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:sticky lg:top-28">
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Motor de pesquisa
            </p>

            <h2 className="mt-3 text-4xl font-black leading-none">
              Encontra a cena.
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Pesquisa
                </label>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome, cidade, género..."
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Tipo
                </label>

                <div className="grid gap-2">
                  {(["all", "artist", "organizer", "venue"] as NetworkType[]).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTypeFilter(type)}
                        className={`rounded-full px-5 py-3 text-sm font-black ${
                          typeFilter === type
                            ? "bg-[#f2f1ec] text-black"
                            : "border border-zinc-800 text-zinc-400"
                        }`}
                      >
                        {typeLabel(type)}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Cidade
                </label>

                <select
                  value={cityFilter}
                  onChange={(event) => setCityFilter(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
                >
                  {cityOptions.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setCityFilter("Todas");
                }}
                className="w-full rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
              >
                Limpar filtros
              </button>

              <button
                type="button"
                onClick={loadNetwork}
                className="w-full rounded-full border border-zinc-800 px-5 py-4 text-sm font-bold text-zinc-500"
              >
                Atualizar rede
              </button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-2">
              <div className="rounded-[1.25rem] border border-zinc-800 bg-black p-3">
                <p className="text-2xl font-black">{counts.artists}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                  Artistas
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-zinc-800 bg-black p-3">
                <p className="text-2xl font-black">{counts.organizers}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                  Org.
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-zinc-800 bg-black p-3">
                <p className="text-2xl font-black">{counts.venues}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                  Espaços
                </p>
              </div>
            </div>
          </aside>

          <section className="space-y-5">
            {filteredItems.length === 0 && <EmptyState />}

            {filteredItems.map((item) => {
              const followKey = buildFollowKey(item.type, item.id);
              const isFollowing = Boolean(follows[followKey]);

              return (
                <article
                  key={followKey}
                  className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6"
                >
                  <div className="grid gap-5 lg:grid-cols-[1fr_220px] lg:items-start">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${typeClasses(
                            item.type
                          )}`}
                        >
                          {typeLabel(item.type)}
                        </span>

                        {item.city && (
                          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-black uppercase tracking-wide text-zinc-400">
                            {item.city}
                          </span>
                        )}

                        {item.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-zinc-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <Link href={item.href}>
                        <h2 className="mt-5 break-words text-5xl font-black leading-none lg:text-7xl">
                          {item.name}
                        </h2>
                      </Link>

                      {item.meta && (
                        <p className="mt-4 text-sm font-bold text-zinc-500">
                          {item.meta}
                        </p>
                      )}

                      {item.description ? (
                        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                          {item.description}
                        </p>
                      ) : (
                        <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                          Ainda sem descrição pública.
                        </p>
                      )}
                    </div>

                    <div className="grid gap-3">
                      <Link
                        href={item.href}
                        className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
                      >
                        Abrir perfil
                      </Link>

                      <button
                        type="button"
                        onClick={() => toggleFollow(item)}
                        disabled={actionLoadingKey === followKey}
                        className={`rounded-full px-5 py-4 text-sm font-black disabled:opacity-50 ${
                          isFollowing
                            ? "border border-zinc-700 text-zinc-300"
                            : "border border-red-900 text-red-300"
                        }`}
                      >
                        {actionLoadingKey === followKey
                          ? "A guardar..."
                          : isFollowing
                            ? "A seguir"
                            : "Seguir"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </section>
      </section>
    </main>
  );
}
