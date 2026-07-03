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

export function AdminSubmissionEditClient({
  submissionId,
}: AdminSubmissionEditClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Pombal");
  const [venue, setVenue] = useState("");
  const [organizer, setOrganizer] = useState("");
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
        console.error(error);
        setMessage("Não consegui carregar esta submissão.");
        setLoading(false);
        return;
      }

      const submission = data as EventSubmission;

      setTitle(submission.title || "");
      setCity(submission.city || "Pombal");
      setVenue(submission.venue || "");
      setOrganizer(submission.organizer || "");
      setCategory(submission.category || "Concertos");
      setEventDate(submission.event_date || "");
      setEventTime(submission.event_time || "");
      setPrice(submission.price || "");
      setDescription(submission.description || "");

      setLoading(false);
    }

    loadSubmission();
  }, [submissionId]);

  async function handleSave() {
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("event_submissions")
      .update({
        title,
        city,
        venue,
        organizer,
        category,
        event_date: eventDate || null,
        event_time: eventTime || null,
        price,
        description,
      })
      .eq("id", submissionId);

    setSaving(false);

    if (error) {
      console.error(error);
      setMessage("Erro ao guardar alterações.");
      return;
    }

    setMessage("Submissão atualizada.");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <p className="text-zinc-400">A carregar submissão...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
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
          Ajusta dados, texto, preço e categoria antes de aprovar o evento.
        </p>

        <div className="mt-8 space-y-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Nome do evento
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Organizador
            </label>
            <input
              value={organizer}
              onChange={(event) => setOrganizer(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
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
              Espaço / local
            </label>
            <input
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
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
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Preço
            </label>
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
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
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
          >
            {saving ? "A guardar..." : "Guardar alterações"}
          </button>

          {message && (
            <p className="text-center text-sm font-bold text-zinc-400">
              {message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}