"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

type OrganizerMembership = {
  organizer_id: string;
  role: string;
  organizers: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
  } | null;
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

export function SubmitEventClient() {
  const [loading, setLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<OrganizerMembership[]>([]);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState("");

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

      const { data } = await supabase
        .from("organizer_members")
        .select(
          `
          organizer_id,
          role,
          organizers (
            id,
            name,
            slug,
            city
          )
        `
        )
        .eq("user_id", user.id);

      const loadedMemberships = (data || []) as unknown as OrganizerMembership[];

      setMemberships(loadedMemberships);

      if (loadedMemberships.length > 0) {
        const firstMembership = loadedMemberships[0];
        const firstOrganizer = firstMembership.organizers;

        setSelectedOrganizerId(firstMembership.organizer_id);
        setOrganizer(firstOrganizer?.name || "");

        if (firstOrganizer?.city) {
          setCity(firstOrganizer.city);
        }
      }

      setLoadingAccount(false);
    }

    loadAccount();
  }, []);

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

  function handleOrganizerChange(organizerId: string) {
    setSelectedOrganizerId(organizerId);

    const membership = memberships.find(
      (item) => item.organizer_id === organizerId
    );

    if (!membership) {
      return;
    }

    setOrganizer(membership.organizers?.name || "");

    if (membership.organizers?.city) {
      setCity(membership.organizers.city);
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

  async function handleSubmit() {
    setMessage("");

    if (!title || !organizer || !city || !venue || !eventDate) {
      setMessage(
        "Preenche pelo menos nome do evento, organizador, cidade, espaço e data de início."
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

    setLoading(true);

    let imageUrl: string | null = null;

    try {
      imageUrl = await uploadSelectedImage();
    } catch (error) {
      setMessage(
        `Erro ao carregar imagem: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
      setLoading(false);
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
      description: description || null,
      image_url: imageUrl,
      submitted_by: userId,
      organizer_id: selectedOrganizerId || null,
      artists_text: artistsText || null,
      status: "pending",
    });

    setLoading(false);

    if (error) {
      setMessage(`Erro ao submeter evento: ${error.message}`);
      return;
    }

    setTitle("");
    setArtistsText("");
    setVenue("");
    setEventDate("");
    setEndDate("");
    setIsMultiDay(false);
    setEventTime("");
    setPrice("");
    setDescription("");
    setSelectedImageFile(null);
    setImagePreviewUrl(null);

    if (memberships.length === 0) {
      setOrganizer("");
    }

    setMessage("Evento submetido. Vai ser revisto pela Paranoid.");
  }

  return (
    <div className="mt-8 space-y-6">
      {!loadingAccount && !userId && (
        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm leading-relaxed text-zinc-400">
            Podes submeter sem conta, mas se tiveres conta de organizador o
            evento fica automaticamente ligado ao teu perfil.
          </p>

          <Link
            href="/login"
            className="mt-4 block rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
          >
            Entrar como organizador
          </Link>
        </div>
      )}

      {memberships.length > 0 && (
        <div className="rounded-[2rem] border border-red-950 bg-red-950/20 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-red-500">
            Conta de organizador
          </p>

          <p className="mt-3 text-sm text-zinc-400">
            Esta submissão fica ligada ao organizador selecionado.
          </p>

          <select
            value={selectedOrganizerId}
            onChange={(event) => handleOrganizerChange(event.target.value)}
            className="mt-4 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
          >
            {memberships.map((membership) => (
              <option
                key={membership.organizer_id}
                value={membership.organizer_id}
              >
                {membership.organizers?.name || "Organizador"}
              </option>
            ))}
          </select>
        </div>
      )}

      {imagePreviewUrl && (
        <div
          className="h-64 rounded-[2rem] bg-cover bg-center"
          style={{ backgroundImage: `url(${imagePreviewUrl})` }}
        />
      )}

      <div className="space-y-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
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
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Organizador
          </label>

          <input
            value={organizer}
            onChange={(event) => setOrganizer(event.target.value)}
            disabled={memberships.length > 0}
            placeholder="Nome do organizador"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900 disabled:opacity-50"
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
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
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

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
        >
          {loading ? "A submeter..." : "Submeter evento"}
        </button>

        {message && (
          <p className="text-center text-sm font-bold text-zinc-400">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}