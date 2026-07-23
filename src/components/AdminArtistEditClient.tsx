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

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  genres: string[] | null;
  description: string | null;
  instagram: string | null;
  bandcamp: string | null;
};

type AdminArtistEditClientProps = {
  artistId: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function AdminArtistEditClient({
  artistId,
}: AdminArtistEditClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [artist, setArtist] = useState<ArtistRow | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("Pombal");
  const [genresText, setGenresText] = useState("");
  const [description, setDescription] = useState("");
  const [instagram, setInstagram] = useState("");
  const [bandcamp, setBandcamp] = useState("");

  useEffect(() => {
    async function loadArtist() {
      const { data, error } = await supabase
        .from("artists")
        .select("id,slug,name,city,genres,description,instagram,bandcamp")
        .eq("id", artistId)
        .single();

      if (error) {
        setMessage("Não encontrei este artista.");
        setLoading(false);
        return;
      }

      const loadedArtist = data as ArtistRow;

      setArtist(loadedArtist);
      setName(loadedArtist.name || "");
      setSlug(loadedArtist.slug || "");
      setCity(loadedArtist.city || "Pombal");
      setGenresText((loadedArtist.genres || []).join(", "));
      setDescription(loadedArtist.description || "");
      setInstagram(loadedArtist.instagram || "");
      setBandcamp(loadedArtist.bandcamp || "");

      setLoading(false);
    }

    loadArtist();
  }, [artistId]);

  function generateSlugFromName() {
    if (!name) {
      return;
    }

    setSlug(slugify(name));
  }

  async function handleSave() {
    setMessage("");

    if (!name) {
      setMessage("Mete o nome do artista.");
      return;
    }

    if (!slug) {
      setMessage("Mete o slug do artista.");
      return;
    }

    setSaving(true);

    const genres = genresText
      .split(",")
      .map((genre) => genre.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("artists")
      .update({
        name,
        slug,
        city,
        genres,
        description: description || null,
        instagram: instagram || null,
        bandcamp: bandcamp || null,
      })
      .eq("id", artistId);

    setSaving(false);

    if (error) {
      setMessage("Erro ao guardar artista. Pode existir slug repetido.");
      return;
    }

    setMessage("Artista atualizado.");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] px-5 py-8 pb-28 text-[#f5f5f2]">
        <section className="mx-auto max-w-md">
          <p className="text-foreground-muted">A carregar artista...</p>
        </section>
      </main>
    );
  }

  if (!artist) {
    return (
      <main className="min-h-screen bg-[#070707] px-5 py-8 pb-28 text-[#f5f5f2]">
        <section className="mx-auto max-w-md">
          <Link
            href="/admin/rede"
            className="mb-6 inline-block text-sm text-foreground-muted"
          >
            ← Voltar à rede
          </Link>

          <h1 className="text-4xl font-black">Artista não encontrado.</h1>

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
          Editar artista
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Afina o perfil.
        </h1>

        <p className="mt-5 text-base text-foreground-muted">
          Atualiza nome, slug, cidade, géneros e links públicos deste artista.
        </p>

        <div className="mt-8 space-y-5 rounded-[2rem] border border-border bg-background p-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground-secondary">
              Nome do artista
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do artista"
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
              placeholder="ex: dead-static"
              className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
            />

            <p className="mt-2 text-xs text-foreground-muted">
              O slug define o link público: /artistas/{slug || "slug"}
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
              Géneros
            </label>

            <input
              value={genresText}
              onChange={(event) => setGenresText(event.target.value)}
              placeholder="Ex: Doom, Sludge, Punk"
              className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
            />

            <p className="mt-2 text-xs text-foreground-muted">
              Separa vários géneros por vírgula.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-foreground-secondary">
              Descrição
            </label>

            <textarea
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descrição curta do artista"
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

          <div>
            <label className="mb-2 block text-sm font-bold text-foreground-secondary">
              Bandcamp
            </label>

            <input
              value={bandcamp}
              onChange={(event) => setBandcamp(event.target.value)}
              placeholder="https://..."
              className="w-full rounded-2xl border border-border bg-black px-4 py-3 text-[#f5f5f2] outline-none placeholder:text-foreground-muted focus:border-[var(--accent)]"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full bg-[#f5f5f2] px-5 py-4 text-sm font-black text-black disabled:opacity-50"
          >
            {saving ? "A guardar..." : "Guardar artista"}
          </button>

          {message && (
            <p className="text-center text-sm font-bold text-foreground-muted">
              {message}
            </p>
          )}

          {slug && (
            <Link
              href={`/artistas/${slug}`}
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