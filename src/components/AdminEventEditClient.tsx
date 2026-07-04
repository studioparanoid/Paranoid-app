"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

const categories = [
  "Concertos",
  "DJ Sets",
  "Cinema",
  "Exposições",
  "Mercados",
  "Workshops",
  "Teatro",
  "Outros",
];

const cities = [
  "Pombal",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
];

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue_id: string | null;
  venue_name: string | null;
  organizer_id: string | null;
  organizer_name: string | null;
  start_at: string | null;
  display_date: string | null;
  display_time: string | null;
  category: string;
  price: string | null;
  description: string | null;
  image_url: string | null;
  featured: boolean | null;
  status: string;
};

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
};

type VenueRow = {
  id: string;
  slug: string;
  name: string;
};

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
};

type EventArtistRelationRow = {
  artists: ArtistRow | ArtistRow[] | null;
};

type AdminEventEditClientProps = {
  eventId: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function getStartAt(displayDate: string, displayTime: string) {
  if (!displayDate) {
    return new Date().toISOString();
  }

  const cleanTime = displayTime || "00:00";
  const timeWithSeconds =
    cleanTime.split(":").length === 2 ? `${cleanTime}:00` : cleanTime;

  if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) {
    return `${displayDate}T${timeWithSeconds}+00:00`;
  }

  return new Date().toISOString();
}

function getArtistNames(artistsText: string) {
  const names = artistsText
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  return Array.from(new Set(names));
}

function formatTimeForInput(value: string | null) {
  if (!value) {
    return "";
  }

  const parts = value.split(":");

  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }

  return value;
}

function formatPriceValue(value: string) {
  const cleanPrice = value.trim();

  if (!cleanPrice) {
    return "";
  }

  if (
    cleanPrice.toLowerCase() === "gratis" ||
    cleanPrice.toLowerCase() === "grátis" ||
    cleanPrice === "0"
  ) {
    return "Entrada livre";
  }

  if (!cleanPrice.includes("€") && /^\d+([,.]\d{1,2})?$/.test(cleanPrice)) {
    return `${cleanPrice.replace(".", ",")}€`;
  }

  return cleanPrice;
}

function getArtistNamesFromRelationRows(rows: EventArtistRelationRow[]) {
  const names: string[] = [];

  for (const row of rows) {
    if (!row.artists) {
      continue;
    }

    if (Array.isArray(row.artists)) {
      for (const artist of row.artists) {
        if (artist.name) {
          names.push(artist.name);
        }
      }

      continue;
    }

    if (row.artists.name) {
      names.push(row.artists.name);
    }
  }

  return names;
}

export function AdminEventEditClient({ eventId }: AdminEventEditClientProps) {
  const router = useRouter();

  const [event, setEvent] = useState<EventRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("Pombal");
  const [venueName, setVenueName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [artistsText, setArtistsText] = useState("");
  const [displayDate, setDisplayDate] = useState("");
  const [displayTime, setDisplayTime] = useState("");
  const [category, setCategory] = useState("Concertos");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvent() {
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError) {
        setMessage("Não encontrei este evento.");
        setLoading(false);
        return;
      }

      const loadedEvent = eventData as EventRow;

      setEvent(loadedEvent);
      setTitle(loadedEvent.title || "");
      setSlug(loadedEvent.slug || "");
      setCity(loadedEvent.city || "Pombal");
      setVenueName(loadedEvent.venue_name || "");
      setOrganizerName(loadedEvent.organizer_name || "");
      setDisplayDate(loadedEvent.display_date || "");
      setDisplayTime(formatTimeForInput(loadedEvent.display_time));
      setCategory(loadedEvent.category || "Concertos");
      setPrice(loadedEvent.price || "");
      setDescription(loadedEvent.description || "");
      setFeatured(Boolean(loadedEvent.featured));
      setImageUrl(loadedEvent.image_url);

      const { data: eventArtistsData } = await supabase
        .from("event_artists")
        .select(
          `
          artists (
            id,
            name,
            slug
          )
        `
        )
        .eq("event_id", eventId);

      const relationRows = (eventArtistsData ||
        []) as unknown as EventArtistRelationRow[];

      const artistNames = getArtistNamesFromRelationRows(relationRows);

      setArtistsText(artistNames.join(", "));

      setLoading(false);
    }

    loadEvent();
  }, [eventId]);

  function generateSlugFromTitle() {
    if (!title) {
      return;
    }

    setSlug(slugify(title));
  }

  function handlePriceBlur() {
    setPrice(formatPriceValue(price));
  }

  async function findOrCreateVenue() {
    const cleanVenueName = venueName.trim();

    if (!cleanVenueName) {
      return null;
    }

    const venueSlug = slugify(cleanVenueName);

    const { data: existingVenue, error: existingError } = await supabase
      .from("venues")
      .select("id,slug,name")
      .eq("slug", venueSlug)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingVenue) {
      return (existingVenue as VenueRow).id;
    }

    const { data: createdVenue, error: createError } = await supabase
      .from("venues")
      .insert({
        slug: venueSlug,
        name: cleanVenueName,
        city,
        address: null,
        description: null,
        instagram: null,
      })
      .select("id,slug,name")
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    return (createdVenue as VenueRow).id;
  }

  async function findOrCreateOrganizer() {
    const cleanOrganizerName = organizerName.trim();

    if (!cleanOrganizerName) {
      return null;
    }

    const organizerSlug = slugify(cleanOrganizerName);

    const { data: existingOrganizer, error: existingError } = await supabase
      .from("organizers")
      .select("id,slug,name")
      .eq("slug", organizerSlug)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingOrganizer) {
      return (existingOrganizer as OrganizerRow).id;
    }

    const { data: createdOrganizer, error: createError } = await supabase
      .from("organizers")
      .insert({
        slug: organizerSlug,
        name: cleanOrganizerName,
        city,
        description: null,
        pack: null,
        verified: false,
        instagram: null,
      })
      .select("id,slug,name")
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    return (createdOrganizer as OrganizerRow).id;
  }

  async function findOrCreateArtist(name: string) {
    const artistSlug = slugify(name);

    const { data: existingArtist, error: existingError } = await supabase
      .from("artists")
      .select("id,slug,name")
      .eq("slug", artistSlug)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingArtist) {
      return (existingArtist as ArtistRow).id;
    }

    const { data: createdArtist, error: createError } = await supabase
      .from("artists")
      .insert({
        slug: artistSlug,
        name,
        city,
        genres: null,
        description: null,
        instagram: null,
        bandcamp: null,
      })
      .select("id,slug,name")
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    return (createdArtist as ArtistRow).id;
  }

  async function replaceEventArtists() {
    const artistNames = getArtistNames(artistsText);

    const { error: deleteError } = await supabase
      .from("event_artists")
      .delete()
      .eq("event_id", eventId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (artistNames.length === 0) {
      return;
    }

    const artistIds: string[] = [];

    for (const artistName of artistNames) {
      const artistId = await findOrCreateArtist(artistName);
      artistIds.push(artistId);
    }

    const rows = artistIds.map((artistId) => ({
      event_id: eventId,
      artist_id: artistId,
    }));

    const { error: insertError } = await supabase
      .from("event_artists")
      .insert(rows);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  async function handleSave() {
    setMessage("");

    if (!event) {
      setMessage("Evento inválido.");
      return;
    }

    if (!title || !slug || !city || !venueName || !organizerName) {
      setMessage("Preenche título, slug, cidade, espaço e organizador.");
      return;
    }

    setSaving(true);

    let venueId: string | null = null;
    let organizerId: string | null = null;

    try {
      venueId = await findOrCreateVenue();
      organizerId = await findOrCreateOrganizer();
    } catch (error) {
      setMessage(
        `Erro ao preparar espaço/organizador: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
      setSaving(false);
      return;
    }

    const { error: eventError } = await supabase
      .from("events")
      .update({
        title,
        slug,
        city,
        venue_id: venueId,
        venue_name: venueName,
        organizer_id: organizerId,
        organizer_name: organizerName,
        start_at: getStartAt(displayDate, displayTime),
        display_date: displayDate || "Data por definir",
        display_time: displayTime || "Hora por definir",
        category,
        price: price || "Preço por definir",
        description: description || "",
        featured,
        status: "published",
      })
      .eq("id", eventId);

    if (eventError) {
      setMessage(`Erro ao guardar evento: ${eventError.message}`);
      setSaving(false);
      return;
    }

    try {
      await replaceEventArtists();
    } catch (error) {
      setMessage(
        `Evento guardado, mas erro nos artistas: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
      setSaving(false);
      return;
    }

    setMessage("Evento atualizado.");
    setSaving(false);
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <p className="text-zinc-500">A carregar evento...</p>
        </section>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <Link
            href="/admin"
            className="mb-6 inline-block text-sm text-zinc-400"
          >
            ← Voltar ao admin
          </Link>

          <h1 className="text-4xl font-black">Evento não encontrado.</h1>

          {message && <p className="mt-4 text-zinc-400">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link href="/admin" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar ao admin
        </Link>

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Editar evento
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Corrige o que já está vivo.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Edita o evento publicado. Espaço, organizador e artistas são
          associados automaticamente à rede.
        </p>

        {imageUrl && (
          <div
            className="mt-6 h-64 rounded-[2rem] bg-cover bg-center"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        )}

        <div className="mt-8 space-y-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Nome do evento
            </label>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Nome do evento"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label className="block text-sm font-bold text-zinc-300">
                Slug
              </label>

              <button
                type="button"
                onClick={generateSlugFromTitle}
                className="text-xs font-bold uppercase tracking-wide text-red-500"
              >
                Gerar pelo título
              </button>
            </div>

            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="ex: noise-night-pombal"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <p className="mt-2 text-xs text-zinc-600">
              Link público: /eventos/{slug || "slug"}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Organizador
            </label>

            <input
              value={organizerName}
              onChange={(event) => setOrganizerName(event.target.value)}
              placeholder="Nome do organizador"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Artistas / bandas / DJs
            </label>

            <input
              value={artistsText}
              onChange={(event) => setArtistsText(event.target.value)}
              placeholder="Ex: Dead Static, Cave Ritual"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <p className="mt-2 text-xs text-zinc-600">
              Separa vários nomes por vírgula.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Categoria
            </label>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Cidade
            </label>

            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            >
              {cities.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Espaço / local
            </label>

            <input
              value={venueName}
              onChange={(event) => setVenueName(event.target.value)}
              placeholder="Nome do espaço"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Data
              </label>

              <input
                type="date"
                value={displayDate}
                onChange={(event) => setDisplayDate(event.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Hora
              </label>

              <input
                type="time"
                value={displayTime}
                onChange={(event) => setDisplayTime(event.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Preço
            </label>

            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              onBlur={handlePriceBlur}
              placeholder="Ex: 5€, 10€ ou Entrada livre"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Descrição
            </label>

            <textarea
              rows={7}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descrição do evento"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
            <input
              type="checkbox"
              checked={featured}
              onChange={(event) => setFeatured(event.target.checked)}
            />

            <span className="text-sm font-bold text-zinc-300">
              Destacar na Paranoid
            </span>
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
          >
            {saving ? "A guardar..." : "Guardar evento"}
          </button>

          {message && (
            <p className="text-center text-sm font-bold text-zinc-400">
              {message}
            </p>
          )}

          {slug && (
            <Link
              href={`/eventos/${slug}`}
              className="block rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
            >
              Ver evento público
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}