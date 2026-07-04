"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

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

type EventRow = {
  id: string;
  slug: string;
  title: string;
  city: string;
  venue_name: string | null;
  display_date: string | null;
  display_time: string | null;
  category: string;
  price: string | null;
  description: string | null;
  image_url: string | null;
  status: string;
};

type OrganizerEventEditClientProps = {
  eventId: string;
};

export function OrganizerEventEditClient({
  eventId,
}: OrganizerEventEditClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [eventSlug, setEventSlug] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Pombal");
  const [venueName, setVenueName] = useState("");
  const [category, setCategory] = useState("Concertos");
  const [displayDate, setDisplayDate] = useState("");
  const [displayTime, setDisplayTime] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function loadEvent() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select(
          `
          id,
          slug,
          title,
          city,
          venue_name,
          display_date,
          display_time,
          category,
          price,
          description,
          image_url,
          status
        `
        )
        .eq("id", eventId)
        .single();

      if (error) {
        console.error(error);
        setMessage("Não encontrei este evento ou não tens acesso.");
        setLoading(false);
        return;
      }

      const event = data as EventRow;

      setEventSlug(event.slug);
      setImageUrl(event.image_url);
      setTitle(event.title || "");
      setCity(event.city || "Pombal");
      setVenueName(event.venue_name || "");
      setCategory(event.category || "Concertos");
      setDisplayDate(event.display_date || "");
      setDisplayTime(event.display_time || "");
      setPrice(event.price || "");
      setDescription(event.description || "");

      setLoading(false);
    }

    loadEvent();
  }, [eventId]);

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

    const { error } = await supabase.rpc("update_organizer_event", {
      event_id: eventId,
      new_title: title,
      new_city: city,
      new_venue_name: venueName,
      new_category: category,
      new_display_date: displayDate,
      new_display_time: displayTime,
      new_price: price,
      new_description: description,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      setMessage("Erro ao guardar alterações.");
      return;
    }

    setMessage("Evento atualizado.");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <p className="text-zinc-500">A carregar evento...</p>
        </section>
      </main>
    );
  }

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
          Editar evento publicado
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Ajusta o evento em direto.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          As alterações ficam visíveis na Agenda depois de guardares.
        </p>

        {imageUrl && (
          <div
            className="mt-6 h-64 rounded-[2rem] bg-cover bg-center"
            style={{ backgroundImage: `url(${imageUrl})` }}
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
              Espaço / local
            </label>

            <input
              value={venueName}
              onChange={(event) => setVenueName(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none focus:border-red-900"
            />
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Data
              </label>

              <input
                value={displayDate}
                onChange={(event) => setDisplayDate(event.target.value)}
                placeholder="Ex: 24 JUL"
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Hora
              </label>

              <input
                value={displayTime}
                onChange={(event) => setDisplayTime(event.target.value)}
                placeholder="Ex: 22:00"
                className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
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

          {eventSlug && (
            <Link
              href={`/eventos/${eventSlug}`}
              className="block rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
            >
              Ver evento público
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}