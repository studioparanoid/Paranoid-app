"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { findExistingEntity } from "@/lib/data/find-existing-entity";
import { fallbackEventCategories } from "@/lib/eventFilters";

const categories = fallbackEventCategories;

const cities = [
  "Pombal",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
];

type TicketMode = "none" | "external" | "internal";

type AdminEventEditClientProps = {
  eventId: string;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue_id: string | null;
  venue_name: string | null;
  organizer_id: string | null;
  organizer_name: string | null;
  start_date: string | null;
  end_date: string | null;
  is_multi_day: boolean | null;
  display_date: string | null;
  display_time: string | null;
  category: string;
  price: string | null;
  description: string | null;
  image_url: string | null;
  featured: boolean | null;
  status: string | null;

  ticket_mode: TicketMode | null;
  ticket_url: string | null;
  ticket_price: string | null;
  ticket_capacity: number | null;
  ticket_button_label: string | null;
  instagram_url: string | null;
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

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
};

type EventArtistRelationRow = {
  artist_id: string;
  artists: ArtistRow | ArtistRow[] | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function normalizeExternalUrl(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return null;
  }

  if (cleanValue.startsWith("http://") || cleanValue.startsWith("https://")) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
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

function formatDateForDisplay(value: string) {
  if (!value) {
    return "";
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function buildDisplayDate(startDate: string, endDate: string, isMultiDay: boolean) {
  if (!startDate) {
    return "Data por definir";
  }

  if (isMultiDay && endDate && endDate !== startDate) {
    return `${formatDateForDisplay(startDate)} — ${formatDateForDisplay(
      endDate
    )}`;
  }

  return formatDateForDisplay(startDate);
}

function getStartAt(startDate: string, displayTime: string | null) {
  if (!startDate) {
    return new Date().toISOString();
  }

  const cleanTime = displayTime || "00:00";
  const timeWithSeconds =
    cleanTime.split(":").length === 2 ? `${cleanTime}:00` : cleanTime;

  return `${startDate}T${timeWithSeconds}+00:00`;
}

function getEndAt(startDate: string, endDate: string, isMultiDay: boolean) {
  if (!startDate) {
    return new Date().toISOString();
  }

  const finalEndDate = isMultiDay && endDate ? endDate : startDate;

  return `${finalEndDate}T23:59:00+00:00`;
}

function getArtistNames(artistsText: string) {
  const names = artistsText
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  return Array.from(new Set(names));
}

function getArtistRowsFromRelationRows(rows: EventArtistRelationRow[]) {
  const artists: ArtistRow[] = [];

  for (const row of rows) {
    if (!row.artists) {
      continue;
    }

    if (Array.isArray(row.artists)) {
      for (const artist of row.artists) {
        artists.push(artist);
      }

      continue;
    }

    artists.push(row.artists);
  }

  return artists;
}

async function createUniqueSlug({
  title,
  currentEventId,
}: {
  title: string;
  currentEventId: string;
}) {
  const baseSlug = slugify(title) || crypto.randomUUID();
  let candidate = baseSlug;
  let count = 1;

  while (true) {
    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.id === currentEventId) {
      return candidate;
    }

    count += 1;
    candidate = `${baseSlug}-${count}`;
  }
}

async function findOrCreateVenue(name: string, city: string) {
  const cleanName = name.trim();

  if (!cleanName) {
    return null;
  }

  const slug = slugify(cleanName);

  const existingVenue = await findExistingEntity("venues", slug, cleanName, city);

  if (existingVenue) {
    return (existingVenue as VenueRow).id;
  }

  const { data: createdVenue, error: createError } = await supabase
    .from("venues")
    .insert({
      slug,
      name: cleanName,
      city,
      address: null,
      description: null,
      instagram: null,
      verified: false,
      status: "provisional",
    })
    .select("id,slug,name")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return (createdVenue as VenueRow).id;
}

async function findOrCreateOrganizer(name: string, city: string) {
  const cleanName = name.trim();

  if (!cleanName) {
    return null;
  }

  const slug = slugify(cleanName);

  const existingOrganizer = await findExistingEntity("organizers", slug, cleanName, city);

  if (existingOrganizer) {
    return (existingOrganizer as OrganizerRow).id;
  }

  const { data: createdOrganizer, error: createError } = await supabase
    .from("organizers")
    .insert({
      slug,
      name: cleanName,
      city,
      description: null,
      pack: null,
      verified: false,
      status: "provisional",
    })
    .select("id,slug,name")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return (createdOrganizer as OrganizerRow).id;
}

async function findOrCreateArtist(name: string, city: string) {
  const cleanName = name.trim();

  if (!cleanName) {
    return null;
  }

  const slug = slugify(cleanName);

  const existingArtist = await findExistingEntity("artists", slug, cleanName, city);

  if (existingArtist) {
    return (existingArtist as ArtistRow).id;
  }

  const { data: createdArtist, error: createError } = await supabase
    .from("artists")
    .insert({
      slug,
      name: cleanName,
      city,
      genres: null,
      description: null,
      instagram: null,
      bandcamp: null,
      verified: false,
      status: "provisional",
    })
    .select("id,slug,name")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return (createdArtist as ArtistRow).id;
}

async function replaceEventArtists({
  eventId,
  artistsText,
  city,
}: {
  eventId: string;
  artistsText: string;
  city: string;
}) {
  const { error: deleteError } = await supabase
    .from("event_artists")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const artistNames = getArtistNames(artistsText);

  if (artistNames.length === 0) {
    return;
  }

  const artistIds: string[] = [];

  for (const artistName of artistNames) {
    const artistId = await findOrCreateArtist(artistName, city);

    if (artistId) {
      artistIds.push(artistId);
    }
  }

  if (artistIds.length === 0) {
    return;
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

export function AdminEventEditClient({ eventId }: AdminEventEditClientProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [loadedEvent, setLoadedEvent] = useState<EventRow | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [artistsText, setArtistsText] = useState("");
  const [category, setCategory] = useState("Concertos");
  const [city, setCity] = useState("Pombal");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [eventTime, setEventTime] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState("published");

  const [ticketMode, setTicketMode] = useState<TicketMode>("none");
  const [ticketUrl, setTicketUrl] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketCapacity, setTicketCapacity] = useState("");
  const [ticketButtonLabel, setTicketButtonLabel] = useState("Comprar bilhete");
  const [instagramUrl, setInstagramUrl] = useState("");

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const previewImage = useMemo(() => {
    return imagePreviewUrl || currentImageUrl;
  }, [imagePreviewUrl, currentImageUrl]);

  async function loadEvent() {
    setLoading(true);
    setMessage("");

    let query = supabase
      .from("events")
      .select(
        "id,slug,title,city,venue_id,venue_name,organizer_id,organizer_name,start_date,end_date,is_multi_day,display_date,display_time,category,price,description,image_url,featured,status,ticket_mode,ticket_url,ticket_price,ticket_capacity,ticket_button_label,instagram_url"
      );

    query = isUuid(eventId) ? query.eq("id", eventId) : query.eq("slug", eventId);

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      setMessage(error?.message || "Evento não encontrado.");
      setLoadedEvent(null);
      setLoading(false);
      return;
    }

    const event = data as EventRow;

    setLoadedEvent(event);
    setTitle(event.title || "");
    setSlug(event.slug || "");
    setOrganizer(event.organizer_name || "");
    setCategory(event.category || "Concertos");
    setCity(event.city || "Pombal");
    setVenue(event.venue_name || "");
    setEventDate(event.start_date || "");
    setEndDate(event.end_date || "");
    setIsMultiDay(Boolean(event.is_multi_day));
    setEventTime(
      event.display_time && event.display_time !== "Hora por definir"
        ? event.display_time
        : ""
    );
    setPrice(event.price || "");
    setDescription(event.description || "");
    setFeatured(Boolean(event.featured));
    setStatus(event.status || "published");
    setCurrentImageUrl(event.image_url);

    setTicketMode(event.ticket_mode || "none");
    setTicketUrl(event.ticket_url || "");
    setTicketPrice(event.ticket_price || "");
    setTicketCapacity(
      event.ticket_capacity === null || event.ticket_capacity === undefined
        ? ""
        : String(event.ticket_capacity)
    );
    setTicketButtonLabel(event.ticket_button_label || "Comprar bilhete");
    setInstagramUrl(event.instagram_url || "");

    const { data: artistRows } = await supabase
      .from("event_artists")
      .select(
        `
        artist_id,
        artists (
          id,
          slug,
          name
        )
      `
      )
      .eq("event_id", event.id);

    const artists = getArtistRowsFromRelationRows(
      (artistRows || []) as unknown as EventArtistRelationRow[]
    );

    setArtistsText(artists.map((artist) => artist.name).join(", "));
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadEvent(); }, 0);
    return () => window.clearTimeout(timer);
  }, [eventId]);

  function handleCategoryChange(value: string) {
    setCategory(value);

    if (value === "Festivais") {
      setIsMultiDay(true);

      if (eventDate && !endDate) {
        setEndDate(eventDate);
      }
    }
  }

  function handleMultiDayChange(value: boolean) {
    setIsMultiDay(value);

    if (!value) {
      setEndDate("");
    }

    if (value && eventDate && !endDate) {
      setEndDate(eventDate);
    }
  }

  function handleEventDateChange(value: string) {
    setEventDate(value);

    if (isMultiDay && !endDate) {
      setEndDate(value);
    }
  }

  function handleTicketModeChange(value: TicketMode) {
    setTicketMode(value);

    if (value === "none") {
      setTicketUrl("");
      setTicketPrice("");
      setTicketCapacity("");
      setTicketButtonLabel("Comprar bilhete");
    }

    if (value === "external") {
      setTicketButtonLabel("Bilhetes / inscrição");
    }

    if (value === "internal") {
      setTicketUrl("");
      setTicketButtonLabel("Comprar na Paranoid");
    }
  }

  function handleImageChange(file: File | null) {
    setMessage("");

    if (!file) {
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setMessage("A imagem tem de ser JPG, PNG ou WEBP.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setMessage("A imagem tem de ter menos de 5MB.");
      return;
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  async function uploadSelectedImage() {
    if (!selectedImageFile) {
      return currentImageUrl;
    }

    const extension =
      selectedImageFile.name.split(".").pop()?.toLowerCase() || "jpg";

    const filePath = `events/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("event-images")
      .upload(filePath, selectedImageFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedImageFile.type,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("event-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function saveEvent() {
    setMessage("");

    if (!loadedEvent) {
      setMessage("Evento inválido.");
      return;
    }

    if (!title || !organizer || !city || !venue || !eventDate) {
      setMessage(
        "Preenche pelo menos nome do evento, organizador, cidade, espaço e data."
      );
      return;
    }

    if (isMultiDay && !endDate) {
      setMessage("Mete a data de fim do festival/evento.");
      return;
    }

    if (isMultiDay && endDate < eventDate) {
      setMessage("A data de fim não pode ser antes da data de início.");
      return;
    }

    if (ticketMode === "external" && !ticketUrl.trim()) {
      setMessage("Se escolheste bilheteira externa, mete o link.");
      return;
    }

    if (ticketMode === "internal" && !ticketPrice.trim()) {
      setMessage("Se escolheste bilheteira Paranoid, mete o preço do bilhete.");
      return;
    }

    setSaving(true);

    try {
      const imageUrl = await uploadSelectedImage();
      const venueId = await findOrCreateVenue(venue, city);
      const organizerId = await findOrCreateOrganizer(organizer, city);

      const finalEndDate = isMultiDay ? endDate || eventDate : eventDate;
      const displayDate = buildDisplayDate(eventDate, finalEndDate, isMultiDay);
      const startAt = getStartAt(eventDate, eventTime || null);
      const endAt = getEndAt(eventDate, finalEndDate, isMultiDay);

      const finalSlug =
        slug.trim() ||
        (await createUniqueSlug({
          title,
          currentEventId: loadedEvent.id,
        }));

      const { error } = await supabase
        .from("events")
        .update({
          slug: finalSlug,
          title,
          city,
          venue_id: venueId,
          venue_name: venue,
          organizer_id: organizerId,
          organizer_name: organizer,
          start_at: startAt,
          end_at: endAt,
          start_date: eventDate,
          end_date: finalEndDate,
          is_multi_day: isMultiDay,
          display_date: displayDate,
          display_time: eventTime || "Hora por definir",
          category,
          price: price || "Preço por definir",
          description: description || "",
          image_url: imageUrl,

          ticket_mode: ticketMode,
          ticket_url:
            ticketMode === "external" ? normalizeExternalUrl(ticketUrl) : null,
          ticket_price: ticketMode === "internal" ? ticketPrice || null : null,
          ticket_capacity:
            ticketMode === "internal" && ticketCapacity
              ? Number(ticketCapacity)
              : null,
          ticket_button_label:
            ticketMode !== "none" ? ticketButtonLabel || null : null,
          instagram_url: normalizeExternalUrl(instagramUrl),

          featured,
          status,
        })
        .eq("id", loadedEvent.id);

      if (error) {
        throw new Error(error.message);
      }

      await replaceEventArtists({
        eventId: loadedEvent.id,
        artistsText,
        city,
      });

      setSaving(false);
      setMessage("Evento atualizado.");
      await loadEvent();
    } catch (error) {
      setSaving(false);
      setMessage(
        `Erro ao guardar evento: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
    }
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-zinc-500">A carregar evento...</p>
      </div>
    );
  }

  if (!loadedEvent) {
    return (
      <div className="mt-8 rounded-[2.5rem] border border-red-950 bg-red-950/20 p-6 lg:p-10">
        <h2 className="text-4xl font-black leading-none">
          Evento não encontrado.
        </h2>

        {message && <p className="mt-4 text-sm text-red-300">{message}</p>}
      </div>
    );
  }

  return (
    <section className="mt-8 rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:mt-12 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Evento
          </p>

          <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
            {title || "Editar evento"}
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            ID: {loadedEvent.id}
          </p>
        </div>

        <div className="rounded-[2rem] border border-zinc-800 bg-black p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-red-700">
            Estado
          </p>

          <div className="mt-4 space-y-2 text-sm text-zinc-500">
            <p>Slug: {slug}</p>
            <p>Estado: {status}</p>
            <p>
              Bilheteira:{" "}
              {ticketMode === "internal"
                ? "Paranoid"
                : ticketMode === "external"
                  ? "externa"
                  : "sem bilhetes"}
            </p>
          </div>

          {status === "published" && (
            <Link
              href={`/eventos/${slug}`}
              className="mt-5 block rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
            >
              Ver público
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Poster / imagem
          </label>

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) =>
              handleImageChange(event.target.files?.[0] || null)
            }
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400 file:mr-4 file:rounded-full file:border-0 file:bg-[#f2f1ec] file:px-4 file:py-2 file:text-sm file:font-black file:text-black"
          />
        </div>

        {previewImage && (
          <div
            className="h-72 rounded-[2rem] bg-cover bg-center lg:col-span-2 lg:h-96"
            style={{ backgroundImage: `url(${previewImage})` }}
          />
        )}

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Nome do evento
          </label>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Slug
          </label>

          <input
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Organizador
          </label>

          <input
            value={organizer}
            onChange={(event) => setOrganizer(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Estado
          </label>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
          >
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
            <option value="draft">Rascunho</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Artistas / bandas / DJs
          </label>

          <input
            value={artistsText}
            onChange={(event) => setArtistsText(event.target.value)}
            placeholder="Separar por vírgulas"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Categoria
          </label>

          <select
            value={category}
            onChange={(event) => handleCategoryChange(event.target.value)}
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

        <div className="lg:col-span-2">
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Espaço / local
          </label>

          <input
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3 lg:col-span-2">
          <input
            type="checkbox"
            checked={isMultiDay}
            onChange={(event) => handleMultiDayChange(event.target.checked)}
          />

          <span className="text-sm font-bold text-zinc-300">
            Festival / evento de vários dias
          </span>
        </label>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Data início
          </label>

          <input
            type="date"
            value={eventDate}
            onChange={(event) => handleEventDateChange(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
          />
        </div>

        {isMultiDay && (
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Data fim
            </label>

            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Hora
          </label>

          <input
            type="time"
            value={eventTime}
            onChange={(event) => setEventTime(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Preço público
          </label>

          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            onBlur={() => setPrice(formatPriceValue(price))}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />
        </div>

        <div className="rounded-[2rem] border border-red-950 bg-red-950/20 p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-red-500">
            Bilheteira
          </p>

          <label className="mt-4 mb-2 block text-sm font-bold text-zinc-300">
            Tipo de bilheteira
          </label>

          <select
            value={ticketMode}
            onChange={(event) =>
              handleTicketModeChange(event.target.value as TicketMode)
            }
            className="w-full rounded-2xl border border-red-950 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-800"
          >
            <option value="none">Sem bilhetes / só informação</option>
            <option value="external">Bilheteira externa</option>
            <option value="internal">Bilheteira Paranoid</option>
          </select>

          {ticketMode === "external" && (
            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Link externo
              </label>

              <input
                value={ticketUrl}
                onChange={(event) => setTicketUrl(event.target.value)}
                placeholder="https://shotgun.live/..."
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
              />
            </div>
          )}

          {ticketMode === "internal" && (
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Preço do bilhete
                </label>

                <input
                  value={ticketPrice}
                  onChange={(event) => setTicketPrice(event.target.value)}
                  onBlur={() => setTicketPrice(formatPriceValue(ticketPrice))}
                  placeholder="Ex: 10€"
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Lotação
                </label>

                <input
                  type="number"
                  min="1"
                  value={ticketCapacity}
                  onChange={(event) => setTicketCapacity(event.target.value)}
                  placeholder="Ex: 100"
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Texto do botão
                </label>

                <input
                  value={ticketButtonLabel}
                  onChange={(event) => setTicketButtonLabel(event.target.value)}
                  placeholder="Comprar na Paranoid"
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Instagram / página do evento
          </label>

          <input
            value={instagramUrl}
            onChange={(event) => setInstagramUrl(event.target.value)}
            placeholder="https://instagram.com/..."
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
            Destacar evento
          </span>
        </label>

        <div className="lg:col-span-2">
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Descrição
          </label>

          <textarea
            rows={8}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-3 lg:grid-cols-[1fr_0.35fr_0.35fr]">
        <button
          type="button"
          onClick={saveEvent}
          disabled={saving}
          className="rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
        >
          {saving ? "A guardar..." : "Guardar alterações"}
        </button>

        {status === "published" && (
          <Link
            href={`/eventos/${slug}`}
            className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
          >
            Ver público
          </Link>
        )}

        <Link
          href="/admin"
          className="rounded-full border border-zinc-800 px-5 py-4 text-center text-sm font-bold text-zinc-500"
        >
          Voltar ao admin
        </Link>
      </div>

      {message && (
        <p className="mt-5 text-center text-sm font-bold text-zinc-400">
          {message}
        </p>
      )}
    </section>
  );
}
