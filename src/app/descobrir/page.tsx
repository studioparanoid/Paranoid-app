import Link from "next/link";
import { FollowButton } from "@/components/FollowButton";
import { getArtists } from "@/lib/artists";
import { getOrganizers } from "@/lib/organizers";
import { getVenues } from "@/lib/venues";

export default async function DiscoverPage() {
  const artists = await getArtists();
  const venues = await getVenues();
  const organizers = await getOrganizers();

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link href="/" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar
        </Link>

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Descobrir
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Segue o que te puxa para fora.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Artistas, espaços e organizadores da rede Paranoid. Quanto mais
          segues, melhor fica o teu mapa.
        </p>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Artistas</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Bandas, DJs, criadores e ruído local.
              </p>
            </div>

            <span className="text-sm font-black text-red-700">
              {artists.length}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {artists.map((artist) => (
              <article
                key={artist.id}
                className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
              >
                <Link href={`/artistas/${artist.slug}`}>
                  <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
                    Artista
                  </p>

                  <h3 className="text-2xl font-black">{artist.name}</h3>

                  <p className="mt-2 text-sm text-zinc-500">
                    {artist.city || "Cidade por definir"}
                  </p>

                  {artist.genres && artist.genres.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {artist.genres.slice(0, 4).map((genre) => (
                        <span
                          key={genre}
                          className="rounded-full border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-400"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>

                <div className="mt-5">
                  <FollowButton targetId={artist.id} targetType="artist" />
                </div>
              </article>
            ))}

            {artists.length === 0 && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-zinc-400">Ainda não há artistas.</p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Espaços</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Salas, caves, auditórios e sítios onde acontece.
              </p>
            </div>

            <span className="text-sm font-black text-red-700">
              {venues.length}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {venues.map((venue) => (
              <article
                key={venue.id}
                className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
              >
                <Link href={`/espacos/${venue.slug}`}>
                  <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
                    Espaço
                  </p>

                  <h3 className="text-2xl font-black">{venue.name}</h3>

                  <p className="mt-2 text-sm text-zinc-500">
                    {venue.address || "Morada por definir"}, {venue.city}
                  </p>

                  <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                    {venue.description ||
                      "Espaço cultural dentro do mapa Paranoid."}
                  </p>
                </Link>

                <div className="mt-5">
                  <FollowButton targetId={venue.id} targetType="venue" />
                </div>
              </article>
            ))}

            {venues.length === 0 && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-zinc-400">Ainda não há espaços.</p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Organizadores</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Quem mete as coisas a acontecer.
              </p>
            </div>

            <span className="text-sm font-black text-red-700">
              {organizers.length}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {organizers.map((organizer) => (
              <article
                key={organizer.id}
                className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
              >
                <Link href={`/organizadores/${organizer.slug}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
                        Organizador
                      </p>

                      <h3 className="text-2xl font-black">{organizer.name}</h3>

                      <p className="mt-2 text-sm text-zinc-500">
                        {organizer.city || "Cidade por definir"}
                      </p>
                    </div>

                    {organizer.verified && (
                      <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-bold text-red-400">
                        Verificado
                      </span>
                    )}
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                    {organizer.description ||
                      "Organizador cultural dentro da rede Paranoid."}
                  </p>

                  {organizer.pack && (
                    <p className="mt-3 text-xs font-bold uppercase tracking-wide text-zinc-600">
                      {organizer.pack}
                    </p>
                  )}
                </Link>

                <div className="mt-5">
                  <FollowButton
                    targetId={organizer.id}
                    targetType="organizer"
                  />
                </div>
              </article>
            ))}

            {organizers.length === 0 && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <p className="text-zinc-400">Ainda não há organizadores.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}