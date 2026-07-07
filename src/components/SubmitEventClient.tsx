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

const cities = [
  "Pombal",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
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

export function SubmitEventClient() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [linkedOrganizer, setLinkedOrganizer] = useState<OrganizerRow | null>(
    null
  );

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Pombal");
  const [venue, setVenue] = useState("");
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

  async function submitEvent() {
    setMessage("");

    if (!title.trim()) {
      setMessage("Mete o nome do evento.");
      return;
    }

    if (!city.trim()) {
      setMessage("Mete a cidade.");
      return;
    }

    if (!venue.trim()) {
      setMessage("Mete o espaço.");
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
      const imageUrl = await uploadImage();

      const { error } = await supabase.from("event_submissions").insert({
        title: title.trim(),
        city: city.trim(),
        venue: venue.trim(),
        organizer: organizer.trim(),
        category,
        event_date: eventDate,
        end_date: isMultiDay ? endDate : null,
        is_multi_day: isMultiDay,
        event_time: eventTime || null,
        price: price.trim() || null,
        description: description.trim() || null,
        image_url: imageUrl,
        submitted_by: userEmail || null,

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

      setTitle("");
      setVenue("");
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

      setMessage(
        isApprovedOrganizer
          ? "Evento enviado. Como organizador aprovado, fica ligado ao teu painel."
          : "Evento enviado. A Paranoid vai rever antes de publicar."
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
              onChange={(event) => setVenue(event.target.value)}
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

          <div className="lg:col-span-2 rounded-[2rem] border border-zinc-800 bg-black p-4">
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

          <div className="lg:col-span-2 rounded-[2rem] border border-zinc-800 bg-black p-5">
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
          disabled={submitting}
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