import { AgendaClient } from "@/components/AgendaClient";
import { getEvents } from "@/lib/events";

export default async function AgendaPage() {
  const events = await getEvents();

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Agenda
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
              O que está a acontecer.
            </h1>
          </div>

          <p className="text-base leading-relaxed text-zinc-400 lg:max-w-xl lg:text-lg">
            Concertos, festivais, cinema, exposições, mercados, workshops e
            outras cenas da zona centro. Filtra por cidade, categoria ou procura
            diretamente pelo nome.
          </p>
        </div>

        <AgendaClient events={events || []} />
      </section>
    </main>
  );
}