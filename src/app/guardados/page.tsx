import { SavedEventsClient } from "@/components/SavedEventsClient";

export default function GuardadosPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Guardados
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Os eventos que não podes deixar morrer.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          O teu bunker de eventos. Guardados neste browser até ligarmos contas e Supabase.
        </p>

        <SavedEventsClient />
      </section>
    </main>
  );
}