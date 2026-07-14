"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  getCanonicalDistrict,
  getCanonicalMunicipality,
  getMunicipalitiesForDistrict,
  portugalDistricts,
} from "@/lib/portugalLocations";
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
  venue_name?: string;
  address?: string;
  locality?: string;
  city?: string;
  municipality?: string;
  district?: string;
  postal_code?: string;
};

type LocationSearchState = "idle" | "loading" | "success" | "not-found" | "error";

type ResolvedLocation = {
  latitude: number;
  longitude: number;
  displayName: string;
  address: string;
  postalCode: string;
  locality: string;
  municipality: string;
  district: string;
};

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

function findDistrictByMunicipality(value: string | null | undefined) {
  const cleanValue = value?.trim();

  if (!cleanValue) {
    return "";
  }

  for (const district of portugalDistricts) {
    const match = getCanonicalMunicipality(cleanValue, district);

    if (match) {
      return district;
    }
  }

  return "";
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
  signal,
}: {
  venue: string;
  address: string;
  postalCode: string;
  city: string;
  municipality: string;
  district: string;
  signal?: AbortSignal;
}) {
  const query = [venue, address, postalCode, city, municipality, district]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

  const response = await fetch("/api/geocode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
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
    if (response.status === 404) {
      throw new Error("Não encontrámos esta morada.");
    }

    throw new Error("Não foi possível procurar a localização. Tenta novamente.");
  }

  return data as GeocodeResult;
}

export function SubmitEventClient() {
  const addressInputRef = useRef<HTMLInputElement>(null);
  const geocodeRequestRef = useRef<AbortController | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [message, setMessage] = useState("");
  const [locationState, setLocationState] =
    useState<LocationSearchState>("idle");
  const [locationMessage, setLocationMessage] = useState("");

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [linkedOrganizer, setLinkedOrganizer] = useState<OrganizerRow | null>(
    null
  );

  const [title, setTitle] = useState("");
  const [district, setDistrict] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [city, setCity] = useState("");
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

  const municipalityOptions = useMemo(() => {
    return getMunicipalitiesForDistrict(district);
  }, [district]);

  const canonicalDistrict = getCanonicalDistrict(district) || district;
  const canonicalMunicipality =
    getCanonicalMunicipality(municipality, canonicalDistrict) || municipality;

  const isApprovedOrganizer = useMemo(() => {
    return (
      profile?.account_type === "organizer" &&
      profile?.account_status === "approved" &&
      Boolean(profile?.entity_id)
    );
  }, [profile]);

  const mapsCoordinateUrl = buildMapsCoordinateUrl(latitude, longitude);

  useEffect(() => {
    async function loadUserContext() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

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
            const inferredDistrict = findDistrictByMunicipality(
              loadedOrganizer.city
            );

            setCity(loadedOrganizer.city);

            if (inferredDistrict) {
              const inferredMunicipality = getCanonicalMunicipality(
                loadedOrganizer.city,
                inferredDistrict
              );

              setDistrict(inferredDistrict);
              setMunicipality(inferredMunicipality || loadedOrganizer.city);
            }
          }
        } else if (loadedProfile.organizer_name) {
          setOrganizer(loadedProfile.organizer_name);
        }
      }

      setLoadingUser(false);
    }

    loadUserContext();
  }, []);

  useEffect(() => {
    return () => geocodeRequestRef.current?.abort();
  }, []);

  function clearGeocode() {
    setLatitude(null);
    setLongitude(null);
    setGeocodeLabel("");
    setLocationState("idle");
    setLocationMessage("");
  }

  function handleDistrictChange(value: string) {
    setDistrict(value);

    if (municipality && !getCanonicalMunicipality(municipality, value)) {
      setMunicipality("");
    }

    if (latitude !== null && longitude !== null) {
      setLocationMessage("Zona atualizada manualmente.");
    }
  }

  function handleMunicipalityChange(value: string) {
    setMunicipality(value);

    if (latitude !== null && longitude !== null) {
      setLocationMessage("Zona atualizada manualmente.");
    }
  }

  function clearLocation() {
    geocodeRequestRef.current?.abort();
    setAddress("");
    setPostalCode("");
    setCity("");
    setDistrict("");
    setMunicipality("");
    clearGeocode();
    addressInputRef.current?.focus();
  }

  function applyGeocodingResult(result: GeocodeResult): ResolvedLocation {
    const detectedDistrict =
      getCanonicalDistrict(result.district || "") ||
      findDistrictByMunicipality(result.municipality || result.city);
    const nextDistrict = detectedDistrict || getCanonicalDistrict(district) || "";
    const nextMunicipality =
      getCanonicalMunicipality(result.municipality || "", nextDistrict) ||
      getCanonicalMunicipality(result.city || "", nextDistrict) ||
      getCanonicalMunicipality(municipality, nextDistrict) ||
      "";
    const nextLocality =
      result.locality?.trim() ||
      result.city?.trim() ||
      city.trim() ||
      nextMunicipality;
    const nextAddress = result.address?.trim() || address.trim();
    const nextPostalCode = result.postal_code?.trim() || postalCode.trim();

    setLatitude(result.latitude);
    setLongitude(result.longitude);
    setGeocodeLabel(result.display_name);
    setAddress(nextAddress);
    setPostalCode(nextPostalCode);
    setCity(nextLocality);
    setDistrict(nextDistrict);
    setMunicipality(nextMunicipality);
    setLocationState("success");

    if (!nextDistrict) {
      setLocationMessage(
        "Localização confirmada. Escolhe o distrito para completar a zona."
      );
    } else if (!nextMunicipality) {
      setLocationMessage(
        "Localização confirmada. Não conseguimos identificar o concelho; escolhe-o manualmente."
      );
    } else {
      setLocationMessage("Localização confirmada.");
    }

    return {
      latitude: result.latitude,
      longitude: result.longitude,
      displayName: result.display_name,
      address: nextAddress,
      postalCode: nextPostalCode,
      locality: nextLocality,
      municipality: nextMunicipality,
      district: nextDistrict,
    };
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

    if (
      ![venue, address, postalCode, city, municipality, district].some((value) =>
        value.trim()
      )
    ) {
      setLocationState("not-found");
      setLocationMessage("Mete o nome do espaço, uma morada ou uma localidade.");
      addressInputRef.current?.focus();
      return null;
    }

    geocodeRequestRef.current?.abort();
    const controller = new AbortController();
    geocodeRequestRef.current = controller;
    setGeocoding(true);
    setLocationState("loading");
    setLocationMessage("A localizar...");

    try {
      const result = await geocodeAddress({
        venue,
        address,
        postalCode,
        city,
        municipality: canonicalMunicipality,
        district: canonicalDistrict,
        signal: controller.signal,
      });

      if (geocodeRequestRef.current !== controller) {
        return null;
      }

      applyGeocodingResult(result);

      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }

      setLatitude(null);
      setLongitude(null);
      setGeocodeLabel("");
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Não foi possível procurar a localização. Tenta novamente.";
      setLocationState(
        errorMessage === "Não encontrámos esta morada." ? "not-found" : "error"
      );
      setLocationMessage(errorMessage);

      return null;
    } finally {
      if (geocodeRequestRef.current === controller) {
        setGeocoding(false);
        geocodeRequestRef.current = null;
      }
    }
  }

  function resetAfterSubmit() {
    setTitle("");
    setVenue("");
    setAddress("");
    setPostalCode("");
    setLatitude(null);
    setLongitude(null);
    setGeocodeLabel("");
    setLocationState("idle");
    setLocationMessage("");
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

    if (!venue.trim()) {
      setMessage("Mete o espaço.");
      return;
    }

    if (!address.trim() && !postalCode.trim() && !city.trim()) {
      setMessage("Mete a morada, o código postal ou a localidade do evento.");
      addressInputRef.current?.focus();
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
      let finalPostalCode = postalCode;
      let finalDistrict = canonicalDistrict;
      let finalMunicipality = canonicalMunicipality;
      let finalCity = city.trim();
      let finalAddress = address.trim();

      if (
        finalLatitude === null ||
        finalLongitude === null ||
        !finalDistrict ||
        !finalMunicipality ||
        (!finalCity && !finalAddress)
      ) {
        try {
          setGeocoding(true);
          setLocationState("loading");
          setLocationMessage("A localizar...");
          const result = await geocodeAddress({
            venue,
            address,
            postalCode,
            city: finalCity,
            municipality: finalMunicipality,
            district: finalDistrict,
          });
          const resolved = applyGeocodingResult(result);

          finalLatitude = resolved.latitude;
          finalLongitude = resolved.longitude;
          finalGeocodeLabel = resolved.displayName;
          finalPostalCode = resolved.postalCode;
          finalCity = resolved.locality;
          finalMunicipality = resolved.municipality;
          finalDistrict = resolved.district;
          finalAddress = resolved.address;
        } catch {
          setLocationState("error");
          setLocationMessage(
            "Não conseguimos localizar esta morada. Revê os dados e tenta novamente."
          );
          setMessage("Confirma a localização do evento.");
          addressInputRef.current?.focus();
          return;
        } finally {
          setGeocoding(false);
        }
      }

      if (
        finalLatitude === null ||
        finalLongitude === null ||
        !Number.isFinite(finalLatitude) ||
        !Number.isFinite(finalLongitude) ||
        finalLatitude < -90 ||
        finalLatitude > 90 ||
        finalLongitude < -180 ||
        finalLongitude > 180
      ) {
        setMessage("Confirma a localização do evento.");
        addressInputRef.current?.focus();
        return;
      }

      if (!finalDistrict) {
        setMessage("Não conseguimos identificar o distrito. Escolhe-o manualmente.");
        return;
      }

      if (!finalMunicipality) {
        setMessage("Não conseguimos identificar o concelho. Escolhe-o manualmente.");
        return;
      }

      if (!finalCity && !finalAddress) {
        setMessage("Confirma a localidade ou a morada do evento.");
        addressInputRef.current?.focus();
        return;
      }

      const imageUrl = await uploadImage();

      const { error } = await supabase.from("event_submissions").insert({
        title: title.trim(),
        city: finalCity,
        municipality: finalMunicipality,
        district: finalDistrict,
        venue: venue.trim(),
        address: finalAddress,
        postal_code: finalPostalCode.trim() || null,
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
          ? `Evento enviado. ${finalGeocodeLabel || "Localização guardada."}`
          : `Evento enviado. A Paranoid vai rever antes de publicar. ${
              finalGeocodeLabel || "Morada guardada."
            }`
      );
    } catch (error) {
      setMessage(
        `Erro ao submeter: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingUser) {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-sm text-zinc-500" aria-live="polite">
          A preparar formulário...
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitEvent();
        }}
        className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 sm:p-7 lg:p-9"
      >
        <header>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-red-600">
            Evento
          </p>
          <h1 className="mt-2 text-4xl font-black leading-none sm:text-5xl">
            Submeter evento
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Preenche os dados essenciais. O evento fica sujeito a revisão antes
            de ser publicado.
          </p>
        </header>

        <section aria-labelledby="event-main" className="mt-8 border-t border-zinc-900 pt-7">
          <h2 id="event-main" className="text-sm font-black uppercase tracking-[0.22em] text-zinc-300">
            1. Informação principal
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="event-title" className="mb-2 block text-sm font-bold text-zinc-300">
                Nome do evento
              </label>
              <input
                id="event-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: Noite Ruído Total"
                required
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800 focus:ring-2 focus:ring-red-950"
              />
            </div>
            <div>
              <label htmlFor="event-category" className="mb-2 block text-sm font-bold text-zinc-300">
                Categoria
              </label>
              <select
                id="event-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-800 focus:ring-2 focus:ring-red-950"
              >
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="event-venue" className="mb-2 block text-sm font-bold text-zinc-300">
                Espaço
              </label>
              <input
                id="event-venue"
                value={venue}
                onChange={(event) => {
                  setVenue(event.target.value);
                  clearGeocode();
                }}
                placeholder="Ex: Teatro-Cine de Pombal"
                required
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800 focus:ring-2 focus:ring-red-950"
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="event-date" className="mt-8 border-t border-zinc-900 pt-7">
          <h2 id="event-date" className="text-sm font-black uppercase tracking-[0.22em] text-zinc-300">
            2. Data e hora
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="event-start-date" className="mb-2 block text-sm font-bold text-zinc-300">Data</label>
              <input
                id="event-start-date"
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                required
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-800 focus:ring-2 focus:ring-red-950"
              />
            </div>
            <div>
              <label htmlFor="event-time" className="mb-2 block text-sm font-bold text-zinc-300">Hora</label>
              <input
                id="event-time"
                type="time"
                value={eventTime}
                onChange={(event) => setEventTime(event.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-800 focus:ring-2 focus:ring-red-950"
              />
            </div>
          </div>
          <label className="mt-5 flex min-h-11 items-center gap-3 text-sm font-bold text-zinc-300">
            <input
              type="checkbox"
              checked={isMultiDay}
              onChange={(event) => setIsMultiDay(event.target.checked)}
              className="h-5 w-5 accent-red-700"
            />
            Evento com vários dias
          </label>
          {isMultiDay && (
            <div className="mt-4 max-w-sm">
              <label htmlFor="event-end-date" className="mb-2 block text-sm font-bold text-zinc-300">Data de fim</label>
              <input
                id="event-end-date"
                type="date"
                value={endDate}
                min={eventDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                required
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-800 focus:ring-2 focus:ring-red-950"
              />
            </div>
          )}
        </section>

        <section aria-labelledby="event-image" className="mt-8 border-t border-zinc-900 pt-7">
          <h2 id="event-image" className="text-sm font-black uppercase tracking-[0.22em] text-zinc-300">
            3. Imagem
          </h2>
          <div className="mt-5">
            <label htmlFor="event-image-file" className="mb-2 block text-sm font-bold text-zinc-300">Poster ou imagem</label>
            <input
              id="event-image-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onImageChange}
              className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-400 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-[#f2f1ec] file:px-4 file:py-2 file:text-sm file:font-black file:text-black focus:border-red-800"
            />
            <p className="mt-2 text-xs text-zinc-600">PNG, JPG ou WEBP. Máximo 5MB.</p>
          </div>
        </section>

        <section aria-labelledby="event-location" className="mt-8 border-t border-zinc-900 pt-7">
          <h2 id="event-location" className="text-sm font-black uppercase tracking-[0.22em] text-zinc-300">
            4. Localização
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Pesquisa pelo espaço, morada, código postal ou localidade. O distrito é opcional.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="event-address" className="mb-2 block text-sm font-bold text-zinc-300">Morada</label>
              <input
                ref={addressInputRef}
                id="event-address"
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  clearGeocode();
                }}
                placeholder="Rua e número"
                aria-describedby="location-feedback"
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800 focus:ring-2 focus:ring-red-950"
              />
            </div>
            <div>
              <label htmlFor="event-postal-code" className="mb-2 block text-sm font-bold text-zinc-300">Código postal</label>
              <input
                id="event-postal-code"
                value={postalCode}
                onChange={(event) => {
                  setPostalCode(event.target.value);
                  clearGeocode();
                }}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="0000-000"
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800 focus:ring-2 focus:ring-red-950"
              />
            </div>
            <div>
              <label htmlFor="event-locality" className="mb-2 block text-sm font-bold text-zinc-300">Localidade</label>
              <input
                id="event-locality"
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  clearGeocode();
                }}
                autoComplete="address-level2"
                placeholder="Ex: Pombal"
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800 focus:ring-2 focus:ring-red-950"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleFindLocation()}
            disabled={geocoding || submitting}
            className="mt-5 min-h-12 w-full rounded-full bg-[#f2f1ec] px-5 py-3 text-sm font-black text-black transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-50 sm:w-auto"
          >
            {geocoding ? "A localizar..." : "Procurar localização"}
          </button>

          <div id="location-feedback" aria-live="polite" className="mt-4">
            {locationMessage && (
              <p className={`text-sm font-bold ${
                locationState === "success" ? "text-green-400" :
                locationState === "loading" ? "text-zinc-400" : "text-red-400"
              }`}>
                {locationMessage}
              </p>
            )}
          </div>

          {geocodeLabel && latitude !== null && longitude !== null && (
            <div className="mt-4 rounded-lg border border-green-900/70 bg-green-950/20 p-4">
              <p className="text-sm font-black text-green-400">Localização confirmada</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                {address || venue}
                {(postalCode || city) && <><br />{[postalCode, city].filter(Boolean).join(" ")}</>}
                {(municipality || district) && <><br />{[municipality, district].filter(Boolean).join(", ")}</>}
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-600">{geocodeLabel}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocationState("idle");
                    setLocationMessage("Corrige os dados e pesquisa novamente se necessário.");
                    addressInputRef.current?.focus();
                  }}
                  className="min-h-10 rounded-full border border-zinc-700 px-4 text-xs font-bold text-zinc-200"
                >Editar</button>
                <button
                  type="button"
                  onClick={() => void handleFindLocation()}
                  disabled={geocoding}
                  className="min-h-10 rounded-full border border-zinc-700 px-4 text-xs font-bold text-zinc-200 disabled:opacity-50"
                >Pesquisar novamente</button>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="min-h-10 rounded-full border border-red-950 px-4 text-xs font-bold text-red-400"
                >Limpar</button>
                {mapsCoordinateUrl && (
                  <a
                    href={mapsCoordinateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center rounded-full border border-zinc-700 px-4 text-xs font-bold text-zinc-200"
                  >Abrir coordenadas</a>
                )}
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="event-district" className="mb-2 block text-sm font-bold text-zinc-300">Distrito</label>
              <select
                id="event-district"
                value={district}
                onChange={(event) => handleDistrictChange(event.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-800 focus:ring-2 focus:ring-red-950"
              >
                <option value="">Escolher distrito</option>
                {portugalDistricts.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="event-municipality" className="mb-2 block text-sm font-bold text-zinc-300">Concelho</label>
              <select
                id="event-municipality"
                value={municipality}
                onChange={(event) => handleMunicipalityChange(event.target.value)}
                disabled={!district}
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50 focus:border-red-800 focus:ring-2 focus:ring-red-950"
              >
                <option value="">Escolher concelho</option>
                {municipalityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section aria-labelledby="event-people" className="mt-8 border-t border-zinc-900 pt-7">
          <h2 id="event-people" className="text-sm font-black uppercase tracking-[0.22em] text-zinc-300">
            5. Artistas e organização
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="event-organizer" className="mb-2 block text-sm font-bold text-zinc-300">Organizador</label>
              <input
                id="event-organizer"
                value={organizer}
                onChange={(event) => setOrganizer(event.target.value)}
                disabled={isApprovedOrganizer}
                placeholder="Ex: Paranoid Crew"
                required={!isApprovedOrganizer}
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 disabled:opacity-60 focus:border-red-800 focus:ring-2 focus:ring-red-950"
              />
            </div>
            <div>
              <label htmlFor="event-artists" className="mb-2 block text-sm font-bold text-zinc-300">Artistas / convidados</label>
              <input
                id="event-artists"
                value={artistsText}
                onChange={(event) => setArtistsText(event.target.value)}
                placeholder="Banda X, DJ Y, coletivo Z"
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800 focus:ring-2 focus:ring-red-950"
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="event-tickets" className="mt-8 border-t border-zinc-900 pt-7">
          <h2 id="event-tickets" className="text-sm font-black uppercase tracking-[0.22em] text-zinc-300">
            6. Preço e bilhetes
          </h2>
          <div className="mt-5 max-w-sm">
            <label htmlFor="event-price" className="mb-2 block text-sm font-bold text-zinc-300">Preço geral</label>
            <input
              id="event-price"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="5€ / Grátis / Donativo"
              className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800 focus:ring-2 focus:ring-red-950"
            />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(["none", "external", "internal"] as TicketMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={ticketMode === mode}
                onClick={() => setTicketMode(mode)}
                className={`min-h-12 rounded-lg border px-4 py-3 text-sm font-black transition active:scale-[0.99] ${
                  ticketMode === mode
                    ? "border-[#f2f1ec] bg-[#f2f1ec] text-black"
                    : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >{ticketModeLabel(mode)}</button>
            ))}
          </div>
          {ticketMode !== "none" && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {ticketMode === "external" && (
                <div className="sm:col-span-2">
                  <label htmlFor="event-ticket-url" className="mb-2 block text-sm font-bold text-zinc-300">Link da bilheteira</label>
                  <input
                    id="event-ticket-url"
                    type="url"
                    value={ticketUrl}
                    onChange={(event) => setTicketUrl(event.target.value)}
                    placeholder="https://..."
                    required
                    className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800 focus:ring-2 focus:ring-red-950"
                  />
                </div>
              )}
              <div>
                <label htmlFor="event-ticket-price" className="mb-2 block text-sm font-bold text-zinc-300">Preço do bilhete</label>
                <input
                  id="event-ticket-price"
                  value={ticketPrice}
                  onChange={(event) => setTicketPrice(event.target.value)}
                  placeholder="Ex: 8€"
                  className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800 focus:ring-2 focus:ring-red-950"
                />
              </div>
              {ticketMode === "internal" && (
                <div>
                  <label htmlFor="event-ticket-capacity" className="mb-2 block text-sm font-bold text-zinc-300">Lotação</label>
                  <input
                    id="event-ticket-capacity"
                    type="number"
                    min="1"
                    step="1"
                    value={ticketCapacity}
                    onChange={(event) => setTicketCapacity(event.target.value)}
                    placeholder="Ex: 80"
                    className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800 focus:ring-2 focus:ring-red-950"
                  />
                </div>
              )}
              <div className={ticketMode === "external" ? "" : "sm:col-span-2"}>
                <label htmlFor="event-ticket-label" className="mb-2 block text-sm font-bold text-zinc-300">Texto do botão</label>
                <input
                  id="event-ticket-label"
                  value={ticketButtonLabel}
                  onChange={(event) => setTicketButtonLabel(event.target.value)}
                  placeholder={ticketMode === "internal" ? "Reservar" : "Comprar bilhete"}
                  className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800 focus:ring-2 focus:ring-red-950"
                />
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="event-description" className="mt-8 border-t border-zinc-900 pt-7">
          <h2 id="event-description" className="text-sm font-black uppercase tracking-[0.22em] text-zinc-300">
            7. Descrição
          </h2>
          <div className="mt-5 grid gap-5">
            <div>
              <label htmlFor="event-description-text" className="mb-2 block text-sm font-bold text-zinc-300">Descrição</label>
              <textarea
                id="event-description-text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Texto curto do evento..."
                rows={5}
                className="w-full resize-y rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800 focus:ring-2 focus:ring-red-950"
              />
            </div>
            <div>
              <label htmlFor="event-instagram" className="mb-2 block text-sm font-bold text-zinc-300">Instagram do evento</label>
              <input
                id="event-instagram"
                type="url"
                value={instagramUrl}
                onChange={(event) => setInstagramUrl(event.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-800 focus:ring-2 focus:ring-red-950"
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="event-submit" className="mt-8 border-t border-zinc-900 pt-7">
          <h2 id="event-submit" className="text-sm font-black uppercase tracking-[0.22em] text-zinc-300">
            8. Revisão e submissão
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Confirma os dados. A equipa revê o evento antes de o publicar.
          </p>
          <button
            type="submit"
            disabled={submitting || geocoding}
            className="mt-5 min-h-12 w-full rounded-full bg-[#f2f1ec] px-5 py-3 text-sm font-black text-black transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-50 sm:w-auto sm:min-w-56"
          >
            {submitting ? "A enviar..." : "Submeter evento"}
          </button>
          {message && (
            <p className="mt-4 rounded-lg border border-zinc-800 bg-black p-4 text-sm font-bold text-zinc-300" role="status" aria-live="polite">
              {message}
            </p>
          )}
        </section>
      </form>

      {isApprovedOrganizer && (
        <section className="rounded-lg border border-green-900/60 bg-green-950/20 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-green-400">Organizador aprovado</p>
          <p className="mt-2 text-sm text-zinc-300">
            O evento fica ligado a {linkedOrganizer?.name || organizer}.
          </p>
          <Link href="/organizador" className="mt-3 inline-flex min-h-10 items-center rounded-full border border-green-800 px-4 text-sm font-bold text-green-300">
            Abrir painel
          </Link>
        </section>
      )}

      {!userEmail && (
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-lg font-black">Acompanha a submissão</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Podes submeter sem conta. Com uma conta, acompanhas o estado no perfil.
          </p>
          <Link href="/registar" className="mt-3 inline-flex min-h-10 items-center rounded-full border border-zinc-700 px-4 text-sm font-bold text-zinc-200">
            Criar conta
          </Link>
        </section>
      )}
    </div>
  );
}
