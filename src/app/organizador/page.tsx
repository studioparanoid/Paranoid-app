import Link from "next/link";
import { events } from "@/data/events";

const organizer = {
  name: "Paranoid Crew",
  pack: "Paranoid Crew",
  status: "Ativo",
  renewal: "Renova em 28 dias",
};

export default function OrganizerPage() {
  const organizerEvents = events.slice(0, 4);
  const totalViews = 1248;
  const totalSaves = 87;
  const ticketClicks = 43;

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Área do Organizador
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Publica. Mede. Volta a atacar.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Dashboard para promotores, espaços e coletivos culturais.
        </p>

        <div className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-red-700">
                Organizador
              </p>

              <h2 className="mt-2 text-2xl font-black">{organizer.name}</h2>

              <p className="mt-2 text-sm text-zinc-500">
                Pack {organizer.pack} · {organizer.renewal}
              </p>
            </div>

            <span className="rounded-full border border-green-900 bg-green-950 px-3 py-1 text-xs font-bold text-green-400">
              {organizer.status}
            </span>
          </div>

          <Link
            href="/submeter"
            className="mt-5 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
          >
            Criar novo evento
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-3xl font-black">{totalViews}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              Views
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-3xl font-black">{totalSaves}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              Guardados
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-3xl font-black">{ticketClicks}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              Cliques
            </p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Os teus eventos</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Eventos publicados ou em campanha.
          </p>

          <div className="mt-4 space-y-4">
            {organizerEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-700">
                      {event.category}
                    </p>

                    <h3 className="text-xl font-black">{event.title}</h3>

                    <p className="mt-2 text-sm text-zinc-400">
                      {event.date} · {event.time}
                    </p>

                    <p className="text-sm text-zinc-500">
                      {event.venue}, {event.city}
                    </p>
                  </div>

                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-400">
                    Publicado
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-black px-3 py-3">
                    <p className="text-lg font-black">342</p>
                    <p className="text-[10px] uppercase text-zinc-600">Views</p>
                  </div>

                  <div className="rounded-2xl bg-black px-3 py-3">
                    <p className="text-lg font-black">18</p>
                    <p className="text-[10px] uppercase text-zinc-600">
                      Guardados
                    </p>
                  </div>

                  <div className="rounded-2xl bg-black px-3 py-3">
                    <p className="text-lg font-black">9</p>
                    <p className="text-[10px] uppercase text-zinc-600">
                      Cliques
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/eventos/${event.slug}`}
                    className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-bold text-zinc-300"
                  >
                    Ver
                  </Link>

                  <button className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-300">
                    Editar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-700">
            Pack ativo
          </p>

          <h2 className="text-2xl font-black">Paranoid Crew</h2>

          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Eventos ilimitados, perfil completo, estatísticas básicas e destaque
            ocasional. Depois ligamos isto ao Stripe e à faturação.
          </p>

          <button className="mt-5 w-full rounded-full border border-zinc-700 px-5 py-4 text-sm font-bold text-zinc-300">
            Gerir pack
          </button>
        </section>
      </section>
    </main>
  );
}