"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { IconButton } from "@/components/ui/Button";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";
import { supabase } from "@/lib/supabase/public";

type SearchResult = {
  id: string;
  label: string;
  meta: string;
  href: string;
  image?: string | null;
};
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
  const [searchError, setSearchError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const router = useRouter();

  useDialogBehavior({ open: true, onClose, containerRef: dialogRef, initialFocusRef: inputRef });

  useEffect(() => {
    const safeQuery = cleanSearch(query);

    if (safeQuery.length < 2) {
      const timer = window.setTimeout(() => {
        setGroups(emptyGroups);
        setLoading(false);
        setSearchError("");
        setActiveIndex(-1);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchError("");
      const pattern = `%${safeQuery}%`;
      const [events, artists, organizers, venues, products] = await Promise.all([
        supabase.from("events").select("id,slug,title,city,venue_name,display_date,start_at,image_url").eq("status", "published").or(`title.ilike.${pattern},city.ilike.${pattern},venue_name.ilike.${pattern}`).limit(4),
        supabase.from("artists").select("id,slug,name,city").or(`name.ilike.${pattern},city.ilike.${pattern}`).limit(4),
        supabase.from("organizers").select("id,slug,name,city").or(`name.ilike.${pattern},city.ilike.${pattern}`).limit(4),
        supabase.from("venues").select("id,slug,name,city").or(`name.ilike.${pattern},city.ilike.${pattern}`).limit(4),
        supabase.from("shop_products").select("id,slug,name,category,final_price_cents,shop_product_images(image_url,sort_order)").eq("status", "active").or(`name.ilike.${pattern},category.ilike.${pattern}`).limit(4),
      ]);

      if (cancelled) return;

      const failed = [events, artists, organizers, venues, products].some((response) => response.error);
      if (failed) setSearchError("Não foi possível concluir a pesquisa.");

      setGroups({
        events: (events.data || []).map((item) => ({
          id: item.id,
          label: item.title,
          meta: [item.display_date || item.start_at, item.venue_name, item.city].filter(Boolean).join(" · "),
          href: `/eventos/${item.slug}`,
          image: item.image_url,
        })),
        artists: (artists.data || []).map((item) => ({ id: item.id, label: item.name, meta: item.city || "Artista", href: `/artistas/${item.slug}` })),
        organizers: (organizers.data || []).map((item) => ({ id: item.id, label: item.name, meta: item.city || "Organizador", href: `/organizadores/${item.slug}` })),
        venues: (venues.data || []).map((item) => ({ id: item.id, label: item.name, meta: item.city || "Espaço", href: `/espacos/${item.slug}` })),
        products: (products.data || []).map((item) => ({
          id: item.id,
          label: item.name,
          meta: [
            item.category || "Loja",
            typeof item.final_price_cents === "number"
              ? new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(item.final_price_cents / 100)
              : null,
          ].filter(Boolean).join(" · "),
          href: `/loja/${item.slug}`,
          image: [...(item.shop_product_images || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0]?.image_url || null,
        })),
      });
      setActiveIndex(-1);
      setLoading(false);
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const sections = useMemo(() => [
    ["Eventos", groups.events], ["Artistas", groups.artists],
    ["Organizadores", groups.organizers], ["Espaços", groups.venues],
    ["Loja", groups.products],
  ] as const, [groups]);
  const total = sections.reduce((sum, [, items]) => sum + items.length, 0);
  const flatResults = useMemo(() => sections.flatMap(([section, items]) => items.map((item) => ({ ...item, section, key: `${section}-${item.id}` }))), [sections]);

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (flatResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % flatResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => current <= 0 ? flatResults.length - 1 : current - 1);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const result = flatResults[activeIndex];
      onClose();
      router.push(result.href);
    }
  }

  return (
    <div className="ui-overlay fixed inset-0 z-[100]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Pesquisa global" className="ui-dialog mx-auto min-h-full w-full bg-[#070707] p-4 text-[#f5f5f2] sm:mt-[8vh] sm:min-h-0 sm:max-w-2xl sm:rounded-lg sm:border sm:border-zinc-800 sm:p-6">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <AppIcon name="search" className="h-5 w-5 shrink-0 text-zinc-500" />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleInputKeyDown} placeholder="Eventos, artistas, espaços, loja..." aria-label="Pesquisar na Paranoid" aria-controls="global-search-results" aria-activedescendant={activeIndex >= 0 ? `search-${flatResults[activeIndex]?.key}` : undefined} aria-autocomplete="list" className="min-w-0 flex-1 bg-transparent py-3 text-base font-bold outline-none placeholder:text-zinc-600" />
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-red-500 motion-reduce:animate-none" aria-hidden="true" />}
          <IconButton label="Fechar pesquisa" onClick={onClose}>
            <AppIcon name="close" />
          </IconButton>
        </div>

        <div id="global-search-results" role="listbox" aria-busy={loading} className="max-h-[calc(100dvh-7rem)] overflow-y-auto py-5 sm:max-h-[70vh]">
          {query.trim().length < 2 && <p className="py-10 text-center text-sm text-zinc-500">Escreve pelo menos duas letras.</p>}
          {loading && total === 0 && <div className="space-y-3" aria-label="A pesquisar"><div className="skeleton-shimmer h-14 rounded" /><div className="skeleton-shimmer h-14 rounded" /></div>}
          {searchError && <p className="py-5 text-center text-sm font-bold text-red-300" role="alert">{searchError}</p>}
          {!loading && !searchError && query.trim().length >= 2 && total === 0 && <p className="py-10 text-center text-sm text-zinc-500">Não encontrámos resultados.</p>}
          {total > 0 && <div className={`space-y-6 transition-opacity ${loading ? "opacity-55" : "opacity-100"}`}>
            {sections.map(([label, items]) => items.length > 0 && (
              <section key={label}>
                <h2 className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-red-600">{label}</h2>
                <div className="divide-y divide-zinc-900">
                  {items.map((item) => { const resultIndex = flatResults.findIndex((result) => result.key === `${label}-${item.id}`); const active = resultIndex === activeIndex; return <Link id={`search-${label}-${item.id}`} role="option" aria-selected={active} key={item.id} href={item.href} onMouseEnter={() => setActiveIndex(resultIndex)} onFocus={() => setActiveIndex(resultIndex)} onClick={onClose} className={`interactive focus-ring flex min-h-16 items-center gap-3 rounded px-2 py-2 ${active ? "bg-zinc-900" : "hover:bg-zinc-950"}`}>
                    <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded bg-zinc-900 text-sm font-black text-zinc-600">
                      {item.image ? <Image src={item.image} alt="" fill sizes="48px" unoptimized className="object-cover" /> : item.label.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-bold">{item.label}</span><span className="block truncate text-xs text-zinc-500">{item.meta}</span></span>
                    <AppIcon name="chevron" className="h-4 w-4 shrink-0 text-zinc-700" />
                  </Link>;})}
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
