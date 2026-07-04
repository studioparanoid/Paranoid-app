"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";
import { type EventSubmission } from "@/lib/submissions";

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

type OrganizerSubmissionEditClientProps = {
  submissionId: string;
};

type MembershipRow = {
  organizer_id: string;
};

function formatTimeForInput(value: string | null) {
  if (!value) {
    return "";
  }

  const parts = value.split(":");

  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }

  return value;
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

export function OrganizerSubmissionEditClient({
  submissionId,
}: OrganizerSubmissionEditClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [submission, setSubmission] = useState<EventSubmission | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Pombal");
  const [venue, setVenue] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [artistsText, setArtistsText] = useState("");
  const [category, setCategory] = useState("Concertos");
  const [eventDate, setEventDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [eventTime, setEventTime] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function loadSubmission() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Tens de iniciar sessão como organizador.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("event_submissions")
        .select("*")
        .eq("id", submissionId)
        .maybeSingle();

      if (error || !data) {
        setMessage("Não encontrei esta submissão.");
        setLoading(false);
        return;
      }

      const loadedSubmission = data as EventSubmission;

      let allowed = loadedSubmission.submitted_by === user.id;

      if (loadedSubmission.organizer_id) {
        const { data: membershipData } = await supabase
          .from("organizer_members")
          .select("organizer_id")
          .eq("user_id", user.id)
          .eq("organizer_id", loadedSubmission.organizer_id)
          .maybeSingle();

        allowed = allowed || Boolean(membershipData as MembershipRow | null);
      }

      if (!allowed) {
        setMessage("Não tens permissão para editar esta submissão.");
        setLoading(false);
        return;
      }

      setSubmission(loadedSubmission);
      setCanEdit(loadedSubmission.status === "pending");

      setTitle(loadedSubmission.title || "");
      setCity(loadedSubmission.city || "Pombal");
      setVenue(loadedSubmission.venue || "");
      setOrganizer(loadedSubmission.organizer || "");
      setArtistsText(loadedSubmission.artists_text || "");
      setCategory(loadedSubmission.category || "Concertos");
      setEventDate(loadedSubmission.event_date || "");
      setEndDate(loadedSubmission.end_date || "");
      setIsMultiDay(Boolean(loadedSubmission.is_multi_day));
      setEventTime(formatTimeForInput(loadedSubmission.event_time));
      setPrice(loadedSubmission.price || "");
      setDescription(loadedSubmission.description || "");

      setLoading(false);
    }

    loadSubmission();
  }, [submissionId]);

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

  async function handleSave() {
    setMessage("");

    if (!submission) {
      setMessage("Submissão inválida.");
      return;
    }

    if (!canEdit) {
      setMessage("Esta submissão já não pode ser editada.");
      return;
    }

    if (!title || !organizer || !city || !venue || !eventDate) {
      setMessage(
        "Preenche pelo menos nome, organizador, espaço, cidade e data de início."
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

    setSaving(true);

    const finalEndDate = isMultiDay ? endDate || eventDate : null;

    const { error } = await supabase
      .from("event_submissions")
      .update({
        title,
        city,
        venue,
        organizer,
        artists_text: artistsText || null,
        category,
        event_date: eventDate || null,
        end_date: finalEndDate,
        is_multi_day: isMultiDay,
        event_time: eventTime || null,
        price: price || null,
        description: description || null,
      })
      .eq("id", submissionId)
      .eq("status", "pending");

    setSaving(false);

    if (error) {
      setMessage(`Erro ao guardar submissão: ${error.message}`);
      return;
    }

    setMessage("Submissão atualizada.");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <p className="text-zinc-500">A carregar submissão...</p>
        </section>
      </main>
    );
  }

  if (!submission) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <Link
            href="/organizador"
            className="mb-6 inline-block text-sm text-zinc-400"
          >
            ← Voltar ao painel
          </Link>

          <h1 className="text-4xl font-black">Submissão não disponível.</h1>

          {message && <p className="mt-4 text-zinc-400">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link
          href="/organizador"
          className="mb-6 inline-block text-sm text-zinc-400"
        >
          ← Voltar ao painel
        </Link>

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Submissão
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Corrige antes da Paranoid rever.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Enquanto a submissão estiver pendente, podes editar os dados enviados.
        </p>

        <div className="mt-6 rounded-full border border-yellow-900 bg-yellow-950/30 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-yellow-500">
          Estado: {submission.status}
        </div>

        {!canEdit && (
          <div className="mt-6 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm leading-relaxed text-zinc-400">
              Esta submissão já foi tratada. Se precisares de corrigir um evento
              aprovado, edita o evento publicado no painel do organizador.
            </p>
          </div>
        )}

        {submission.image_url && (
          <div
            className="mt-6 h-64 rounded-[2rem] bg-cover bg-center"
            style={{ backgroundImage: `url(${submission.image_url})` }}
          />
        )}

        <div className="mt-8 space-y-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Nome do evento
            </label>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!canEdit}
              placeholder="Nome do evento"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Organizador
            </label>

            <input
              value={organizer}
              onChange={(event) => setOrganizer(event.target.value)}
              disabled={!canEdit}
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
              disabled={!canEdit}
              placeholder="Ex: Dead Static, Cave Ritual"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900 disabled:opacity-50"
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
              disabled={!canEdit}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900 disabled:opacity-50"
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
              disabled={!canEdit}
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
              disabled={!canEdit}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900 disabled:opacity-50"
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
              disabled={!canEdit}
              placeholder="Nome do espaço"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900 disabled:opacity-50"
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
                disabled={!canEdit}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900 disabled:opacity-50"
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
                  disabled={!canEdit}
                  className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900 disabled:opacity-50"
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
              disabled={!canEdit}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900 disabled:opacity-50"
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
              disabled={!canEdit}
              placeholder="Ex: 5€, 10€ ou Entrada livre"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900 disabled:opacity-50"
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
              disabled={!canEdit}
              placeholder="Descrição do evento"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900 disabled:opacity-50"
            />
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
            >
              {saving ? "A guardar..." : "Guardar submissão"}
            </button>
          )}

          {message && (
            <p className="text-center text-sm font-bold text-zinc-400">
              {message}
            </p>
          )}

          <Link
            href="/organizador"
            className="block rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
          >
            Voltar ao painel
          </Link>
        </div>
      </section>
    </main>
  );
}