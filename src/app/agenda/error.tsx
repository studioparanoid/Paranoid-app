"use client";

export default function AgendaError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-3xl">
        <div className="rounded-[2rem] border border-red-950 bg-red-950/20 p-6">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-red-400">
            Agenda
          </p>
          <h1 className="mt-3 text-4xl font-black">Não consegui carregar.</h1>
          <button
            type="button"
            onClick={reset}
            className="mt-5 rounded-full bg-[#f2f1ec] px-5 py-3 text-sm font-black text-black"
          >
            Tentar outra vez
          </button>
        </div>
      </section>
    </main>
  );
}
