"use client";

export default function MapError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-[calc(100vh-5rem)] place-items-center bg-black px-5 pb-24 text-[#f2f1ec] lg:min-h-screen lg:pb-0">
      <div className="rounded-2xl border border-red-950 bg-red-950/30 p-5">
        <p className="text-sm font-bold text-red-100">
          Não consegui carregar o mapa.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-full bg-[#f2f1ec] px-5 py-3 text-sm font-black text-black"
        >
          Tentar outra vez
        </button>
      </div>
    </main>
  );
}
