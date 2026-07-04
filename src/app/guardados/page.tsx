import Link from "next/link";
import { SavedEventsClient } from "@/components/SavedEventsClient";
import { getEvents } from "@/lib/events";

export default async function SavedPage() {
  const events = await getEvents();

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <Link href="/" className="mb-6 inline-block text-sm text-zinc-400">
          ← Voltar
        </Link>

        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Guardados
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          O que não queres perder.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Eventos que guardaste para voltar mais tarde.
        </p>

        <SavedEventsClient events={events} />
      </section>
    </main>
  );
}