import { OrganizerTicketsClient } from "@/components/OrganizerTicketsClient";

export default function OrganizerTicketsPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-red-700">
              Bilheteira
            </p>

            <h1 className="text-5xl font-black leading-none tracking-tight lg:text-8xl">
              Porta aberta ou fechada.
            </h1>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
            <p className="text-base leading-relaxed text-zinc-400 lg:text-lg">
              Vê reservas da bilheteira Paranoid, procura por código/email e
              marca entradas à porta.
            </p>
          </div>
        </section>

        <OrganizerTicketsClient />
      </section>
    </main>
  );
}