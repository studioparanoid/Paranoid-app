"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";

type LocationKind = "venue" | "event";

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  district: string | null;
  address: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: string | null;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  district: string | null;
  venue_id: string | null;
  venue_name: string | null;
  address: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: string | null;
  status: string | null;
  start_at: string | null;
  start_date: string | null;
  created_at: string | null;
};

type EditableItem = {
  kind: LocationKind;
  id: string;
  title: string;
  subtitle: string;
  city: string | null;
  district: string | null;
  address: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: string | null;
  href: string | null;
};

type LocationForm = {
  address: string;
  postal_code: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
};

const emptyForm: LocationForm = {
  address: "",
  postal_code: "",
  city: "",
  district: "",
  latitude: "",
  longitude: "",
};

function formatCoordinate(value: number | null) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function hasCoordinates(item: EditableItem) {
  return item.latitude !== null && item.longitude !== null;
}

function locationStatusLabel(item: EditableItem) {
  if (hasCoordinates(item)) {
    if (item.location_source === "venue") {
      return "Herdado do espaço";
    }

    if (item.location_source === "geocoded") {
      return "Geocodificado";
    }

    return "Manual";
  }

  return "Sem coordenadas";
}

function locationStatusClasses(item: EditableItem) {
  if (hasCoordinates(item)) {
    if (item.location_source === "venue") {
      return "border-blue-900 bg-blue-950/20 text-blue-300";
    }

    return "border-green-900 bg-green-950/20 text-green-400";
  }

  return "border-red-900 bg-red-950/20 text-red-300";
}

function parseCoordinate(
  value: string,
  label: string,
  minimum: number,
  maximum: number
) {
  const cleanValue = value.trim().replace(",", ".");

  if (!cleanValue) {
    return null;
  }

  const parsed = Number(cleanValue);

  if (Number.isNaN(parsed)) {
    throw new Error(`${label} inválida.`);
  }

  if (parsed < minimum || parsed > maximum) {
    throw new Error(`${label} fora do intervalo permitido.`);
  }

  return parsed;
}

function buildMapsSearchUrl(form: LocationForm, title: string) {
  const query = [
    form.address,
    form.postal_code,
    form.city,
    form.district,
    title,
    "Portugal",
  ]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

function buildMapsCoordinateUrl(latitude: string, longitude: string) {
  const cleanLatitude = latitude.trim().replace(",", ".");
  const cleanLongitude = longitude.trim().replace(",", ".");

  if (!cleanLatitude || !cleanLongitude) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${cleanLatitude},${cleanLongitude}`
  )}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  const cleanValue = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(cleanValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function AdminLocationsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [message, setMessage] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  const [selectedKind, setSelectedKind] = useState<LocationKind>("venue");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<LocationForm>(emptyForm);

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | LocationKind>("all");
  const [onlyMissing, setOnlyMissing] = useState(true);

  const selectedItem = useMemo(() => {
    const allItems = buildEditableItems(venues, events);
    return (
      allItems.find(
        (item) => item.kind === selectedKind && item.id === selectedId
      ) || null
    );
  }, [venues, events, selectedKind, selectedId]);

  const editableItems = useMemo(() => {
    const allItems = buildEditableItems(venues, events);
    const cleanSearch = search.trim().toLowerCase();

    return allItems.filter((item) => {
      if (kindFilter !== "all" && item.kind !== kindFilter) {
        return false;
      }

      if (onlyMissing && hasCoordinates(item)) {
        return false;
      }

      if (!cleanSearch) {
        return true;
      }

      const searchableText = [
        item.title,
        item.subtitle,
        item.city || "",
        item.district || "",
        item.address || "",
        item.postal_code || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(cleanSearch);
    });
  }, [venues, events, search, kindFilter, onlyMissing]);

  const stats = useMemo(() => {
    const allItems = buildEditableItems(venues, events);
    const withCoordinates = allItems.filter((item) => hasCoordinates(item));

    return {
      total: allItems.length,
      venues: venues.length,
      events: events.length,
      withCoordinates: withCoordinates.length,
      missing: allItems.length - withCoordinates.length,
    };
  }, [venues, events]);

  function buildEditableItems(
    venueRows: VenueRow[],
    eventRows: EventRow[]
  ): EditableItem[] {
    const venueItems: EditableItem[] = venueRows.map((venue) => ({
      kind: "venue",
      id: venue.id,
      title: venue.name,
      subtitle: "Espaço",
      city: venue.city,
      district: venue.district,
      address: venue.address,
      postal_code: venue.postal_code,
      latitude: venue.latitude,
      longitude: venue.longitude,
      location_source: venue.location_source,
      href: `/espacos/${venue.slug}`,
    }));

    const eventItems: EditableItem[] = eventRows.map((event) => ({
      kind: "event",
      id: event.id,
      title: event.title,
      subtitle: [
        "Evento",
        event.venue_name || "",
        formatDate(event.start_at || event.start_date),
      ]
        .filter(Boolean)
        .join(" · "),
      city: event.city,
      district: event.district,
      address: event.address,
      postal_code: event.postal_code,
      latitude: event.latitude,
      longitude: event.longitude,
      location_source: event.location_source,
      href: event.status === "published" ? `/eventos/${event.slug}` : null,
    }));

    return [...venueItems, ...eventItems].sort((first, second) => {
      if (hasCoordinates(first) !== hasCoordinates(second)) {
        return hasCoordinates(first) ? 1 : -1;
      }

      return first.title.localeCompare(second.title, "pt-PT");
    });
  }

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsAdmin(false);
      setVenues([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data: adminData } = await supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminData) {
      setIsAdmin(false);
      setVenues([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const [venuesResponse, eventsResponse] = await Promise.all([
      supabase
        .from("venues")
        .select(
          "id,slug,name,city,district,address,postal_code,latitude,longitude,location_source"
        )
        .order("name", { ascending: true })
        .limit(1000),

      supabase
        .from("events")
        .select(
          "id,slug,title,city,district,venue_id,venue_name,address,postal_code,latitude,longitude,location_source,status,start_at,start_date,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    if (venuesResponse.error) {
      setMessage(venuesResponse.error.message);
    }

    if (eventsResponse.error) {
      setMessage(eventsResponse.error.message);
    }

    setVenues((venuesResponse.data || []) as VenueRow[]);
    setEvents((eventsResponse.data || []) as EventRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function selectItem(item: EditableItem) {
    setSelectedKind(item.kind);
    setSelectedId(item.id);
    setForm({
      address: item.address || "",
      postal_code: item.postal_code || "",
      city: item.city || "",
      district: item.district || "",
      latitude: formatCoordinate(item.latitude),
      longitude: formatCoordinate(item.longitude),
    });
    setMessage("");
  }

  async function saveLocation() {
    setMessage("");

    if (!selectedItem) {
      setMessage("Escolhe um espaço ou evento para editar.");
      return;
    }

    let latitude: number | null = null;
    let longitude: number | null = null;

    try {
      latitude = parseCoordinate(form.latitude, "Latitude", -90, 90);
      longitude = parseCoordinate(form.longitude, "Longitude", -180, 180);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Coordenadas inválidas.");
      return;
    }

    if ((latitude === null && longitude !== null) || (latitude !== null && longitude === null)) {
      setMessage("Tens de preencher latitude e longitude, ou limpar as duas.");
      return;
    }

    setSaving(true);

    const payload = {
      address: form.address.trim() || null,
      postal_code: form.postal_code.trim() || null,
      city: form.city.trim() || null,
      district: form.district.trim() || null,
      latitude,
      longitude,
      location_source: latitude !== null && longitude !== null ? "manual" : null,
    };

    const response =
      selectedItem.kind === "venue"
        ? await supabase.from("venues").update(payload).eq("id", selectedItem.id)
        : await supabase.from("events").update(payload).eq("id", selectedItem.id);

    setSaving(false);

    if (response.error) {
      setMessage(response.error.message);
      return;
    }

    setMessage("Localização guardada.");
    await loadData();
  }

  async function backfillEventsFromVenues() {
    setBackfilling(true);
    setMessage("");

    const { error } = await supabase.rpc("backfill_event_locations_from_venues");

    setBackfilling(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Eventos atualizados com coordenadas dos espaços.");
    await loadData();
  }

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-zinc-500">A carregar localizações...</p>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="rounded-[2.5rem] border border-red-900 bg-red-950/20 p-6 lg:p-10">
        <p className="text-xs uppercase tracking-[0.35em] text-red-400">
          Sem acesso
        </p>

        <h2 className="mt-4 text-5xl font-black leading-none">
          Isto é só para admin.
        </h2>

        <p className="mt-5 text-base leading-relaxed text-red-200">
          Entra com a conta admin da Paranoid para editar coordenadas.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-block rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black"
        >
          Entrar
        </Link>
      </section>
    );
  }

  const mapsSearchUrl = selectedItem
    ? buildMapsSearchUrl(form, selectedItem.title)
    : null;

  const mapsCoordinateUrl = buildMapsCoordinateUrl(form.latitude, form.longitude);

  return (
    <section className="space-y-6">
      {message && (
        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm font-bold text-zinc-300">{message}</p>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-4xl font-black">{stats.total}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Total
          </p>
        </article>

        <article className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-4xl font-black">{stats.withCoordinates}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Com geo
          </p>
        </article>

        <article className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-4xl font-black">{stats.missing}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Em falta
          </p>
        </article>

        <article className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-4xl font-black">{stats.venues}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Espaços
          </p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
        <aside className="space-y-6 lg:sticky lg:top-28">
          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Pesquisa
            </p>

            <div className="mt-5 space-y-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, cidade, morada..."
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
              />

              <select
                value={kindFilter}
                onChange={(event) =>
                  setKindFilter(event.target.value as "all" | LocationKind)
                }
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
              >
                <option value="all">Tudo</option>
                <option value="venue">Espaços</option>
                <option value="event">Eventos</option>
              </select>

              <button
                type="button"
                onClick={() => setOnlyMissing((current) => !current)}
                className={`w-full rounded-full px-5 py-4 text-sm font-black ${
                  onlyMissing
                    ? "bg-[#f2f1ec] text-black"
                    : "border border-zinc-700 text-zinc-300"
                }`}
              >
                {onlyMissing ? "Só em falta" : "Mostrar tudo"}
              </button>

              <button
                type="button"
                onClick={backfillEventsFromVenues}
                disabled={backfilling}
                className="w-full rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300 disabled:opacity-50"
              >
                {backfilling
                  ? "A atualizar..."
                  : "Herdar coordenadas dos espaços"}
              </button>

              <button
                type="button"
                onClick={loadData}
                className="w-full rounded-full border border-zinc-800 px-5 py-4 text-sm font-bold text-zinc-500"
              >
                Atualizar lista
              </button>
            </div>
          </section>

          <section className="max-h-[70vh] space-y-3 overflow-y-auto rounded-[2rem] border border-zinc-800 bg-zinc-950 p-3">
            {editableItems.length === 0 && (
              <p className="p-4 text-sm text-zinc-500">
                Sem resultados para estes filtros.
              </p>
            )}

            {editableItems.map((item) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onClick={() => selectItem(item)}
                className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                  selectedKind === item.kind && selectedId === item.id
                    ? "border-red-900 bg-red-950/20"
                    : "border-zinc-800 bg-black hover:border-zinc-700"
                }`}
              >
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${locationStatusClasses(
                      item
                    )}`}
                  >
                    {locationStatusLabel(item)}
                  </span>

                  <span className="rounded-full border border-zinc-800 px-3 py-1 text-[10px] font-black uppercase text-zinc-500">
                    {item.kind === "venue" ? "Espaço" : "Evento"}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-black leading-tight">
                  {item.title}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  {item.subtitle}
                </p>

                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  {[item.address, item.postal_code, item.city, item.district]
                    .filter(Boolean)
                    .join(" · ") || "Sem morada"}
                </p>
              </button>
            ))}
          </section>
        </aside>

        <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
          {!selectedItem ? (
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Editar
              </p>

              <h2 className="mt-3 text-5xl font-black leading-none">
                Escolhe uma localização.
              </h2>

              <p className="mt-5 text-base leading-relaxed text-zinc-400">
                Seleciona um espaço ou evento na lista para meter coordenadas
                exatas da porta.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                    Editar localização
                  </p>

                  <h2 className="mt-3 text-5xl font-black leading-none lg:text-7xl">
                    {selectedItem.title}
                  </h2>

                  <p className="mt-4 text-sm text-zinc-500">
                    {selectedItem.kind === "venue" ? "Espaço" : "Evento"} ·{" "}
                    {locationStatusLabel(selectedItem)}
                  </p>
                </div>

                {selectedItem.href && (
                  <Link
                    href={selectedItem.href}
                    className="rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
                  >
                    Ver público
                  </Link>
                )}
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Morada completa
                  </label>

                  <input
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    placeholder="Rua, número, espaço..."
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Código postal
                  </label>

                  <input
                    value={form.postal_code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        postal_code: event.target.value,
                      }))
                    }
                    placeholder="0000-000"
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Cidade / localidade
                  </label>

                  <input
                    value={form.city}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    placeholder="Ansião, Pombal, Leiria..."
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Distrito
                  </label>

                  <input
                    value={form.district}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        district: event.target.value,
                      }))
                    }
                    placeholder="Leiria, Coimbra, Lisboa..."
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Latitude
                  </label>

                  <input
                    value={form.latitude}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        latitude: event.target.value,
                      }))
                    }
                    placeholder="39.912345"
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Longitude
                  </label>

                  <input
                    value={form.longitude}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        longitude: event.target.value,
                      }))
                    }
                    placeholder="-8.435678"
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>
              </div>

              <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-black p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                  Como obter coordenadas perfeitas
                </p>

                <ol className="mt-4 space-y-2 text-sm leading-relaxed text-zinc-400">
                  <li>1. Abre o local no Google Maps.</li>
                  <li>2. Clica com o botão direito exatamente na porta.</li>
                  <li>3. Copia o par de números: latitude, longitude.</li>
                  <li>4. Cola cada valor no campo certo.</li>
                </ol>

                <div className="mt-5 flex flex-wrap gap-3">
                  {mapsSearchUrl && (
                    <a
                      href={mapsSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
                    >
                      Procurar morada no Maps
                    </a>
                  )}

                  {mapsCoordinateUrl && (
                    <a
                      href={mapsCoordinateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-green-900 px-5 py-4 text-sm font-bold text-green-400"
                    >
                      Testar coordenadas
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-8 grid gap-3 lg:grid-cols-2">
                <button
                  type="button"
                  onClick={saveLocation}
                  disabled={saving}
                  className="rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
                >
                  {saving ? "A guardar..." : "Guardar localização exata"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      latitude: "",
                      longitude: "",
                    }))
                  }
                  className="rounded-full border border-red-900 px-5 py-4 text-sm font-bold text-red-300"
                >
                  Limpar coordenadas
                </button>
              </div>
            </div>
          )}
        </section>
      </section>
    </section>
  );
}