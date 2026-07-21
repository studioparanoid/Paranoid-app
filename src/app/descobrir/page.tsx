"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/public";

type NetworkType = "all" | "artist" | "organizer" | "venue";
type NetworkTab = "discover" | "following";
type EntityType = Exclude<NetworkType, "all">;

type EntityRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  description: string | null;
  image_url: string | null;
  genres?: string | string[] | null;
  music_genres?: string[] | null;
  artist_category?: string | null;
  organizer_type?: string | null;
  address?: string | null;
  venue_type?: string | null;
};

type FollowRow = { id: string; target_type: EntityType; target_id: string };
type NetworkItem = EntityRow & { type: EntityType; href: string; category: string | null; genreList: string[]; venueType: string | null };

const filters: Array<{ value: NetworkType; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "artist", label: "Artistas" },
  { value: "venue", label: "Espaços" },
  { value: "organizer", label: "Organizadores" },
];

function followKey(type: EntityType, id: string) {
  return `${type}:${id}`;
}

function entityLabel(type: EntityType) {
  if (type === "artist") return "Artista";
  if (type === "venue") return "Espaço";
  return "Organizador";
}

function firstGenre(value: EntityRow["genres"]) {
  if (Array.isArray(value)) return value[0] || null;
  return value?.split(",")[0]?.trim() || null;
}

export default function DiscoverPage() {
  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState("");
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<NetworkItem[]>([]);
  const [follows, setFollows] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<NetworkType>("all");
  const [genreFilter, setGenreFilter] = useState("");
  const [venueTypeFilter, setVenueTypeFilter] = useState("");
  const [tab, setTab] = useState<NetworkTab>("discover");
  const [canRequestBooking, setCanRequestBooking] = useState(false);
  const [canContactOrganizer, setCanContactOrganizer] = useState(false);
  const { toast } = useToast();

  const loadNetwork = useCallback(async () => {
    setLoading(true);
    const [artists, organizers, venues, userResponse] = await Promise.all([
      supabase.from("artists").select("id,slug,name,city,description,image_url,genres,music_genres,artist_category").order("name"),
      supabase.from("organizers").select("id,slug,name,city,description,image_url,organizer_type").order("name"),
      supabase.from("venues").select("id,slug,name,city,description,image_url,address,venue_type").order("name"),
      supabase.auth.getUser(),
    ]);

    const errors = [artists.error, organizers.error, venues.error].filter(Boolean);
    if (errors.length > 0) toast({ message: "Não foi possível carregar toda a rede.", tone: "error" });

    const nextItems: NetworkItem[] = [
      ...((artists.data || []) as EntityRow[]).map((item) => {
        const genreList = item.music_genres && item.music_genres.length > 0 ? item.music_genres : (firstGenre(item.genres) ? [firstGenre(item.genres) as string] : []);
        return { ...item, type: "artist" as const, href: `/artistas/${item.slug}`, category: item.artist_category || firstGenre(item.genres), genreList, venueType: null };
      }),
      ...((organizers.data || []) as EntityRow[]).map((item) => ({ ...item, type: "organizer" as const, href: `/organizadores/${item.slug}`, category: item.organizer_type || null, genreList: [], venueType: null })),
      ...((venues.data || []) as EntityRow[]).map((item) => ({ ...item, type: "venue" as const, href: `/espacos/${item.slug}`, category: item.address || null, genreList: [], venueType: item.venue_type || null })),
    ].sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));
    setItems(nextItems);

    const user = userResponse.data.user;
    setUserId(user?.id || "");
    if (user) {
      const [followResponse, membershipResponse, viewerProfileResponse] = await Promise.all([
        supabase.from("follows").select("id,target_type,target_id").eq("user_id", user.id),
        supabase.from("organizer_members").select("role,status,can_manage_events").eq("user_id", user.id).eq("status", "active"),
        supabase.from("profiles").select("account_type,entity_id,account_status").eq("id", user.id).maybeSingle(),
      ]);
      const nextFollows: Record<string, string> = {};
      ((followResponse.data || []) as FollowRow[]).forEach((follow) => { nextFollows[followKey(follow.target_type, follow.target_id)] = follow.id; });
      setFollows(nextFollows);
      setCanRequestBooking((membershipResponse.data || []).some((membership) => ["owner", "admin"].includes(membership.role) || membership.can_manage_events));
      const viewerProfile = viewerProfileResponse.data;
      setCanContactOrganizer(viewerProfile?.account_type === "artist" && viewerProfile.account_status === "approved" && Boolean(viewerProfile.entity_id));
    } else {
      setFollows({});
      setCanRequestBooking(false);
      setCanContactOrganizer(false);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadNetwork(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadNetwork]);

  const genreOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => { if (item.type === "artist") item.genreList.forEach((genre) => set.add(genre)); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-PT"));
  }, [items]);

  const venueTypeOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => { if (item.type === "venue" && item.venueType) set.add(item.venueType); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-PT"));
  }, [items]);

  function selectTypeFilter(value: NetworkType) {
    setTypeFilter(value);
    setGenreFilter("");
    setVenueTypeFilter("");
  }

  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-PT");
    return items.filter((item) => {
      const key = followKey(item.type, item.id);
      if (tab === "following" && !follows[key]) return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (typeFilter === "artist" && genreFilter && !item.genreList.includes(genreFilter)) return false;
      if (typeFilter === "venue" && venueTypeFilter && item.venueType !== venueTypeFilter) return false;
      return !query || [item.name, item.city, item.category, entityLabel(item.type)].filter(Boolean).join(" ").toLocaleLowerCase("pt-PT").includes(query);
    });
  }, [follows, genreFilter, items, search, tab, typeFilter, venueTypeFilter]);

  async function toggleFollow(item: NetworkItem) {
    const key = followKey(item.type, item.id);
    if (!userId) {
      toast({ message: "Inicia sessão para seguir perfis.", tone: "error" });
      return;
    }
    if (actionKey) return;

    const previous = follows[key];
    setActionKey(key);
    setFollows((current) => {
      const next = { ...current };
      if (previous) delete next[key]; else next[key] = "pending";
      return next;
    });

    if (previous) {
      const { error } = await supabase.from("follows").delete().eq("id", previous);
      if (error) {
        setFollows((current) => ({ ...current, [key]: previous }));
        toast({ message: "Não foi possível deixar de seguir.", tone: "error" });
      } else {
        toast({ message: "Deixaste de seguir.", tone: "success" });
      }
    } else {
      const { data, error } = await supabase.from("follows").insert({ user_id: userId, target_type: item.type, target_id: item.id }).select("id").single();
      if (error) {
        setFollows((current) => { const next = { ...current }; delete next[key]; return next; });
        toast({ message: "Não foi possível seguir.", tone: "error" });
      } else {
        setFollows((current) => ({ ...current, [key]: data.id }));
        toast({ message: "Agora estás a seguir.", tone: "success" });
      }
    }
    setActionKey("");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-4 pb-28 text-[var(--foreground)] sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <section aria-label="Pesquisa e filtros">
          <label htmlFor="network-search" className="sr-only">Pesquisar na Rede Cultural</label>
          <input id="network-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar nome, cidade ou categoria" className="h-12 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 text-base outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--accent)]" />

          <div className="mt-4 flex border-b border-[var(--border)]" role="tablist" aria-label="Vista da rede">
            {(["discover", "following"] as NetworkTab[]).map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`min-h-11 flex-1 border-b-2 px-3 text-sm font-black sm:flex-none sm:px-6 ${tab === value ? "border-[var(--accent)] text-[var(--foreground)]" : "border-transparent text-[var(--foreground-muted)]"}`}>{value === "discover" ? "A descobrir" : "Seguidos"}</button>)}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por tipo">
            {filters.map((filter) => <button key={filter.value} type="button" aria-pressed={typeFilter === filter.value} onClick={() => selectTypeFilter(filter.value)} className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-black ${typeFilter === filter.value ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--foreground-secondary)]"}`}>{filter.label}</button>)}
          </div>

          {typeFilter === "artist" && genreOptions.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por estilo musical">
              <button type="button" aria-pressed={!genreFilter} onClick={() => setGenreFilter("")} className={`min-h-9 shrink-0 rounded-full border px-3.5 text-[11px] font-bold ${!genreFilter ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--foreground-muted)]"}`}>Todos os estilos</button>
              {genreOptions.map((genre) => <button key={genre} type="button" aria-pressed={genreFilter === genre} onClick={() => setGenreFilter(genre)} className={`min-h-9 shrink-0 rounded-full border px-3.5 text-[11px] font-bold ${genreFilter === genre ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--foreground-muted)]"}`}>{genre}</button>)}
            </div>
          )}

          {typeFilter === "venue" && venueTypeOptions.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por tipo de espaço">
              <button type="button" aria-pressed={!venueTypeFilter} onClick={() => setVenueTypeFilter("")} className={`min-h-9 shrink-0 rounded-full border px-3.5 text-[11px] font-bold ${!venueTypeFilter ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--foreground-muted)]"}`}>Todos os tipos</button>
              {venueTypeOptions.map((venueType) => <button key={venueType} type="button" aria-pressed={venueTypeFilter === venueType} onClick={() => setVenueTypeFilter(venueType)} className={`min-h-9 shrink-0 rounded-full border px-3.5 text-[11px] font-bold capitalize ${venueTypeFilter === venueType ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--foreground-muted)]"}`}>{venueType}</button>)}
            </div>
          )}
        </section>

        <p className="mt-6 text-xs font-bold text-[var(--foreground-muted)]" aria-live="polite">{loading ? "A carregar rede..." : `${visibleItems.length} ${visibleItems.length === 1 ? "perfil" : "perfis"}`}</p>

        {!loading && visibleItems.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-10 text-center" role="status">
            <h2 className="text-xl font-black">{tab === "following" ? "Ainda não segues ninguém." : "Sem resultados."}</h2>
            {tab === "following" && <button type="button" onClick={() => setTab("discover")} className="mt-5 min-h-11 rounded-full bg-[var(--accent)] px-5 text-sm font-black text-white">Explorar a rede</button>}
          </section>
        ) : (
          <section className="mt-4 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy={loading}>
            {visibleItems.map((item) => {
              const key = followKey(item.type, item.id);
              const following = Boolean(follows[key]);
              const contactHref = item.type === "artist" && canRequestBooking
                ? `/reservas/nova?artistId=${item.id}`
                : item.type === "organizer" && canContactOrganizer
                  ? `/reservas/nova?organizerId=${item.id}`
                  : null;
              return <article key={key} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                <Link href={item.href} className="block aspect-square bg-[var(--surface-secondary)]">
                  {item.image_url ? <img src={item.image_url} alt={`Foto de ${item.name}`} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-5xl font-black text-[var(--accent)]" aria-hidden="true">{item.name.charAt(0).toUpperCase()}</span>}
                </Link>
                <div className="p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">{entityLabel(item.type)}</p>
                  <Link href={item.href}><h2 className="mt-1 truncate text-lg font-black">{item.name}</h2></Link>
                  <p className="mt-1 min-h-5 truncate text-xs text-[var(--foreground-muted)]">{[item.city, item.category].filter(Boolean).join(" · ") || "Perfil cultural"}</p>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => void toggleFollow(item)} disabled={actionKey === key} aria-pressed={following} className={`min-h-11 flex-1 rounded-full border px-4 text-xs font-black disabled:opacity-60 ${following ? "border-[var(--border-strong)] text-[var(--foreground-secondary)]" : "border-[var(--accent)] text-[var(--accent)]"}`}>{actionKey === key ? "A guardar..." : following ? "Seguido" : "Seguir"}</button>
                    {contactHref && <Link href={contactHref} className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-center text-xs font-black text-white">Contacto</Link>}
                  </div>
                </div>
              </article>;
            })}
          </section>
        )}
      </div>
    </main>
  );
}
