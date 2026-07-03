import Link from "next/link";
import { getEvents } from "@/lib/events";
import { getVenues } from "@/lib/venues";

export default async function MapPage() {
  const events = await getEvents();
  const venues = await getVenues();

  const cities = Array.from(
    new Set([...events.map((event) => event.city), ...venues.map((venue) => venue.city)])
  ).sort();

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Mapa
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Onde a zona centro ainda mexe.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Cidades, espaços e eventos ativos vindos da base real.
        </p>

        <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <div className="relative h-80 overflow-hidden rounded-[1.5rem] bg-black">
            <div className="absolute left-[44%] top-[16%] h-3 w-3 rounded-full bg-red-700" />
            <div className="absolute left-[38%] top-[34%] h-4 w-4 rounded-full bg-red-700" />
            <div className="absolute left-[54%] top-[42%] h-5 w-5 rounded-full bg-red-700" />
            <div className="absolute left-[50%] top-[62%] h-3 w-3 rounded-full bg-red-700" />
            <div className="absolute left-[31%] top-[57%] h-3 w-3 rounded-full bg-red-700" />
            <div className="absolute left-[62%] top-[70%] h-3 w-3 rounded-full bg-red-700" />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(127,29,29,0.35),transparent_55%)]" />

            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-xs uppercase tracking-[0.35em] text-red-700">
                Zona Centro
              </p>
              <p className="mt-2 text-3xl font-black">
                {events.length} eventos · {venues.length} espaços
              </p>
            </div>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Cidades</h2>
          <p className="mt-1 text-sm text-zinc-500">
            O mapa vivo da Paranoid começa aqui.
          </p>

          <div className="mt-4 space-y-4">
            {cities.map((city) => {
              const cityEvents = events.filter((event) => event.city === city);
              const cityVenues = venues.filter((venue) => venue.city === city);

              return (
                <article
                  key={city}
                  className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-black">{city}</h3>

                      <p className="mt-2 text-sm text-zinc-500">
                        {cityEvents.length} evento
                        {cityEvents.length !== 1 ? "s" : ""} ·{" "}
                        {cityVenues.length} espaço
                        {cityVenues.length !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-bold text-red-400">
                      Ativa
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {cityVenues.map((venue) => (
                      <Link
                        key={venue.id}
                        href={`/espacos/${venue.slug}`}
                        className="rounded-full border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-400"
                      >
                        {venue.name}
                      </Link>
                    ))}
                  </div>

                  <Link
                    href="/agenda"
                    className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-3 text-center text-sm font-black text-black"
                  >
                    Ver eventos
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}