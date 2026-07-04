import { SavedEventsClient } from "@/components/SavedEventsClient";
import { getEvents } from "@/lib/events";

export default async function SavedEventsPage() {
  const events = await getEvents();
  const safeEvents = Array.isArray(events) ? events : [];

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Guardados
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
              O saco do que não podes perder.
            </h1>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-base leading-relaxed text-zinc-400 lg:text-lg">
              Eventos que marcaste para ver depois. Se um evento for arquivado
              ou removido da agenda pública, deixa de aparecer aqui.
            </p>

            <div className="mt-6 rounded-[1.5rem] border border-zinc-800 bg-black p-4">
              <p className="text-3xl font-black">{safeEvents.length}</p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Eventos públicos disponíveis
              </p>
            </div>
          </div>
        </section>

        <SavedEventsClient events={safeEvents} />
      </section>
    </main>
  );
}