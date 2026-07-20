"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import { type EventSubmission } from "@/lib/submissions";
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

type AdminSubmissionEditClientProps = {
  submissionId?: string;
  id?: string;
};

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

export function AdminSubmissionEditClient({
  submissionId,
  id,
}: AdminSubmissionEditClientProps) {
  const resolvedSubmissionId = submissionId || id || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [submission, setSubmission] = useState<EventSubmission | null>(null);

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

  const [ticketMode, setTicketMode] = useState<TicketMode>("none");
  const [ticketUrl, setTicketUrl] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketCapacity, setTicketCapacity] = useState("");
  const [ticketButtonLabel, setTicketButtonLabel] = useState("Comprar bilhete");
  const [instagramUrl, setInstagramUrl] = useState("");

  async function loadSubmission() {
    setLoading(true);
    setMessage("");

    if (!resolvedSubmissionId) {
      setMessage("Submissão inválida.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("event_submissions")
      .select("*")
      .eq("id", resolvedSubmissionId)
      .maybeSingle();

    if (error || !data) {
      setMessage(error?.message || "Submissão não encontrada.");
      setSubmission(null);
      setLoading(false);
      return;
    }

    const loadedSubmission = data as EventSubmission;

    setSubmission(loadedSubmission);
    setTitle(loadedSubmission.title || "");
    setOrganizer(loadedSubmission.organizer || "");
    setArtistsText(loadedSubmission.artists_text || "");
    setCategory(loadedSubmission.category || "Concertos");
    setCity(loadedSubmission.city || "Pombal");
    setVenue(loadedSubmission.venue || "");
    setEventDate(loadedSubmission.event_date || "");
    setEndDate(loadedSubmission.end_date || "");
    setIsMultiDay(Boolean(loadedSubmission.is_multi_day));
    setEventTime(loadedSubmission.event_time || "");
    setPrice(loadedSubmission.price || "");
    setDescription(loadedSubmission.description || "");

    setTicketMode(loadedSubmission.ticket_mode || "none");
    setTicketUrl(loadedSubmission.ticket_url || "");
    setTicketPrice(loadedSubmission.ticket_price || "");
    setTicketCapacity(
      loadedSubmission.ticket_capacity === null ||
        loadedSubmission.ticket_capacity === undefined
        ? ""
        : String(loadedSubmission.ticket_capacity)
    );
    setTicketButtonLabel(
      loadedSubmission.ticket_button_label || "Comprar bilhete"
    );
    setInstagramUrl(loadedSubmission.instagram_url || "");

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSubmission(); }, 0);
    return () => window.clearTimeout(timer);
  }, [resolvedSubmissionId]);

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

  async function saveSubmission() {
    setMessage("");

    if (!submission) {
      setMessage("Submissão inválida.");
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

    const finalEndDate = isMultiDay ? endDate || eventDate : null;

    const { error } = await supabase
      .from("event_submissions")
      .update({
        title,
        organizer,
        artists_text: artistsText || null,
        category,
        city,
        venue,
        event_date: eventDate,
        end_date: finalEndDate,
        is_multi_day: isMultiDay,
        event_time: eventTime || null,
        price: price || null,
        description: description || null,

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
      })
      .eq("id", submission.id);

    setSaving(false);

    if (error) {
      setMessage(`Erro ao guardar: ${error.message}`);
      return;
    }

    setMessage("Submissão atualizada.");
    await loadSubmission();
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-zinc-500">A carregar submissão...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="mt-8 rounded-[2.5rem] border border-red-950 bg-red-950/20 p-6 lg:p-10">
        <h2 className="text-4xl font-black leading-none">
          Submissão não encontrada.
        </h2>

        {message && <p className="mt-4 text-sm text-red-300">{message}</p>}

        <Link
          href="/admin"
          className="mt-6 inline-block rounded-full bg-[#f2f1ec] px-6 py-4 text-sm font-black text-black"
        >
          Voltar ao admin
        </Link>
      </div>
    );
  }

  const locked = submission.status !== "pending";

  return (
    <section className="mt-8 rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-5 lg:mt-12 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Submissão
          </p>

          <h2 className="mt-3 text-4xl font-black leading-none lg:text-6xl">
            {title || "Editar submissão"}
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            Estado: {submission.status}. Só edita antes de aprovar/rejeitar.
          </p>
        </div>

        <div className="rounded-[2rem] border border-zinc-800 bg-black p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-red-700">
            Bilheteira
          </p>

          <div className="mt-4 space-y-2 text-sm text-zinc-500">
            <p>
              Tipo:{" "}
              {ticketMode === "internal"
                ? "Paranoid"
                : ticketMode === "external"
                  ? "externa"
                  : "sem bilhetes"}
            </p>

            <p>Preço: {ticketPrice || price || "Preço por definir"}</p>

            {ticketCapacity && <p>Lotação: {ticketCapacity}</p>}
          </div>
        </div>
      </div>

      {locked && (
        <div className="mt-6 rounded-2xl border border-yellow-900 bg-yellow-950/20 px-4 py-3 text-sm font-bold text-yellow-500">
          Esta submissão já não está pendente. Se já foi aprovada, edita o
          evento publicado em vez da submissão.
        </div>
      )}

      {submission.image_url && (
        <div
          className="mt-8 h-72 rounded-[2rem] bg-cover bg-center lg:h-96"
          style={{ backgroundImage: `url(${submission.image_url})` }}
        />
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Nome do evento
          </label>

          <input
            value={title}
            disabled={locked}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Organizador
          </label>

          <input
            value={organizer}
            disabled={locked}
            onChange={(event) => setOrganizer(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
          />
        </div>

        <div className="lg:col-span-2">
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Artistas / bandas / DJs
          </label>

          <input
            value={artistsText}
            disabled={locked}
            onChange={(event) => setArtistsText(event.target.value)}
            placeholder="Separar por vírgulas"
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Categoria
          </label>

          <select
            value={category}
            disabled={locked}
            onChange={(event) => handleCategoryChange(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
            disabled={locked}
            onChange={(event) => setCity(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
            disabled={locked}
            onChange={(event) => setVenue(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
          />
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black px-4 py-3 lg:col-span-2">
          <input
            type="checkbox"
            checked={isMultiDay}
            disabled={locked}
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
            disabled={locked}
            onChange={(event) => handleEventDateChange(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
              disabled={locked}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
            disabled={locked}
            onChange={(event) => setEventTime(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Preço público
          </label>

          <input
            value={price}
            disabled={locked}
            onChange={(event) => setPrice(event.target.value)}
            onBlur={() => setPrice(formatPriceValue(price))}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
            disabled={locked}
            onChange={(event) =>
              handleTicketModeChange(event.target.value as TicketMode)
            }
            className="w-full rounded-2xl border border-red-950 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
                disabled={locked}
                onChange={(event) => setTicketUrl(event.target.value)}
                placeholder="https://shotgun.live/..."
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
                  disabled={locked}
                  onChange={(event) => setTicketPrice(event.target.value)}
                  onBlur={() => setTicketPrice(formatPriceValue(ticketPrice))}
                  placeholder="Ex: 10€"
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
                  disabled={locked}
                  onChange={(event) => setTicketCapacity(event.target.value)}
                  placeholder="Ex: 100"
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Texto do botão
                </label>

                <input
                  value={ticketButtonLabel}
                  disabled={locked}
                  onChange={(event) => setTicketButtonLabel(event.target.value)}
                  placeholder="Comprar na Paranoid"
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
            disabled={locked}
            onChange={(event) => setInstagramUrl(event.target.value)}
            placeholder="https://instagram.com/..."
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
          />
        </div>

        <div className="lg:col-span-2">
          <label className="mb-2 block text-sm font-bold text-zinc-300">
            Descrição
          </label>

          <textarea
            rows={8}
            value={description}
            disabled={locked}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-3 lg:grid-cols-[1fr_0.35fr]">
        <button
          type="button"
          onClick={saveSubmission}
          disabled={saving || locked}
          className="rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
        >
          {saving ? "A guardar..." : "Guardar submissão"}
        </button>

        <Link
          href="/admin"
          className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
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
