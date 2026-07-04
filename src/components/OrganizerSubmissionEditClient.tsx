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

type OrganizerSubmissionEditClientProps = {
  submissionId: string;
};

export function OrganizerSubmissionEditClient({
  submissionId,
}: OrganizerSubmissionEditClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [submission, setSubmission] = useState<EventSubmission | null>(null);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("event_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (error) {
        console.error(error);
        setMessage("Não encontrei esta submissão ou não tens acesso.");
        setLoading(false);
        return;
      }

      const loadedSubmission = data as EventSubmission;

      setSubmission(loadedSubmission);
      setTitle(loadedSubmission.title || "");
      setCity(loadedSubmission.city || "Pombal");
      setVenue(loadedSubmission.venue || "");
      setOrganizer(loadedSubmission.organizer || "");
      setCategory(loadedSubmission.category || "Concertos");
      setEventDate(loadedSubmission.event_date || "");
      setEventTime(loadedSubmission.event_time || "");
      setPrice(loadedSubmission.price || "");
      setDescription(loadedSubmission.description || "");

      setLoading(false);
    }

    loadSubmission();
  }, [submissionId]);

  function formatPrice() {
    const cleanPrice = price.trim();

    if (!cleanPrice) {
      return;
    }

    if (
      cleanPrice.toLowerCase() === "gratis" ||
      cleanPrice.toLowerCase() === "grátis" ||
      cleanPrice === "0"
    ) {
      setPrice("Entrada livre");
      return;
    }

    if (!cleanPrice.includes("€") && /^\d+([,.]\d{1,2})?$/.test(cleanPrice)) {
      setPrice(`${cleanPrice.replace(".", ",")}€`);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    if (!submission) {
      setSaving(false);
      setMessage("Submissão inválida.");
      return;
    }

    if (submission.status !== "pending") {
      setSaving(false);
      setMessage("Esta submissão já não está pendente.");
      return;
    }

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
          <p className="text-zinc-500">A carregar submissão...</p>
        </section>
      </main>
    );
  }

  if (!submission) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <Link
            href="/organizador"
            className="mb-6 inline-block text-sm text-zinc-400"
          >
            ← Voltar ao organizador
          </Link>

          <h1 className="text-4xl font-black">Sem acesso.</h1>

          <p className="mt-4 text-zinc-400">
            Esta submissão não existe ou não pertence ao teu organizador.
          </p>
        </section>
      </main>
    );
  }

  const isEditable = submission.status === "pending";

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link
          href="/organizador"
          className="mb-6 inline-block text-sm text-zinc-400"
        >
          ← Voltar ao organizador
        </Link>

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Editar submissão
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Corrige antes da aprovação.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Enquanto estiver pendente, podes ajustar a submissão antes da Paranoid
          aprovar.
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

        <div className="mt-8 space-y-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Nome do evento
            </label>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!isEditable}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Organizador
            </label>

            <input
              value={organizer}
              onChange={(event) => setOrganizer(event.target.value)}
              disabled={!isEditable}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Cidade
            </label>

            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              disabled={!isEditable}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
              disabled={!isEditable}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
              disabled={!isEditable}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
                disabled={!isEditable}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
                disabled={!isEditable}
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
              onBlur={formatPrice}
              disabled={!isEditable}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
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
              disabled={!isEditable}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none disabled:opacity-50"
            />
          </div>

          {isEditable ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
            >
              {saving ? "A guardar..." : "Guardar alterações"}
            </button>
          ) : (
            <p className="text-center text-sm font-bold text-zinc-500">
              Esta submissão já foi tratada e não pode ser editada.
            </p>
          )}

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