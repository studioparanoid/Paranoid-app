"use client";

import { useEffect, useMemo, useState } from "react";
import { DateQuickFilters, type QuickDateValue } from "@/components/DateQuickFilters";
import { CardGrid } from "@/components/CardGrid";
import { EmptyState } from "@/components/EmptyState";
import { EventCard } from "@/components/EventCard";
import { FilterDrawer } from "@/components/FilterDrawer";
import { EventCardSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  ALL_CATEGORIES, ALL_CITIES, ALL_DISTRICTS, ALL_MUNICIPALITIES,
  buildEventFilterIndex, filterIndexedEvents, getCategoryOptionsForIndexedEvents,
  getDistrictOptions, getMunicipalityOptions, type EventDateFilter,
  eventPriceFilterOptions, type EventPriceFilter,
} from "@/lib/eventFilters";
import { supabase } from "@/lib/supabase/public";

type EventRow = {
  id: string; slug: string; title: string; city: string | null; municipality: string | null;
  district: string | null; address: string | null; postal_code: string | null; venue_name: string | null;
  organizer_id: string | null; organizer_name: string | null; display_date: string | null; display_time: string | null;
  start_at: string | null; start_date: string | null; end_date: string | null; category: string | null;
  price: string | null; description: string | null; image_url: string | null; featured: boolean | null;
  ticket_price: string | null; frequencyActive?: boolean;
};

function eventDateValue(event: EventRow) { return event.start_at || event.start_date || event.display_date || ""; }
function eventTime(event: EventRow) { const value = eventDateValue(event); const date = value ? new Date(value.includes("T") ? value : `${value}T00:00:00`) : null; return date && !Number.isNaN(date.getTime()) ? date.getTime() : Number.MAX_SAFE_INTEGER; }
function compactDate(event: EventRow) {
  if (event.display_date) return event.display_date;
  const value = eventDateValue(event); if (!value) return "Data por definir";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(date);
}
function groupLabel(event: EventRow) {
  const value = eventDateValue(event); if (!value) return "Data por definir";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

export default function AgendaPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [search, setSearch] = useState("");
  const [quickDate, setQuickDate] = useState<QuickDateValue>("7d");
  const [customDate, setCustomDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [district, setDistrict] = useState(ALL_DISTRICTS);
  const [municipality, setMunicipality] = useState(ALL_MUNICIPALITIES);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [price, setPrice] = useState<EventPriceFilter>("all");
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const { toast } = useToast();

  async function loadEvents() {
    setLoading(true); setMessage("");
    const [eventsResponse, frequencyResponse] = await Promise.all([
      supabase.from("events").select("id,slug,title,city,municipality,district,address,postal_code,venue_name,organizer_id,organizer_name,display_date,display_time,start_at,start_date,end_date,category,price,description,image_url,featured,ticket_price").eq("status", "published").order("start_at", { ascending: true, nullsFirst: false }).limit(120),
      fetch("/api/billing/frequency/active-organizers").catch(() => null),
    ]);
    if (eventsResponse.error) { setMessage("Não foi possível carregar a Agenda."); setEvents([]); setLoading(false); return; }
    const payload = frequencyResponse?.ok ? await frequencyResponse.json().catch(() => ({})) : {};
    const priorityIds = new Set<string>(payload.organizerIds || []);
    setEvents(((eventsResponse.data || []) as EventRow[]).map((event) => ({ ...event, frequencyActive: Boolean(event.organizer_id && priorityIds.has(event.organizer_id)) })));
    setLoading(false);
  }

  useEffect(() => { const timer = window.setTimeout(() => { void loadEvents(); }, 0); return () => window.clearTimeout(timer); }, []);

  const indexed = useMemo(() => events.map((event) => buildEventFilterIndex(event)), [events]);
  const districtOptions = useMemo(() => getDistrictOptions(), []);
  const municipalityOptions = useMemo(() => getMunicipalityOptions(district), [district]);
  const categoryOptions = useMemo(() => getCategoryOptionsForIndexedEvents(indexed), [indexed]);
  const dateFilter: EventDateFilter = quickDate === "custom" ? "all" : quickDate;

  const filtered = useMemo(() => {
    let next = filterIndexedEvents(indexed, { searchQuery: search, districtFilter: district, municipalityFilter: municipality, cityFilter: ALL_CITIES, categoryFilter: category, dateFilter, priceFilter: price, onlyFeatured }).map((item) => item.event);
    if (quickDate === "custom" && customDate) next = next.filter((event) => { const value = eventDateValue(event); if (!value) return false; const date = new Date(value.includes("T") ? value : `${value}T00:00:00`); const selected = new Date(`${customDate}T00:00:00`); return date.getFullYear() === selected.getFullYear() && date.getMonth() === selected.getMonth() && date.getDate() === selected.getDate(); });
    return next.sort((first, second) => { const priority = Number(Boolean(second.featured)) * 2 + Number(Boolean(second.frequencyActive)) - (Number(Boolean(first.featured)) * 2 + Number(Boolean(first.frequencyActive))); return priority || eventTime(first) - eventTime(second); });
  }, [indexed, search, district, municipality, category, dateFilter, price, onlyFeatured, quickDate, customDate]);

  const groups = useMemo(() => { const map = new Map<string, EventRow[]>(); filtered.forEach((event) => { const key = groupLabel(event); map.set(key, [...(map.get(key) || []), event]); }); return Array.from(map.entries()); }, [filtered]);
  const activeAdvanced = [district !== ALL_DISTRICTS, municipality !== ALL_MUNICIPALITIES, category !== ALL_CATEGORIES, price !== "all", onlyFeatured].filter(Boolean).length;

  function clearAdvanced() { setDistrict(ALL_DISTRICTS); setMunicipality(ALL_MUNICIPALITIES); setCategory(ALL_CATEGORIES); setPrice("all"); setOnlyFeatured(false); }

  return <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8"><section className="mx-auto max-w-7xl">
    <div className="sticky top-12 z-30 -mx-4 border-y border-border bg-background/96 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-4 lg:top-16">
      <div className="grid gap-3 lg:grid-cols-[1fr_360px_auto] lg:items-center">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar evento, espaço ou cidade" aria-label="Pesquisar eventos" className="h-11 font-bold" />
        <DateQuickFilters value={quickDate} onChange={setQuickDate} />
        <Button variant="secondary" onClick={() => setFiltersOpen(true)} className="rounded">Filtros{activeAdvanced > 0 ? ` · ${activeAdvanced}` : ""}</Button>
      </div>
      {quickDate === "custom" && <Input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} aria-label="Escolher data" className="mt-3 h-11 sm:w-auto" />}
    </div>

    <div className="mt-6 flex items-center justify-between"><p className="text-xs font-bold text-foreground-muted" aria-live="polite">{filtered.length} resultado{filtered.length === 1 ? "" : "s"}</p>{(search || activeAdvanced > 0) && <button type="button" onClick={() => { setSearch(""); clearAdvanced(); toast("Filtros limpos."); }} className="pressable focus-ring rounded text-xs font-bold text-foreground-muted underline underline-offset-4">Limpar filtros</button>}</div>
    {message && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-l-2 border-danger pl-4" role="alert"><p className="text-sm text-danger">{message}</p><Button variant="secondary" size="sm" onClick={() => void loadEvents()}>Tentar novamente</Button></div>}
    <div className="content-transition mt-3">{loading ? <EventCardSkeleton rows={8} /> : groups.length === 0 ? <EmptyState title="Não encontrámos eventos para estes filtros." description="Experimenta mudar a data ou a localização." actionLabel="Limpar filtros" actionHref="/agenda" /> : groups.map(([label, dayEvents]) => <section key={label} className="mt-10 first:mt-0"><h2 className="mb-5 border-b border-border pb-3 text-sm font-black capitalize text-foreground-secondary">{label}</h2><CardGrid>{dayEvents.map((event) => <EventCard key={event.id} event={{ id: event.id, slug: event.slug, title: event.title, date: compactDate(event), time: event.display_time, venue: event.venue_name, municipality: event.municipality, city: event.city, price: event.price || event.ticket_price, category: event.category, image: event.image_url, featured: event.featured }} />)}</CardGrid></section>)}</div>

    <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} footer={<div className="flex gap-3"><Button type="button" variant="secondary" onClick={clearAdvanced} className="flex-1">Limpar</Button><Button type="button" onClick={() => { setFiltersOpen(false); toast({ message: "Filtros aplicados.", tone: "success" }); }} className="flex-1">Aplicar</Button></div>}>
      <SelectField label="Distrito" value={district} onChange={(value) => { setDistrict(value); setMunicipality(ALL_MUNICIPALITIES); }} options={districtOptions} />
      <SelectField label="Concelho" value={municipality} onChange={setMunicipality} options={municipalityOptions} />
      <SelectField label="Categoria" value={category} onChange={setCategory} options={categoryOptions} />
      <SelectField label="Preço" value={price} onChange={(value) => setPrice(value as EventPriceFilter)} options={eventPriceFilterOptions.map((option) => option.value)} labels={Object.fromEntries(eventPriceFilterOptions.map((option) => [option.value, option.label]))} />
      <label className="flex min-h-12 items-center justify-between border-y border-border py-3 text-sm font-bold"><span>Apenas eventos destacados</span><input type="checkbox" checked={onlyFeatured} onChange={(event) => setOnlyFeatured(event.target.checked)} className="h-5 w-5 accent-[var(--accent)]" /></label>
    </FilterDrawer>
  </section></main>;
}

function SelectField({ label, value, onChange, options, labels = {} }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; labels?: Record<string, string> }) {
  return <label><span className="mb-2 block text-xs font-bold text-foreground-muted">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring h-12 w-full rounded-md border border-input-border bg-input px-4 text-sm text-foreground outline-none">{options.map((option) => <option key={option} value={option}>{labels[option] || option}</option>)}</select></label>;
}
