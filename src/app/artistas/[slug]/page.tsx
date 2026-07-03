import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCard } from "@/components/EventCard";
import { getArtistBySlug, getArtists } from "@/lib/artists";
import { getEvents } from "@/lib/events";

export async function generateStaticParams() {
  const artists = await getArtists();

  return artists.map((artist) => ({
    slug: artist.slug,
  }));
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const artist = await getArtistBySlug(slug);

  if (!artist) {
    notFound();
  }

  const events = await getEvents();

  const artistEvents = events.filter((event) =>
    event.artists.some((eventArtist) => eventArtist.slug === artist.slug)
  );

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link href="/" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar
        </Link>

        <div className="mb-6 h-64 rounded-[2rem] bg-gradient-to-br from-zinc-800 to-red-950" />

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Artista
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          {artist.name}
        </h1>

        <p className="mt-3 text-zinc-400">
          {artist.city || "Cidade por definir"}
        </p>

        <p className="mt-6 text-lg leading-relaxed text-zinc-300">
          {artist.description || "Artista dentro da rede cultural Paranoid."}
        </p>

        {artist.genres && artist.genres.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {artist.genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-400"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button className="rounded-full bg-[#f2f1ec] px-5 py-3 text-sm font-black text-black">
            Seguir artista
          </button>

          {artist.instagram && (
            <a
              href={artist.instagram}
              target="_blank"
              className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-300"
            >
              Instagram
            </a>
          )}

          {artist.bandcamp && (
            <a
              href={artist.bandcamp}
              target="_blank"
              className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-300"
            >
              Bandcamp
            </a>
          )}
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Próximos eventos</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Onde este artista aparece no mapa.
          </p>

          <div className="mt-4 space-y-4">
            {artistEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {artistEvents.length === 0 && (
            <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-zinc-400">
                Ainda não há eventos marcados para este artista.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}