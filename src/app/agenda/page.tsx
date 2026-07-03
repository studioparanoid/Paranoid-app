import { AgendaClient } from "@/components/AgendaClient";
import { getEvents } from "@/lib/events";

export default async function AgendaPage() {
  const events = await getEvents();

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Agenda
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Tudo o que está a acontecer.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Filtra por cidade e categoria. Sem cartazes mortos.
        </p>

        <AgendaClient events={events} />
      </section>
    </main>
  );
}