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

type OrganizerRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  description: string | null;
  pack: string | null;
  verified: boolean | null;
  instagram: string | null;
};

type AdminOrganizerEditClientProps = {
  organizerId: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function AdminOrganizerEditClient({
  organizerId,
}: AdminOrganizerEditClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [organizer, setOrganizer] = useState<OrganizerRow | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("Pombal");
  const [description, setDescription] = useState("");
  const [pack, setPack] = useState("");
  const [instagram, setInstagram] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    async function loadOrganizer() {
      const { data, error } = await supabase
        .from("organizers")
        .select("id,slug,name,city,description,pack,verified,instagram")
        .eq("id", organizerId)
        .single();

      if (error) {
        setMessage("Não encontrei este organizador.");
        setLoading(false);
        return;
      }

      const loadedOrganizer = data as OrganizerRow;

      setOrganizer(loadedOrganizer);
      setName(loadedOrganizer.name || "");
      setSlug(loadedOrganizer.slug || "");
      setCity(loadedOrganizer.city || "Pombal");
      setDescription(loadedOrganizer.description || "");
      setPack(loadedOrganizer.pack || "");
      setInstagram(loadedOrganizer.instagram || "");
      setVerified(Boolean(loadedOrganizer.verified));

      setLoading(false);
    }

    loadOrganizer();
  }, [organizerId]);

  function generateSlugFromName() {
    if (!name) {
      return;
    }

    setSlug(slugify(name));
  }

  async function handleSave() {
    setMessage("");

    if (!name) {
      setMessage("Mete o nome do organizador.");
      return;
    }

    if (!slug) {
      setMessage("Mete o slug do organizador.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("organizers")
      .update({
        name,
        slug,
        city,
        description: description || null,
        pack: pack || null,
        instagram: instagram || null,
        verified,
      })
      .eq("id", organizerId);

    setSaving(false);

    if (error) {
      setMessage("Erro ao guardar organizador. Pode existir slug repetido.");
      return;
    }

    setMessage("Organizador atualizado.");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] px-5 py-8 pb-28 text-[#f5f5f2]">
        <section className="mx-auto max-w-md">
          <p className="text-foreground-muted">A carregar organizador...</p>
        </section>
      </main>
    );
  }

  if (!organizer) {
    return (
      <main className="min-h-screen bg-[#070707] px-5 py-8 pb-28 text-[#f5f5f2]">
        <section className="mx-auto max-w-md">
          <Link
            href="/admin/rede"
            className="mb-6 inline-block text-sm text-foreground-muted"
          >
            ← Voltar à rede
          </Link>

          <h1 className="text-4xl font-black">Organizador não encontrado.</h1>

          {message && <p className="mt-4 text-foreground-muted">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-5 py-8 pb-28 text-[#f5f5f2]">
      <section className="mx-auto max-w-md">
        <Link
          href="/admin/rede"
          className="mb-6 inline-block text-sm text-foreground-muted"
        >
          ← Voltar à rede
        </Link>

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-danger">
          Editar organizador
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Afina quem mexe.
        </h1>

        <p className="mt-5 text-base text-foreground-muted">
          Atualiza nome, slug, cidade, descrição, pack e estado verificado deste
          organizador.
        </p>

        <div className="mt-8 space-y-5 rounded-[2rem] border border-border bg-background p-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground-secondary">
              Nome do organizador
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do organizador"
              className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label className="block text-sm font-bold text-foreground-secondary">
                Slug
              </label>

              <button
                type="button"
                onClick={generateSlugFromName}
                className="text-xs font-bold uppercase tracking-wide text-danger"
              >
                Gerar pelo nome
              </button>
            </div>

            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="ex: paranoid-crew"
              className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
            />

            <p className="mt-2 text-xs text-foreground-muted">
              O slug define o link público: /organizadores/{slug || "slug"}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-foreground-secondary">
              Cidade
            </label>

            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none focus:border-[var(--accent)]"
            >
              {cities.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-foreground-secondary">
              Descrição
            </label>

            <textarea
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descrição curta do organizador"
              className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-foreground-secondary">
              Pack
            </label>

            <input
              value={pack}
              onChange={(event) => setPack(event.target.value)}
              placeholder="Ex: Paranoid Crew"
              className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-foreground-secondary">
              Instagram
            </label>

            <input
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
              placeholder="https://instagram.com/..."
              className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-border bg-black px-4 py-3">
            <input
              type="checkbox"
              checked={verified}
              onChange={(event) => setVerified(event.target.checked)}
            />

            <span className="text-sm font-bold text-foreground-secondary">
              Organizador verificado
            </span>
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full bg-[#f5f5f2] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
          >
            {saving ? "A guardar..." : "Guardar organizador"}
          </button>

          {message && (
            <p className="text-center text-sm font-bold text-foreground-muted">
              {message}
            </p>
          )}

          {slug && (
            <Link
              href={`/organizadores/${slug}`}
              className="block rounded-full border border-border-strong px-5 py-4 text-center text-sm font-bold text-foreground-secondary"
            >
              Ver perfil público
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}