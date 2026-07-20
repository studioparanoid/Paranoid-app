"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  getCanonicalDistrict,
  getCanonicalMunicipality,
  portugalDistricts,
} from "@/lib/portugalLocations";
import { formatPortuguesePostalCode, isValidPortuguesePostalCode, normalizeDecimalValue, normalizePortuguesePostalCode } from "@/lib/inputFormatting";
import { supabase } from "@/lib/supabase/public";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { LocationMapPicker, LocationSuggestions } from "@/components/location/LocationSearch";
import type { LocationResult } from "@/lib/location/types";

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
  const [isFree, setIsFree] = useState(false);
  const [artistsText, setArtistsText] = useState("");
  const [description, setDescription] = useState("");

  const [instagramUrl, setInstagramUrl] = useState("");

  const [ticketMode, setTicketMode] = useState<TicketMode>("none");
  const [ticketUrl, setTicketUrl] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketCapacity, setTicketCapacity] = useState("");
  const [ticketButtonLabel, setTicketButtonLabel] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);

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
    setIsFree(false);
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

    if (postalCode && !isValidPortuguesePostalCode(postalCode)) {
      setMessage("Introduz os 7 números do código postal.");
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
            "Não conseguimos localizar automaticamente. Os dados manuais serão guardados sem coordenadas."
          );
        } finally {
          setGeocoding(false);
        }
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
        postal_code: normalizePortuguesePostalCode(finalPostalCode) || finalPostalCode.trim() || null,
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
        price: isFree ? "Gratuito" : normalizeDecimalValue(price),
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
            ? normalizeDecimalValue(ticketPrice)
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
      <section className="rounded-lg border border-border bg-surface p-6">
        <p className="text-sm text-foreground-muted" aria-live="polite">
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
        className="rounded-lg border border-border bg-surface p-5 sm:p-7 lg:p-9"
      >
        <header>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">
            Evento
          </p>
          <h1 className="mt-2 text-4xl font-black leading-none sm:text-5xl">
            Submeter evento
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground-muted">
            Preenche os dados essenciais. O evento fica sujeito a revisão antes
            de ser publicado.
          </p>
        </header>

        <section aria-labelledby="event-main" className="mt-8 border-t border-border pt-7">
          <h2 id="event-main" className="text-sm font-black uppercase tracking-[0.22em] text-foreground-secondary">
            1. Informação principal
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="event-title" className="mb-2 block text-sm font-bold text-foreground-secondary">
                Nome do evento
              </label>
              <input
                id="event-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: Noite Ruído Total"
                required
                className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label htmlFor="event-category" className="mb-2 block text-sm font-bold text-foreground-secondary">
                Categoria
              </label>
              <select
                id="event-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="event-venue" className="mb-2 block text-sm font-bold text-foreground-secondary">
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
                className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <LocationSuggestions query={venue} context={{ city, municipality, district, postal_code: postalCode }} onSelect={(result: LocationResult) => applyGeocodingResult(result)} />
            </div>
          </div>
        </section>

        <section aria-labelledby="event-date" className="mt-8 border-t border-border pt-7">
          <h2 id="event-date" className="text-sm font-black uppercase tracking-[0.22em] text-foreground-secondary">
            2. Data e hora
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="event-start-date" className="mb-2 block text-sm font-bold text-foreground-secondary">Data</label>
              <input
                id="event-start-date"
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                required
                className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label htmlFor="event-time" className="mb-2 block text-sm font-bold text-foreground-secondary">Hora</label>
              <input
                id="event-time"
                type="time"
                value={eventTime}
                onChange={(event) => setEventTime(event.target.value)}
                className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
          <label className="mt-5 flex min-h-11 items-center gap-3 text-sm font-bold text-foreground-secondary">
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
              <label htmlFor="event-end-date" className="mb-2 block text-sm font-bold text-foreground-secondary">Data de fim</label>
              <input
                id="event-end-date"
                type="date"
                value={endDate}
                min={eventDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                required
                className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          )}
        </section>

        <section aria-labelledby="event-image" className="mt-8 border-t border-border pt-7">
          <h2 id="event-image" className="text-sm font-black uppercase tracking-[0.22em] text-foreground-secondary">
            3. Imagem
          </h2>
          <div className="mt-5">
            <label htmlFor="event-image-file" className="mb-2 block text-sm font-bold text-foreground-secondary">Poster ou imagem</label>
            <input
              id="event-image-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onImageChange}
              className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-sm text-foreground-muted outline-none file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-black file:text-background focus:border-accent"
            />
            <p className="mt-2 text-xs text-foreground-muted">PNG, JPG ou WEBP. Máximo 5MB.</p>
          </div>
        </section>

        <section aria-labelledby="event-location" className="mt-8 border-t border-border pt-7">
          <h2 id="event-location" className="text-sm font-black uppercase tracking-[0.22em] text-foreground-secondary">
            4. Localização
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Preenche pelo menos um destes campos — morada, código postal ou localidade — e depois carrega em &quot;Procurar localização&quot;. A zona é confirmada automaticamente.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="event-address" className="mb-2 block text-sm font-bold text-foreground-secondary">Morada <span className="font-normal text-foreground-muted">(opcional)</span></label>
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
                className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <LocationSuggestions query={address} context={{ venue, city, municipality, district, postal_code: postalCode }} onSelect={(result: LocationResult) => applyGeocodingResult(result)} />
            </div>
            <div>
              <label htmlFor="event-postal-code" className="mb-2 block text-sm font-bold text-foreground-secondary">Código postal <span className="font-normal text-foreground-muted">(opcional)</span></label>
              <input
                id="event-postal-code"
                value={postalCode}
                onChange={(event) => {
                  setPostalCode(formatPortuguesePostalCode(event.target.value));
                  clearGeocode();
                }}
                inputMode="numeric"
                maxLength={8}
                autoComplete="postal-code"
                placeholder="0000-000"
                className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label htmlFor="event-locality" className="mb-2 block text-sm font-bold text-foreground-secondary">Localidade <span className="font-normal text-foreground-muted">(opcional)</span></label>
              <input
                id="event-locality"
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  clearGeocode();
                }}
                autoComplete="address-level2"
                placeholder="Ex: Pombal"
                className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20"
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
                locationState === "success" ? "text-success" :
                locationState === "loading" ? "text-foreground-muted" : "text-danger"
              }`}>
                {locationMessage}
              </p>
            )}
          </div>

          <details className="mt-4 border-t border-border pt-4">
            <summary className="cursor-pointer text-sm font-black text-foreground-secondary">Escolher ponto no mapa</summary>
            <div className="mt-4"><LocationMapPicker latitude={latitude} longitude={longitude} onSelect={(result) => applyGeocodingResult(result)} /></div>
          </details>

          {geocodeLabel && latitude !== null && longitude !== null && (
            <div className="mt-4 rounded-lg border border-success/35 bg-success/10 p-4">
              <p className="text-sm font-black text-success">Localização confirmada</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
                {address || venue}
                {(postalCode || city) && <><br />{[postalCode, city].filter(Boolean).join(" ")}</>}
                {(municipality || district) && <><br />{[municipality, district].filter(Boolean).join(", ")}</>}
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-foreground-muted">{geocodeLabel}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocationState("idle");
                    setLocationMessage("Corrige os dados e pesquisa novamente se necessário.");
                    addressInputRef.current?.focus();
                  }}
                  className="min-h-10 rounded-full border border-border-strong px-4 text-xs font-bold text-foreground-secondary"
                >Editar</button>
                <button
                  type="button"
                  onClick={() => void handleFindLocation()}
                  disabled={geocoding}
                  className="min-h-10 rounded-full border border-border-strong px-4 text-xs font-bold text-foreground-secondary disabled:opacity-50"
                >Pesquisar novamente</button>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="min-h-10 rounded-full border border-danger/40 px-4 text-xs font-bold text-danger"
                >Limpar</button>
                {mapsCoordinateUrl && (
                  <a
                    href={mapsCoordinateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center rounded-full border border-border-strong px-4 text-xs font-bold text-foreground-secondary"
                  >Abrir coordenadas</a>
                )}
              </div>
            </div>
          )}

        </section>

        <section aria-labelledby="event-people" className="mt-8 border-t border-border pt-7">
          <h2 id="event-people" className="text-sm font-black uppercase tracking-[0.22em] text-foreground-secondary">
            5. Artistas e organização
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="event-organizer" className="mb-2 block text-sm font-bold text-foreground-secondary">Organizador</label>
              <input
                id="event-organizer"
                value={organizer}
                onChange={(event) => setOrganizer(event.target.value)}
                disabled={isApprovedOrganizer}
                placeholder="Ex: Paranoid Crew"
                required={!isApprovedOrganizer}
                className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder disabled:opacity-60 focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label htmlFor="event-artists" className="mb-2 block text-sm font-bold text-foreground-secondary">Artistas / convidados</label>
              <input
                id="event-artists"
                value={artistsText}
                onChange={(event) => setArtistsText(event.target.value)}
                placeholder="Banda X, DJ Y, coletivo Z"
                className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="event-tickets" className="mt-8 border-t border-border pt-7">
          <h2 id="event-tickets" className="text-sm font-black uppercase tracking-[0.22em] text-foreground-secondary">
            6. Preço e bilhetes
          </h2>
          <div className="mt-5 max-w-sm">
            <label htmlFor="event-price" className="mb-2 block text-sm font-bold text-foreground-secondary">Preço geral</label>
            {isFree ? <input id="event-price" value="Gratuito" disabled className="w-full rounded-lg border border-input-border bg-input px-4 py-3 font-bold text-foreground-muted" /> : <CurrencyInput id="event-price" value={price} onChange={setPrice} placeholder="Ex: 12,50" className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20" />}
            <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold text-foreground-secondary"><input type="checkbox" checked={isFree} onChange={(event) => { setIsFree(event.target.checked); if (event.target.checked) setPrice(""); }} className="h-5 w-5 accent-red-600" />Evento gratuito</label>
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
                    : "border-border text-foreground-muted hover:border-border-strong"
                }`}
              >{ticketModeLabel(mode)}</button>
            ))}
          </div>
          {ticketMode !== "none" && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {ticketMode === "external" && (
                <div className="sm:col-span-2">
                  <label htmlFor="event-ticket-url" className="mb-2 block text-sm font-bold text-foreground-secondary">Link da bilheteira</label>
                  <input
                    id="event-ticket-url"
                    type="url"
                    value={ticketUrl}
                    onChange={(event) => setTicketUrl(event.target.value)}
                    placeholder="https://..."
                    required
                    className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              )}
              <div>
                <label htmlFor="event-ticket-price" className="mb-2 block text-sm font-bold text-foreground-secondary">Preço do bilhete</label>
                <CurrencyInput
                  id="event-ticket-price"
                  value={ticketPrice}
                  onChange={setTicketPrice}
                  placeholder="Ex: 8,00"
                  className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              {ticketMode === "internal" && (
                <div>
                  <label htmlFor="event-ticket-capacity" className="mb-2 block text-sm font-bold text-foreground-secondary">Lotação</label>
                  <input
                    id="event-ticket-capacity"
                    type="number"
                    min="1"
                    step="1"
                    value={ticketCapacity}
                    onChange={(event) => setTicketCapacity(event.target.value)}
                    placeholder="Ex: 80"
                    className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              )}
              <div className={ticketMode === "external" ? "" : "sm:col-span-2"}>
                <label htmlFor="event-ticket-label" className="mb-2 block text-sm font-bold text-foreground-secondary">Texto do botão</label>
                <input
                  id="event-ticket-label"
                  value={ticketButtonLabel}
                  onChange={(event) => setTicketButtonLabel(event.target.value)}
                  placeholder={ticketMode === "internal" ? "Reservar" : "Comprar bilhete"}
                  className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="event-description" className="mt-8 border-t border-border pt-7">
          <h2 id="event-description" className="text-sm font-black uppercase tracking-[0.22em] text-foreground-secondary">
            7. Descrição
          </h2>
          <div className="mt-5 grid gap-5">
            <div>
              <label htmlFor="event-description-text" className="mb-2 block text-sm font-bold text-foreground-secondary">Descrição</label>
              <textarea
                id="event-description-text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Texto curto do evento..."
                rows={5}
                className="w-full resize-y rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label htmlFor="event-instagram" className="mb-2 block text-sm font-bold text-foreground-secondary">Instagram do evento</label>
              <input
                id="event-instagram"
                type="url"
                value={instagramUrl}
                onChange={(event) => setInstagramUrl(event.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full rounded-lg border border-input-border bg-input px-4 py-3 text-foreground outline-none placeholder:text-input-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="event-submit" className="mt-8 border-t border-border pt-7">
          <h2 id="event-submit" className="text-sm font-black uppercase tracking-[0.22em] text-foreground-secondary">
            8. Revisão e submissão
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
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
            <p className="mt-4 rounded-lg border border-input-border bg-input p-4 text-sm font-bold text-foreground-secondary" role="status" aria-live="polite">
              {message}
            </p>
          )}
        </section>
      </form>

      {isApprovedOrganizer && (
        <section className="rounded-lg border border-success/35 bg-success/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-success">Organizador aprovado</p>
          <p className="mt-2 text-sm text-foreground-secondary">
            O evento fica ligado a {linkedOrganizer?.name || organizer}.
          </p>
          <Link href="/organizador" className="mt-3 inline-flex min-h-10 items-center rounded-full border border-success/50 px-4 text-sm font-bold text-success">
            Abrir painel
          </Link>
        </section>
      )}

      {!userEmail && (
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-lg font-black">Acompanha a submissão</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Podes submeter sem conta. Com uma conta, acompanhas o estado no perfil.
          </p>
          <Link href="/registar" className="mt-3 inline-flex min-h-10 items-center rounded-full border border-border-strong px-4 text-sm font-bold text-foreground-secondary">
            Criar conta
          </Link>
        </section>
      )}
    </div>
  );
}
