"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

const categories = [
  "Concertos",
  "Festivais",
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
  end_at: string | null;
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getDateFromIso(value: string | null) {
  if (!value) {
    return "";
  }

  const datePart = value.split("T")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  return "";
}

function formatDateForInput(value: string | null) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return "";
}

function formatTimeForInput(value: string | null) {
  if (!value) {
    return "";
  }

  const parts = value.split(":");

  if (parts.length >= 2 && /^\d{2}$/.test(parts[0])) {
    return `${parts[0]}:${parts[1]}`;
  }

  return "";
}

function getStartAt(startDate: string, displayTime: string) {
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

function getArtistNames(artistsText: string) {
  const names = artistsText
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  return Array.from(new Set(names));
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [displayTime, setDisplayTime] = useState("");
  const [category, setCategory] = useState("Concertos");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvent() {
      const eventQuery = supabase.from("events").select("*");

      const { data: eventData, error: eventError } = isUuid(eventId)
        ? await eventQuery.eq("id", eventId).maybeSingle()
        : await eventQuery.eq("slug", eventId).maybeSingle();

      if (eventError || !eventData) {
        setMessage("Não encontrei este evento.");
        setLoading(false);
        return;
      }

      const loadedEvent = eventData as EventRow;

      const loadedStartDate =
        formatDateForInput(loadedEvent.start_date) ||
        getDateFromIso(loadedEvent.start_at);

      const loadedEndDate =
        formatDateForInput(loadedEvent.end_date) ||
        getDateFromIso(loadedEvent.end_at) ||
        loadedStartDate;

      setEvent(loadedEvent);
      setTitle(loadedEvent.title || "");
      setSlug(loadedEvent.slug || "");
      setCity(loadedEvent.city || "Pombal");
      setVenueName(loadedEvent.venue_name || "");
      setOrganizerName(loadedEvent.organizer_name || "");
      setStartDate(loadedStartDate);
      setEndDate(loadedEndDate);
      setDisplayTime(formatTimeForInput(loadedEvent.display_time));
      setCategory(loadedEvent.category || "Concertos");
      setPrice(loadedEvent.price || "");
      setDescription(loadedEvent.description || "");
      setFeatured(Boolean(loadedEvent.featured));
      setIsMultiDay(Boolean(loadedEvent.is_multi_day));
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
        .eq("event_id", loadedEvent.id);

      const relationRows = (eventArtistsData ||
        []) as unknown as EventArtistRelationRow[];

      const artistNames = getArtistNamesFromRelationRows(relationRows);

      setArtistsText(artistNames.join(", "));

      setLoading(false);
    }

    loadEvent();
  }, [eventId]);

  function handleTitleChange(value: string) {
    setTitle(value);
    setSlug(slugify(value));
  }

  function handleCategoryChange(value: string) {
    setCategory(value);

    if (value === "Festivais") {
      setIsMultiDay(true);

      if (startDate && !endDate) {
        setEndDate(startDate);
      }
    }
  }

  function handleMultiDayChange(value: boolean) {
    setIsMultiDay(value);

    if (!value) {
      setEndDate("");
    }

    if (value && startDate && !endDate) {
      setEndDate(startDate);
    }
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);

    if (isMultiDay && !endDate) {
      setEndDate(value);
    }
  }

  function handlePriceBlur() {
    setPrice(formatPriceValue(price));
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

  async function getUniqueEventSlug(baseSlug: string, currentEventId: string) {
    const cleanBaseSlug = baseSlug || `evento-${crypto.randomUUID().slice(0, 6)}`;

    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("slug", cleanBaseSlug)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.id === currentEventId) {
      return cleanBaseSlug;
    }

    return `${cleanBaseSlug}-${crypto.randomUUID().slice(0, 6)}`;
  }

  async function uploadSelectedImage() {
    if (!selectedImageFile) {
      return imageUrl;
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
    if (!event) {
      throw new Error("Evento inválido.");
    }

    const artistNames = getArtistNames(artistsText);

    const { error: deleteError } = await supabase
      .from("event_artists")
      .delete()
      .eq("event_id", event.id);

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
      event_id: event.id,
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

    if (!title || !city || !venueName || !organizerName || !startDate) {
      setMessage(
        "Preenche pelo menos título, cidade, espaço, organizador e data de início."
      );
      return;
    }

    if (isMultiDay && !endDate) {
      setMessage("Mete a data de fim do festival.");
      return;
    }

    if (isMultiDay && endDate < startDate) {
      setMessage("A data de fim não pode ser antes da data de início.");
      return;
    }

    setSaving(true);

    let venueId: string | null = null;
    let organizerId: string | null = null;
    let finalImageUrl = imageUrl;
    let finalSlug = slug;

    const finalEndDate = isMultiDay ? endDate || startDate : startDate;
    const displayDateText = buildDisplayDate(startDate, finalEndDate, isMultiDay);
    const startAt = getStartAt(startDate, displayTime);
    const endAt = getEndAt(startDate, finalEndDate, isMultiDay);

    try {
      finalSlug = await getUniqueEventSlug(slug || slugify(title), event.id);
    } catch (error) {
      setMessage(
        `Erro ao gerar slug: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
      setSaving(false);
      return;
    }

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

    try {
      finalImageUrl = await uploadSelectedImage();
    } catch (error) {
      setMessage(
        `Erro ao carregar imagem: ${
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
        slug: finalSlug,
        city,
        venue_id: venueId,
        venue_name: venueName,
        organizer_id: organizerId,
        organizer_name: organizerName,
        start_at: startAt,
        end_at: endAt,
        start_date: startDate,
        end_date: finalEndDate,
        is_multi_day: isMultiDay,
        display_date: displayDateText,
        display_time: displayTime || "Hora por definir",
        category,
        price: price || "Preço por definir",
        description: description || "",
        image_url: finalImageUrl,
        featured,
        status: "published",
      })
      .eq("id", event.id);

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

    const updatedEvent = {
      ...event,
      title,
      slug: finalSlug,
      city,
      venue_id: venueId,
      venue_name: venueName,
      organizer_id: organizerId,
      organizer_name: organizerName,
      start_at: startAt,
      end_at: endAt,
      start_date: startDate,
      end_date: finalEndDate,
      is_multi_day: isMultiDay,
      display_date: displayDateText,
      display_time: displayTime || "Hora por definir",
      category,
      price: price || "Preço por definir",
      description: description || "",
      image_url: finalImageUrl,
      featured,
      status: "published",
    };

    setEvent(updatedEvent);
    setSlug(finalSlug);
    setImageUrl(finalImageUrl);
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setMessage("Evento atualizado.");
    setSaving(false);
    router.refresh();
  }

  const visibleImageUrl = imagePreviewUrl || imageUrl;

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
          O slug acompanha o título. Também podes transformar este evento num
          festival de vários dias.
        </p>

        {visibleImageUrl && (
          <div
            className="mt-6 h-64 rounded-[2rem] bg-cover bg-center"
            style={{ backgroundImage: `url(${visibleImageUrl})` }}
          />
        )}

        <div className="mt-8 space-y-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Imagem / poster
            </label>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) =>
                handleImageChange(event.target.files?.[0] || null)
              }
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400 file:mr-4 file:rounded-full file:border-0 file:bg-[#f2f1ec] file:px-4 file:py-2 file:text-sm file:font-black file:text-black"
            />

            <p className="mt-2 text-xs text-zinc-600">
              JPG, PNG ou WEBP. Máximo 5MB.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Nome do evento
            </label>

            <input
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="Nome do evento"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Slug automático
            </label>

            <input
              value={slug}
              readOnly
              placeholder="gerado-automaticamente"
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-400 outline-none placeholder:text-zinc-700"
            />

            <p className="mt-2 text-xs text-zinc-600">
              É gerado pelo título. Se já existir, a app acrescenta um código no
              fim ao guardar.
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
              onChange={(event) => handleCategoryChange(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3">
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

          <div className={isMultiDay ? "grid grid-cols-2 gap-3" : ""}>
            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Data início
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(event) => handleStartDateChange(event.target.value)}
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