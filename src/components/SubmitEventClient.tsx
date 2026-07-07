"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/public";

type TicketMode = "none" | "external" | "internal";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  account_type: string | null;
  account_status: string | null;
  organizer_name: string | null;
  entity_id: string | null;
  entity_slug: string | null;
};

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
};

type GeocodeResult = {
  latitude: number;
  longitude: number;
  display_name: string;
};

const citySuggestions = [
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
  "Outra",
];

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

function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
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

function ticketModeLabel(mode: TicketMode) {
  if (mode === "internal") {
    return "Bilheteira Paranoid";
  }

  if (mode === "external") {
    return "Link externo";
  }

  return "Sem bilhetes";
}

function buildMapsSearchUrl({
  venue,
  address,
  postalCode,
  city,
  district,
}: {
  venue: string;
  address: string;
  postalCode: string;
  city: string;
  district: string;
}) {
  const query = [venue, address, postalCode, city, district, "Portugal"]
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
  district,
}: {
  venue: string;
  address: string;
  postalCode: string;
  city: string;
  district: string;
}) {
  const response = await fetch("/api/geocode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      venue,
      address,
      postal_code: postalCode,
      city,
      district,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Não consegui localizar a morada.");
  }

  return data as GeocodeResult;
}

export function SubmitEventClient() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [linkedOrganizer, setLinkedOrganizer] = useState<OrganizerRow | null>(
    null
  );

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Pombal");
  const [district, setDistrict] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geocodeLabel, setGeocodeLabel] = useState("");

  const [organizer, setOrganizer] = useState("");
  const [category, setCategory] = useState("Concertos");

  const [isMultiDay, setIsMultiDay] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [eventTime, setEventTime] = useState("");

  const [price, setPrice] = useState("");
  const [artistsText, setArtistsText] = useState("");
  const [description, setDescription] = useState("");

  const [instagramUrl, setInstagramUrl] = useState("");

  const [ticketMode, setTicketMode] = useState<TicketMode>("none");
  const [ticketUrl, setTicketUrl] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketCapacity, setTicketCapacity] = useState("");
  const [ticketButtonLabel, setTicketButtonLabel] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);

  const isApprovedOrganizer = useMemo(() => {
    return (
      profile?.account_type === "organizer" &&
      profile?.account_status === "approved" &&
      Boolean(profile?.entity_id)
    );
  }, [profile]);

  const mapsSearchUrl = buildMapsSearchUrl({
    venue,
    address,
    postalCode,
    city,
    district,
  });

  const mapsCoordinateUrl = buildMapsCoordinateUrl(latitude, longitude);

  useEffect(() => {
    async function loadUserContext() {
      setLoadingUser(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoadingUser(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "id,email,display_name,account_type,account_status,organizer_name,entity_id,entity_slug"
        )
        .eq("id", user.id)
        .maybeSingle();

      const loadedProfile = (profileData || null) as ProfileRow | null;
      setProfile(loadedProfile);

      if (
        loadedProfile?.account_type === "organizer" &&
        loadedProfile?.account_status === "approved" &&
        loadedProfile?.entity_id
      ) {
        const { data: organizerData } = await supabase
          .from("organizers")
          .select("id,slug,name,city")
          .eq("id", loadedProfile.entity_id)
          .maybeSingle();

        const loadedOrganizer = (organizerData || null) as OrganizerRow | null;

        if (loadedOrganizer) {
          setLinkedOrganizer(loadedOrganizer);
          setOrganizer(loadedOrganizer.name);

          if (loadedOrganizer.city) {
            setCity(loadedOrganizer.city);
          }
        } else if (loadedProfile.organizer_name) {
          setOrganizer(loadedProfile.organizer_name);
        }
      }

      setLoadingUser(false);
    }

    loadUserContext();
  }, []);

  function clearGeocode() {
    setLatitude(null);
    setLongitude(null);
    setGeocodeLabel("");
  }

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setImageFile(null);
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setMessage("A imagem tem de ser PNG, JPG ou WEBP.");
      event.target.value = "";
      setImageFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("A imagem não pode ter mais de 5MB.");
      event.target.value = "";
      setImageFile(null);
      return;
    }

    setMessage("");
    setImageFile(file);
  }

  async function uploadImage() {
    if (!imageFile) {
      return null;
    }

    const safeName = slugifyFileName(imageFile.name);
    const filePath = `submissions/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from("event-images")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("event-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleFindLocation() {
    setMessage("");

    if (!address.trim() || !city.trim()) {
      setMessage("Mete pelo menos morada e cidade para localizar.");
      return null;
    }

    setGeocoding(true);

    try {
      const result = await geocodeAddress({
        venue,
        address,
        postalCode,
        city,
        district,
      });

      setLatitude(result.latitude);
      setLongitude(result.longitude);
      setGeocodeLabel(result.display_name);
      setMessage("Localização encontrada automaticamente.");
      setGeocoding(false);

      return result;
    } catch (error) {
      setLatitude(null);
      setLongitude(null);
      setGeocodeLabel("");
      setGeocoding(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não consegui encontrar a localização."
      );

      return null;
    }
  }

  function resetAfterSubmit() {
    setTitle("");
    setVenue("");
    setAddress("");
    setPostalCode("");
    setDistrict("");
    setLatitude(null);
    setLongitude(null);
    setGeocodeLabel("");
    setArtistsText("");
    setDescription("");
    setPrice("");
    setEventDate("");
    setEndDate("");
    setEventTime("");
    setInstagramUrl("");
    setTicketMode("none");
    setTicketUrl("");
    setTicketPrice("");
    setTicketCapacity("");
    setTicketButtonLabel("");
    setImageFile(null);

    if (!isApprovedOrganizer) {
      setOrganizer("");
    }
  }

  async function submitEvent() {
    setMessage("");

    if (!title.trim()) {
      setMessage("Mete o nome do evento.");
      return;
    }

    if (!city.trim()) {
      setMessage("Mete a cidade/localidade.");
      return;
    }

    if (!venue.trim()) {
      setMessage("Mete o espaço.");
      return;
    }

    if (!address.trim()) {
      setMessage("Mete a morada do espaço/evento.");
      return;
    }

    if (!organizer.trim()) {
      setMessage("Mete o organizador.");
      return;
    }

    if (!eventDate) {
      setMessage("Mete a data do evento.");
      return;
    }

    if (isMultiDay && !endDate) {
      setMessage("Mete a data de fim.");
      return;
    }

    if (isMultiDay && endDate < eventDate) {
      setMessage("A data de fim não pode ser antes da data de início.");
      return;
    }

    if (ticketMode === "external" && !ticketUrl.trim()) {
      setMessage("Mete o link da bilheteira externa.");
      return;
    }

    if (ticketMode === "internal" && ticketCapacity.trim()) {
      const capacityNumber = Number(ticketCapacity);

      if (!Number.isInteger(capacityNumber) || capacityNumber < 1) {
        setMessage("A lotação da bilheteira Paranoid tem de ser um número.");
        return;
      }
    }

    setSubmitting(true);

    try {
      let finalLatitude = latitude;
      let finalLongitude = longitude;
      let finalGeocodeLabel = geocodeLabel;

      if (finalLatitude === null || finalLongitude === null) {
        const result = await geocodeAddress({
          venue,
          address,
          postalCode,
          city,
          district,
        });

        finalLatitude = result.latitude;
        finalLongitude = result.longitude;
        finalGeocodeLabel = result.display_name;

        setLatitude(result.latitude);
        setLongitude(result.longitude);
        setGeocodeLabel(result.display_name);
      }

      const imageUrl = await uploadImage();

      const { error } = await supabase.from("event_submissions").insert({
        title: title.trim(),
        city: city.trim(),
        district: district.trim() || null,
        venue: venue.trim(),
        address: address.trim(),
        postal_code: postalCode.trim() || null,
        latitude: finalLatitude,
        longitude: finalLongitude,
        location_source:
          finalLatitude !== null && finalLongitude !== null
            ? "geocoded"
            : null,

        organizer: organizer.trim(),
        category,
        event_date: eventDate,
        end_date: isMultiDay ? endDate : null,
        is_multi_day: isMultiDay,
        event_time: eventTime || null,
        price: price.trim() || null,
        description: description.trim() || null,
        image_url: imageUrl,

        submitted_by: userId || null,

        organizer_id: isApprovedOrganizer
          ? linkedOrganizer?.id || profile?.entity_id || null
          : null,

        artists_text: artistsText.trim() || null,

        instagram_url: normalizeExternalUrl(instagramUrl),

        ticket_mode: ticketMode,
        ticket_url:
          ticketMode === "external" ? normalizeExternalUrl(ticketUrl) : null,
        ticket_price:
          ticketMode === "internal" || ticketMode === "external"
            ? ticketPrice.trim() || null
            : null,
        ticket_capacity:
          ticketMode === "internal" && ticketCapacity.trim()
            ? Number(ticketCapacity)
            : null,
        ticket_button_label:
          ticketMode !== "none" ? ticketButtonLabel.trim() || null : null,

        status: "pending",
      });

      if (error) {
        throw new Error(error.message);
      }

      resetAfterSubmit();

      setMessage(
        isApprovedOrganizer
          ? `Evento enviado com localização automática. ${finalGeocodeLabel}`
          : `Evento enviado. A Paranoid vai rever antes de publicar. ${finalGeocodeLabel}`
      );
    } catch (error) {
      setMessage(
        `Erro ao submeter: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
    }

    setSubmitting(false);
  }

  if (loadingUser) {
    return (
      <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-zinc-500">A preparar formulário...</p>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
      <aside className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 lg:sticky lg:top-28 lg:p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-red-700">
          Submissão
        </p>

        <h2 className="mt-4 text-5xl font-black leading-none lg:text-7xl">
          Mete o evento na rede.
        </h2>

        <p className="mt-5 text-base leading-relaxed text-zinc-400">
          Submete concertos, DJ sets, exposições, cinema, mercados, workshops ou
          qualquer cena cultural que tenha sangue.
        </p>

        {isApprovedOrganizer && (
          <div className="mt-6 rounded-[2rem] border border-green-900 bg-green-950/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-green-400">
              Organizador aprovado
            </p>

            <p className="mt-3 text-2xl font-black">
              {linkedOrganizer?.name || organizer}
            </p>

            <p className="mt-2 text-sm leading-relaxed text-green-300/80">
              Este evento fica ligado ao teu painel de organizador.
            </p>

            <Link
              href="/organizador"
              className="mt-4 inline-block rounded-full border border-green-800 px-4 py-3 text-sm font-bold text-green-300"
            >
              Abrir painel
            </Link>
          </div>
        )}

        {!userEmail && (
          <div className="mt-6 rounded-[2rem] border border-yellow-900 bg-yellow-950/20 p-5">
            <p className="text-sm leading-relaxed text-yellow-500">
              Podes submeter sem conta, mas se criares conta consegues acompanhar
              o estado no perfil.
            </p>

            <Link
              href="/registar"
              className="mt-4 inline-block rounded-full border border-yellow-800 px-4 py-3 text-sm font-bold text-yellow-400"
            >
              Criar conta
            </Link>
          </div>
        )}
      </aside>

      <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-red-700">
          Evento
        </p>

        <h1 className="mt-3 text-5xl font-black leading-none lg:text-7xl">
          Submeter.
        </h1>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Nome do evento
            </label>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex: Noite Ruído Total"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Cidade / localidade
            </label>

            <input
              list="submit-event-city-suggestions"
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                clearGeocode();
              }}
              placeholder="Ex: Ansião, Pombal, Leiria..."
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <datalist id="submit-event-city-suggestions">
              {citySuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
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
              Espaço
            </label>

            <input
              value={venue}
              onChange={(event) => {
                setVenue(event.target.value);
                clearGeocode();
              }}
              placeholder="Ex: Stereogun"
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
              disabled={isApprovedOrganizer}
              placeholder="Ex: Paranoid Crew"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 disabled:opacity-60 focus:border-red-900"
            />
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-black p-5 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Morada
            </p>

            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              Mete a morada do espaço. A app calcula as coordenadas
              automaticamente para o mapa. O cliente não precisa de mexer em
              latitude/longitude.
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Morada completa
                </label>

                <input
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    clearGeocode();
                  }}
                  placeholder="Rua, número, nome do espaço..."
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Código postal
                </label>

                <input
                  value={postalCode}
                  onChange={(event) => {
                    setPostalCode(event.target.value);
                    clearGeocode();
                  }}
                  placeholder="0000-000"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Distrito
                </label>

                <input
                  value={district}
                  onChange={(event) => {
                    setDistrict(event.target.value);
                    clearGeocode();
                  }}
                  placeholder="Leiria, Coimbra, Lisboa..."
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleFindLocation}
                disabled={geocoding}
                className="rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
              >
                {geocoding
                  ? "A localizar..."
                  : "Encontrar localização automática"}
              </button>

              <a
                href={mapsSearchUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300"
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
                <p className="text-sm font-black text-green-400">
                  Localização encontrada
                </p>

                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {geocodeLabel}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Data
            </label>

            <input
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            />
          </div>

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

          <div className="rounded-[2rem] border border-zinc-800 bg-black p-4 lg:col-span-2">
            <label className="flex items-center gap-3 text-sm font-bold text-zinc-300">
              <input
                type="checkbox"
                checked={isMultiDay}
                onChange={(event) => setIsMultiDay(event.target.checked)}
                className="h-5 w-5"
              />
              Evento com vários dias / festival
            </label>

            {isMultiDay && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Data de fim
                </label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Preço
            </label>

            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Ex: 5€ / Grátis / Donativo"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Instagram do evento
            </label>

            <input
              value={instagramUrl}
              onChange={(event) => setInstagramUrl(event.target.value)}
              placeholder="instagram.com/..."
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Artistas / bandas / convidados
            </label>

            <input
              value={artistsText}
              onChange={(event) => setArtistsText(event.target.value)}
              placeholder="Ex: banda X, DJ Y, coletivo Z"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Descrição
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Texto curto do evento..."
              rows={6}
              className="w-full resize-none rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-black p-5 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Bilhetes
            </p>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {(["none", "external", "internal"] as TicketMode[]).map(
                (mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTicketMode(mode)}
                    className={`rounded-2xl border px-4 py-4 text-sm font-black ${
                      ticketMode === mode
                        ? "border-[#f2f1ec] bg-[#f2f1ec] text-black"
                        : "border-zinc-800 text-zinc-400"
                    }`}
                  >
                    {ticketModeLabel(mode)}
                  </button>
                )
              )}
            </div>

            {ticketMode === "external" && (
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Link da bilheteira
                  </label>

                  <input
                    value={ticketUrl}
                    onChange={(event) => setTicketUrl(event.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Preço do bilhete
                  </label>

                  <input
                    value={ticketPrice}
                    onChange={(event) => setTicketPrice(event.target.value)}
                    placeholder="Ex: 8€"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Texto do botão
                  </label>

                  <input
                    value={ticketButtonLabel}
                    onChange={(event) =>
                      setTicketButtonLabel(event.target.value)
                    }
                    placeholder="Ex: Comprar bilhete"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>
              </div>
            )}

            {ticketMode === "internal" && (
              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Preço
                  </label>

                  <input
                    value={ticketPrice}
                    onChange={(event) => setTicketPrice(event.target.value)}
                    placeholder="Ex: 5€ / Grátis"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Lotação
                  </label>

                  <input
                    value={ticketCapacity}
                    onChange={(event) => setTicketCapacity(event.target.value)}
                    placeholder="Ex: 80"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-300">
                    Texto do botão
                  </label>

                  <input
                    value={ticketButtonLabel}
                    onChange={(event) =>
                      setTicketButtonLabel(event.target.value)
                    }
                    placeholder="Ex: Reservar"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Imagem
            </label>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onImageChange}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-[#f2f1ec] file:px-4 file:py-2 file:text-sm file:font-black file:text-black"
            />

            <p className="mt-2 text-xs text-zinc-600">
              PNG, JPG ou WEBP. Máximo 5MB.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={submitEvent}
          disabled={submitting || geocoding}
          className="mt-8 w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
        >
          {submitting ? "A enviar..." : "Submeter evento"}
        </button>

        {message && (
          <p className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4 text-center text-sm font-bold text-zinc-400">
            {message}
          </p>
        )}
      </section>
    </section>
  );
}