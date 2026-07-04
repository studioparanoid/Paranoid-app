import { SavedEventsClient } from "@/components/SavedEventsClient";
import { getEvents } from "@/lib/events";

export default async function SavedEventsPage() {
  const events = await getEvents();

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Guardados
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Guarda o que não queres perder.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Eventos que marcaste para ver depois. Se um evento for arquivado,
          deixa de aparecer aqui.
        </p>

        <SavedEventsClient events={events || []} />
      </section>
    </main>
  );
}