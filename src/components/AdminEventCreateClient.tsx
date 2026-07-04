"use client";

import Link from "next/link";
import { useState } from "react";
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

type CreatedEventRow = {
  id: string;
  slug: string;
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

  return `${displayDate}T${timeWithSeconds}+00:00`;
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

export function AdminEventCreateClient() {
  const router = useRouter();

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

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  function generateSlugFromTitle() {
    if (!title) {
      return;
    }

    const baseSlug = slugify(title);
    const suffix = crypto.randomUUID().slice(0, 6);

    setSlug(`${baseSlug}-${suffix}`);
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

  async function uploadSelectedImage() {
    if (!selectedImageFile) {
      return null;
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

  async function attachArtistsToEvent(eventId: string) {
    const artistNames = getArtistNames(artistsText);

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

    const { error } = await supabase.from("event_artists").insert(rows);

    if (error) {
      throw new Error(error.message);
    }
  }

  async function handleCreate() {
    setMessage("");

    if (!title || !slug || !city || !venueName || !organizerName || !displayDate) {
      setMessage(
        "Preenche pelo menos título, slug, cidade, espaço, organizador e data."
      );
      return;
    }

    setSaving(true);

    let venueId: string | null = null;
    let organizerId: string | null = null;
    let imageUrl: string | null = null;

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
      imageUrl = await uploadSelectedImage();
    } catch (error) {
      setMessage(
        `Erro ao carregar imagem: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
      setSaving(false);
      return;
    }

    const { data: createdEvent, error: eventError } = await supabase
      .from("events")
      .insert({
        slug,
        title,
        city,
        venue_id: venueId,
        venue_name: venueName,
        organizer_id: organizerId,
        organizer_name: organizerName,
        start_at: getStartAt(displayDate, displayTime),
        display_date: displayDate,
        display_time: displayTime || "Hora por definir",
        category,
        price: price || "Preço por definir",
        description: description || "",
        image_url: imageUrl,
        featured,
        status: "published",
      })
      .select("id,slug")
      .single();

    if (eventError || !createdEvent) {
      setMessage(
        `Erro ao criar evento: ${
          eventError?.message || "sem detalhe do Supabase"
        }`
      );
      setSaving(false);
      return;
    }

    const event = createdEvent as CreatedEventRow;

    try {
      await attachArtistsToEvent(event.id);
    } catch (error) {
      setMessage(
        `Evento criado, mas erro nos artistas: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
      setSaving(false);
      return;
    }

    setMessage("Evento criado.");
    setSaving(false);

    router.push(`/admin/eventos/${event.slug}`);
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link href="/admin" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar ao admin
        </Link>

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Novo evento
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Publica direto.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Cria um evento manualmente. A Paranoid cria ou associa espaço,
          organizador e artistas automaticamente.
        </p>

        {imagePreviewUrl && (
          <div
            className="mt-6 h-64 rounded-[2rem] bg-cover bg-center"
            style={{ backgroundImage: `url(${imagePreviewUrl})` }}
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
              placeholder="ex: noise-night-pombal-a1b2c3"
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
            onClick={handleCreate}
            disabled={saving}
            className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
          >
            {saving ? "A publicar..." : "Publicar evento"}
          </button>

          {message && (
            <p className="text-center text-sm font-bold text-zinc-400">
              {message}
            </p>
          )}

          <Link
            href="/admin"
            className="block rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
          >
            Voltar ao Admin
          </Link>
        </div>
      </section>
    </main>
  );
}