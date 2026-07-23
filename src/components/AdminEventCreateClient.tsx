"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { findExistingEntity } from "@/lib/data/find-existing-entity";
import { LocationMapPicker, LocationSuggestions } from "@/components/location/LocationSearch";
import type { LocationResult } from "@/lib/location/types";
import { fallbackEventCategories } from "@/lib/eventFilters";

const categories = fallbackEventCategories;

const citySuggestions = [
  "Pombal",
  "Alvorge",
  "Ansião",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
  "Lisboa",
  "Porto",
  "Aveiro",
  "Braga",
  "Faro",
];

const municipalitySuggestions = [
  "Pombal",
  "Ansião",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
  "Lisboa",
  "Porto",
  "Aveiro",
  "Braga",
  "Faro",
];

type TicketMode = "none" | "external" | "internal";

type LocationPayload = {
  address: string | null;
  postal_code: string | null;
  municipality: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: "geocoded" | null;
};

type GeocodeResult = {
  latitude: number;
  longitude: number;
  display_name: string;
  provider: string;
  city?: string;
  municipality?: string;
  district?: string;
  postal_code?: string;
  address?: string;
  locality?: string;
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

function buildMapsSearchUrl({
  venue,
  address,
  postalCode,
  city,
  municipality,
  district,
}: {
  venue: string;
  address: string;
  postalCode: string;
  city: string;
  municipality: string;
  district: string;
}) {
  const query = [
    venue,
    address,
    postalCode,
    city,
    municipality,
    district,
    "Portugal",
  ]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

function buildMapsCoordinateUrl(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${latitude},${longitude}`
  )}`;
}

async function geocodeAddress({
  venue,
  address,
  postalCode,
  city,
  municipality,
  district,
}: {
  venue: string;
  address: string;
  postalCode: string;
  city: string;
  municipality: string;
  district: string;
}) {
  const query = [address, postalCode, city, municipality, district]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

  const response = await fetch("/api/geocode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      venue,
      address,
      postal_code: postalCode,
      city,
      municipality,
      district,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Não consegui localizar a morada.");
  }

  return data as GeocodeResult;
}

async function createUniqueEventSlug(title: string) {
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

    if (!data) {
      return candidate;
    }

    count += 1;
    candidate = `${baseSlug}-${count}`;
  }
}

async function findOrCreateVenue(
  name: string,
  city: string,
  location: LocationPayload,
  organizerId: string | null
) {
  const cleanName = name.trim();

  if (!cleanName) {
    return null;
  }

  const slug = slugify(cleanName);

  const existingVenue = await findExistingEntity("venues", slug, cleanName, city);

  if (existingVenue) {
    const { error: updateError } = await supabase
      .from("venues")
      .update({
        city,
        municipality: location.municipality,
        address: location.address,
        postal_code: location.postal_code,
        district: location.district,
        latitude: location.latitude,
        longitude: location.longitude,
        location_source: location.location_source,
      })
      .eq("id", (existingVenue as VenueRow).id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return (existingVenue as VenueRow).id;
  }

  const { data: createdVenue, error: createError } = await supabase
    .from("venues")
    .insert({
      slug,
      name: cleanName,
      city,
      municipality: location.municipality,
      address: location.address,
      postal_code: location.postal_code,
      district: location.district,
      latitude: location.latitude,
      longitude: location.longitude,
      location_source: location.location_source,
      description: null,
      instagram: null,
      verified: false,
      status: "provisional",
      organizer_id: organizerId,
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

async function attachArtistsToEvent({
  eventId,
  artistsText,
  city,
}: {
  eventId: string;
  artistsText: string;
  city: string;
}) {
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

  const { error } = await supabase.from("event_artists").insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}

export function AdminEventCreateClient() {
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [artistsText, setArtistsText] = useState("");
  const [category, setCategory] = useState("Concertos");
  const [city, setCity] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [district, setDistrict] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geocodeLabel, setGeocodeLabel] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [eventTime, setEventTime] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);

  const [ticketMode, setTicketMode] = useState<TicketMode>("none");
  const [ticketUrl, setTicketUrl] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketCapacity, setTicketCapacity] = useState("");
  const [ticketButtonLabel, setTicketButtonLabel] = useState("Comprar bilhete");
  const [instagramUrl, setInstagramUrl] = useState("");

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const mapsSearchUrl = buildMapsSearchUrl({
    venue,
    address,
    postalCode,
    city,
    municipality,
    district,
  });

  const mapsCoordinateUrl = buildMapsCoordinateUrl(latitude, longitude);

  function clearGeocode() {
    setLatitude(null);
    setLongitude(null);
    setGeocodeLabel("");
  }

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

  async function handleFindLocation() {
    setMessage("");

    if (![venue, address, postalCode, city, municipality, district].some((value) => value.trim())) {
      setMessage("Mete o espaço, uma morada ou uma localidade para pesquisar.");
      return null;
    }

    setGeocoding(true);

    try {
      const result = await geocodeAddress({
        venue,
        address,
        postalCode,
        city,
        municipality,
        district,
      });

      applyLocationResult(result);

      setMessage("Localização encontrada automaticamente.");
      setGeocoding(false);

      return result;
    } catch (error) {
      setGeocoding(false);
      setLatitude(null);
      setLongitude(null);
      setGeocodeLabel("");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não consegui encontrar a localização."
      );

      return null;
    }
  }

  function applyLocationResult(result: LocationResult) {
    setLatitude(result.latitude);
    setLongitude(result.longitude);
    setGeocodeLabel(result.display_name);
    if (result.address) setAddress(result.address);
    if (result.locality || result.city) setCity(result.locality || result.city || "");
    if (result.municipality) setMunicipality(result.municipality);
    if (result.district) setDistrict(result.district);
    if (result.postal_code) setPostalCode(result.postal_code);
  }

  function resetForm() {
    setTitle("");
    setOrganizer("");
    setArtistsText("");
    setCategory("Concertos");
    setCity("");
    setMunicipality("");
    setDistrict("");
    setVenue("");
    setAddress("");
    setPostalCode("");
    setLatitude(null);
    setLongitude(null);
    setGeocodeLabel("");
    setEventDate("");
    setEndDate("");
    setIsMultiDay(false);
    setEventTime("");
    setPrice("");
    setDescription("");
    setFeatured(false);
    setTicketMode("none");
    setTicketUrl("");
    setTicketPrice("");
    setTicketCapacity("");
    setTicketButtonLabel("Comprar bilhete");
    setInstagramUrl("");
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
  }

  async function handleCreateEvent() {
    setMessage("");

    if (!title || !organizer || !venue || !eventDate) {
      setMessage(
        "Preenche pelo menos nome do evento, organizador, espaço e data."
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
      let finalLatitude = latitude;
      let finalLongitude = longitude;
      let finalGeocodeLabel = geocodeLabel;
      let finalCity = city;
      let finalMunicipality = municipality;
      let finalDistrict = district;
      let finalPostalCode = postalCode;

      if (finalLatitude === null || finalLongitude === null) {
        try {
          const result = await geocodeAddress({ venue, address, postalCode, city, municipality, district });
          finalLatitude = result.latitude;
          finalLongitude = result.longitude;
          finalGeocodeLabel = result.display_name;
          finalCity = city.trim() || result.city || "";
          finalMunicipality = municipality.trim() || result.municipality || municipality;
          finalDistrict = district.trim() || result.district || "";
          finalPostalCode = postalCode.trim() || result.postal_code || "";
          applyLocationResult(result);
        } catch {
          setMessage("A pesquisa automática falhou. O evento será guardado com os dados manuais e poderá ser localizado mais tarde.");
        }
      }

      const location: LocationPayload = {
        address: address.trim() || null,
        postal_code: finalPostalCode.trim() || null,
        municipality: finalMunicipality.trim() || null,
        district: finalDistrict.trim() || null,
        latitude: finalLatitude,
        longitude: finalLongitude,
        location_source:
          finalLatitude !== null && finalLongitude !== null
            ? "geocoded"
            : null,
      };

      const eventSlug = await createUniqueEventSlug(title);
      const imageUrl = await uploadSelectedImage();

      const organizerId = await findOrCreateOrganizer(organizer, finalCity);
      const venueId = await findOrCreateVenue(venue, finalCity, location, organizerId);

      const finalEndDate = isMultiDay ? endDate || eventDate : eventDate;
      const displayDate = buildDisplayDate(eventDate, finalEndDate, isMultiDay);
      const startAt = getStartAt(eventDate, eventTime || null);
      const endAt = getEndAt(eventDate, finalEndDate, isMultiDay);

      const { data: createdEvent, error } = await supabase
        .from("events")
        .insert({
          slug: eventSlug,
          title,
          city: finalCity,
          municipality: location.municipality,
          district: location.district,
          address: location.address,
          postal_code: location.postal_code,
          latitude: location.latitude,
          longitude: location.longitude,
          location_source: location.location_source,

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
          status: "published",
        })
        .select("id,slug")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      await attachArtistsToEvent({
        eventId: createdEvent.id,
        artistsText,
        city: finalCity,
      });

      setSaving(false);
      setMessage(
        `Evento criado: /eventos/${createdEvent.slug}${
          finalGeocodeLabel ? ` · localização: ${finalGeocodeLabel}` : ""
        }`
      );
      resetForm();
    } catch (error) {
      setSaving(false);
      setMessage(
        `Erro ao criar evento: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
    }
  }

  return (
    <section className="mt-8 rounded-[2.5rem] border border-border bg-background p-5 lg:mt-12 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-danger">
            Admin
          </p>

          <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
            Criar evento.
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-foreground-muted">
            Cria eventos diretamente como Paranoid. A localização é calculada
            automaticamente pela morada.
          </p>
        </div>

        <div className="rounded-[2rem] border border-border bg-black p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-danger">
            Pré-visualização
          </p>

          <h3 className="mt-3 text-2xl font-black leading-tight">
            {title || "Nome do evento"}
          </h3>

          <div className="mt-4 space-y-1 text-sm text-foreground-muted">
            <p>{category}</p>
            <p>{eventDate || "Data por definir"}</p>
            <p>{eventTime || "Hora por definir"}</p>
            <p>
              {[venue, city, municipality].filter(Boolean).join(" · ") ||
                "Local"}
            </p>
            <p>{address || "Morada por definir"}</p>
            <p>
              {latitude !== null && longitude !== null
                ? "Localização automática encontrada"
                : "Localização ainda por calcular"}
            </p>
            <p>{price || "Preço por definir"}</p>
            {ticketMode === "external" && <p>Bilheteira externa</p>}
            {ticketMode === "internal" && (
              <p>Bilheteira Paranoid · {ticketPrice || "preço por definir"}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-danger bg-danger/20 p-4">
        <p className="text-sm font-bold text-danger">
          Nova ordem: primeiro nome do evento, depois espaço e organizador,
          depois localização automática pela morada.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <label className="mb-2 block text-sm font-bold text-foreground-secondary">
            Poster / imagem
          </label>

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) =>
              handleImageChange(event.target.files?.[0] || null)
            }
            className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-sm text-foreground-muted file:mr-4 file:rounded-full file:border-0 file:bg-[#f5f5f2] file:px-4 file:py-2 file:text-sm file:font-black file:text-black"
          />
        </div>

        {imagePreviewUrl && (
          <div
            className="h-72 rounded-[2rem] bg-cover bg-center lg:col-span-2 lg:h-96"
            style={{ backgroundImage: `url(${imagePreviewUrl})` }}
          />
        )}

        <div className="lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-danger">
            1. Evento
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-foreground-secondary">
            Nome do evento
          </label>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex: Noite Paranoid Vol. I"
            className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
          />
        </div>

        <div className="lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-danger">
            2. Espaço e organização
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-foreground-secondary">
            Espaço / local
          </label>

          <input
            value={venue}
            onChange={(event) => {
              setVenue(event.target.value);
              clearGeocode();
            }}
            placeholder="Ex: Stereogun, Teatro-Cine, Praça..."
            className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
          />
          <LocationSuggestions query={venue} context={{ city, municipality, district, postal_code: postalCode }} onSelect={applyLocationResult} />

          <p className="mt-2 text-xs leading-relaxed text-foreground-muted">
            Pesquisa pelo nome do espaço ou completa a morada abaixo.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-foreground-secondary">
            Organizador
          </label>

          <input
            value={organizer}
            onChange={(event) => setOrganizer(event.target.value)}
            placeholder="Nome do coletivo, sala ou promotor"
            className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
          />
        </div>

        <div className="rounded-[2rem] border border-border bg-black p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-danger">
            3. Localização automática
          </p>

          <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
            Mete a morada real do espaço. A Paranoid encontra as coordenadas
            exatas primeiro; só depois guarda localidade, concelho e distrito
            para o mapa.
          </p>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-bold text-foreground-secondary">
                Morada completa
              </label>

              <input
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  clearGeocode();
                }}
                placeholder="Rua, número, espaço..."
                className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
              />
              <LocationSuggestions query={address} context={{ venue, city, municipality, district, postal_code: postalCode }} onSelect={applyLocationResult} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-foreground-secondary">
                Código postal
              </label>

              <input
                value={postalCode}
                onChange={(event) => {
                  setPostalCode(event.target.value);
                  clearGeocode();
                }}
                placeholder="0000-000"
                className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleFindLocation}
                disabled={geocoding}
                className="w-full rounded-full bg-[#f5f5f2] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
              >
                {geocoding
                  ? "A localizar..."
                  : "Encontrar localização automática"}
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={mapsSearchUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border-strong px-5 py-4 text-sm font-bold text-foreground-secondary"
            >
              Ver morada no Maps
            </a>

            {mapsCoordinateUrl && (
              <a
                href={mapsCoordinateUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-green-900 px-5 py-4 text-sm font-bold text-green-400"
              >
                Testar localização encontrada
              </a>
            )}
          </div>

          {geocodeLabel && (
            <div className="mt-5 rounded-2xl border border-green-900 bg-green-950/20 p-4">
              <p className="text-sm font-bold text-green-400">
                Localização encontrada
              </p>

              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                {geocodeLabel}
              </p>

              <p className="mt-2 text-xs leading-relaxed text-foreground-muted">
                Coordenadas guardadas automaticamente pela app.
              </p>
            </div>
          )}

          <details className="mt-5 border-t border-border pt-4">
            <summary className="cursor-pointer text-sm font-black text-foreground-secondary">Escolher ponto no mapa</summary>
            <div className="mt-4"><LocationMapPicker latitude={latitude} longitude={longitude} onSelect={applyLocationResult} /></div>
          </details>

          <p className="mt-4 text-xs leading-relaxed text-foreground-muted">Pesquisa e mapa por OpenStreetMap/Nominatim. Se falhar, continua com preenchimento manual.</p>
        </div>

        <div className="rounded-[2rem] border border-border bg-black p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-danger">
            4. Zona confirmada
          </p>

          <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
            A Paranoid tenta preencher isto pela morada. Corrige manualmente se
            a localização automática não bater certo.
          </p>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground-secondary">
                Localidade
              </label>

              <input
                list="admin-event-city-suggestions"
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  clearGeocode();
                }}
                placeholder="Ex: Alvorge, Pombal, Leiria..."
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
              />

              <datalist id="admin-event-city-suggestions">
                {citySuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-foreground-secondary">
                Concelho
              </label>

              <input
                list="admin-event-municipality-suggestions"
                value={municipality}
                onChange={(event) => {
                  setMunicipality(event.target.value);
                  clearGeocode();
                }}
                placeholder="Ex: Ansião, Pombal, Leiria..."
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
              />

              <datalist id="admin-event-municipality-suggestions">
                {municipalitySuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-foreground-secondary">
                Distrito
              </label>

              <input
                value={district}
                onChange={(event) => {
                  setDistrict(event.target.value);
                  clearGeocode();
                }}
                placeholder="Ex: Leiria, Coimbra, Lisboa..."
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-danger">
            5. Detalhes do evento
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-foreground-secondary">
            Categoria
          </label>

          <select
            value={category}
            onChange={(event) => handleCategoryChange(event.target.value)}
            className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none focus:border-[var(--accent)]"
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-foreground-secondary">
            Artistas / bandas / DJs
          </label>

          <input
            value={artistsText}
            onChange={(event) => setArtistsText(event.target.value)}
            placeholder="Separar por vírgulas"
            className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
          />
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-border bg-black px-4 py-3 lg:col-span-2">
          <input
            type="checkbox"
            checked={isMultiDay}
            onChange={(event) => handleMultiDayChange(event.target.checked)}
          />

          <span className="text-sm font-bold text-foreground-secondary">
            Festival / evento de vários dias
          </span>
        </label>

        <div>
          <label className="mb-2 block text-sm font-bold text-foreground-secondary">
            Data início
          </label>

          <input
            type="date"
            value={eventDate}
            onChange={(event) => handleEventDateChange(event.target.value)}
            className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none focus:border-[var(--accent)]"
          />
        </div>

        {isMultiDay && (
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground-secondary">
              Data fim
            </label>

            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-bold text-foreground-secondary">
            Hora
          </label>

          <input
            type="time"
            value={eventTime}
            onChange={(event) => setEventTime(event.target.value)}
            className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-foreground-secondary">
            Preço público
          </label>

          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            onBlur={() => setPrice(formatPriceValue(price))}
            placeholder="Ex: 5€, 10€ ou Entrada livre"
            className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
          />
        </div>

        <div className="rounded-[2rem] border border-danger bg-danger/20 p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-danger">
            Bilheteira
          </p>

          <label className="mt-4 mb-2 block text-sm font-bold text-foreground-secondary">
            Tipo de bilheteira
          </label>

          <select
            value={ticketMode}
            onChange={(event) =>
              handleTicketModeChange(event.target.value as TicketMode)
            }
            className="w-full rounded-2xl border border-danger bg-black px-4 py-3 text-[#f5f5f2] outline-none focus:border-[var(--accent)]"
          >
            <option value="none">Sem bilhetes / só informação</option>
            <option value="external">Bilheteira externa</option>
            <option value="internal">Bilheteira Paranoid</option>
          </select>

          {ticketMode === "external" && (
            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-foreground-secondary">
                Link externo
              </label>

              <input
                value={ticketUrl}
                onChange={(event) => setTicketUrl(event.target.value)}
                placeholder="https://shotgun.live/..."
                className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
              />
            </div>
          )}

          {ticketMode === "internal" && (
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-foreground-secondary">
                  Preço do bilhete
                </label>

                <input
                  value={ticketPrice}
                  onChange={(event) => setTicketPrice(event.target.value)}
                  onBlur={() => setTicketPrice(formatPriceValue(ticketPrice))}
                  placeholder="Ex: 10€"
                  className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-foreground-secondary">
                  Lotação
                </label>

                <input
                  type="number"
                  min="1"
                  value={ticketCapacity}
                  onChange={(event) => setTicketCapacity(event.target.value)}
                  placeholder="Ex: 100"
                  className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-foreground-secondary">
                  Texto do botão
                </label>

                <input
                  value={ticketButtonLabel}
                  onChange={(event) => setTicketButtonLabel(event.target.value)}
                  placeholder="Comprar na Paranoid"
                  className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-foreground-secondary">
            Instagram / página do evento
          </label>

          <input
            value={instagramUrl}
            onChange={(event) => setInstagramUrl(event.target.value)}
            placeholder="https://instagram.com/..."
            className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
          />
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-border bg-black px-4 py-3">
          <input
            type="checkbox"
            checked={featured}
            onChange={(event) => setFeatured(event.target.checked)}
          />

          <span className="text-sm font-bold text-foreground-secondary">
            Destacar evento
          </span>
        </label>

        <div className="lg:col-span-2">
          <label className="mb-2 block text-sm font-bold text-foreground-secondary">
            Descrição
          </label>

          <textarea
            rows={8}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrição, horários, contexto, links úteis..."
            className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-3 lg:grid-cols-[1fr_0.35fr]">
        <button
          type="button"
          onClick={handleCreateEvent}
          disabled={saving || geocoding}
          className="rounded-full bg-[#f5f5f2] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
        >
          {saving ? "A criar..." : "Criar evento"}
        </button>

        <Link
          href="/admin"
          className="rounded-full border border-border-strong px-5 py-4 text-center text-sm font-bold text-foreground-secondary"
        >
          Voltar ao admin
        </Link>
      </div>

      {message && (
        <p className="mt-5 text-center text-sm font-bold text-foreground-muted">
          {message}
        </p>
      )}
    </section>
  );
}
