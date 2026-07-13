"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { supabase } from "@/lib/supabase/public";

type SearchResult = { id: string; label: string; meta: string; href: string };
type SearchGroups = {
  events: SearchResult[];
  artists: SearchResult[];
  organizers: SearchResult[];
  venues: SearchResult[];
  products: SearchResult[];
};

const emptyGroups: SearchGroups = {
  events: [], artists: [], organizers: [], venues: [], products: [],
};

function cleanSearch(value: string) {
  return value.replace(/[,%_()]/g, " ").replace(/\s+/g, " ").trim();
}

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroups>(emptyGroups);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const safeQuery = cleanSearch(query);

    if (safeQuery.length < 2) {
      const timer = window.setTimeout(() => {
        setGroups(emptyGroups);
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const pattern = `%${safeQuery}%`;
      const [events, artists, organizers, venues, products] = await Promise.all([
        supabase.from("events").select("id,slug,title,city,venue_name").eq("status", "published").or(`title.ilike.${pattern},city.ilike.${pattern},venue_name.ilike.${pattern}`).limit(4),
        supabase.from("artists").select("id,slug,name,city").or(`name.ilike.${pattern},city.ilike.${pattern}`).limit(4),
        supabase.from("organizers").select("id,slug,name,city").or(`name.ilike.${pattern},city.ilike.${pattern}`).limit(4),
        supabase.from("venues").select("id,slug,name,city").or(`name.ilike.${pattern},city.ilike.${pattern}`).limit(4),
        supabase.from("shop_products").select("id,slug,name,category").eq("status", "active").or(`name.ilike.${pattern},category.ilike.${pattern}`).limit(4),
      ]);

      if (cancelled) return;

      setGroups({
        events: (events.data || []).map((item) => ({ id: item.id, label: item.title, meta: [item.venue_name, item.city].filter(Boolean).join(" · "), href: `/eventos/${item.slug}` })),
        artists: (artists.data || []).map((item) => ({ id: item.id, label: item.name, meta: item.city || "Artista", href: `/artistas/${item.slug}` })),
        organizers: (organizers.data || []).map((item) => ({ id: item.id, label: item.name, meta: item.city || "Organizador", href: `/organizadores/${item.slug}` })),
        venues: (venues.data || []).map((item) => ({ id: item.id, label: item.name, meta: item.city || "Espaço", href: `/espacos/${item.slug}` })),
        products: (products.data || []).map((item) => ({ id: item.id, label: item.name, meta: item.category || "Loja", href: `/loja/${item.slug}` })),
      });
      setLoading(false);
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const sections = [
    ["Eventos", groups.events], ["Artistas", groups.artists],
    ["Organizadores", groups.organizers], ["Espaços", groups.venues],
    ["Loja", groups.products],
  ] as const;
  const total = sections.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-label="Pesquisa global" className="mx-auto min-h-full w-full bg-[#0b0b0b] p-4 text-[#f2f1ec] sm:mt-[8vh] sm:min-h-0 sm:max-w-2xl sm:rounded-lg sm:border sm:border-zinc-800 sm:p-6">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <AppIcon name="search" className="h-5 w-5 shrink-0 text-zinc-500" />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Eventos, artistas, espaços, loja..." aria-label="Pesquisar na Paranoid" className="min-w-0 flex-1 bg-transparent py-3 text-base font-bold outline-none placeholder:text-zinc-600" />
          <button type="button" onClick={onClose} aria-label="Fechar pesquisa" className="grid h-11 w-11 place-items-center rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-white">
            <AppIcon name="close" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-7rem)] overflow-y-auto py-5 sm:max-h-[70vh]">
          {query.trim().length < 2 && <p className="py-10 text-center text-sm text-zinc-500">Escreve pelo menos duas letras.</p>}
          {loading && <div className="space-y-3" aria-label="A pesquisar"><div className="h-14 animate-pulse rounded bg-zinc-900" /><div className="h-14 animate-pulse rounded bg-zinc-900" /></div>}
          {!loading && query.trim().length >= 2 && total === 0 && <p className="py-10 text-center text-sm text-zinc-500">Não encontrámos resultados.</p>}
          {!loading && total > 0 && <div className="space-y-6">
            {sections.map(([label, items]) => items.length > 0 && (
              <section key={label}>
                <h2 className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-red-600">{label}</h2>
                <div className="divide-y divide-zinc-900">
                  {items.map((item) => <Link key={item.id} href={item.href} onClick={onClose} className="flex min-h-14 items-center justify-between gap-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
                    <span className="min-w-0"><span className="block truncate font-bold">{item.label}</span><span className="block truncate text-xs text-zinc-500">{item.meta}</span></span>
                    <AppIcon name="chevron" className="h-4 w-4 shrink-0 text-zinc-700" />
                  </Link>)}
                </div>
              </section>
            ))}
          </div>}
        </div>
      </section>
    </div>
  );
}

export default GlobalSearch;
