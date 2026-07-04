"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/public";

const cities = [
  "Pombal",
  "Leiria",
  "Coimbra",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Marinha Grande",
];

type VenueRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  description: string | null;
  instagram: string | null;
};

type AdminVenueEditClientProps = {
  venueId: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function AdminVenueEditClient({ venueId }: AdminVenueEditClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [venue, setVenue] = useState<VenueRow | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("Pombal");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [instagram, setInstagram] = useState("");

  useEffect(() => {
    async function loadVenue() {
      const { data, error } = await supabase
        .from("venues")
        .select("id,slug,name,city,address,description,instagram")
        .eq("id", venueId)
        .single();

      if (error) {
        setMessage("Não encontrei este espaço.");
        setLoading(false);
        return;
      }

      const loadedVenue = data as VenueRow;

      setVenue(loadedVenue);
      setName(loadedVenue.name || "");
      setSlug(loadedVenue.slug || "");
      setCity(loadedVenue.city || "Pombal");
      setAddress(loadedVenue.address || "");
      setDescription(loadedVenue.description || "");
      setInstagram(loadedVenue.instagram || "");

      setLoading(false);
    }

    loadVenue();
  }, [venueId]);

  function generateSlugFromName() {
    if (!name) {
      return;
    }

    setSlug(slugify(name));
  }

  async function handleSave() {
    setMessage("");

    if (!name) {
      setMessage("Mete o nome do espaço.");
      return;
    }

    if (!slug) {
      setMessage("Mete o slug do espaço.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("venues")
      .update({
        name,
        slug,
        city,
        address: address || null,
        description: description || null,
        instagram: instagram || null,
      })
      .eq("id", venueId);

    setSaving(false);

    if (error) {
      setMessage("Erro ao guardar espaço. Pode existir slug repetido.");
      return;
    }

    setMessage("Espaço atualizado.");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <p className="text-zinc-500">A carregar espaço...</p>
        </section>
      </main>
    );
  }

  if (!venue) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
        <section className="mx-auto max-w-md">
          <Link
            href="/admin/rede"
            className="mb-6 inline-block text-sm text-zinc-400"
          >
            ← Voltar à rede
          </Link>

          <h1 className="text-4xl font-black">Espaço não encontrado.</h1>

          {message && <p className="mt-4 text-zinc-400">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link
          href="/admin/rede"
          className="mb-6 inline-block text-sm text-zinc-400"
        >
          ← Voltar à rede
        </Link>

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Editar espaço
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Afina o sítio.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Atualiza nome, morada, cidade, descrição e links públicos deste
          espaço.
        </p>

        <div className="mt-8 space-y-5 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Nome do espaço
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do espaço"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label className="block text-sm font-bold text-zinc-300">
                Slug
              </label>

              <button
                type="button"
                onClick={generateSlugFromName}
                className="text-xs font-bold uppercase tracking-wide text-red-500"
              >
                Gerar pelo nome
              </button>
            </div>

            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="ex: armazem"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />

            <p className="mt-2 text-xs text-zinc-600">
              O slug define o link público: /espacos/{slug || "slug"}
            </p>
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
              Morada
            </label>

            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Morada do espaço"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Descrição
            </label>

            <textarea
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descrição curta do espaço"
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-zinc-300">
              Instagram
            </label>

            <input
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
              placeholder="https://instagram.com/..."
              className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-[#f2f1ec] outline-none placeholder:text-zinc-600 focus:border-red-900"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full bg-[#f2f1ec] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
          >
            {saving ? "A guardar..." : "Guardar espaço"}
          </button>

          {message && (
            <p className="text-center text-sm font-bold text-zinc-400">
              {message}
            </p>
          )}

          {slug && (
            <Link
              href={`/espacos/${slug}`}
              className="block rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
            >
              Ver perfil público
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}