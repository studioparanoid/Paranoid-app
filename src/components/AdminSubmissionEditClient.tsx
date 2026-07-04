"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";
import { type EventSubmission } from "@/lib/submissions";

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

type AdminSubmissionEditClientProps = {
  submissionId: string;
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

export function AdminSubmissionEditClient({
  submissionId,
}: AdminSubmissionEditClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [submission, setSubmission] = useState<EventSubmission | null>(null);

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Pombal");
  const [venue, setVenue] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [artistsText, setArtistsText] = useState("");
  const [category, setCategory] = useState("Concertos");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function loadSubmission() {
      const { data, error } = await supabase
        .from("event_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (error) {
        setMessage("Não encontrei esta submissão.");
        setLoading(false);
        return;
      }

      const loadedSubmission = data as EventSubmission;

      setSubmission(loadedSubmission);
      setTitle(loadedSubmission.title || "");
      setCity(loadedSubmission.city || "Pombal");
      setVenue(loadedSubmission.venue || "");
      setOrganizer(loadedSubmission.organizer || "");
      setArtistsText(loadedSubmission.artists_text || "");
      setCategory(loadedSubmission.category || "Concertos");
      setEventDate(loadedSubmission.event_date || "");
      setEventTime(formatTimeForInput(loadedSubmission.event_time));
      setPrice(loadedSubmission.price || "");
      setDescription(loadedSubmission.description || "");

      setLoading(false);
    }

    loadSubmission();
  }, [submissionId]);

  function handlePriceBlur() {
    setPrice(formatPriceValue(price));
  }

  async function handleSave() {
    setMessage("");

    if (!submission) {
      setMessage("Submissão inválida.");
      return;
    }

    if (!title || !organizer || !city || !venue || !eventDate) {
      setMessage("Preenche pelo menos nome, organizador, espaço, cidade e data.");
      return;
    }

    setSaving(true);

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
        event_time: eventTime || null,
        price: price || null,
        description: description || null,
      })
      .eq("id", submissionId);

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
            href="/admin"
            className="mb-6 inline-block text-sm text-zinc-400"
          >
            ← Voltar ao admin
          </Link>

          <h1 className="text-4xl font-black">Submissão não encontrada.</h1>

          {message && <p className="mt-4 text-zinc-400">{message}</p>}
        </section>
      </main>
    );
  }

  const isApproved = submission.status === "approved";
  const isRejected = submission.status === "rejected";

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link href="/admin" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar ao admin
        </Link>

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Editar submissão
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Corrige antes de publicar.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Ajusta os dados da submissão antes de aprovar. Ao aprovar, a Paranoid
          cria/associa espaço, organizador e artistas automaticamente.
        </p>

        <div className="mt-6 rounded-full border border-yellow-900 bg-yellow-950/30 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-yellow-500">
          Estado: {submission.status}
        </div>

        {submission.image_url && (
          <div
            className="mt-6 h-64 rounded-[2rem] bg-cover bg-center"
            style={{ backgroundImage: `url(${submission.image_url})` }}
          />
        )}

        {(isApproved || isRejected) && (
          <div className="mt-6 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm leading-relaxed text-zinc-400">
              Esta submissão já foi tratada. Podes consultar os dados, mas o
              ideal é editar o evento publicado diretamente se já foi aprovado.
            </p>
          </div>
        )}

        <div className="mt-8 space-y-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Nome do evento
            </label>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isApproved || isRejected}
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
              disabled={isApproved || isRejected}
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
              disabled={isApproved || isRejected}
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
              onChange={(event) => setCategory(event.target.value)}
              disabled={isApproved || isRejected}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900 disabled:opacity-50"
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
              disabled={isApproved || isRejected}
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
              disabled={isApproved || isRejected}
              placeholder="Nome do espaço"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900 disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Data
              </label>

              <input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                disabled={isApproved || isRejected}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900 disabled:opacity-50"
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
                disabled={isApproved || isRejected}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900 disabled:opacity-50"
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
              disabled={isApproved || isRejected}
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
              disabled={isApproved || isRejected}
              placeholder="Descrição do evento"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900 disabled:opacity-50"
            />
          </div>

          {!isApproved && !isRejected && (
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