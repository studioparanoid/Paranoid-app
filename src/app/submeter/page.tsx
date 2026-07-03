import { SubmitEventClient } from "@/components/SubmitEventClient";

export default function SubmitEventPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 text-[#f2f1ec]">
      <section className="mx-auto max-w-md">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
          Submeter evento
        </p>

        <h1 className="text-5xl font-black leading-none tracking-tight">
          Mete o teu evento no mapa.
        </h1>

        <p className="mt-5 text-base text-zinc-400">
          Preenche, vê o preview e envia para aprovação Paranoid.
        </p>

        <SubmitEventClient />
      </section>
    </main>
  );
}