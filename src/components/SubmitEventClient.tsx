"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type OrganizerRow = {
  id: string;
  name: string;
  slug: string;
};

type OrganizerMemberRow = {
  organizer_id: string;
};

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

function getDateLabel(startDate: string, endDate: string, isMultiDay: boolean) {
  if (!startDate) {
    return "Data por definir";
  }

  if (isMultiDay && endDate && endDate !== startDate) {
    return `${startDate} → ${endDate}`;
  }

  return startDate;
}

export function SubmitEventClient() {
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [organizerOptions, setOrganizerOptions] = useState<OrganizerRow[]>([]);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string>("");

  const [title, setTitle] = useState("");
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
  const [ticketUrl, setTicketUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [description, setDescription] = useState("");

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccount() {
      setLoadingAccount(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setLoadingAccount(false);
        return;
      }

      setUserId(user.id);

      const { data: membershipsData } = await supabase
        .from("organizer_members")
        .select("organizer_id")
        .eq("user_id", user.id);

      const memberships = (membershipsData || []) as OrganizerMemberRow[];
      const organizerIds = memberships
        .map((membership) => membership.organizer_id)
        .filter(Boolean);

      if (organizerIds.length === 0) {
        setOrganizerOptions([]);
        setLoadingAccount(false);
        return;
      }

      const { data: organizersData } = await supabase
        .from("organizers")
        .select("id,name,slug")
        .in("id", organizerIds)
        .order("name", { ascending: true });

      const loadedOrganizers = (organizersData || []) as OrganizerRow[];

      setOrganizerOptions(loadedOrganizers);

      if (loadedOrganizers.length === 1) {
        setSelectedOrganizerId(loadedOrganizers[0].id);
        setOrganizer(loadedOrganizers[0].name);
      }

      setLoadingAccount(false);
    }

    loadAccount();
  }, []);

  const selectedOrganizer = useMemo(() => {
    return (
      organizerOptions.find((item) => item.id === selectedOrganizerId) || null
    );
  }, [organizerOptions, selectedOrganizerId]);

  const previewDate = getDateLabel(eventDate, endDate, isMultiDay);

  function handleOrganizerChange(value: string) {
    setSelectedOrganizerId(value);

    const foundOrganizer = organizerOptions.find((item) => item.id === value);

    if (foundOrganizer) {
      setOrganizer(foundOrganizer.name);
    }
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

    const filePath = `submissions/${crypto.randomUUID()}.${extension}`;

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

  function resetForm() {
    setTitle("");
    setArtistsText("");
    setCategory("Concertos");
    setCity("Pombal");
    setVenue("");
    setEventDate("");
    setEndDate("");
    setIsMultiDay(false);
    setEventTime("");
    setPrice("");
    setTicketUrl("");
    setInstagramUrl("");
    setDescription("");
    setSelectedImageFile(null);
    setImagePreviewUrl(null);

    if (!selectedOrganizer) {
      setOrganizer("");
    }
  }

  async function handleSubmit() {
    setMessage("");

    if (!title || !organizer || !city || !venue || !eventDate) {
      setMessage(
        "Preenche pelo menos nome do evento, organizador, cidade, espaço e data."
      );
      return;
    }

    if (isMultiDay && !endDate) {
      setMessage("Mete a data de fim do festival.");
      return;
    }

    if (isMultiDay && endDate < eventDate) {
      setMessage("A data de fim não pode ser antes da data de início.");
      return;
    }

    setSubmitting(true);

    let imageUrl: string | null = null;

    try {
      imageUrl = await uploadSelectedImage();
    } catch (error) {
      setSubmitting(false);
      setMessage(
        `Erro ao carregar imagem: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
      return;
    }

    const finalEndDate = isMultiDay ? endDate || eventDate : null;

    const { error } = await supabase.from("event_submissions").insert({
      title,
      city,
      venue,
      organizer,
      category,
      event_date: eventDate,
      end_date: finalEndDate,
      is_multi_day: isMultiDay,
      event_time: eventTime || null,
      price: price || null,
      ticket_url: normalizeExternalUrl(ticketUrl),
      instagram_url: normalizeExternalUrl(instagramUrl),
      description: description || null,
      image_url: imageUrl,
      submitted_by: userId,
      organizer_id: selectedOrganizerId || null,
      artists_text: artistsText || null,
      status: "pending",
    });

    setSubmitting(false);

    if (error) {
      setMessage(`Erro ao submeter evento: ${error.message}`);
      return;
    }

    setMessage("Evento submetido. A Paranoid vai rever antes de publicar.");
    resetForm();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-700">
              Formulário
            </p>

            <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
              Dados do evento.
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              Mete a informação base. Depois, se for preciso, podes corrigir a
              submissão no painel do organizador antes de ser aprovada.
            </p>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-black p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Pré-visualização
            </p>

            <h3 className="mt-3 text-2xl font-black leading-tight">
              {title || "Nome do evento"}
            </h3>

            <div className="mt-4 space-y-1 text-sm text-zinc-500">
              <p>{category}</p>
              <p>{previewDate}</p>
              <p>{eventTime || "Hora por definir"}</p>
              <p>{[venue, city].filter(Boolean).join(" · ") || "Local"}</p>
              <p>{price || "Preço por definir"}</p>
              {ticketUrl && <p>Bilhetes disponíveis</p>}
            </div>
          </div>
        </div>

        {loadingAccount && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-500">
            A verificar conta...
          </div>
        )}

        {!loadingAccount && !userId && (
          <div className="mt-6 rounded-2xl border border-yellow-900 bg-yellow-950/20 px-4 py-3 text-sm leading-relaxed text-yellow-500">
            Podes submeter sem conta, mas se iniciares sessão consegues acompanhar
            e editar submissões pendentes.
          </div>
        )}

        {!loadingAccount && userId && organizerOptions.length > 0 && (
          <div className="mt-6 rounded-2xl border border-red-950 bg-red-950/20 px-4 py-3 text-sm leading-relaxed text-red-300">
            Estás ligado a {organizerOptions.length} organizador
            {organizerOptions.length === 1 ? "" : "es"}. Se escolheres um, a
            submissão fica ligada ao painel desse organizador.
          </div>
        )}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {organizerOptions.length > 0 && (
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Conta de organizador
              </label>

              <select
                value={selectedOrganizerId}
                onChange={(event) => handleOrganizerChange(event.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
              >
                <option value="">Submissão livre</option>

                {organizerOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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

            <p className="mt-2 text-xs text-zinc-600">
              JPG, PNG ou WEBP. Máximo 5MB.
            </p>
          </div>

          {imagePreviewUrl && (
            <div
              className="h-72 rounded-[2rem] bg-cover bg-center lg:col-span-2 lg:h-96"
              style={{ backgroundImage: `url(${imagePreviewUrl})` }}
            />
          )}

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Nome do evento
            </label>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex: Noite Paranoid Vol. I"
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
              placeholder="Nome do coletivo, sala ou promotor"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Artistas / bandas / DJs
            </label>

            <input
              value={artistsText}
              onChange={(event) => setArtistsText(event.target.value)}
              placeholder="Ex: Dead Static, Cave Ritual, DJ Mau Ambiente"
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
              placeholder="Ex: Stereogun, Teatro-Cine, Praça..."
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
              Bilhetes / inscrição
            </label>

            <input
              type="url"
              value={ticketUrl}
              onChange={(event) => setTicketUrl(event.target.value)}
              placeholder="https://..."
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Instagram / página do evento
            </label>

            <input
              type="url"
              value={instagramUrl}
              onChange={(event) => setInstagramUrl(event.target.value)}
              placeholder="https://instagram.com/..."
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Descrição
            </label>

            <textarea
              rows={8}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descrição, horários, bilhetes, contexto, links úteis..."
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>
        </div>

        <div className="mt-8 grid gap-3 lg:grid-cols-[1fr_0.35fr]">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
          >
            {submitting ? "A submeter..." : "Submeter evento"}
          </button>

          <Link
            href="/agenda"
            className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
          >
            Ver agenda
          </Link>
        </div>

        {message && (
          <p className="mt-5 text-center text-sm font-bold text-zinc-400">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}