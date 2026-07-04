import Link from "next/link";
import { getEvents, type AppEvent } from "@/lib/events";

function EventCard({ event }: { event: AppEvent }) {
  return (
    <Link
      href={`/eventos/${event.slug}`}
      className="block rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 transition hover:border-red-950"
    >
      {event.image && (
        <div
          className="mb-4 h-56 rounded-[1.5rem] bg-cover bg-center"
          style={{
            backgroundImage: `url(${event.image})`,
          }}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">
            {event.category || "Evento"}
          </p>

          <h3 className="mt-2 text-2xl font-black leading-tight text-[#f2f1ec]">
            {event.title}
          </h3>
        </div>

        {event.featured && (
          <span className="rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-black uppercase text-red-400">
            Destaque
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1 text-sm text-zinc-400">
        <p>
          <span className="font-bold text-zinc-300">Data:</span>{" "}
          {event.date || "Data por definir"}{" "}
          {event.time ? `· ${event.time}` : ""}
        </p>

        <p>
          <span className="font-bold text-zinc-300">Cidade:</span>{" "}
          {event.city || "Cidade por definir"}
        </p>

        <p>
          <span className="font-bold text-zinc-300">Espaço:</span>{" "}
          {event.venue || "Espaço por definir"}
        </p>

        {event.price && (
          <p>
            <span className="font-bold text-zinc-300">Preço:</span>{" "}
            {event.price}
          </p>
        )}
      </div>
    </Link>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6">
      <p className="text-zinc-500">{text}</p>
    </div>
  );
}

export default async function HomePage() {
  const events = await getEvents();

  const safeEvents = Array.isArray(events) ? events : [];
  const featuredEvents = safeEvents.filter((event) => event.featured).slice(0, 3);
  const nextEvents = safeEvents.slice(0, 5);

  const cities = Array.from(
    new Set(safeEvents.map((event) => event.city).filter(Boolean))
  ).slice(0, 6);

  const categories = Array.from(
    new Set(safeEvents.map((event) => event.category).filter(Boolean))
  ).slice(0, 8);

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <section className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6">
          <p className="mb-4 text-xs uppercase tracking-[0.4em] text-red-700">
            Agenda Paranoid
          </p>

          <h1 className="text-6xl font-black leading-none tracking-tight">
            A cultura não espera por ninguém.
          </h1>

          <p className="mt-6 text-base leading-relaxed text-zinc-400">
            Concertos, festivais, cinema, exposições, mercados, artistas,
            espaços e organizadores da zona centro. Uma agenda feita para quem
            não quer só “sair” — quer encontrar onde as coisas acontecem.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <Link
              href="/agenda"
              className="rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
            >
              Entrar na agenda
            </Link>

            <Link
              href="/submeter"
              className="rounded-full border border-zinc-700 px-5 py-4 text-center text-sm font-bold text-zinc-300"
            >
              Submeter evento
            </Link>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
            <p className="text-3xl font-black">{safeEvents.length}</p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Eventos
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
            <p className="text-3xl font-black">{cities.length}</p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Cidades
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-zinc-800 bg-black p-4">
            <p className="text-3xl font-black">{categories.length}</p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Cenas
            </p>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-2 gap-3">
          <Link
            href="/para-ti"
            className="rounded-[2rem] border border-red-950 bg-red-950/30 p-5"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-red-500">
              Feed
            </p>

            <h2 className="mt-3 text-2xl font-black leading-none">
              Para ti
            </h2>

            <p className="mt-3 text-sm text-zinc-500">
              Eventos afinados ao teu gosto.
            </p>
          </Link>

          <Link
            href="/descobrir"
            className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-red-700">
              Rede
            </p>

            <h2 className="mt-3 text-2xl font-black leading-none">
              Descobrir
            </h2>

            <p className="mt-3 text-sm text-zinc-500">
              Artistas, espaços e organizadores.
            </p>
          </Link>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Destaques
              </p>

              <h2 className="mt-2 text-3xl font-black">Em cima da mesa</h2>
            </div>

            <span className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400">
              {featuredEvents.length}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {featuredEvents.length === 0 && (
              <EmptyCard text="Ainda não há eventos em destaque." />
            )}

            {featuredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                Próximos
              </p>

              <h2 className="mt-2 text-3xl font-black">O que vem aí</h2>
            </div>

            <Link
              href="/agenda"
              className="rounded-full border border-zinc-800 px-3 py-1 text-sm font-black text-zinc-400"
            >
              Ver tudo
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {nextEvents.length === 0 && (
              <EmptyCard text="Ainda não há eventos publicados." />
            )}

            {nextEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Chamada
          </p>

          <h2 className="mt-3 text-4xl font-black leading-none">
            Tens um evento?
          </h2>

          <p className="mt-5 text-sm leading-relaxed text-zinc-400">
            Submete concertos, festivais, exposições, cinema, mercados,
            workshops ou qualquer coisa que mereça sair da sombra.
          </p>

          <Link
            href="/submeter"
            className="mt-6 block rounded-full bg-[#f2f1ec] px-5 py-4 text-center text-sm font-black text-black"
          >
            Submeter evento
          </Link>
        </section>
      </section>
    </main>
  );
}