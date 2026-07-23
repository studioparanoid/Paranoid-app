"use client";

export default function OrganizerError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-background px-5 py-8 pb-28 text-foreground lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-3xl">
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-danger">
            Organizador
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Não consegui carregar.</h1>
          <button
            type="button"
            onClick={reset}
            className="pressable focus-ring mt-5 rounded-xl bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--background)]"
          >
            Tentar outra vez
          </button>
        </div>
      </section>
    </main>
  );
}
